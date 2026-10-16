import {NextRequest,NextResponse} from 'next/server';
import {createHash} from 'node:crypto';
import {db,ensureSchema} from '../../../lib/db';
export const runtime='nodejs';
export async function POST(req:NextRequest){
 let b:{teamId?:string;queueToken?:string;matchId?:string;ready?:boolean};
 try{b=await req.json();}catch{return NextResponse.json({error:'JSON inválido'},{status:400});}
 if(typeof b.teamId!=='string'||!/^[0-9a-f-]{36}$/i.test(b.teamId)||typeof b.matchId!=='string'||!/^[0-9a-f-]{36}$/i.test(b.matchId)||typeof b.queueToken!=='string'||!/^[0-9a-f]{64}$/i.test(b.queueToken)||typeof b.ready!=='boolean')return NextResponse.json({error:'Dados inválidos'},{status:400});
 try{
  await ensureSchema();const c=await db().connect();
  try{
   await c.query('BEGIN');
   const t=await c.query('SELECT id FROM arena_teams WHERE id=$1 AND queue_token_hash=$2',[b.teamId,createHash('sha256').update(b.queueToken).digest('hex')]);
   if(!t.rowCount){await c.query('ROLLBACK');return NextResponse.json({error:'Equipe não autorizada'},{status:403});}
   const m=await c.query('SELECT team_a,team_b,status,vortex_room_id FROM arena_matches WHERE id=$1 FOR UPDATE',[b.matchId]);
   if(!m.rowCount||![m.rows[0].team_a,m.rows[0].team_b].includes(b.teamId)){await c.query('ROLLBACK');return NextResponse.json({error:'Confronto não encontrado'},{status:404});}
   if(m.rows[0].status==='finished'||!m.rows[0].vortex_room_id){await c.query('ROLLBACK');return NextResponse.json({error:'Aguarde a sala Vortex ficar disponível'},{status:409});}
   await c.query('CREATE TABLE IF NOT EXISTS arena_match_ready(match_id uuid PRIMARY KEY REFERENCES arena_matches(id),team_a_ready boolean NOT NULL DEFAULT false,team_b_ready boolean NOT NULL DEFAULT false,updated_at timestamptz NOT NULL DEFAULT now())');
   await c.query('INSERT INTO arena_match_ready(match_id) VALUES($1) ON CONFLICT DO NOTHING',[b.matchId]);
   const col=m.rows[0].team_a===b.teamId?'team_a_ready':'team_b_ready';
   const r=await c.query('UPDATE arena_match_ready SET '+col+'=$2,updated_at=now() WHERE match_id=$1 RETURNING team_a_ready,team_b_ready',[b.matchId,b.ready]);
   await c.query('COMMIT');
   return NextResponse.json({status:r.rows[0].team_a_ready&&r.rows[0].team_b_ready?'both_ready':'waiting',teamAReady:r.rows[0].team_a_ready,teamBReady:r.rows[0].team_b_ready,autoStartEnabled:false});
  }catch{await c.query('ROLLBACK');return NextResponse.json({error:'Confirmação indisponível'},{status:503});}finally{c.release();}
 }catch{return NextResponse.json({error:'Banco indisponível'},{status:503});}
}
