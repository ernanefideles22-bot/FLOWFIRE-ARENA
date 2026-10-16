import type {MetadataRoute} from 'next';
export default function manifest():MetadataRoute.Manifest{return {name:'FLOWFIRE ARENA',short_name:'FLOWFIRE',description:'Partidas Contra Squad 1x1, 2x2 e 4x4',start_url:'/',display:'standalone',background_color:'#090f20',theme_color:'#ef662f',icons:[{src:'/icon.svg',sizes:'any',type:'image/svg+xml',purpose:'any'}]};}
