import type {MetadataRoute} from 'next';
export default function manifest():MetadataRoute.Manifest{return {name:'FLOWFIRE ARENA',short_name:'FLOWFIRE',description:'Partidas Contra Squad 1x1, 2x2 e 4x4',start_url:'/',display:'standalone',background_color:'#08090b',theme_color:'#ff701f',icons:[{src:'/flowfire-arena-logo.png',sizes:'1536x1536',purpose:'any'}]};}
