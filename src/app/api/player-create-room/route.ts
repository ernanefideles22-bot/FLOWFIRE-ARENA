import {NextRequest,NextResponse} from 'next/server';
import {createHash,randomInt} from 'node:crypto';
import {db,ensureSchema} from '../../../lib/db';
export const runtime='nodejs';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function POST(req:NextRequest){
 let b:{teamId?:string;queueToken?:string;matchId?:string};
 try{b=await req.json();}catch{return NextResponse.json({error:'JSON inválido'},{status:400});}
 if(!b.teamId||!uuid.test(b.teamId)||!b.matchId||!uuid.test(b.matchId)||!b.queueToken||!/^[0-9a-f]{64}$/i.test(b.queueToken))return NextResponse.json({error:'Credenciais inválidas'},{status:400});
 if(process.env.VORTEX_ROOM_CREATION_ENABLED!=='true')return NextResponse.json({error:'Criação de salas ainda desativada para segurança',code:'VORTEX_CREATION_DISABLED'},{status:403});
 if(!process.env.VORTEX_TOKEN)return NextResponse.json({error:'Vortex não configurada'},{status:503});
 let reserved=false;
 try{
  await ensureSchema();
  const c=await db().connect();
  try{
   await c.query('BEGIN');
   const t=await c.query('SELECT id FROM arena_teams WHERE id=$1 AND queue_token_hash=$2',[b.teamId,createHash('sha256').update(b.queueToken).digest('hex')]);
   if(!t.rowCount){await c.query('ROLLBACK');return NextResponse.json({error:'Capitão não autorizado'},{status:403});}
   const m=await c.query('SELECT id,team_a,team_b,mode,status,vortex_room_id,vortex_room_password,vortex_session_id FROM arena_matches WHERE id=$1 FOR UPDATE',[b.matchId]);
   const x=m.rows[0];
   if(!x||![x.team_a,x.team_b].includes(b.teamId)){await c.query('ROLLBACK');return NextResponse.json({error:'Confronto não pertence à equipe'},{status:403});}
   if(x.vortex_room_id){await c.query('COMMIT');return NextResponse.json({status:'existing',roomId:x.vortex_room_id,password:x.vortex_room_password});}
   if(x.status!=='ready'||!['1v1','2v2'].includes(x.mode)){await c.query('ROLLBACK');return NextResponse.json({error:'Modalidade ou confronto indisponível para criação'},{status:409});}
   await c.query("CREATE TABLE IF NOT EXISTS arena_room_reservations(match_id uuid PRIMARY KEY REFERENCES arena_matches(id),state text NOT NULL CHECK(state IN ('reserved','uncertain','completed')),reserved_at timestamptz NOT NULL DEFAULT now())");
   const reservation=await c.query("INSERT INTO arena_room_reservations(match_id,state) VALUES($1,'uncertain') ON CONFLICT DO NOTHING RETURNING match_id",[b.matchId]);
   if(!reservation.rowCount){await c.query('ROLLBACK');return NextResponse.json({error:'Criação já solicitada. Aguarde a sala ou a revisão; não haverá segunda cobrança.',code:'ROOM_ATTEMPT_EXISTS',retryBlocked:true},{status:409});}
   await c.query('COMMIT');reserved=true;
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
  const password=String(randomInt(100000,1000000));
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),20000);
  try{
   const base=process.env.VORTEX_BASE_URL||'https://vortex-ff.com/api';
   const response=await fetch(base+'/rooms',{method:'POST',headers:{Authorization:'Bearer '+process.env.VORTEX_TOKEN,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({password,start_delay_minutes:10,config_type:'ap_padrao',room_name:'FLOWFIRE ARENA CS',map_name:'Bermuda'}),cache:'no-store',signal:controller.signal});
   const raw=await response.text();let data:Record<string,unknown>={};try{data=JSON.parse(raw);}catch{}
   if(!response.ok){console.error('Vortex create failed',{matchId:b.matchId,status:response.status});return NextResponse.json({error:'Vortex recusou a criação. Verificação necessária antes de nova tentativa.',providerStatus:response.status,retryBlocked:true},{status:502});}
   const session=typeof data.session_id==='string'?data.session_id:null;
   const room=typeof data.room_id==='string'||typeof data.room_id==='number'?String(data.room_id):null;
   if(!session||!room)return NextResponse.json({error:'Resposta Vortex incompleta. Não repetir a operação.',retryBlocked:true},{status:502});
   const pass=typeof data.password==='string'?data.password:password;
   await db().query('UPDATE arena_matches SET vortex_session_id=$2,vortex_room_id=$3,vortex_room_password=$4,vortex_created_at=now() WHERE id=$1 AND vortex_room_id IS NULL',[b.matchId,session,room,pass]);
   await db().query("UPDATE arena_room_reservations SET state='completed' WHERE match_id=$1",[b.matchId]);
   return NextResponse.json({status:'created',roomId:room,password:pass});
  }catch(e){console.error('Vortex create uncertain',{matchId:b.matchId,error:e instanceof Error?e.name:'unknown'});return NextResponse.json({error:'Resultado incerto. Não repetir sem verificar a Vortex.',retryBlocked:true},{status:502});}
  finally{clearTimeout(timer);}
 }catch{return NextResponse.json({error:reserved?'Falha após reservar; revisão necessária':'Não foi possível preparar a sala',retryBlocked:reserved},{status:503});}
}
