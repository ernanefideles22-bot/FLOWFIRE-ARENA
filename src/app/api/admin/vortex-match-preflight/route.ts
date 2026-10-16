import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
import {db,ensureSchema} from '../../../../lib/db';
export const runtime='nodejs';
function authorized(req:NextRequest){const key=process.env.ADMIN_API_KEY,s=req.headers.get('x-admin-key');if(!key||!s)return false;const a=Buffer.from(key),b=Buffer.from(s);return a.length===b.length&&timingSafeEqual(a,b);}
export async function POST(req:NextRequest){
 if(!authorized(req))return NextResponse.json({error:'Não autorizado'},{status:401});
 let body:{matchId?:string};try{body=await req.json();}catch{return NextResponse.json({error:'JSON inválido'},{status:400});}
 if(typeof body.matchId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.matchId))return NextResponse.json({error:'Partida inválida'},{status:400});
 try{
  await ensureSchema();
  const c=await db().connect();
  try{
   await c.query('BEGIN READ ONLY');
   const m=await c.query('SELECT id,mode,status,team_a,team_b,vortex_room_id,vortex_session_id FROM arena_matches WHERE id=$1',[body.matchId]);
   if(!m.rowCount){await c.query('ROLLBACK');return NextResponse.json({error:'Partida não encontrada'},{status:404});}
   const approval=await c.query("SELECT to_regclass('public.arena_room_approvals') AS name");
   const reservation=await c.query("SELECT to_regclass('public.arena_room_reservations') AS name");
   const a=approval.rows[0].name?await c.query('SELECT approved FROM arena_room_approvals WHERE match_id=$1',[body.matchId]):null;
   const r=reservation.rows[0].name?await c.query('SELECT state FROM arena_room_reservations WHERE match_id=$1',[body.matchId]):null;
   await c.query('COMMIT');
   const match=m.rows[0];const approved=a?.rows[0]?.approved===true;const reservationState=r?.rows[0]?.state??null;
   const checks={approved,reserved:reservationState==='reserved',noExistingRoom:!match.vortex_room_id&&!match.vortex_session_id,providerConfigured:Boolean(process.env.VORTEX_TOKEN),creationGateEnabled:process.env.VORTEX_ROOM_CREATION_ENABLED==='true',modeVerified:false};
   return NextResponse.json({matchId:match.id,mode:match.mode,status:match.status,teamA:match.team_a,teamB:match.team_b,reservationState,checks,canCreate:false,reason:'Configuração da modalidade Vortex ainda não homologada; criação real bloqueada',providerCalled:false,creditsConsumed:false,databaseWritten:false});
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 }catch{return NextResponse.json({error:'Consulta prévia indisponível'},{status:503});}
}
