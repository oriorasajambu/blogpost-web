export const themeStorageKey = 'blogpost-theme';
export type Theme = 'light' | 'dark';

/** Resolve before paint; keep this in a shared module rather than exporting a Client reference. */
export const themeScript = `(()=>{var p='system';try{var s=localStorage.getItem('blogpost-theme');if(s==='light'||s==='dark')p=s}catch{}var r=document.documentElement;r.dataset.themePreference=p;r.dataset.theme=p==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):p})()`;
