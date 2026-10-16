import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
import {db,ensureSchema} from '../../../../lib/db';
import {POST as checkResult} from '../../admin/vortex-match-result/route';
export const runtime='nodejs';
export const dynamic='force-dynamic';
function authorized(req:NextRequest){
 const expected=process.env.RESULT_POLL_KEY;
 const supplied=req.headers.get('authorization')?.replace(/^Bearer /i,'');
 if(!expected||!supplied)return false;
 const a=Buffer.from(expected),b=Buffer.from(supplied);
 return a.length===b.length&&timingSafeEqual(a,b);
}
export async function GET(req:NextRequest){
 if(!authorized(req))return NextResponse.json({error:'Não autorizado'},{status:401});
 if(!process.env.ADMIN_API_KEY)return NextResponse.json({error:'Admin não configurado'},{status:503});
 try{
  await ensureSchema();
  const pending=await db().query(`SELECT id FROM arena_matches WHERE status <> 'finished' AND vortex_session_id IS NOT NULL AND vortex_room_id IS NOT NULL ORDER BY created_at ASC LIMIT 10`);
  const outcomes=[];
  for(const row of pending.rows){
   const request=new NextRequest(new URL('/api/admin/vortex-match-result',req.url),{
    method:'POST',
    headers:{'content-type':'application/json','x-admin-key':process.env.ADMIN_API_KEY},
    body:JSON.stringify({matchId:row.id})
   });
   const response=await checkResult(request);
   const result=await response.json();
   outcomes.push({matchId:row.id,httpStatus:response.status,recorded:result.recorded===true,alreadyRecorded:result.alreadyRecorded===true,reason:result.reason||result.error||null});
  }
  return NextResponse.json({checked:outcomes.length,results:outcomes});
 }catch{return NextResponse.json({error:'Falha na consulta periódica'},{status:503});}
}
