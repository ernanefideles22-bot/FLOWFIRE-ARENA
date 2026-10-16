import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
import {db,ensureSchema} from '../../../../lib/db';
export const runtime='nodejs';
function authorized(req:NextRequest){const key=process.env.ADMIN_API_KEY,supplied=req.headers.get('x-admin-key');if(!key||!supplied)return false;const a=Buffer.from(key),b=Buffer.from(supplied);return a.length===b.length&&timingSafeEqual(a,b);}
export async function GET(req:NextRequest){
 if(!authorized(req))return NextResponse.json({error:'Não autorizado'},{status:401});
 try{
  await ensureSchema();
  await db().query('CREATE TABLE IF NOT EXISTS arena_room_approvals (match_id uuid PRIMARY KEY REFERENCES arena_matches(id),approved boolean NOT NULL DEFAULT false,updated_at timestamptz NOT NULL DEFAULT now())');
  const result=await db().query(`SELECT m.id,m.mode,m.status,m.created_at,m.vortex_room_id,m.vortex_created_at,COALESCE(ap.approved,false) AS approved,a.name AS team_a,b.name AS team_b FROM arena_matches m LEFT JOIN arena_room_approvals ap ON ap.match_id=m.id JOIN arena_teams a ON a.id=m.team_a JOIN arena_teams b ON b.id=m.team_b ORDER BY m.created_at DESC LIMIT 50`);
  return NextResponse.json({matches:result.rows.map(r=>({id:r.id,mode:r.mode,status:r.status,createdAt:r.created_at,teamA:r.team_a,teamB:r.team_b,roomCreated:Boolean(r.vortex_room_id),approved:r.approved,roomCreatedAt:r.vortex_created_at})),roomCreationEnabled:false});
 }catch{return NextResponse.json({error:'Falha ao consultar partidas'},{status:503});}
}
