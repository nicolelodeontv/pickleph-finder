const $=s=>document.querySelector(s);
const quality=()=>{
  if(document.querySelector('.pp-quality-banner'))return;
  const host=$('#finder')||document.querySelector('.finder-v2');
  if(!host)return;
  const banner=document.createElement('div');banner.className='pp-quality-banner';banner.setAttribute('role','status');
  banner.innerHTML='<span aria-hidden="true">✓</span><span><strong>PicklePH quality layer:</strong> readable touch targets, clearer loading states, and keyboard-friendly search.</span><button type="button" aria-label="Dismiss quality note">×</button>';
  banner.querySelector('button').onclick=()=>banner.remove();host.parentNode.insertBefore(banner,host);
};
const searchTools=()=>{
  const input=$('#search');if(!input||input.dataset.aitmplBound)return;
  input.dataset.aitmplBound='1';input.setAttribute('aria-label','Search pickleball courts');input.setAttribute('autocomplete','off');
  const box=input.closest('.search-box');if(!box)return;
  const clear=document.createElement('button');clear.type='button';clear.className='pp-search-clear';clear.setAttribute('aria-label','Clear search');clear.textContent='×';box.appendChild(clear);
  const sync=()=>box.classList.toggle('has-value',!!input.value);sync();
  input.addEventListener('input',sync);clear.addEventListener('click',()=>{input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));input.focus()});
  input.addEventListener('keydown',e=>{if(e.key==='Escape'&&input.value){input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));}});
};
const skeleton=()=>{
  const r=$('#results');if(!r||r.dataset.skeletonReady)return;
  r.dataset.skeletonReady='1';
  if(r.children.length)return;
  r.innerHTML='<div class="pp-skeleton-grid" aria-label="Loading courts"><div class="pp-skeleton"></div><div class="pp-skeleton"></div><div class="pp-skeleton"></div></div>';
  const obs=new MutationObserver(()=>{if(r.querySelector('.v-card'))obs.disconnect();});obs.observe(r,{childList:true,subtree:true});
};
const backTop=()=>{
  if($('#ppBackTop'))return;
  const b=document.createElement('button');b.id='ppBackTop';b.className='pp-back-top';b.type='button';b.setAttribute('aria-label','Back to top');b.textContent='↑';
  b.onclick=()=>window.scrollTo({top:0,behavior:'smooth'});document.body.appendChild(b);
  const on=()=>b.classList.toggle('show',window.scrollY>700);window.addEventListener('scroll',on,{passive:true});on();
};
const keyboardSearch=()=>document.addEventListener('keydown',e=>{if(e.key==='/'&&!/input|textarea|select/i.test(document.activeElement?.tagName||'')){e.preventDefault();$('#search')?.focus()}});
const observe=()=>{quality();searchTools();skeleton();backTop();};
observe();const mo=new MutationObserver(observe);mo.observe(document.body,{childList:true,subtree:true});keyboardSearch();
