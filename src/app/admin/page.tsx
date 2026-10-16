'use client';
import {useState} from 'react';
type Match={id:string;mode:string;status:string;createdAt:string;teamA:string;teamB:string;roomCreated:boolean};
export default function AdminPage(){
 const [key,setKey]=useState('');const [matches,setMatches]=useState<Match[]>([]);const [error,setError]=useState('');const [loading,setLoading]=useState(false);const [loaded,setLoaded]=useState(false);
 async function load(){setLoading(true);setError('');try{const r=await fetch('/api/admin/matches',{headers:{'x-admin-key':key},cache:'no-store'});const data=await r.json();if(!r.ok)throw new Error(data.error||'Consulta falhou');setMatches(data.matches);setLoaded(true);}catch(e){setError(e instanceof Error?e.message:'Erro inesperado');setLoaded(false);}finally{setLoading(false);}}
 return <main style={{maxWidth:800,margin:'auto',padding:24,color:'#f5f7ff',fontFamily:'Arial,sans-serif'}}>
 <h1>🔥 FLOWFIRE ARENA — Administração</h1><p style={{color:'#bac5d7'}}>Painel de consulta. A criação de salas Vortex está desativada e nenhuma operação desta página consome créditos.</p>
 <label>Chave administrativa<input type="password" autoComplete="off" value={key} onChange={e=>setKey(e.target.value)} style={{display:'block',width:'100%',boxSizing:'border-box',padding:12,marginTop:8,background:'#111b2d',color:'white',border:'1px solid #526079',borderRadius:8}}/></label>
 <button type="button" disabled={loading||!key} onClick={load} style={{padding:14,marginTop:16,background:'#ef662f',color:'white',border:0,borderRadius:8}}>{loading?'Consultando...':'Consultar partidas'}</button>
 {error&&<p role="alert">{error}</p>}
 {loaded&&<section style={{marginTop:24}}><h2>Últimos confrontos ({matches.length})</h2>{matches.length===0&&<p>Nenhuma partida registrada.</p>}{matches.map(m=><article key={m.id} style={{background:'#151e31',padding:16,marginBottom:12,borderRadius:12}}><strong>{m.teamA} × {m.teamB}</strong><p>Modalidade: {m.mode.replace('v','x')} · Estado: {m.status}</p><p style={{fontSize:12,overflowWrap:'anywhere'}}>Partida: {m.id}</p><p>{m.roomCreated?'Sala vinculada':'Sala não criada'}</p><button type="button" disabled title="Criação desativada até validação da integração" style={{padding:10,borderRadius:8}}>Criar sala (indisponível)</button></article>)}</section>}
 </main>;
}
