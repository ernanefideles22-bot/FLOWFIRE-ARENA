import Link from 'next/link';
import type { ReactNode } from 'react';

export function ArenaIcon({name='grid'}:{name?:string}) {
 const paths:Record<string,ReactNode>={
  grid:<><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
  sword:<><path d="m14 3 7 0 0 7-12 11-6-6L14 3Z M3 3l18 18M3 21l5-5M16 8l5-5"/></>,
  shield:<><path d="m12 3 8 3v6c0 4-4 7-8 9-4-2-8-5-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/></>,
  arrow:<path d="M4 12h16m-6-6 6 6-6 6"/>,
  bolt:<path d="m14 2-10 12h7l-1 8 10-13h-7l1-7Z"/>,
  users:<><circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M17 5a3 3 0 0 1 0 6m1 4a5 5 0 0 1 3 5"/></>,
 };
 return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]||paths.grid}</svg>;
}

export function ArenaShell({children,admin=false}:{children:ReactNode;admin?:boolean}) {
 return <div className="arena-app">
  <a className="skip-link" href="#main-content">Ir para o conteúdo</a>
  <aside className="arena-sidebar">
   <Link href="/" className="sidebar-brand" aria-label="Flowfire Arena — início"><img src="/flowfire-arena-logo.png" alt="FLOWFIRE ARENA" width="180" height="180"/><span>COMPETITIVE PLATFORM</span></Link>
   <div className="nav-label">EXPERIÊNCIA ARENA</div>
   <nav aria-label="Navegação principal">
    <Link href="/" className={!admin?'nav-item is-active':'nav-item'} aria-current={!admin?'page':undefined}><ArenaIcon name="sword"/> Arena de partidas <span>01</span></Link>
    <Link href="/admin" className={admin?'nav-item is-active':'nav-item'} aria-current={admin?'page':undefined}><ArenaIcon/> Central de operações <span>02</span></Link>
    <a href={admin?'#confrontos':'#inscricao'} className="nav-item"><ArenaIcon name={admin?'bolt':'users'}/>{admin?'Confrontos':'Minha equipe'}<ArenaIcon name="arrow"/></a>
   </nav>
   <div className="sidebar-note"><ArenaIcon name="shield"/><strong>Espírito competitivo.<br/>Identidade Flowfire.</strong><p>Uma arena para quem entra em campo para evoluir.</p><div className="tiny-rule"/><span>CONTRA SQUAD · FREE FIRE</span></div>
   <div className="sidebar-bottom"><span className="status-dot"/> AMBIENTE DE TESTES <small>FLOWFIRE ARENA © 2026</small></div>
  </aside>
  <div className="arena-workspace">
   <div className="arena-ambience" aria-hidden="true"><div className="ambient-grid"/><div className="ambient-aura ambient-aura-one"/><div className="ambient-aura ambient-aura-two"/><div className="ambient-embers">{Array.from({length:18},(_,i)=><i key={i} style={{left:`${3+(i*17)%95}%`,animationDelay:`${i*-.9}s`,animationDuration:`${11+i%7}s`}}/>)}</div></div>
   <header className="arena-topbar"><div className="topbar-brand"><img className="topbar-logo" src="/flowfire-arena-logo.png" alt="" width="44" height="44"/><span>FLOWFIRE <b>ARENA</b><small>{admin?'WORKSPACE / OPERAÇÕES':'PLAY / CONTRA SQUAD'}</small></span></div><div className="topbar-right"><span className="environment-tag">BETA</span><span className="workspace-tag"><ArenaIcon name={admin?'shield':'sword'}/>{admin?'Organização':'Área do jogador'}</span></div></header>
   <main id="main-content" className={admin?'arena-content admin-content':'arena-content player-content'}>{children}</main>
   <footer className="arena-footer"><span>FLOWFIRE <b>ARENA</b><small>O próximo nível da sua competição.</small></span><span>CONTRA SQUAD <i/> 1×1 · 2×2 · 4×4</span></footer>
  </div>
 </div>;
}

export function ArenaHero({admin=false}:{admin?:boolean}) {
 return <section className="arena-hero">
  <div className="hero-grid" aria-hidden="true"/><div className="hero-orbit" aria-hidden="true"/>
  <div className="hero-embers" aria-hidden="true">{Array.from({length:12},(_,i)=><i key={i} style={{left:`${12+i*7}%`,animationDelay:`${i*-.7}s`,animationDuration:`${6+i%4}s`}}/>)}</div>
  <div className="hero-copy"><span className="eyebrow"><span className="status-dot"/>{admin?'CENTRAL DE OPERAÇÕES':'BEM-VINDO À FLOWFIRE ARENA'}</span><h1>{admin?<>Sua arena.<br/><span>Seu comando.</span></>:<>Entre em campo.<br/><span>Deixe sua marca.</span></>}</h1><p>{admin?'Uma visão clara de cada confronto. Da formação das equipes ao resultado final, o controle está nas suas mãos.':'Reúna sua equipe, encontre seu adversário e viva a intensidade do Contra Squad.'}</p><div className="hero-actions"><a className="primary-button" href={admin?'#controle':'#inscricao'}>{admin?'Acessar operações':'Preparar minha equipe'}<ArenaIcon name="arrow"/></a><span className="hero-caption">{admin?'PRECISÃO EM CADA DECISÃO':'COMPETIÇÃO EM CADA DETALHE'}</span></div></div>
  <div className="hero-art"><div className="logo-halo"/><img src="/flowfire-arena-logo.png" alt="FLOWFIRE ARENA — logo oficial" width="1536" height="1536"/><span className="art-caption"><i/> FORGED IN FIRE. BUILT TO COMPETE. <i/></span></div>
  <div className="hero-bottom"><span>FLOWFIRE ORIGINAL IDENTITY</span><span>FÊNIX · FORÇA · EVOLUÇÃO <ArenaIcon name="bolt"/></span></div>
 </section>;
}
