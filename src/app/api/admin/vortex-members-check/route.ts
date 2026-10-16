import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
import {validateVortexMembers,type Mode} from '../../../../lib/vortex-validation';
export const runtime='nodejs';
function authorized(req:NextRequest){const k=process.env.ADMIN_API_KEY,s=req.headers.get('x-admin-key');if(!k||!s)return false;const a=Buffer.from(k),b=Buffer.from(s);return a.length===b.length&&timingSafeEqual(a,b);}
export async function POST(req:NextRequest){
 if(!authorized(req))return NextResponse.json({error:'Não autorizado'},{status:401});
 const size=Number(req.headers.get('content-length')||0);if(size>16384)return NextResponse.json({error:'Payload muito grande'},{status:413});
 let body:{mode?:string;members?:unknown};try{body=await req.json();}catch{return NextResponse.json({error:'JSON inválido'},{status:400});}
 if(!['1v1','2v2','4v4'].includes(body.mode||''))return NextResponse.json({error:'Modalidade inválida'},{status:400});
 if(!Array.isArray(body.members)||body.members.length>8)return NextResponse.json({error:'Lista inválida ou acima de oito jogadores'},{status:400});
 return NextResponse.json({...validateVortexMembers(body.mode as Mode,body.members),dryRun:true,providerCalled:false,creditsConsumed:false});
}
