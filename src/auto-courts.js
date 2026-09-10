const feedUrl = './data/auto-courts.json';
const results = document.getElementById('results');
const search = document.getElementById('search');
const region = document.getElementById('region');
const sort = document.getElementById('sort');
let autoVenues = [];
let busy = false;

const labels = {indoor:'Indoor',outdoor:'Outdoor',aircon:'Aircon',lights:'Night lights',parking:'Parking',paddleRental:'Paddle rental',openPlay:'Open play',cafe:'Food / café'};
const money = v => v.price == null ? 'Check venue' : `₱${Number(v.price).toLocaleString()}/${v.unit?.includes('player') ? 'player' : 'hr'}`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const link = (text, url, primary = false) => url ? `<a class="${primary ? 'primary-btn' : 'secondary-btn'}" target="_blank" rel="noopener noreferrer" href="${esc(url)}">${text}</a>` : '';

function activeFilters(){
  return {
    region: region?.value || 'cebu',
    search: (search?.value || '').trim().toLowerCase(),
    areas: [...document.querySelectorAll('[data-area].active')].map(x => x.dataset.area),
    price: [...document.querySelectorAll('[data-price].active')].map(x => Number(x.dataset.price))[0] ?? null,
    keys: [...document.querySelectorAll('[data-key].active')].map(x => x.dataset.key)
  };
}

function matches(v, f){
  if(f.region !== 'all' && v.region !== f.region) return false;
  const hay = `${v.name} ${v.area} ${v.address}`.toLowerCase();
  if(f.search && !hay.includes(f.search)) return false;
  if(f.areas.length && !f.areas.includes(v.area)) return false;
  if(f.price !== null && (v.price == null || v.price > f.price)) return false;
  if(f.keys.some(k => !v.tags?.includes(k))) return false;
  return true;
}

function card(v){
  const map = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${v.name} ${v.address}`)}`;
  return `<article class="card auto-card"><div class="card-top"><div><span class="area">${esc(v.area)}</span><h3>${esc(v.name)}</h3></div><span class="auto-badge">Auto-added</span></div><div class="details"><span>🏟 <b>${esc(v.courts)}</b> courts</span><span>💸 <b>${esc(money(v))}</b></span><span>⏰ ${esc(v.hours)}</span></div><div class="tags">${(v.tags||[]).map(t=>`<span>${labels[t]||esc(t)}</span>`).join('')}</div><p class="address">${esc(v.address)}</p>${v.notes?`<p class="venue-note">${esc(v.notes)}</p>`:''}<div class="card-actions">${link('Maps',map,true)}${link('Facebook',v.fb)}${link('Instagram',v.instagram)}${link('Book / Schedule',v.booking)}${v.phone?`<a class="secondary-btn" href="tel:${String(v.phone).replace(/[^+\d]/g,'')}">Call</a>`:''}${v.email?`<a class="secondary-btn" href="mailto:${esc(v.email)}">Email</a>`:''}</div></article>`;
}

function renderAuto(){
  if(!results || busy) return;
  busy = true;
  const f = activeFilters();
  let list = autoVenues.filter(v => matches(v,f));
  if(f.region === 'all' && !f.search && !f.areas.length && f.price === null && !f.keys.length) {
    // keep the freshest additions at the bottom so the primary directory remains stable
    list = [...list];
  }
  if(sort?.value === 'price-low') list.sort((a,b)=>(a.price??99999)-(b.price??99999));
  if(sort?.value === 'price-high') list.sort((a,b)=>(b.price??-1)-(a.price??-1));
  if(sort?.value === 'courts-high') list.sort((a,b)=>(b.courts||0)-(a.courts||0));
  if(sort?.value === 'name') list.sort((a,b)=>a.name.localeCompare(b.name));
  results.querySelectorAll('.auto-card').forEach(el => el.remove());
  results.insertAdjacentHTML('beforeend', list.map(card).join(''));
  busy = false;
}

async function load(){
  try{
    const res = await fetch(feedUrl, {cache:'no-store'});
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    autoVenues = await res.json();
    renderAuto();
  }catch(err){
    console.warn('PicklePH automatic court feed unavailable:', err);
  }
}

['input','change','click'].forEach(type=>document.addEventListener(type, e=>{
  if(e.target.matches('#search,#region,#sort,[data-area],[data-price],[data-key],#resetBtn,#emptyReset')) setTimeout(renderAuto, 0);
}));
new MutationObserver(()=>{ if(!busy && results && !results.querySelector('.auto-card') && autoVenues.length) setTimeout(renderAuto,0); }).observe(results,{childList:true});
load();
