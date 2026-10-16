import {NextRequest,NextResponse} from 'next/server';
import {createHash} from 'node:crypto';
import {db} from '../../../lib/db';
export const runtime='nodejs';
export async function POST(req:NextRequest){
 let body:{teamId?:string;queueToken?:string};
 try{body=await req.json();}catch{return NextResponse.json({error:'JSON inválido'},{status:400});}
 if(typeof body.teamId!=='string'||!/^[0-9a-f-]{36}$/i.test(body.teamId)||typeof body.queueToken!=='string'||!/^[0-9a-f]{64}$/i.test(body.queueToken))return NextResponse.json({error:'Credenciais inválidas'},{status:400});
 try{
 const t=await db().query('SELECT id,mode,name,captain,players FROM arena_teams WHERE id=$1 AND queue_token_hash=$2',[body.teamId,createHash('sha256').update(body.queueToken).digest('hex')]);
 if(!t.rowCount)return NextResponse.json({error:'Equipe não autorizada'},{status:403});
 const m=await db().query('SELECT m.id,m.mode,m.status,a.name AS team_a_name,a.captain AS team_a_captain,a.players AS team_a_players,b.name AS team_b_name,b.captain AS team_b_captain,b.players AS team_b_players FROM arena_matches m JOIN arena_teams a ON a.id=m.team_a JOIN arena_teams b ON b.id=m.team_b WHERE m.team_a=$1 OR m.team_b=$1 ORDER BY m.created_at DESC LIMIT 1',[body.teamId]);
 if(!m.rowCount)return NextResponse.json({status:'waiting',mode:t.rows[0].mode,team:t.rows[0].name});
 const x=m.rows[0];return NextResponse.json({status:x.status,matchId:x.id,mode:x.mode,teamA:{name:x.team_a_name,captain:x.team_a_captain,players:x.team_a_players},teamB:{name:x.team_b_name,captain:x.team_b_captain,players:x.team_b_players},roomCreated:false});
 }catch{return NextResponse.json({error:'Consulta indisponível'},{status:503});}
}
