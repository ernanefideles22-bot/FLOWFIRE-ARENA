import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
import {simulateMatchmaking,simulateResult,simulateStandings,type SimTeam} from '../../../../lib/simulation';
export const runtime='nodejs';
function authorized(req:NextRequest){const k=process.env.ADMIN_API_KEY,s=req.headers.get('x-admin-key');if(!k||!s)return false;const a=Buffer.from(k),b=Buffer.from(s);return a.length===b.length&&timingSafeEqual(a,b);}
export async function POST(req:NextRequest){
 if(!authorized(req))return NextResponse.json({error:'Não autorizado'},{status:401});
 if(Number(req.headers.get('content-length')||0)>16384)return NextResponse.json({error:'Dados muito grandes'},{status:413});
 let body:{teams?:SimTeam[];scores?:{scoreA:number;scoreB:number}[]};try{body=await req.json();}catch{return NextResponse.json({error:'JSON inválido'},{status:400});}
 if(!Array.isArray(body.teams)||body.teams.length>40||!Array.isArray(body.scores)||body.scores.length>20)return NextResponse.json({error:'Limites da simulação excedidos'},{status:400});
 try{
  const result=simulateMatchmaking(body.teams);
  const results=result.matches.map((m,i)=>simulateResult(m.id,body.scores?.[i]?.scoreA??0,body.scores?.[i]?.scoreB??0));
  return NextResponse.json({...result,results,standings:simulateStandings(result.matches,results),simulated:true,databaseWritten:false});
 }catch{return NextResponse.json({error:'Placares inválidos'},{status:400});}
}
