const BASE = process.env.VORTEX_BASE_URL || 'https://vortex-ff.com/api';
export type VortexBalance = { user_id?: string; plan_type?: 'credit' | 'infinite'; credit?: {balance:number; total_spent:number}; cost_per_room?:number; rooms_created?:number };
export class VortexError extends Error { constructor(public status:number, message:string){super(message);} }
export async function vortexGet<T>(path:string):Promise<T> {
  const token=process.env.VORTEX_TOKEN;
  if (!token) throw new VortexError(503,'VORTEX_TOKEN not configured');
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),10000);
  try {
    const response=await fetch(`${BASE}${path}`,{headers:{Authorization:`Bearer ${token}`,Accept:'application/json'},cache:'no-store',signal:controller.signal});
    if(!response.ok) throw new VortexError(response.status,`Vortex request failed (${response.status})`);
    const type=response.headers.get('content-type')||'';
    if(!type.includes('application/json')) throw new VortexError(502,'Unexpected non-JSON response from Vortex');
    return await response.json() as T;
  } finally {clearTimeout(timeout);}
}
