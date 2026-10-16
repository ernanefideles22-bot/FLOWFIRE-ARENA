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
   // Preserve visible Free Fire symbols: deleting them can turn different players into the same nickname.
   const normalize=(s:string)=>s.normalize('NFKC').trim().toLocaleLowerCase('und').replace(/\\s+/gu,' ');
   // Some providers omit zero-width formatting marks. Ignore only those marks, never visible symbols.
   const comparable=(s:string)=>normalize(s).replace(/[\\u200B-\\u200D\\u2060\\uFEFF]/gu,'');
   const roster=(value:unknown):string[]=>Array.isArray(value)?value.filter((p):p is string=>typeof p==='string').map(normalize):[];
   const a=roster(m.rows[0].players_a),b=roster(m.rows[0].players_b);
   const mapping=teams.map(t=>({number:t.team,names:Array.isArray(t.players)?(t.players as Record<string,unknown>[]).map(p=>typeof p.nickname==='string'?normalize(p.nickname):''):[]}));
   const allRegistered=[...a,...b];
   const observed=mapping.flatMap(t=>t.names);
   const validNames=(names:string[])=>names.every(Boolean)&&new Set(names.map(comparable)).size===names.length;
   const uniqueRegistration=validNames(allRegistered);
   const uniqueObserved=validNames(observed);
   const matches=(registered:string[],observedNames:string[])=>registered.some(name=>observedNames.some(n=>comparable(n)===comparable(name)));
   const teamA=mapping.filter(t=>matches(a,t.names)&&!matches(b,t.names));
   const teamB=mapping.filter(t=>matches(b,t.names)&&!matches(a,t.names));
   const finished=typeof result.finished_at==='string'&&!Number.isNaN(Date.parse(result.finished_at));
   const winnerTeams=teams.filter(t=>t.is_winner===true);
   const providerWinner=winnerTeams.length===1&&winnerTeams[0].team===result.winner_team?winnerTeams[0]:null;
   // One exclusive exact nickname is sufficient, provided the other Vortex team
   // does not contain a conflicting nickname registered to the opposite roster.
   const winningA=providerWinner!==null&&matches(a,Array.isArray(providerWinner.players)?(providerWinner.players as Record<string,unknown>[]).map(p=>typeof p.nickname==='string'?normalize(p.nickname):''):[])&&!matches(b,Array.isArray(providerWinner.players)?(providerWinner.players as Record<string,unknown>[]).map(p=>typeof p.nickname==='string'?normalize(p.nickname):''):[]);
   const winningB=providerWinner!==null&&matches(b,Array.isArray(providerWinner.players)?(providerWinner.players as Record<string,unknown>[]).map(p=>typeof p.nickname==='string'?normalize(p.nickname):''):[])&&!matches(a,Array.isArray(providerWinner.players)?(providerWinner.players as Record<string,unknown>[]).map(p=>typeof p.nickname==='string'?normalize(p.nickname):''):[]);
   const losingTeam=mapping.find(t=>t.number!==result.winner_team);
   const conflict=!!losingTeam&&((winningA&&matches(a,losingTeam.names))||(winningB&&matches(b,losingTeam.names)));
   const valid=finished&&uniqueRegistration&&uniqueObserved&&mapping.length===2&&providerWinner!==null&&!conflict&&
      ((winningA&&!winningB&&teamA.length===1&&teamA[0].number===result.winner_team)||
       (winningB&&!winningA&&teamB.length===1&&teamB[0].number===result.winner_team));
   if(!valid)return NextResponse.json({matchId:body.matchId,providerResponse:data,recorded:false,winnerVerified:false,reason:'Nenhum nick exclusivo do vencedor ou identificação contraditória; exige conferência manual'});
   const winner=winningA?'team_a':'team_b';
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
