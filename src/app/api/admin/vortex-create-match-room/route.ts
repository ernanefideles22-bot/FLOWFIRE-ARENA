import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual,randomInt} from 'node:crypto';
import {db,ensureSchema} from '../../../../lib/db';
export const runtime='nodejs';
function authorized(req:NextRequest){const k=process.env.ADMIN_API_KEY,s=req.headers.get('x-admin-key');if(!k||!s)return false;const a=Buffer.from(k),b=Buffer.from(s);return a.length===b.length&&timingSafeEqual(a,b);}
export async function POST(req:NextRequest){
 if(!authorized(req))return NextResponse.json({error:'Não autorizado'},{status:401});
 if(process.env.VORTEX_ROOM_CREATION_ENABLED!=='true')return NextResponse.json({error:'Criação de salas desativada no Railway'},{status:403});
 let body:{matchId?:string;confirm?:string};try{body=await req.json();}catch{return NextResponse.json({error:'JSON inválido'},{status:400});}
 if(typeof body.matchId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.matchId))return NextResponse.json({error:'Partida inválida'},{status:400});
 if(body.confirm!=='CREATE_ONE_CREDITED_MATCH_ROOM')return NextResponse.json({error:'Confirmação explícita obrigatória'},{status:400});
 if(!process.env.VORTEX_TOKEN)return NextResponse.json({error:'Token Vortex ausente'},{status:503});
 try{
  await ensureSchema();const c=await db().connect();
  try{
   await c.query('BEGIN');
   const m=await c.query('SELECT id,mode,status,vortex_room_id,vortex_session_id FROM arena_matches WHERE id=$1 FOR UPDATE',[body.matchId]);
   if(!m.rowCount){await c.query('ROLLBACK');return NextResponse.json({error:'Partida não encontrada'},{status:404});}
   if(m.rows[0].vortex_room_id||m.rows[0].vortex_session_id){await c.query('ROLLBACK');return NextResponse.json({error:'Sala já vinculada'},{status:409});}
   if(m.rows[0].mode!=='1v1'||m.rows[0].status!=='ready'){await c.query('ROLLBACK');return NextResponse.json({error:'Somente partida 1x1 pronta para teste'},{status:409});}
   const approval=await c.query('SELECT approved FROM arena_room_approvals WHERE match_id=$1',[body.matchId]);
   const reservation=await c.query('SELECT state FROM arena_room_reservations WHERE match_id=$1',[body.matchId]);
   if(approval.rows[0]?.approved!==true||reservation.rows[0]?.state!=='reserved'){await c.query('ROLLBACK');return NextResponse.json({error:'Autorize e reserve a partida antes da criação'},{status:403});}
   const reserved=await c.query("UPDATE arena_room_reservations SET state='uncertain' WHERE match_id=$1 AND state='reserved' RETURNING match_id",[body.matchId]);
   if(!reserved.rowCount){await c.query('ROLLBACK');return NextResponse.json({error:'Tentativa já realizada'},{status:409});}
   await c.query('COMMIT');
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
  const password=String(randomInt(100000,1000000));const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),20000);
  try{
   const base=process.env.VORTEX_BASE_URL||'https://vortex-ff.com/api';
   const res=await fetch(base+'/rooms',{method:'POST',headers:{Authorization:'Bearer '+process.env.VORTEX_TOKEN,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({password,start_delay_minutes:10,config_type:'ap_padrao',room_name:'FLOWFIRE ARENA 1X1',map_name:'Bermuda'}),signal:controller.signal,cache:'no-store'});
   const raw=await res.text();let data:Record<string,unknown>={};try{data=JSON.parse(raw);}catch{}
   if(!res.ok)return NextResponse.json({error:'Vortex recusou criação; reserva exige revisão manual',providerStatus:res.status,retryBlocked:true},{status:502});
   const session=typeof data.session_id==='string'?data.session_id:null;const room=typeof data.room_id==='number'||typeof data.room_id==='string'?String(data.room_id):null;
   if(!session||!room)return NextResponse.json({error:'Resposta Vortex incompleta; verificar painel do provedor antes de qualquer nova tentativa',retryBlocked:true},{status:502});
   const pass=typeof data.password==='string'?data.password:password;
   await db().query("UPDATE arena_matches SET vortex_session_id=$2,vortex_room_id=$3,vortex_room_password=$4,vortex_created_at=now() WHERE id=$1 AND vortex_room_id IS NULL",[body.matchId,session,room,pass]);
   await db().query("UPDATE arena_room_reservations SET state='completed' WHERE match_id=$1",[body.matchId]);
   return NextResponse.json({status:'created',matchId:body.matchId,roomId:room,sessionId:session,password:pass,format:'AP (1x1 participation not yet verified)'});
  }catch{return NextResponse.json({error:'Resultado incerto; NÃO repetir criação sem verificar Vortex',retryBlocked:true},{status:502});}
  finally{clearTimeout(timeout);}
 }catch{return NextResponse.json({error:'Falha de preparação; nenhuma tentativa automática será feita'},{status:503});}
}
