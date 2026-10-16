export type Mode='1v1'|'2v2'|'4v4';
export type Team={name:string;captain:string;players:string[]};
export type Match={id:string;mode:Mode;status:'waiting'|'ready'|'room_created'|'playing'|'finished';teamA:Team;teamB?:Team;createdAt:string};
export const capacity:Record<Mode,number>={'1v1':1,'2v2':2,'4v4':4};
export function validateTeam(mode:Mode,team:Team){const n=capacity[mode];if(!team.name.trim()||!team.captain.trim())throw Error('Informe equipe e capitão');if(team.players.length!==n)throw Error('Informe exatamente '+n+' jogador(es)');const ids=team.players.map(x=>x.trim()).filter(Boolean);if(ids.length!==n||new Set(ids.map(x=>x.toLowerCase())).size!==n)throw Error('Jogadores inválidos ou repetidos');return {...team,name:team.name.trim(),captain:team.captain.trim(),players:ids};}
