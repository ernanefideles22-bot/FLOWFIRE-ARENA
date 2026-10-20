import {NextRequest,NextResponse} from 'next/server';
import {validAdminSession} from './lib/admin-session';
export async function middleware(req:NextRequest){
 const secret=process.env.ADMIN_API_KEY||'';
 if(!await validAdminSession(req.cookies.get('flowfire_admin_session')?.value,secret))return NextResponse.next();
 const headers=new Headers(req.headers);
 headers.set('x-admin-key',secret);
 return NextResponse.next({request:{headers}});
}
export const config={matcher:['/api/admin/:path*']};
