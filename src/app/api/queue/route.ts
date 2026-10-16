import {NextRequest,NextResponse} from 'next/server';
import {createHash,randomUUID} from 'node:crypto';
import {db,ensureSchema} from '../../../lib/db';
export const runtime='nodejs';
export async function POST(req:NextRequest){
 let body:{teamId?:string;queueToken?:string};
 try{body=await req.json();}catch{return NextResponse.json({error:'JSON inválido'},{status:400});}
 if(typeof body.teamId!=='string'||!/^[0-9a-f-]{36}$/i.test(body.teamId)||typeof body.queueToken!=='string'||!/^[0-9a-f]{64}$/i.test(body.queueToken))return NextResponse.json({error:'Credenciais de equipe inválidas'},{status:400});
 try{
  await ensureSchema();
  const c=await db().connect();
  try{
   await c.query('BEGIN');
   const t=await c.query('SELECT id,mode FROM arena_teams WHERE id=$1 AND queue_token_hash=$2',[body.teamId,createHash('sha256').update(body.queueToken).digest('hex')]);
   if(!t.rowCount){await c.query('ROLLBACK');return NextResponse.json({error:'Equipe não autorizada'},{status:403});}
   const mode=t.rows[0].mode;
   await c.query('SELECT pg_advisory_xact_lock(hashtext($1))',[mode]);
   const existing=await c.query('SELECT id,team_a,team_b FROM arena_matches WHERE team_a=$1 OR team_b=$1 LIMIT 1',[body.teamId]);
   if(existing.rowCount){await c.query('COMMIT');return NextResponse.json({status:'ready',matchId:existing.rows[0].id,mode});}
   const queued=await c.query('SELECT q.team_id FROM arena_queue q JOIN arena_teams t ON t.id=q.team_id WHERE q.team_id<>$1 AND q.mode=$2 AND t.queue_token_hash IS NOT NULL ORDER BY q.created_at LIMIT 1',[body.teamId,mode]);
   if(!queued.rowCount){await c.query('INSERT INTO arena_queue(team_id,mode) VALUES($1,$2) ON CONFLICT(team_id) DO NOTHING',[body.teamId,mode]);await c.query('COMMIT');return NextResponse.json({status:'waiting',mode});}
   const opponent=queued.rows[0].team_id;const matchId=randomUUID();
   await c.query('DELETE FROM arena_queue WHERE team_id IN ($1,$2)',[body.teamId,opponent]);
   await c.query('INSERT INTO arena_matches(id,mode,team_a,team_b) VALUES($1,$2,$3,$4)',[matchId,mode,opponent,body.teamId]);
   await c.query('COMMIT');
   return NextResponse.json({status:'ready',mode,matchId,roomCreated:false});
  }catch{await c.query('ROLLBACK');return NextResponse.json({error:'Pareamento indisponível'},{status:503});}
  finally{c.release();}
 }catch{return NextResponse.json({error:'Banco indisponível'},{status:503});}
}
