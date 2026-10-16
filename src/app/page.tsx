'use client';
import {useState} from 'react';
type Mode='1v1'|'2v2'|'4v4';
const count:Record<Mode,number>={'1v1':1,'2v2':2,'4v4':4};
export default function Home(){
 const [mode,setMode]=useState<Mode>('4v4'),[team,setTeam]=useState(''),[captain,setCaptain]=useState(''),[players,setPlayers]=useState<string[]>(Array(4).fill('')),[preview,setPreview]=useState(false);
 const changeMode=(m:Mode)=>{setMode(m);setPlayers(Array(count[m]).fill(''));setPreview(false)};
 return <main style={{maxWidth:620,margin:'auto',padding:24,fontFamily:'Arial,sans-serif',color:'#f5f7ff'}}>
 <header style={{fontWeight:900,fontSize:28,letterSpacing:1}}>🔥 FLOWFIRE <span style={{color:'#ff682f'}}>ARENA</span></header>
 <h1 style={{marginTop:52,fontSize:36}}>Contra Squad</h1><p style={{color:'#a8b4c8'}}>Prepare sua equipe para partidas competitivas.</p>
 <section style={{background:'#151e31',borderRadius:16,padding:24,marginTop:24}}>
 <h2 style={{fontSize:20}}>Escolha a modalidade</h2><div style={{display:'flex',gap:8}}>{(['1v1','2v2','4v4'] as Mode[]).map(m=><button key={m} onClick={()=>changeMode(m)} style={{flex:1,padding:14,borderRadius:9,border:'1px solid #53617d',background:mode===m?'#ef662f':'#0c1323',color:'white',fontWeight:700}}>{m.replace('v','x')}</button>)}</div>
 <p style={{color:'#a8b4c8',fontSize:13}}>{count[mode]} jogador(es) por equipe · Integração Vortex pendente de validação.</p>
 {preview?<><h2>Prévia da equipe</h2><p><b>Equipe:</b> {team}</p><p><b>Capitão:</b> {captain}</p><p><b>Modalidade:</b> {mode.replace('v','x')}</p><ol>{players.map((p,i)=><li key={i}>{p}</li>)}</ol><p style={{color:'#ffbc88'}}>Demonstração: os dados não foram salvos nem enviados.</p><button onClick={()=>setPreview(false)}>Editar</button></>:
 <form onSubmit={e=>{e.preventDefault();if(new Set(players.map(p=>p.trim().toLowerCase())).size!==players.length){alert('Não repita jogadores');return}setPreview(true)}}>
 <label style={{display:'block',marginTop:16}}>Nome da equipe<input required value={team} onChange={e=>setTeam(e.target.value)} style={field}/></label>
 <label style={{display:'block',marginTop:16}}>Nick do capitão<input required value={captain} onChange={e=>setCaptain(e.target.value)} style={field}/></label>
 <h3>Jogadores</h3>{players.map((p,i)=><label key={i} style={{display:'block',marginTop:12}}>Nick {i+1}<input required value={p} onChange={e=>setPlayers(a=>a.map((x,j)=>j===i?e.target.value:x))} style={field}/></label>)}
 <button type="submit" style={{width:'100%',padding:14,background:'#ef662f',color:'white',fontWeight:700,border:0,borderRadius:8,marginTop:22}}>Visualizar pré-cadastro</button>
 </form>}
 </section><p style={{color:'#9ba8bf',fontSize:12,marginTop:24}}>Ambiente demonstrativo • Sem pagamentos • Sem cadastro persistente • Sem criação de salas</p></main>;
}
const field:React.CSSProperties={display:'block',width:'100%',boxSizing:'border-box',padding:12,marginTop:8,background:'#0c1323',color:'white',border:'1px solid #3b4963',borderRadius:8};
