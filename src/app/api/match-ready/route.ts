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
   const m=await c.query('SELECT team_a,team_b,status,mode,vortex_room_id,vortex_session_id FROM arena_matches WHERE id=$1 FOR UPDATE',[b.matchId]);
   if(!m.rowCount||![m.rows[0].team_a,m.rows[0].team_b].includes(b.teamId)){await c.query('ROLLBACK');return NextResponse.json({error:'Confronto não encontrado'},{status:404});}
   if(m.rows[0].status==='finished'||!m.rows[0].vortex_room_id){await c.query('ROLLBACK');return NextResponse.json({error:'Aguarde a sala Vortex ficar disponível'},{status:409});}
   await c.query('CREATE TABLE IF NOT EXISTS arena_match_ready(match_id uuid PRIMARY KEY REFERENCES arena_matches(id),team_a_ready boolean NOT NULL DEFAULT false,team_b_ready boolean NOT NULL DEFAULT false,updated_at timestamptz NOT NULL DEFAULT now())');
   await c.query('INSERT INTO arena_match_ready(match_id) VALUES($1) ON CONFLICT DO NOTHING',[b.matchId]);
   const col=m.rows[0].team_a===b.teamId?'team_a_ready':'team_b_ready';
   const r=await c.query('UPDATE arena_match_ready SET '+col+'=$2,updated_at=now() WHERE match_id=$1 RETURNING team_a_ready,team_b_ready',[b.matchId,b.ready]);
   const both=r.rows[0].team_a_ready&&r.rows[0].team_b_ready;
   const enabled=process.env.VORTEX_AUTO_START_ENABLED==='true';
   const eligible=both&&enabled&&['1v1','2v2'].includes(m.rows[0].mode)&&Boolean(m.rows[0].vortex_session_id)&&Boolean(process.env.VORTEX_TOKEN);
   let reserved=false;
   if(eligible){
    await c.query('CREATE TABLE IF NOT EXISTS arena_vortex_start_attempts(match_id uuid PRIMARY KEY REFERENCES arena_matches(id),requested_at timestamptz NOT NULL DEFAULT now(),state text NOT NULL)');
    const attempt=await c.query("INSERT INTO arena_vortex_start_attempts(match_id,state) VALUES($1,'uncertain') ON CONFLICT DO NOTHING RETURNING match_id",[b.matchId]);
    reserved=Boolean(attempt.rowCount);
   }
   await c.query('COMMIT');
   if(!reserved)return NextResponse.json({status:both?'both_ready':'waiting',teamAReady:r.rows[0].team_a_ready,teamBReady:r.rows[0].team_b_ready,autoStartEnabled:enabled,startRequested:false});
   const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);
   try{
    const base=process.env.VORTEX_BASE_URL||'https://vortex-ff.com/api';
    const response=await fetch(base+'/rooms/'+encodeURIComponent(m.rows[0].vortex_session_id)+'/start',{method:'POST',headers:{Authorization:'Bearer '+process.env.VORTEX_TOKEN,Accept:'application/json'},cache:'no-store',signal:controller.signal});
    if(!response.ok)return NextResponse.json({status:'start_uncertain',teamAReady:true,teamBReady:true,startRequested:true,providerStatus:response.status,message:'Vortex não confirmou START; não repetir automaticamente'});
    await db().query("UPDATE arena_vortex_start_attempts SET state='confirmed' WHERE match_id=$1",[b.matchId]);
    return NextResponse.json({status:'start_confirmed',teamAReady:true,teamBReady:true,startRequested:true});
   }catch{return NextResponse.json({status:'start_uncertain',teamAReady:true,teamBReady:true,startRequested:true,message:'START incerto; verifique na Vortex antes de repetir'});}finally{clearTimeout(timer);}

  }catch{await c.query('ROLLBACK');return NextResponse.json({error:'Confirmação indisponível'},{status:503});}finally{c.release();}
 }catch{return NextResponse.json({error:'Banco indisponível'},{status:503});}
}
