import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'FLOWFIRE ARENA',description:'Arena de desafios e campeonatos Free Fire'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>}
