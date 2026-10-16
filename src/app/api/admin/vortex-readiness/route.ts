import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
import {db,ensureSchema} from '../../../../lib/db';
import {vortexGet,type VortexBalance} from '../../../../lib/vortex';
export const runtime='nodejs';
function authorized(req:NextRequest){const key=process.env.ADMIN_API_KEY;const supplied=req.headers.get('x-admin-key');if(!key||!supplied)return false;const a=Buffer.from(key),b=Buffer.from(supplied);return a.length===b.length&&timingSafeEqual(a,b);}
export async function GET(req:NextRequest){
 if(!authorized(req))return NextResponse.json({error:'Unauthorized'},{status:401});
 let database=false,vortex=false,plan_type:string|null=null,credit_balance:number|null=null,cost_per_room:number|null=null;
 try{await ensureSchema();await db().query('SELECT 1');database=true;}catch{}
 try{const b=await vortexGet<VortexBalance>('/balance');vortex=true;plan_type=b.plan_type??null;credit_balance=b.credit?.balance??null;cost_per_room=b.cost_per_room??null;}catch{}
 return NextResponse.json({database_connected:database,vortex_connected:vortex,plan_type,credit_balance,cost_per_room,room_creation_enabled:false,mode_compatibility:{'1v1':'unverified','2v2':'unverified','4v4':'unverified'},next_step:'Verify Vortex room configuration modes in official provider documentation or controlled sandbox test'});
}
