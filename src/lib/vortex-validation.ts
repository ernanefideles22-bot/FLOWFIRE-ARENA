export type Mode='1v1'|'2v2'|'4v4';
export type VortexMember={team:unknown;slot:unknown;uid?:unknown;player_id?:unknown;id?:unknown};
export type Validation={valid:boolean;expectedPerTeam:number;observedPerTeam:[number,number];unknownSlots:number[];duplicateSlots:number[];reason:string;identityVerified:false};
export function validateVortexMembers(mode:Mode,members:unknown):Validation{
 const expected={'1v1':1,'2v2':2,'4v4':4}[mode];
 const fail=(reason:string,counts:[number,number]=[0,0],unknownSlots:number[]=[],duplicateSlots:number[]=[]):Validation=>({valid:false,expectedPerTeam:expected,observedPerTeam:counts,unknownSlots,duplicateSlots,reason,identityVerified:false});
 if(!Array.isArray(members))return fail('Lista de jogadores inválida');
 const counts:[number,number]=[0,0],seen=new Set<number>(),unknown:number[]=[],duplicates:number[]=[];const teamLabels:[Set<string>,Set<string>]=[new Set(),new Set()];
 for(const member of members as VortexMember[]){
  if(!member||typeof member!=='object')return fail('Jogador inválido',counts);
  const slot=Number(member.slot);
  if(!Number.isInteger(slot)||slot<1||slot>8)return fail('Slot fora do intervalo 1–8',counts);
  if(seen.has(slot))duplicates.push(slot);else seen.add(slot);
  // Slots 1–4 correspondem à equipe A; 5–8 à equipe B. Confirmar mapeamento com provedor.
  const index=slot<=4?0:1;counts[index]++;
  if(member.team!==undefined&&member.team!==null){const team=String(member.team).toLowerCase();if(!['1','2','a','b','team1','team2','team_a','team_b'].includes(team))unknown.push(slot);else teamLabels[index].add(team);}
 }
 if(duplicates.length)return fail('Slots duplicados',counts,unknown,duplicates);
 if(unknown.length)return fail('Identificador de equipe desconhecido',counts,unknown);
 if([...teamLabels[0]].some(label=>teamLabels[1].has(label)))return fail('Mesmo identificador de equipe em ambos os lados',counts);
 if(teamLabels[0].size>1||teamLabels[1].size>1)return fail('Identificadores de equipe inconsistentes',counts);
 if(counts[0]!==expected||counts[1]!==expected)return fail('Quantidade de jogadores incompatível com a modalidade',counts);
 return {valid:true,expectedPerTeam:expected,observedPerTeam:counts,unknownSlots:[],duplicateSlots:[],reason:'Contagem de slots compatível; identidade e atribuição de equipes ainda não homologadas',identityVerified:false};
}
