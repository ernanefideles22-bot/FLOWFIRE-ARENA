import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
import {db,ensureSchema} from '../../../../lib/db';
export const runtime='nodejs';
function authorized(req:NextRequest){const k=process.env.ADMIN_API_KEY,s=req.headers.get('x-admin-key');if(!k||!s)return false;const a=Buffer.from(k),b=Buffer.from(s);return a.length===b.length&&timingSafeEqual(a,b);}
export async function POST(req:NextRequest){
 if(!authorized(req))return NextResponse.json({error:'Não autorizado'},{status:401});
 let b:{matchId?:string;keepTeamId?:string;confirm?:string};try{b=await req.json();}catch{return NextResponse.json({error:'JSON inválido'},{status:400});}
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 if(!b.matchId||!uuid.test(b.matchId)||!b.keepTeamId||!uuid.test(b.keepTeamId)||b.confirm!=='CANCEL_UNSTARTED_MATCH')return NextResponse.json({error:'Confirmação e IDs obrigatórios'},{status:400});
 if(!process.env.VORTEX_TOKEN)return NextResponse.json({error:'Vortex não configurada'},{status:503});
 try{
  await ensureSchema();
  const c=await db().connect();
  let session:string;
  let mode:string;
  try{
   await c.query('BEGIN');
   const m=await c.query('SELECT id,team_a,team_b,mode,status,vortex_session_id FROM arena_matches WHERE id=$1 FOR UPDATE',[b.matchId]);
   const x=m.rows[0];
   if(!x||![x.team_a,x.team_b].includes(b.keepTeamId)||x.status!=='ready'||!x.vortex_session_id){await c.query('ROLLBACK');return NextResponse.json({error:'Confronto inválido ou já encerrado'},{status:409});}
   const started=await c.query("SELECT state FROM arena_vortex_start_attempts WHERE match_id=$1",[b.matchId]).catch(()=>({rows:[]}));
   if(started.rows.length){await c.query('ROLLBACK');return NextResponse.json({error:'START já solicitado; cancelamento exige verificação manual',retryBlocked:true},{status:409});}
   await c.query("CREATE TABLE IF NOT EXISTS arena_match_cancellations(match_id uuid PRIMARY KEY REFERENCES arena_matches(id),state text NOT NULL,requested_at timestamptz NOT NULL DEFAULT now())");
   const attempt=await c.query("INSERT INTO arena_match_cancellations(match_id,state) VALUES($1,'releasing') ON CONFLICT DO NOTHING RETURNING match_id",[b.matchId]);
   if(!attempt.rowCount){await c.query('ROLLBACK');return NextResponse.json({error:'Cancelamento já solicitado; verificar estado',retryBlocked:true},{status:409});}
   session=x.vortex_session_id;mode=x.mode;
   await c.query('COMMIT');
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  try{
   const base=process.env.VORTEX_BASE_URL||'https://vortex-ff.com/api';
   const response=await fetch(base+'/rooms/'+encodeURIComponent(session)+'/release',{method:'POST',headers:{Authorization:'Bearer '+process.env.VORTEX_TOKEN,Accept:'application/json'},cache:'no-store',signal:controller.signal});
   if(!response.ok)return NextResponse.json({error:'Vortex não confirmou liberação; não repetir sem revisão',providerStatus:response.status,retryBlocked:true},{status:502});
  }catch{return NextResponse.json({error:'Liberação incerta na Vortex; não repetir sem revisão',retryBlocked:true},{status:502});}finally{clearTimeout(timer);}
  const c2=await db().connect();
  try{
   await c2.query('BEGIN');
   await c2.query('SELECT pg_advisory_xact_lock(hashtext($1))',[mode]);
   const m=await c2.query('SELECT status,vortex_session_id FROM arena_matches WHERE id=$1 FOR UPDATE',[b.matchId]);
   if(m.rows[0]?.status!=='ready'||m.rows[0]?.vortex_session_id!==session)throw Error('Confronto alterado durante liberação');
   await c2.query("UPDATE arena_matches SET status='finished',vortex_result=$2::jsonb WHERE id=$1",[b.matchId,JSON.stringify({source:'admin_cancelled_unstarted',cancelled:true,verifiedWinner:false,releasedAt:new Date().toISOString()})]);
   await c2.query('DELETE FROM arena_queue WHERE team_id=$1',[b.keepTeamId]);
   await c2.query('INSERT INTO arena_queue(team_id,mode) VALUES($1,$2) ON CONFLICT(team_id) DO NOTHING',[b.keepTeamId,mode]);
   await c2.query("UPDATE arena_match_cancellations SET state='completed' WHERE match_id=$1",[b.matchId]);
   await c2.query('COMMIT');
   return NextResponse.json({status:'cancelled',roomReleased:true,keptTeamQueued:true,matchId:b.matchId});
  }catch{await c2.query('ROLLBACK');return NextResponse.json({error:'Vortex liberada, mas banco exige reconciliação; não repetir',retryBlocked:true},{status:503});}finally{c2.release();}
 }catch{return NextResponse.json({error:'Não foi possível preparar cancelamento'},{status:503});}
}
