import type {Mode} from './match';
export type SimTeam={id:string;mode:Mode;players:string[]};
export type SimMatch={id:string;mode:Mode;teamA:string;teamB:string;status:'ready'};
export function simulateMatchmaking(teams:SimTeam[]){
 const queue:Record<Mode,SimTeam[]>={'1v1':[],'2v2':[],'4v4':[]};
 const seen=new Set<string>();const matchesOut:SimMatch[]=[];const rejectedOut:string[]=[];
 const capacity:Record<Mode,number>={'1v1':1,'2v2':2,'4v4':4};
 for(const t of teams){
  if(!t||typeof t.id!=='string'||!t.id.trim()||seen.has(t.id)||!Object.hasOwn(capacity,t.mode)||!Array.isArray(t.players)||t.players.length!==capacity[t.mode]||t.players.some(p=>typeof p!=='string'||!p.trim())||new Set(t.players.map(p=>p.trim().toLowerCase())).size!==t.players.length){rejectedOut.push(t?.id||'invalid');continue;}
  seen.add(t.id);
  const waiting=queue[t.mode].shift();
  if(waiting)matchesOut.push({id:'sim-'+matchesOut.length,mode:t.mode,teamA:waiting.id,teamB:t.id,status:'ready'});
  else queue[t.mode].push(t);
 }
 return {matches:matchesOut,waiting:Object.values(queue).flat().map(t=>t.id),rejected:rejectedOut,dryRun:true,providerCalled:false,creditsConsumed:false};
}
export type SimResult={matchId:string;winner:'A'|'B'|'draw';scoreA:number;scoreB:number;status:'finished'};
export function simulateResult(matchId:string,scoreA:number,scoreB:number):SimResult{
 if(typeof matchId!=='string'||!matchId.trim()||!Number.isInteger(scoreA)||!Number.isInteger(scoreB)||scoreA<0||scoreB<0||scoreA>100||scoreB>100)throw Error('Resultado inválido');
 return {matchId,winner:scoreA===scoreB?'draw':scoreA>scoreB?'A':'B',scoreA,scoreB,status:'finished'};
}

export type SimStanding={teamId:string;played:number;wins:number;draws:number;losses:number;points:number;scored:number;conceded:number;difference:number};
export function simulateStandings(matches:SimMatch[],results:SimResult[]):SimStanding[]{
 const table=new Map<string,SimStanding>();
 const get=(id:string)=>{let x=table.get(id);if(!x){x={teamId:id,played:0,wins:0,draws:0,losses:0,points:0,scored:0,conceded:0,difference:0};table.set(id,x);}return x;};
 const resultsByMatch=new Map(results.map(r=>[r.matchId,r]));
 for(const m of matches){
  const r=resultsByMatch.get(m.id);if(!r)continue;
  const a=get(m.teamA),b=get(m.teamB);
  a.played++;b.played++;a.scored+=r.scoreA;a.conceded+=r.scoreB;b.scored+=r.scoreB;b.conceded+=r.scoreA;
  if(r.winner==='draw'){a.draws++;b.draws++;a.points++;b.points++;}
  else if(r.winner==='A'){a.wins++;a.points+=3;b.losses++;}
  else{b.wins++;b.points+=3;a.losses++;}
 }
 return [...table.values()].map(t=>({...t,difference:t.scored-t.conceded})).sort((a,b)=>b.points-a.points||b.difference-a.difference||b.scored-a.scored||a.teamId.localeCompare(b.teamId));
}

export function simulationStats(matches:SimMatch[],results:SimResult[]){
 const ids=new Set(matches.map(m=>m.id));const valid=results.filter(r=>ids.has(r.matchId));
 const total=valid.length,draws=valid.filter(r=>r.winner==='draw').length;
 const scored=valid.reduce((sum,r)=>sum+r.scoreA+r.scoreB,0);
 return {totalMatches:matches.length,finished:total,draws,decisive:total-draws,totalPointsScored:scored,averagePointsPerMatch:total?Math.round(scored/total*100)/100:0};
}
