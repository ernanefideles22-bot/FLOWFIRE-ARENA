import {NextResponse} from 'next/server';
export function GET(){return NextResponse.json({service:'flowfire-arena',status:'ok',mode:'test',payments_enabled:false});}
