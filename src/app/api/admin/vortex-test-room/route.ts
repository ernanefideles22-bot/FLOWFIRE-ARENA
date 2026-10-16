import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
import {db,ensureSchema} from '../../../../lib/db';
export const runtime='nodejs';
function authorized(req:NextRequest){const k=process.env.ADMIN_API_KEY,s=req.headers.get('x-admin-key');if(!k||!s)return false;const a=Buffer.from(k),b=Buffer.from(s);return a.length===b.length&&timingSafeEqual(a,b);}
export async function POST(req:NextRequest){
 if(!authorized(req))return NextResponse.json({error:'Unauthorized'},{status:401});
 let body:{confirm?:string};try{body=await req.json();}catch{return NextResponse.json({error:'Invalid JSON'},{status:400});}
 if(body.confirm!=='CREATE_ONE_CREDITED_TEST_ROOM')return NextResponse.json({error:'Explicit confirmation required'},{status:400});
 if(!process.env.VORTEX_TOKEN)return NextResponse.json({error:'Vortex not configured'},{status:503});
 await ensureSchema();
 const c=await db().connect();
 try{
  await c.query("CREATE TABLE IF NOT EXISTS arena_vortex_test_runs (id text PRIMARY KEY, state text NOT NULL, session_id text, room_id text, password text, created_at timestamptz NOT NULL DEFAULT now())");
  const reserve=await c.query("INSERT INTO arena_vortex_test_runs(id,state) VALUES('first-1v1','requested') ON CONFLICT DO NOTHING RETURNING id");
  if(!reserve.rowCount)return NextResponse.json({error:'Test already requested; do not retry automatically. Inspect provider dashboard and database before another attempt.'},{status:409});
 }finally{c.release();}
 const base=process.env.VORTEX_BASE_URL||'https://vortex-ff.com/api';
 const password=String(Math.floor(100000+Math.random()*900000));
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
 try{
  const res=await fetch(base+'/rooms',{method:'POST',headers:{Authorization:'Bearer '+process.env.VORTEX_TOKEN,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({password,start_delay_minutes:10,config_type:'ap_padrao',room_name:'FLOWFIRE TESTE 1X1',map_name:'Bermuda'}),cache:'no-store',signal:controller.signal});
  const raw=await res.text();let data:Record<string,unknown>={};try{data=JSON.parse(raw);}catch{}
  if(!res.ok){await db().query("UPDATE arena_vortex_test_runs SET state='provider_error' WHERE id='first-1v1'");return NextResponse.json({error:'Provider rejected request',provider_status:res.status},{status:502});}
  const session=typeof data.session_id==='string'?data.session_id:null;
  const room=typeof data.room_id==='string'||typeof data.room_id==='number'?String(data.room_id):null;
  const returnedPassword=typeof data.password==='string'?data.password:password;
  await db().query("UPDATE arena_vortex_test_runs SET state='created',session_id=$1,room_id=$2,password=$3 WHERE id='first-1v1'",[session,room,returnedPassword]);
  return NextResponse.json({status:'created',session_id:session,room_id:room,password:returnedPassword,expires_at:data.expires_at??null,mode:'AP',format_1v1:'not_yet_verified'});
 }catch{
  await db().query("UPDATE arena_vortex_test_runs SET state='uncertain' WHERE id='first-1v1'");
  return NextResponse.json({error:'Provider response uncertain. Do not retry; inspect provider dashboard.'},{status:502});
 }finally{clearTimeout(timeout);}
}
