import {NextRequest,NextResponse} from 'next/server';
import {createHash} from 'node:crypto';
import {db,ensureSchema} from '../../../../lib/db';
export const runtime='nodejs';
export async function POST(req:NextRequest){
 let body:{teamId?:string;queueToken?:string};
 try{body=await req.json();}catch{return NextResponse.json({error:'JSON inválido'},{status:400});}
 if(typeof body.teamId!=='string'||!/^[0-9a-f-]{36}$/i.test(body.teamId)||typeof body.queueToken!=='string'||!/^[0-9a-f]{64}$/i.test(body.queueToken))return NextResponse.json({error:'Credenciais inválidas'},{status:400});
 try{
  await ensureSchema();const c=await db().connect();
  try{
   await c.query('BEGIN');
   const t=await c.query('SELECT mode FROM arena_teams WHERE id=$1 AND queue_token_hash=$2',[body.teamId,createHash('sha256').update(body.queueToken).digest('hex')]);
   if(!t.rowCount){await c.query('ROLLBACK');return NextResponse.json({error:'Equipe não autorizada'},{status:403});}
   await c.query('SELECT pg_advisory_xact_lock(hashtext($1))',[t.rows[0].mode]);
   const matched=await c.query('SELECT 1 FROM arena_matches WHERE (team_a=$1 OR team_b=$1) AND status<>$2 LIMIT 1',[body.teamId,'finished']);
   if(matched.rowCount){await c.query('COMMIT');return NextResponse.json({status:'matched',cancelled:false});}
   const removed=await c.query('DELETE FROM arena_queue WHERE team_id=$1 RETURNING team_id',[body.teamId]);
   await c.query('COMMIT');return NextResponse.json({status:'not_queued',cancelled:Boolean(removed.rowCount)});
  }catch{await c.query('ROLLBACK');return NextResponse.json({error:'Cancelamento indisponível'},{status:503});}
  finally{c.release();}
 }catch{return NextResponse.json({error:'Banco indisponível'},{status:503});}
}
