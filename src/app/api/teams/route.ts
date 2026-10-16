import {NextRequest,NextResponse} from 'next/server';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {db,ensureSchema} from '../../../lib/db';
import {capacity,validateTeam,type Mode} from '../../../lib/match';
export const runtime='nodejs';
export async function POST(req:NextRequest){
 const length=Number(req.headers.get('content-length')||0);if(length>4096)return NextResponse.json({error:'Payload muito grande'},{status:413});
 try{
  const body=await req.json();const mode=body.mode as Mode;
  if(!Object.prototype.hasOwnProperty.call(capacity,mode))return NextResponse.json({error:'Modalidade inválida'},{status:400});
  if(!body.team||typeof body.team!=='object'||typeof body.team.name!=='string'||typeof body.team.captain!=='string'||!Array.isArray(body.team.players)||body.team.players.some((x:unknown)=>typeof x!=='string'))return NextResponse.json({error:'Dados inválidos'},{status:400});
  const team=validateTeam(mode,body.team);
  if([team.name,team.captain,...team.players].some(x=>x.length>64))return NextResponse.json({error:'Máximo de 64 caracteres por campo'},{status:400});
  await ensureSchema();
  const id=randomUUID();const queueToken=randomBytes(32).toString('hex');const tokenHash=createHash('sha256').update(queueToken).digest('hex');await db().query('INSERT INTO arena_teams(id,mode,name,captain,players,queue_token_hash) VALUES($1,$2,$3,$4,$5::jsonb,$6)',[id,mode,team.name,team.captain,JSON.stringify(team.players),tokenHash]);
  return NextResponse.json({teamId:id,queueToken,mode,status:'registered',message:'Equipe cadastrada. Pareamento ainda não habilitado para usuários.'},{status:201});
 }catch(e){if(e instanceof SyntaxError)return NextResponse.json({error:'JSON inválido'},{status:400});if(e instanceof Error&&/Informe|inválidos|repetidos/.test(e.message))return NextResponse.json({error:e.message},{status:400});return NextResponse.json({error:'Não foi possível cadastrar a equipe'},{status:503});}
}
