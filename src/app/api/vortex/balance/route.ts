import { NextRequest,NextResponse } from 'next/server';
import { vortexGet,VortexError,VortexBalance } from '../../../../lib/vortex';
export const runtime='nodejs';
export async function GET(request:NextRequest){
  const key=process.env.ADMIN_API_KEY;
  if(!key) return NextResponse.json({error:'Admin access not configured'},{status:503});
  if(request.headers.get('x-admin-key')!==key) return NextResponse.json({error:'Unauthorized'},{status:401});
  try {
    const data=await vortexGet<VortexBalance>('/balance');
    return NextResponse.json({connected:true,plan_type:data.plan_type,credit_balance:data.credit?.balance,cost_per_room:data.cost_per_room});
  }catch(error){return NextResponse.json({connected:false,error:error instanceof VortexError?error.message:'Vortex unavailable'},{status:502});}
}
