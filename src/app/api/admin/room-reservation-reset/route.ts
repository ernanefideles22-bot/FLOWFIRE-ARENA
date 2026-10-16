import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
import {db,ensureSchema} from '../../../../lib/db';
export const runtime='nodejs';
export async function POST(req:NextRequest){
 const key=process.env.ADMIN_API_KEY,supplied=req.headers.get('x-admin-key');
 if(!key||!supplied)return NextResponse.json({error:'Não autorizado'},{status:401});
 const a=Buffer.from(key),b=Buffer.from(supplied);
 if(a.length!==b.length||!timingSafeEqual(a,b))return NextResponse.json({error:'Não autorizado'},{status:401});
 let body:{matchId?:string;confirm?:string};try{body=await req.json();}catch{return NextResponse.json({error:'JSON inválido'},{status:400});}
 if(!body.matchId||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.matchId)||body.confirm!=='VERIFIED_NO_VORTEX_ROOM_OR_CREDIT_USED')return NextResponse.json({error:'Confirmação de verificação obrigatória'},{status:400});
 try{
  await ensureSchema();const c=await db().connect();
  try{
   await c.query('BEGIN');
   const m=await c.query('SELECT vortex_room_id,vortex_session_id,status FROM arena_matches WHERE id=$1 FOR UPDATE',[body.matchId]);
   if(!m.rowCount||m.rows[0].status!=='ready'||m.rows[0].vortex_room_id||m.rows[0].vortex_session_id){await c.query('ROLLBACK');return NextResponse.json({error:'Partida não elegível para liberação'},{status:409});}
   const r=await c.query("UPDATE arena_room_reservations SET state='reserved',reserved_at=now() WHERE match_id=$1 AND state='uncertain' RETURNING match_id",[body.matchId]);
   if(!r.rowCount){await c.query('ROLLBACK');return NextResponse.json({error:'Reserva não está em revisão'},{status:409});}
   await c.query('COMMIT');return NextResponse.json({status:'reserved',message:'Reserva liberada para uma única nova tentativa de criação Vortex'});
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 }catch{return NextResponse.json({error:'Não foi possível liberar reserva'},{status:503});}
}
