import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
import {db,ensureSchema} from '../../../../lib/db';
export const runtime='nodejs';
function authorized(req:NextRequest){const k=process.env.ADMIN_API_KEY,s=req.headers.get('x-admin-key');if(!k||!s)return false;const a=Buffer.from(k),b=Buffer.from(s);return a.length===b.length&&timingSafeEqual(a,b);}
export async function POST(req:NextRequest){
 if(!authorized(req))return NextResponse.json({error:'Não autorizado'},{status:401});
 let body:{matchId?:string;approved?:boolean};try{body=await req.json();}catch{return NextResponse.json({error:'JSON inválido'},{status:400});}
 if(typeof body.matchId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.matchId)||typeof body.approved!=='boolean')return NextResponse.json({error:'Dados inválidos'},{status:400});
 try{
  await ensureSchema();
  const c=await db().connect();
  try{
   await c.query('BEGIN');
   await c.query("CREATE TABLE IF NOT EXISTS arena_room_approvals (match_id uuid PRIMARY KEY REFERENCES arena_matches(id),approved boolean NOT NULL DEFAULT false,updated_at timestamptz NOT NULL DEFAULT now())");
   const match=await c.query('SELECT id,mode,vortex_room_id FROM arena_matches WHERE id=$1 FOR UPDATE',[body.matchId]);
   if(!match.rowCount){await c.query('ROLLBACK');return NextResponse.json({error:'Partida não encontrada'},{status:404});}
   if(match.rows[0].vortex_room_id){await c.query('ROLLBACK');return NextResponse.json({error:'Sala já vinculada à partida'},{status:409});}
   await c.query("INSERT INTO arena_room_approvals(match_id,approved) VALUES($1,$2) ON CONFLICT(match_id) DO UPDATE SET approved=EXCLUDED.approved,updated_at=now()",[body.matchId,body.approved]);
   await c.query('COMMIT');
   return NextResponse.json({matchId:body.matchId,approved:body.approved,roomCreated:false,providerCalled:false,creditsConsumed:false});
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 }catch{return NextResponse.json({error:'Falha ao atualizar autorização'},{status:503});}
}
