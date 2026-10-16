import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
import {db,ensureSchema} from '../../../../lib/db';
export const runtime='nodejs';
function authorized(req:NextRequest){const k=process.env.ADMIN_API_KEY,s=req.headers.get('x-admin-key');if(!k||!s)return false;const a=Buffer.from(k),b=Buffer.from(s);return a.length===b.length&&timingSafeEqual(a,b);}
export async function POST(req:NextRequest){
 if(!authorized(req))return NextResponse.json({error:'Não autorizado'},{status:401});
 let body:{matchId?:string;confirm?:string};try{body=await req.json();}catch{return NextResponse.json({error:'JSON inválido'},{status:400});}
 if(typeof body.matchId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.matchId)||body.confirm!=='START_MATCH_NOW')return NextResponse.json({error:'Confirmação ou partida inválida'},{status:400});
 if(!process.env.VORTEX_TOKEN)return NextResponse.json({error:'Vortex não configurada'},{status:503});
 try{
  await ensureSchema();const c=await db().connect();let session='';
  try{
   await c.query('BEGIN');
   const m=await c.query('SELECT vortex_session_id,vortex_room_id,mode FROM arena_matches WHERE id=$1 FOR UPDATE',[body.matchId]);
   if(!m.rowCount||!m.rows[0].vortex_session_id||!m.rows[0].vortex_room_id){await c.query('ROLLBACK');return NextResponse.json({error:'Sala vinculada não encontrada'},{status:404});}
   if(!['1v1','2v2'].includes(m.rows[0].mode)){await c.query('ROLLBACK');return NextResponse.json({error:'Teste disponível somente para 1x1 e 2x2'},{status:409});}
   session=m.rows[0].vortex_session_id;
   await c.query('CREATE TABLE IF NOT EXISTS arena_vortex_start_attempts(match_id uuid PRIMARY KEY REFERENCES arena_matches(id),requested_at timestamptz NOT NULL DEFAULT now(),state text NOT NULL)');
   const x=await c.query("INSERT INTO arena_vortex_start_attempts(match_id,state) VALUES($1,'uncertain') ON CONFLICT DO NOTHING RETURNING match_id",[body.matchId]);
   if(!x.rowCount){await c.query('ROLLBACK');return NextResponse.json({error:'START já solicitado; verifique a Vortex antes de repetir',retryBlocked:true},{status:409});}
   await c.query('COMMIT');
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),12000);
  try{
   const base=process.env.VORTEX_BASE_URL||'https://vortex-ff.com/api';
   const res=await fetch(base+'/rooms/'+encodeURIComponent(session)+'/start',{method:'POST',headers:{Authorization:'Bearer '+process.env.VORTEX_TOKEN,Accept:'application/json'},cache:'no-store',signal:controller.signal});
   if(!res.ok)return NextResponse.json({error:'Vortex não confirmou START',providerStatus:res.status,retryBlocked:true},{status:502});
   await db().query("UPDATE arena_vortex_start_attempts SET state='confirmed' WHERE match_id=$1",[body.matchId]);
   return NextResponse.json({status:'start_confirmed',matchId:body.matchId});
  }catch{return NextResponse.json({error:'START incerto; verifique na Vortex antes de repetir',retryBlocked:true},{status:502});}
  finally{clearTimeout(timeout);}
 }catch{return NextResponse.json({error:'Falha ao preparar START'},{status:503});}
}
