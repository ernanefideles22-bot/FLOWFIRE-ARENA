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
  const c=await db().connect();
  try{
   await c.query('BEGIN');
   const m=await c.query('SELECT id,mode,vortex_room_id FROM arena_matches WHERE id=$1 FOR UPDATE',[body.matchId]);
   if(!m.rowCount){await c.query('ROLLBACK');return NextResponse.json({error:'Partida não encontrada'},{status:404});}
   if(m.rows[0].vortex_room_id){await c.query('ROLLBACK');return NextResponse.json({error:'Sala já existente'},{status:409});}
   await c.query("CREATE TABLE IF NOT EXISTS arena_room_reservations(match_id uuid PRIMARY KEY REFERENCES arena_matches(id),state text NOT NULL CHECK(state IN ('reserved','uncertain','completed')),reserved_at timestamptz NOT NULL DEFAULT now())");
   const approval=await c.query('SELECT approved FROM arena_room_approvals WHERE match_id=$1',[body.matchId]);
   if(!approval.rows[0]?.approved){await c.query('ROLLBACK');return NextResponse.json({error:'Partida não autorizada'},{status:403});}
   const inserted=await c.query("INSERT INTO arena_room_reservations(match_id,state) VALUES($1,'reserved') ON CONFLICT DO NOTHING RETURNING match_id",[body.matchId]);
   if(!inserted.rowCount){await c.query('ROLLBACK');return NextResponse.json({error:'Partida já reservada; nenhuma nova tentativa permitida',duplicatePrevented:true},{status:409});}
   await c.query('COMMIT');
   return NextResponse.json({matchId:body.matchId,reserved:true,state:'reserved',providerCalled:false,creditsConsumed:false,roomCreated:false});
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 }catch{return NextResponse.json({error:'Falha ao reservar partida'},{status:503});}
}
