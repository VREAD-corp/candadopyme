/*! Candado Pyme audiencia anónima: sin cookies, sin identificadores, sin IP guardada. Mismo patrón que octave-checkout gas/web/mesure.js */
((n,l,d)=>{let q=new URLSearchParams(l.search),A=(k,f)=>d.addEventListener(k,f,!0),H=['outils.vread.fr','candadopyme.github.io'],b,t;
window.cpTrack=()=>{};
if(n.doNotTrack=='1'||n.globalPrivacyControl||(H.indexOf(l.hostname)<0&&!window.cpForceTrack))return;
b={site:'candadopyme',page:l.pathname,ref_domain:d.referrer.split('/')[2],device:innerWidth<768?'mobile':'desktop',variant:window.cpVariant||''};
for(let g of['source','medium','campaign'])b['utm_'+g]=q.get('utm_'+g);
t=v=>{b.event=v;b.ts=Date.now();try{fetch(window.CP_API+'?action=track',{method:'POST',keepalive:!0,credentials:'omit',redirect:'manual',body:JSON.stringify(b)}).catch(e=>0)}catch{}};
window.cpTrack=t;t('view');d.body.dataset.page=='kit'&&t('preorder_view');
A('click',e=>{let a=e.target.closest?.('a,button'),h=a?.dataset.mesure;h&&t(h)})})(navigator,location,document)
