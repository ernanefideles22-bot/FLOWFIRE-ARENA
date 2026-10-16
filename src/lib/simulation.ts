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
