import type { Metadata } from 'next';
export const metadata:Metadata={title:'FLOWFIRE ARENA',description:'Arena de desafios e campeonatos Free Fire'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body style={{margin:0,fontFamily:'system-ui,Arial',background:'#080e1b',color:'#f8fafc'}}>{children}</body></html>}
