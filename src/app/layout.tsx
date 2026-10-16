import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'FLOWFIRE ARENA',description:'Arena de desafios e campeonatos Free Fire',icons:{icon:'/flowfire-arena-logo.png',apple:'/flowfire-arena-logo.png'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>}
