import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
import {db,ensureSchema} from '../../../../lib/db';
export const runtime='nodejs';
function authorized(req:NextRequest){const k=process.env.ADMIN_API_KEY,s=req.headers.get('x-admin-key');if(!k||!s)return false;const a=Buffer.from(k),b=Buffer.from(s);return a.length===b.length&&timingSafeEqual(a,b);}
export async function POST(req:NextRequest){
 if(!authorized(req))return NextResponse.json({error:'Não autorizado'},{status:401});
 let body:{matchId?:string};try{body=await req.json();}catch{return NextResponse.json({error:'JSON inválido'},{status:400});}
 if(typeof body.matchId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.matchId))return NextResponse.json({error:'Partida inválida'},{status:400});
 try{
  await ensureSchema();
  const r=await db().query('SELECT m.id,m.mode,m.status,m.vortex_room_id,a.name AS team_a,b.name AS team_b FROM arena_matches m JOIN arena_teams a ON a.id=m.team_a JOIN arena_teams b ON b.id=m.team_b WHERE m.id=$1',[body.matchId]);
  if(!r.rowCount)return NextResponse.json({error:'Partida não encontrada'},{status:404});
  const m=r.rows[0],alreadyCreated=Boolean(m.vortex_room_id);
  return NextResponse.json({matchId:m.id,mode:m.mode,status:m.status,teamA:m.team_a,teamB:m.team_b,roomCreated:alreadyCreated,canCreate:false,reason:alreadyCreated?'Sala já vinculada':'Criação desativada até confirmação dos parâmetros Vortex',dryRun:true,providerCalled:false,creditsConsumed:false});
 }catch{return NextResponse.json({error:'Falha ao preparar prévia'},{status:503});}
}
