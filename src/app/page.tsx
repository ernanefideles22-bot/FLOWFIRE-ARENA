'use client';
import {useEffect,useState} from 'react';
import {ArenaShell,ArenaHero} from '../components/arena-shell';
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
 const [match,setMatch]=useState<{matchId:string;mode:string;teamA:{name:string;players:string[]};teamB:{name:string;players:string[]};teamAReady?:boolean;teamBReady?:boolean;roomCreated?:boolean;room?:{id:string;password:string|null;createdAt:string|null}|null}|null>(null);
 useEffect(()=>{try{const saved=window.localStorage.getItem('flowfire-arena-team-v1');if(!saved)return;const x=JSON.parse(saved);if(!['1v1','2v2','4v4'].includes(x.mode)||typeof x.teamId!=='string'||typeof x.queueToken!=='string')return;setMode(x.mode);setTeam(x.name||'');setCaptain(x.captain||'');setPlayers(Array.isArray(x.players)?x.players:Array(count[x.mode as Mode]).fill(''));setSavedId(x.teamId);setQueueToken(x.queueToken);setPreview(true);setNotice('');}catch{window.localStorage.removeItem('flowfire-arena-team-v1');}},[]);
 const confirmReady=async(ready:boolean)=>{if(!savedId||!queueToken||!match)return;setSaving(true);setNotice('');try{const r=await fetch('/api/match-ready',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({teamId:savedId,queueToken,matchId:match.matchId,ready})});const d=await r.json();if(!r.ok)throw Error(d.error||'Não foi possível confirmar');setMatch(x=>x?{...x,teamAReady:d.teamAReady,teamBReady:d.teamBReady}:x);setNotice(d.status==='both_ready'?'As duas equipes confirmaram! Aguardando início autorizado.':ready?'Confirmação registrada. Aguardando o outro capitão.':'Confirmação retirada.');}catch(e){setNotice(e instanceof Error?e.message:'Falha ao confirmar');}finally{setSaving(false);}};
 const clearSaved=()=>{window.localStorage.removeItem('flowfire-arena-team-v1');setSavedId('');setQueueToken('');setQueueStatus('');setMatch(null);setPreview(false);setTeam('');setCaptain('');setPlayers(Array(count[mode]).fill(''));setNotice('Cadastro local desvinculado deste navegador.');};
 const changeMode=(m:Mode)=>{setMode(m);setPlayers(Array(count[m]).fill(''));setPreview(false);setNotice('');setSavedId('');setQueueToken('');setQueueStatus('');setMatch(null)};
 const register=async()=>{
  setSaving(true);setNotice('');
  try{
   const response=await fetch('/api/teams',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({mode,team:{name:team,captain,players}})});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||'Falha ao cadastrar');
   setSavedId(data.teamId);setQueueToken(data.queueToken);setMatch(null);window.localStorage.setItem('flowfire-arena-team-v1',JSON.stringify({teamId:data.teamId,queueToken:data.queueToken,mode,name:team,captain,players}));
   setNotice('Cadastro concluído.');
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
   else{setMatch(null);setQueueStatus(data.status==='waiting'?'Aguardando adversário da mesma modalidade.':'Equipe cadastrada. Você ainda não está na fila.');}
  }catch(e){setNotice(e instanceof Error?e.message:'Falha na consulta');}
  finally{setSaving(false);}
 };
 useEffect(()=>{if(!savedId||!queueToken)return;let active=true;const refresh=async()=>{try{const r=await fetch('/api/match-status',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({teamId:savedId,queueToken}),cache:'no-store'});if(!r.ok)return;const data=await r.json();if(!active)return;if(data.matchId){setMatch(data);setQueueStatus('Confronto formado!');}else{setMatch(null);setQueueStatus(data.status==='waiting'?'Aguardando adversário da mesma modalidade.':'Equipe cadastrada. Você ainda não está na fila.');}}catch{}};void refresh();const timer=setInterval(()=>{void refresh()},12000);return()=>{active=false;clearInterval(timer)};},[savedId,queueToken]);
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

 return <ArenaShell>
 <ArenaHero/>
 <div className="section-heading" id="inscricao"><h2>{savedId?'Minha equipe':'Cadastrar equipe'}</h2></div>
 <div className="registration-grid" style={{display:"block",maxWidth:720,margin:"0 auto"}}><section className="panel registration-panel">
   <h2 style={{fontSize:20}}>Modalidade</h2>
   <div className="mode-selector">{(['1v1','2v2','4v4'] as Mode[]).map(m=><button key={m} aria-pressed={mode===m} type="button" onClick={()=>changeMode(m)} style={{flex:1,padding:14,borderRadius:9,border:'1px solid #53617d',background:mode===m?'linear-gradient(120deg,#f78322,#c53716)':'#17131a',color:'white',fontWeight:700}}><b>{m.replace('v','×')}</b><span>{m==='1v1'?'Duelo':m==='2v2'?'Dupla':'Squad'}</span></button>)}</div>
   {preview?<div>
    <h2>Confirme os dados</h2>
    <p><b>Equipe:</b> {team}</p><p><b>Capitão:</b> {captain}</p>
    <ol>{players.map((p,i)=><li key={i}>{p}</li>)}</ol>
    {!savedId&&<p style={{color:'#ffe4b8'}}>Confira cada nick com o Free Fire antes de confirmar. A identificação automática depende desses dados.</p>}
    {savedId?<div><p style={{color:'#8ee0a2'}}>Equipe cadastrada</p><button type="button" disabled={saving} onClick={joinQueue} style={{padding:14,background:'#ef662f',color:'white',border:0,borderRadius:8}}>{saving?'Processando...':'Entrar na fila'}</button><button type="button" disabled={saving} onClick={cancelQueue} style={{marginTop:12,marginLeft:8,padding:12,borderRadius:8}}>Sair da fila</button><button type="button" disabled={saving} onClick={checkMatch} style={{marginTop:12,padding:12,borderRadius:8}}>Atualizar detalhes do confronto</button>{queueStatus&&<p role="status">{queueStatus}</p>}{match&&<section className="player-match-card" style={{marginTop:20,padding:18,border:'1px solid #455574',borderRadius:12}}><h2>Confronto {match.mode.replace('v','x')}</h2><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>{[match.teamA,match.teamB].map((t,i)=><div className="player-team-card" key={i} style={{background:'#0c1323',padding:12,borderRadius:10}}><b>{t.name}</b><ol style={{paddingLeft:22}}>{t.players.map((p,j)=><li key={j}>{p}</li>)}</ol></div>)}</div>{match.roomCreated&&match.room?<div className="room-credentials" style={{marginTop:12,padding:12,background:'#103b2a',borderRadius:8}}><strong>Sala Vortex disponível</strong><p>ID: {match.room.id}</p><p>Senha: {match.room.password||'Consulte o organizador'}</p><div style={{marginTop:14,padding:12,border:'1px solid #5e7c6c',borderRadius:8}}><strong>Confirmação dos capitães</strong><p>Equipe A: {match.teamAReady?'Pronta':'Aguardando'} · Equipe B: {match.teamBReady?'Pronta':'Aguardando'}</p><button type="button" disabled={saving} onClick={()=>confirmReady(true)} style={{padding:12,background:'#248451',color:'white',border:0,borderRadius:8}}>Minha equipe está na sala e pronta</button><button type="button" disabled={saving} onClick={()=>confirmReady(false)} style={{marginLeft:8,padding:12,borderRadius:8}}>Retirar confirmação</button><p style={{fontSize:12}}>Teste: START automático ainda desativado. Nenhum crédito será consumido por esta confirmação.</p></div></div>:<p style={{color:'#ffbc88'}}>Sala Vortex ainda não criada. Aguardando liberação do organizador.</p>}</section>}</div>:<button type="button" disabled={saving} onClick={register} style={{padding:14,background:'#ef662f',border:0,borderRadius:8,color:'white'}}>{saving?'Salvando...':'Confirmar cadastro'}</button>}
    {notice&&<p role="status">{notice}</p>}
    {!savedId&&<button type="button" onClick={()=>setPreview(false)} style={{marginLeft:12}}>Corrigir dados</button>}{savedId&&<button type="button" onClick={clearSaved} style={{display:'block',marginTop:16}}>Trocar de equipe</button>}
   </div>:<form onSubmit={e=>{e.preventDefault();if(new Set(players.map(p=>p.trim().toLowerCase())).size!==players.length){setNotice('Não repita jogadores');return;}setNotice('');setPreview(true);}}>
    <label style={{display:'block',marginTop:16}}>Nome da equipe<input required maxLength={64} value={team} onChange={e=>setTeam(e.target.value)} style={field}/></label>
    <label style={{display:'block',marginTop:16}}>Nick do capitão<input required maxLength={64} value={captain} onChange={e=>setCaptain(e.target.value)} style={field}/></label>
    <h3>Jogadores</h3>
    <p role="note" style={{padding:14,background:'#3a2818',border:'1px solid #ef9b4a',borderRadius:10,color:'#ffe4b8',fontWeight:700}}>⚠️ Digite cada nick exatamente como aparece no Free Fire, incluindo símbolos e espaços.</p>
    {players.map((p,i)=><label key={i} style={{display:'block',marginTop:12}}>Nick {i+1}<input required maxLength={64} value={p} onChange={e=>setPlayers(a=>a.map((x,j)=>j===i?e.target.value:x))} style={field}/></label>)}
    {notice&&<p role="alert">{notice}</p>}
    <button type="submit" style={{width:'100%',padding:14,background:'#ef662f',color:'white',fontWeight:700,border:0,borderRadius:8,marginTop:22}}>Revisar cadastro</button>
   </form>}
  </section></div>
 </ArenaShell>;
}
