// Plain module (no "use client", no hooks) so the server root layout can import it.

export const THEME_STORAGE_KEY = "luna-theme";

/**
 * Inlined in <head>: sets html.dark before first paint from the stored mode
 * (system | light | dark) and the OS appearance, then keeps <html> in step when
 * the OS appearance or another tab's choice changes. color-scheme lives in
 * globals.css, so it only turns dark on pages built on the plan tokens.
 * Same-tab writes go through setThemeMode in ./mode.ts; their event carries
 * newValue, which `m` keeps when storage is blocked.
 */
export const themeScript = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)},q=matchMedia("(prefers-color-scheme: dark)"),m;function a(){try{m=localStorage.getItem(k)}catch(e){}document.documentElement.classList.toggle("dark",m==="dark"||(m!=="light"&&q.matches))}a();q.addEventListener("change",a);addEventListener("storage",function(e){if(e.key===k||e.key===null){m=e.newValue;a()}})}catch(e){}})()`;
