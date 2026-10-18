/*! Candado Pyme audiencia anónima: sin cookies, sin identificadores, sin IP guardada. Mismo patrón que octave-checkout gas/web/mesure.js */
((n,l,d)=>{let q=new URLSearchParams(l.search),A=(k,f)=>d.addEventListener(k,f,!0),H=['candado.jalonel.com'],b,t,x='',s,o='octave_notrack',go;
window.cpTrack=()=>{};
if(n.doNotTrack=='1'||n.globalPrivacyControl||(H.indexOf(l.hostname)<0&&!window.cpForceTrack))return;
// No es una visita: nuestras pruebas (?octave_notrack=1, recordado en este navegador; =0 lo borra), navegadores automatizados y robots. Se cuentan aparte; el user agent solo se lee aquí, nunca se envía.
try{s=localStorage;q.has(o)&&(q.get(o)=='1'?s.setItem(o,'1'):s.removeItem(o));s.getItem(o)=='1'&&(x='notrack')}catch{}
x=x||(q.get(o)=='1'?'notrack':n.webdriver?'webdriver':/bot\b|crawl|spider|slurp|headless|lighthouse|pagespeed|inspectiontool|googleother|mediapartners|bingpreview|phantom|puppeteer|playwright|selenium/i.test(n.userAgent||'')?'bot':'');
b={site:'candadopyme',page:l.pathname,ref_domain:d.referrer.split('/')[2],device:innerWidth<768?'mobile':'desktop',variant:window.cpVariant||'',v:2};
if(x)b.excluded=x;
for(let g of['source','medium','campaign'])b['utm_'+g]=q.get('utm_'+g);
t=v=>{b.event=v;b.ts=Date.now();try{fetch(window.CP_API+'?action=track',{method:'POST',keepalive:!0,credentials:'omit',redirect:'manual',body:JSON.stringify(b)}).catch(e=>0)}catch{}};
window.cpTrack=t;
// Una página precargada solo cuenta si la persona la abre.
go=()=>{t('view');d.body.dataset.page=='kit'&&t('preorder_view')};
if(d.prerendering)A('prerenderingchange',go);else if(d.visibilityState=='prerender'){let v=()=>{d.visibilityState!='prerender'&&(d.removeEventListener('visibilitychange',v,!0),go())};A('visibilitychange',v)}else go();
A('click',e=>{let a=e.target.closest?.('a,button'),h=a?.dataset.mesure;h&&t(h)})})(navigator,location,document)
