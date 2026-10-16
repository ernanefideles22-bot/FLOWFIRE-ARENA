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
  const m=await db().query('SELECT m.vortex_session_id,m.vortex_room_id,m.status,a.players AS players_a,b.players AS players_b FROM arena_matches m JOIN arena_teams a ON a.id=m.team_a JOIN arena_teams b ON b.id=m.team_b WHERE m.id=$1',[body.matchId]);
  if(!m.rowCount||!m.rows[0].vortex_session_id||!m.rows[0].vortex_room_id)return NextResponse.json({error:'Sessão Vortex não encontrada'},{status:404});
  if(!process.env.VORTEX_TOKEN)return NextResponse.json({error:'Vortex não configurada'},{status:503});
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000);
  try{
   const base=process.env.VORTEX_BASE_URL||'https://vortex-ff.com/api';
   const res=await fetch(base+'/rooms/'+encodeURIComponent(m.rows[0].vortex_session_id)+'/result',{headers:{Authorization:'Bearer '+process.env.VORTEX_TOKEN,Accept:'application/json'},cache:'no-store',signal:controller.signal});
   const raw=await res.text();let data:unknown;try{data=JSON.parse(raw);}catch{return NextResponse.json({error:'Resposta Vortex não é JSON',providerStatus:res.status},{status:502});}
   if(!res.ok)return NextResponse.json({error:'Resultado ainda indisponível ou recusado pela Vortex',providerStatus:res.status,providerResponse:data},{status:res.status===404?404:502});
   const result=data as Record<string,unknown>;
   const teams=Array.isArray(result.teams)?result.teams as Record<string,unknown>[]:[];
   const normalize=(s:string)=>s.normalize('NFKC').trim().toLowerCase().replace(/[^a-z0-9]/g,'');
   const roster=(value:unknown):string[]=>Array.isArray(value)?value.filter((p):p is string=>typeof p==='string').map(normalize):[];
   const a=roster(m.rows[0].players_a),b=roster(m.rows[0].players_b);
   const mapping=teams.map(t=>({number:t.team,names:Array.isArray(t.players)?(t.players as Record<string,unknown>[]).map(p=>typeof p.nickname==='string'?normalize(p.nickname):''):[]}));
   // Each observed nickname must uniquely identify one registered team, never both.
   const allRegistered=[...a,...b].filter(Boolean);
   const uniqueRegistration=new Set(allRegistered).size===allRegistered.length;
   const observed=mapping.flatMap(t=>t.names).filter(Boolean);
   const uniqueObserved=new Set(observed).size===observed.length;
   const matches=(registered:string[],observedNames:string[])=>registered.some(name=>name.length>0&&observedNames.includes(name));
   const teamA=mapping.filter(t=>matches(a,t.names)&&!matches(b,t.names));
   const teamB=mapping.filter(t=>matches(b,t.names)&&!matches(a,t.names));
   const unambiguous=uniqueRegistration&&uniqueObserved&&mapping.length===2&&teamA.length===1&&teamB.length===1&&teamA[0].number!==teamB[0].number;
   const finished=typeof result.finished_at==='string'&&!Number.isNaN(Date.parse(result.finished_at));
   const valid=finished&&unambiguous&&
     (result.winner_team===teamA[0].number||result.winner_team===teamB[0].number)&&
     teams.filter(t=>t.is_winner===true).length===1&&teams.some(t=>t.team===result.winner_team&&t.is_winner===true);
   if(!valid)return NextResponse.json({matchId:body.matchId,providerResponse:data,recorded:false,winnerVerified:false,reason:'Identidade das duas equipes ou vencedor não verificados; exige conferência manual'});
   const winner=result.winner_team===teamA[0].number?'team_a':'team_b';
   const c=await db().connect();
   try{
     await c.query('BEGIN');
     const locked=await c.query('SELECT status,vortex_session_id FROM arena_matches WHERE id=$1 FOR UPDATE',[body.matchId]);
     if(locked.rows[0]?.vortex_session_id!==m.rows[0].vortex_session_id)throw Error('Sessão alterada');
     if(locked.rows[0].status==='finished'){await c.query('COMMIT');return NextResponse.json({matchId:body.matchId,status:'finished',alreadyRecorded:true,winnerVerified:true,winner});}
     await c.query("UPDATE arena_matches SET status='finished',vortex_result=$2::jsonb WHERE id=$1",[body.matchId,JSON.stringify({source:'vortex_verified',winner,providerWinnerTeam:result.winner_team,providerResult:data,verifiedAt:new Date().toISOString()})]);
     await c.query('COMMIT');
     return NextResponse.json({matchId:body.matchId,status:'finished',recorded:true,winnerVerified:true,winner,providerResponse:data});
   }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}

  }finally{clearTimeout(timeout);}
 }catch{return NextResponse.json({error:'Falha na consulta ao resultado; nenhuma alteração feita'},{status:503});}
}
