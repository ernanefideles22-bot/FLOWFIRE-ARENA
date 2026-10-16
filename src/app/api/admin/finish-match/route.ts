import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
import {db,ensureSchema} from '../../../../lib/db';
export const runtime='nodejs';
function authorized(req:NextRequest){const k=process.env.ADMIN_API_KEY,s=req.headers.get('x-admin-key');if(!k||!s)return false;const a=Buffer.from(k),b=Buffer.from(s);return a.length===b.length&&timingSafeEqual(a,b);}
export async function POST(req:NextRequest){
 if(!authorized(req))return NextResponse.json({error:'Não autorizado'},{status:401});
 let body:{matchId?:string;winner?:'team_a'|'team_b';scoreA?:number;scoreB?:number;confirm?:string};try{body=await req.json();}catch{return NextResponse.json({error:'JSON inválido'},{status:400});}
 if(!body||typeof body.matchId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.matchId)||body.confirm!=='FINISH_VERIFIED_MATCH')return NextResponse.json({error:'Partida ou confirmação inválida'},{status:400});
 const {scoreA,scoreB,winner}=body;
 if(!Number.isInteger(scoreA)||!Number.isInteger(scoreB)||scoreA===undefined||scoreB===undefined||scoreA<0||scoreB<0||scoreA>20||scoreB>20||scoreA===scoreB)return NextResponse.json({error:'Placar inválido: informe dois números diferentes de 0 a 20'},{status:400});
 const expectedWinner=scoreA>scoreB?'team_a':'team_b';
 if(winner!==expectedWinner)return NextResponse.json({error:'Vencedor não corresponde ao placar informado'},{status:400});
 try{await ensureSchema();const c=await db().connect();try{await c.query('BEGIN');const m=await c.query('SELECT id,status,team_a,team_b,vortex_room_id FROM arena_matches WHERE id=$1 FOR UPDATE',[body.matchId]);if(!m.rowCount){await c.query('ROLLBACK');return NextResponse.json({error:'Partida não encontrada'},{status:404});}if(m.rows[0].status==='finished'){await c.query('ROLLBACK');return NextResponse.json({error:'Partida já finalizada'},{status:409});}if(!m.rows[0].vortex_room_id){await c.query('ROLLBACK');return NextResponse.json({error:'Sala Vortex não vinculada'},{status:409});}await c.query("UPDATE arena_matches SET status='finished',vortex_result=$2::jsonb WHERE id=$1",[body.matchId,JSON.stringify({source:'admin_verified_screenshot',winner:body.winner,scoreA:body.scoreA,scoreB:body.scoreB,verifiedAt:new Date().toISOString()})]);await c.query('COMMIT');return NextResponse.json({status:'finished',matchId:body.matchId,recorded:true});}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}catch{return NextResponse.json({error:'Não foi possível finalizar a partida'},{status:503});}
}
