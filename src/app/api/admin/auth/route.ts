import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
import {createAdminSession,validAdminSession} from '../../../../lib/admin-session';
export const runtime='nodejs';
const cookieName='flowfire_admin_session';
export async function GET(req:NextRequest){const secret=process.env.ADMIN_API_KEY||'';return NextResponse.json({authenticated:await validAdminSession(req.cookies.get(cookieName)?.value,secret)},{headers:{'Cache-Control':'no-store'}});}
export async function POST(req:NextRequest){
 let body:{username?:string;password?:string};try{body=await req.json();}catch{return NextResponse.json({error:'Dados inválidos'},{status:400});}
 const secret=process.env.ADMIN_API_KEY||'',input=body.password||'';
 const a=Buffer.from(secret),b=Buffer.from(input);
 if(!secret||body.username?.trim().toLowerCase()!=='admin'||a.length!==b.length||!timingSafeEqual(a,b))return NextResponse.json({error:'Usuário ou senha incorretos'},{status:401});
 const res=NextResponse.json({authenticated:true});res.cookies.set(cookieName,await createAdminSession(secret),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:43200});return res;
}
export async function DELETE(){const res=NextResponse.json({authenticated:false});res.cookies.set(cookieName,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:0});return res;}
