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
  const m=await db().query('SELECT vortex_session_id,vortex_room_id,status FROM arena_matches WHERE id=$1',[body.matchId]);
  if(!m.rowCount||!m.rows[0].vortex_session_id||!m.rows[0].vortex_room_id)return NextResponse.json({error:'Sessão Vortex não encontrada'},{status:404});
  if(!process.env.VORTEX_TOKEN)return NextResponse.json({error:'Vortex não configurada'},{status:503});
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000);
  try{
   const base=process.env.VORTEX_BASE_URL||'https://vortex-ff.com/api';
   const res=await fetch(base+'/rooms/'+encodeURIComponent(m.rows[0].vortex_session_id)+'/result',{headers:{Authorization:'Bearer '+process.env.VORTEX_TOKEN,Accept:'application/json'},cache:'no-store',signal:controller.signal});
   const raw=await res.text();let data:unknown;try{data=JSON.parse(raw);}catch{return NextResponse.json({error:'Resposta Vortex não é JSON',providerStatus:res.status},{status:502});}
   if(!res.ok)return NextResponse.json({error:'Resultado ainda indisponível ou recusado pela Vortex',providerStatus:res.status,providerResponse:data},{status:res.status===404?404:502});
   // Provider response shape and player/team identity are not yet validated: never declare a winner automatically.
   return NextResponse.json({matchId:body.matchId,providerResponse:data,recorded:false,winnerVerified:false,reason:'Conferir campos e identidade dos jogadores antes de gravar o resultado'});
  }finally{clearTimeout(timeout);}
 }catch{return NextResponse.json({error:'Falha na consulta ao resultado; nenhuma alteração feita'},{status:503});}
}
