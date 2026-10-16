'use client';
import {useEffect,useState} from 'react';
type Mode='1v1'|'2v2'|'4v4';
const count:Record<Mode,number>={'1v1':1,'2v2':2,'4v4':4};
const field:React.CSSProperties={display:'block',width:'100%',boxSizing:'border-box',padding:12,marginTop:8,background:'#0c1323',color:'white',border:'1px solid #3b4963',borderRadius:8};
export default function Home(){
 const [mode,setMode]=useState<Mode>('4v4');
 const [team,setTeam]=useState('');
 const [captain,setCaptain]=useState('');
 const [players,setPlayers]=useState<string[]>(Array(4).fill(''));
 const [preview,setPreview]=useState(false);
 const [saving,setSaving]=useState(false);
 const [notice,setNotice]=useState('');
 const [savedId,setSavedId]=useState('');
 const [queueToken,setQueueToken]=useState('');
 const [queueStatus,setQueueStatus]=useState('');
 const [match,setMatch]=useState<{matchId:string;mode:string;teamA:{name:string;players:string[]};teamB:{name:string;players:string[]};roomCreated?:boolean;room?:{id:string;password:string|null;createdAt:string|null}|null}|null>(null);
 useEffect(()=>{try{const saved=window.localStorage.getItem('flowfire-arena-team-v1');if(!saved)return;const x=JSON.parse(saved);if(!['1v1','2v2','4v4'].includes(x.mode)||typeof x.teamId!=='string'||typeof x.queueToken!=='string')return;setMode(x.mode);setTeam(x.name||'');setCaptain(x.captain||'');setPlayers(Array.isArray(x.players)?x.players:Array(count[x.mode as Mode]).fill(''));setSavedId(x.teamId);setQueueToken(x.queueToken);setPreview(true);setNotice('Cadastro recuperado deste dispositivo.');}catch{window.localStorage.removeItem('flowfire-arena-team-v1');}},[]);
 const clearSaved=()=>{window.localStorage.removeItem('flowfire-arena-team-v1');setSavedId('');setQueueToken('');setQueueStatus('');setMatch(null);setPreview(false);setTeam('');setCaptain('');setPlayers(Array(count[mode]).fill(''));setNotice('Cadastro local desvinculado deste navegador.');};
 const changeMode=(m:Mode)=>{setMode(m);setPlayers(Array(count[m]).fill(''));setPreview(false);setNotice('');setSavedId('');setQueueToken('');setQueueStatus('');setMatch(null)};
 const register=async()=>{
  setSaving(true);setNotice('');
  try{
   const response=await fetch('/api/teams',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({mode,team:{name:team,captain,players}})});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||'Falha ao cadastrar');
   setSavedId(data.teamId);setQueueToken(data.queueToken);setMatch(null);window.localStorage.setItem('flowfire-arena-team-v1',JSON.stringify({teamId:data.teamId,queueToken:data.queueToken,mode,name:team,captain,players}));
   setNotice('Equipe cadastrada no banco de dados. Este dispositivo poderá recuperar o cadastro.');
  }catch(error){setNotice(error instanceof Error?error.message:'Falha no cadastro');}
  finally{setSaving(false);}
 };
 const checkMatch=async()=>{
  if(!savedId||!queueToken)return;
  setSaving(true);setNotice('');
  try{
   const response=await fetch('/api/match-status',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({teamId:savedId,queueToken})});
   const data=await response.json();if(!response.ok)throw Error(data.error||'Consulta indisponível');
   if(data.matchId){setMatch(data);setQueueStatus('Confronto formado!');}
   else{setMatch(null);setQueueStatus('Aguardando adversário da mesma modalidade.');}
  }catch(e){setNotice(e instanceof Error?e.message:'Falha na consulta');}
  finally{setSaving(false);}
 };
 useEffect(()=>{if(!savedId||!queueToken)return;let active=true;const refresh=async()=>{try{const r=await fetch('/api/match-status',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({teamId:savedId,queueToken}),cache:'no-store'});if(!r.ok)return;const data=await r.json();if(!active)return;if(data.matchId){setMatch(data);setQueueStatus('Confronto formado!');}}catch{}};void refresh();const timer=setInterval(()=>{void refresh()},12000);return()=>{active=false;clearInterval(timer)};},[savedId,queueToken]);
 const cancelQueue=async()=>{
  if(!savedId||!queueToken)return;setSaving(true);setNotice('');
  try{const r=await fetch('/api/queue/cancel',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({teamId:savedId,queueToken})});const data=await r.json();if(!r.ok)throw Error(data.error||'Falha ao sair da fila');if(data.status==='matched'){setQueueStatus('Confronto já formado; não é possível cancelar a partida.');}else{setQueueStatus('Você não está na fila. Seu cadastro foi preservado.');}}
  catch(e){setNotice(e instanceof Error?e.message:'Falha ao sair da fila');}finally{setSaving(false);}
 };
 const joinQueue=async()=>{
  setSaving(true);setNotice('');
  try{
   const response=await fetch('/api/queue',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({teamId:savedId,queueToken})});
   const data=await response.json();if(!response.ok)throw Error(data.error||'Falha no pareamento');
   if(data.status==='ready'){setQueueStatus('Confronto formado!');setMatch(null);}
   else setQueueStatus('Aguardando adversário da mesma modalidade.');
  }catch(e){setNotice(e instanceof Error?e.message:'Falha no pareamento');}
  finally{setSaving(false);}
 };

 return <main style={{maxWidth:620,margin:'auto',padding:24,fontFamily:'Arial,sans-serif',color:'#f5f7ff'}}>
  <header style={{fontWeight:900,fontSize:28,letterSpacing:1}}>🔥 FLOWFIRE <span style={{color:'#ff682f'}}>ARENA</span></header>
  <h1 style={{marginTop:52,fontSize:36}}>Contra Squad</h1>
  <p style={{color:'#a8b4c8'}}>Cadastre sua equipe para partidas competitivas.</p>
  <section style={{background:'#151e31',borderRadius:16,padding:24,marginTop:24}}>
   <h2 style={{fontSize:20}}>Escolha a modalidade</h2>
   <div style={{display:'flex',gap:8}}>{(['1v1','2v2','4v4'] as Mode[]).map(m=><button key={m} type="button" onClick={()=>changeMode(m)} style={{flex:1,padding:14,borderRadius:9,border:'1px solid #53617d',background:mode===m?'#ef662f':'#0c1323',color:'white',fontWeight:700}}>{m.replace('v','x')}</button>)}</div>
   <p style={{color:'#a8b4c8',fontSize:13}}>{count[mode]} jogador(es) por equipe. A compatibilidade com Vortex ainda será testada.</p>
   {preview?<div>
    <h2>Confirme os dados</h2>
    <p><b>Equipe:</b> {team}</p><p><b>Capitão:</b> {captain}</p><p><b>Modalidade:</b> {mode.replace('v','x')}</p>
    <ol>{players.map((p,i)=><li key={i}>{p}</li>)}</ol>
    {savedId?<div><p style={{color:'#8ee0a2'}}>Equipe cadastrada. Protocolo: {savedId}</p><button type="button" disabled={saving} onClick={joinQueue} style={{padding:14,background:'#ef662f',color:'white',border:0,borderRadius:8}}>{saving?'Processando...':'Entrar na fila / Consultar confronto'}</button><button type="button" disabled={saving} onClick={cancelQueue} style={{marginTop:12,marginLeft:8,padding:12,borderRadius:8}}>Sair da fila</button><button type="button" disabled={saving} onClick={checkMatch} style={{marginTop:12,padding:12,borderRadius:8}}>Atualizar detalhes do confronto</button>{queueStatus&&<p role="status">{queueStatus}</p>}{match&&<section style={{marginTop:20,padding:18,border:'1px solid #455574',borderRadius:12}}><h2>Confronto {match.mode.replace('v','x')}</h2><p>Partida: {match.matchId}</p><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>{[match.teamA,match.teamB].map((t,i)=><div key={i} style={{background:'#0c1323',padding:12,borderRadius:10}}><b>{t.name}</b><ol style={{paddingLeft:22}}>{t.players.map((p,j)=><li key={j}>{p}</li>)}</ol></div>)}</div>{match.roomCreated&&match.room?<div style={{marginTop:12,padding:12,background:'#103b2a',borderRadius:8}}><strong>Sala Vortex disponível</strong><p>ID: {match.room.id}</p><p>Senha: {match.room.password||'Consulte o organizador'}</p><p style={{fontSize:12}}>Use as credenciais somente com os jogadores deste confronto.</p></div>:<p style={{color:'#ffbc88'}}>Sala Vortex ainda não criada. Aguardando liberação do organizador.</p>}</section>}</div>:<button type="button" disabled={saving} onClick={register} style={{padding:14,background:'#ef662f',border:0,borderRadius:8,color:'white'}}>{saving?'Salvando...':'Confirmar cadastro'}</button>}
    {notice&&<p role="status">{notice}</p>}
    <button type="button" onClick={()=>setPreview(false)} style={{marginLeft:12}}>Voltar</button>{savedId&&<button type="button" onClick={clearSaved} style={{display:'block',marginTop:16}}>Desvincular cadastro deste dispositivo</button>}
   </div>:<form onSubmit={e=>{e.preventDefault();if(new Set(players.map(p=>p.trim().toLowerCase())).size!==players.length){setNotice('Não repita jogadores');return;}setNotice('');setPreview(true);}}>
    <label style={{display:'block',marginTop:16}}>Nome da equipe<input required maxLength={64} value={team} onChange={e=>setTeam(e.target.value)} style={field}/></label>
    <label style={{display:'block',marginTop:16}}>Nick do capitão<input required maxLength={64} value={captain} onChange={e=>setCaptain(e.target.value)} style={field}/></label>
    <h3>Jogadores</h3>
    {players.map((p,i)=><label key={i} style={{display:'block',marginTop:12}}>Nick {i+1}<input required maxLength={64} value={p} onChange={e=>setPlayers(a=>a.map((x,j)=>j===i?e.target.value:x))} style={field}/></label>)}
    {notice&&<p role="alert">{notice}</p>}
    <button type="submit" style={{width:'100%',padding:14,background:'#ef662f',color:'white',fontWeight:700,border:0,borderRadius:8,marginTop:22}}>Revisar cadastro</button>
   </form>}
  </section>
  <p style={{color:'#9ba8bf',fontSize:12,marginTop:24}}>Ambiente de testes • Cadastro salvo neste navegador (evite dispositivos compartilhados) • Sem pagamentos • Sem criação de salas • Pareamento experimental disponível após cadastro</p>
 </main>;
}
