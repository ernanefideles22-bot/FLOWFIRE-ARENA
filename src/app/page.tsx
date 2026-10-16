'use client';
import {useState} from 'react';
export default function Home(){
 const [team,setTeam]=useState(''),[nick,setNick]=useState(''),[uid,setUid]=useState(''),[submitted,setSubmitted]=useState(false);
 return <main style={{maxWidth:520,margin:'auto',padding:24}}>
 <header style={{fontWeight:900,fontSize:28,letterSpacing:1}}>🔥 FLOWFIRE <span style={{color:'#ff682f'}}>ARENA</span></header>
 <h1 style={{marginTop:60,fontSize:38}}>Contra Squad 4x4</h1>
 <p style={{color:'#a8b4c8'}}>Cadastre seu time para disputar partidas CS 4x4.</p>
 <section style={{background:'#151e31',borderRadius:16,padding:24,marginTop:28}}>
 {submitted?<><h2>Pré-cadastro demonstrativo</h2><p>Equipe: {team}</p><p>Capitão: {nick}</p><p>Modalidade: CS 4x4</p><p>Este MVP ainda não salva cadastros nem cria salas automaticamente.</p><button onClick={()=>setSubmitted(false)}>Voltar</button></>:
 <form onSubmit={e=>{e.preventDefault();setSubmitted(true)}}>
 <p style={{color:'#ff8a59',fontWeight:700}}>MODALIDADE FIXA • CS 4x4</p>
 {([['Nome da equipe',team,setTeam],['Nick do capitão',nick,setNick],['UID do capitão',uid,setUid]] as const).map(([label,value,set])=><div key={label} style={{marginBottom:16}}><label>{label}</label><input required value={value} onChange={e=>set(e.target.value)} style={{display:'block',width:'100%',boxSizing:'border-box',padding:12,marginTop:8,background:'#0c1323',color:'white',border:'1px solid #3b4963',borderRadius:8}}/></div>)}
 <button type="submit" style={{width:'100%',padding:14,background:'#ef662f',color:'white',fontWeight:700,border:0,borderRadius:8}}>Pré-cadastrar equipe 4x4</button>
 </form>}
 </section><p style={{color:'#9ba8bf',fontSize:12,marginTop:24}}>Modo de teste • Sem pagamentos • Sem criação automática de salas</p></main>;
}
