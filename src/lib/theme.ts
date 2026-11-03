export const themeStorageKey = 'blogpost-theme';
export type Theme = 'light' | 'dark';

/** Nocturne is dark-first: only an explicit OS light preference starts in Dawn. Resolve before paint; keep this in a shared module rather than exporting a Client reference. */
export const themeScript = `(()=>{var p='system';try{var s=localStorage.getItem('blogpost-theme');if(s==='light'||s==='dark')p=s}catch{}var r=document.documentElement;r.dataset.themePreference=p;r.dataset.theme=p==='system'?(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):p})()`;
