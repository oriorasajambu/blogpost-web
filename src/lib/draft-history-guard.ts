/** Install before hydration so a failed device save can retain the mounted editor. */
export const draftHistoryGuardScript = `window.addEventListener('popstate',function(event){window.dispatchEvent(new CustomEvent('blogpost:before-history',{detail:event}));},true);`;
