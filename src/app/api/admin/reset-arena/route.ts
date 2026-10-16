import {NextRequest,NextResponse} from 'next/server';
import {randomUUID,timingSafeEqual} from 'node:crypto';
import {db,ensureSchema} from '../../../../lib/db';
export const runtime='nodejs';
const tables=['arena_match_cancellations','arena_vortex_start_attempts','arena_match_ready','arena_room_reservations','arena_room_approvals','arena_queue','arena_matches','arena_teams'];
function auth(req:NextRequest){const a=process.env.ADMIN_API_KEY,b=req.headers.get('x-admin-key');if(!a||!b)return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
export async function POST(req:NextRequest){
 if(!auth(req))return NextResponse.json({error:'Acesso negado'},{status:401});
 const body=await req.json().catch(()=>null);
 if(body?.confirm!=='BACKUP_AND_RESET_ARENA')return NextResponse.json({error:'Confirmação inválida'},{status:400});
 try{
  await ensureSchema();
  const client=await db().connect();const id=randomUUID();
  try{
   await client.query('BEGIN');
   await client.query('SELECT pg_advisory_xact_lock(20261016,1)');
   await client.query('CREATE TABLE IF NOT EXISTS arena_reset_backups(id uuid PRIMARY KEY,created_at timestamptz NOT NULL DEFAULT now(),snapshot jsonb NOT NULL,counts jsonb NOT NULL)');
   const snapshot:Record<string,unknown[]>={},counts:Record<string,number>={};
   for(const table of tables){
    const exists=await client.query('SELECT to_regclass($1) AS table_name',[table]);
    if(!exists.rows[0].table_name)continue;
    const rows=await client.query('SELECT * FROM '+table);
    snapshot[table]=rows.rows;counts[table]=rows.rowCount??0;
   }
   await client.query('INSERT INTO arena_reset_backups(id,snapshot,counts) VALUES($1,$2::jsonb,$3::jsonb)',[id,JSON.stringify(snapshot),JSON.stringify(counts)]);
   await client.query('COMMIT');
   const sessions=(snapshot.arena_matches||[]).map((m:any)=>m.vortex_session_id).filter((v:unknown):v is string=>typeof v==='string'&&v.length>0);
   if(sessions.length){
    if(!process.env.VORTEX_TOKEN)return NextResponse.json({error:'Backup interno salvo, mas Vortex não configurada; nenhuma exclusão feita',backupId:id,counts},{status:409});
    const base=process.env.VORTEX_BASE_URL||'https://vortex-ff.com/api';
    for(const session of [...new Set(sessions)]){
     const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
     try{
      const r=await fetch(base+'/rooms/'+encodeURIComponent(session)+'/release',{method:'POST',headers:{Authorization:'Bearer '+process.env.VORTEX_TOKEN,Accept:'application/json'},signal:controller.signal,cache:'no-store'});
      if(!r.ok){console.error('Arena reset release rejected',{backupId:id,sessionId:session,providerStatus:r.status});return NextResponse.json({error:'Vortex não confirmou liberação de todas as salas; banco preservado',backupId:id,providerStatus:r.status,failedSession:session},{status:409});}
     }catch(e){console.error('Arena reset release uncertain',{backupId:id,sessionId:session,error:e instanceof Error?e.name:'unknown'});return NextResponse.json({error:'Liberação incerta na Vortex; banco preservado',backupId:id,failedSession:session},{status:409});}finally{clearTimeout(timer);}
    }
   }
   await client.query('BEGIN');
   await client.query('SELECT pg_advisory_xact_lock(20261016,1)');
   const current=await client.query('SELECT id,team_a,team_b,vortex_session_id FROM arena_matches ORDER BY id');
   const old=(snapshot.arena_matches||[]) as any[];
   if(current.rows.length!==old.length||current.rows.some((m:any,i:number)=>m.id!==[...old].sort((a,b)=>a.id.localeCompare(b.id))[i]?.id)){
    await client.query('ROLLBACK');return NextResponse.json({error:'Confrontos alterados durante liberação; backup preservado, limpeza bloqueada',backupId:id},{status:409});
   }
   for(const table of tables){
    if(snapshot[table])await client.query('DELETE FROM '+table);
   }
   await client.query('COMMIT');
   return NextResponse.json({status:'reset',backupId:id,counts,roomsReleased:sessions.length,backupType:'internal_postgresql_snapshot'});
  }catch(e){await client.query('ROLLBACK').catch(()=>{});return NextResponse.json({error:'Limpeza não concluída. Nenhum sucesso confirmado.',details:e instanceof Error?e.message:'erro'},{status:503});}finally{client.release();}
 }catch{return NextResponse.json({error:'Banco indisponível'},{status:503});}
}
