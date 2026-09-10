const feedUrls = [
  './data/auto-courts.json',
  './data/discovery-1.json',
  './data/discovery-2.json',
  './data/discovery-3.json',
  './data/discovery-4.json',
  './data/discovery-5.json',
  './data/discovery-6.json'
];
const results = document.getElementById('results');
const search = document.getElementById('search');
const region = document.getElementById('region');
const sort = document.getElementById('sort');
let autoVenues = [];
let busy = false;

const labels = {indoor:'Indoor',outdoor:'Outdoor',aircon:'Aircon',lights:'Night lights',parking:'Parking',paddleRental:'Paddle rental',openPlay:'Open play',cafe:'Food / café'};
const money = v => v.price == null ? 'Check venue' : `₱${Number(v.price).toLocaleString()}/${v.unit?.includes('player') ? 'player' : 'hr'}`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const splitPhones = value => String(value ?? '').split(/[\/|,;]/).map(x => x.trim()).filter(Boolean);
const primaryPhone = value => splitPhones(value)[0] || '';
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
  const phone = primaryPhone(v.phone);
  return `<article class="card auto-card"><div class="card-top"><div><span class="area">${esc(v.area)}</span><h3>${esc(v.name)}</h3></div><span class="auto-badge">Auto-added</span></div><div class="details"><span>🏟 <b>${esc(v.courts)}</b> courts</span><span>💸 <b>${esc(money(v))}</b></span><span>⏰ ${esc(v.hours)}</span></div><div class="tags">${(v.tags||[]).map(t=>`<span>${labels[t]||esc(t)}</span>`).join('')}</div><p class="address">${esc(v.address)}</p>${v.notes?`<p class="venue-note">${esc(v.notes)}</p>`:''}<div class="card-actions">${link('Maps',map,true)}${link('Facebook',v.fb)}${link('Instagram',v.instagram)}${link('Book / Schedule',v.booking)}${phone?`<a class="secondary-btn" href="tel:${esc(phone.replace(/[^+\d]/g,''))}">Call</a>`:''}${v.email?`<a class="secondary-btn" href="mailto:${esc(v.email)}">Email</a>`:''}</div></article>`;
}

function updateDiscoveryStats(){
  if(!results) return;
  const stats = document.getElementById('stats');
  const meta = document.getElementById('resultMeta');
  const coreCount = results.querySelectorAll('.card:not(.auto-card)').length;
  const discoveredCount = results.querySelectorAll('.auto-card').length;
  const shownCount = coreCount + discoveredCount;
  if(stats){
    stats.innerHTML = `<div><b>${coreCount}</b><span>Core venues</span></div><div><b>${discoveredCount}</b><span>Discovered venues</span></div><div><b>${shownCount}</b><span>Shown now</span></div>`;
  }
  if(meta){
    const label = region?.value === 'all' ? 'Philippines' : region?.value === 'cebu' ? 'Cebu' : 'selected region';
    meta.textContent = `${shownCount} venue${shownCount===1?'':'s'} found · ${label}`;
  }
}

function renderAuto(){
  if(!results || busy) return;
  busy = true;
  const f = activeFilters();
  let list = autoVenues.filter(v => matches(v,f));
  if(sort?.value === 'price-low') list.sort((a,b)=>(a.price??99999)-(b.price??99999));
  if(sort?.value === 'price-high') list.sort((a,b)=>(b.price??-1)-(a.price??-1));
  if(sort?.value === 'courts-high') list.sort((a,b)=>(b.courts||0)-(a.courts||0));
  if(sort?.value === 'name') list.sort((a,b)=>a.name.localeCompare(b.name));
  results.querySelectorAll('.auto-card').forEach(el => el.remove());
  results.insertAdjacentHTML('beforeend', list.map(card).join(''));
  updateDiscoveryStats();
  busy = false;
}

async function load(){
  const payloads = await Promise.all(feedUrls.map(async url => {
    try{
      const res = await fetch(url, {cache:'no-store'});
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }catch(err){
      console.warn(`PicklePH feed unavailable (${url}):`, err);
      return [];
    }
  }));

  const seen = new Set();
  autoVenues = payloads.flat().filter(v => {
    if(!v?.name) return false;
    const key = `${String(v.name).trim().toLowerCase()}|${String(v.address ?? '').trim().toLowerCase()}`;
    if(seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  renderAuto();
}

['input','change','click'].forEach(type=>document.addEventListener(type, e=>{
  if(e.target.matches('#search,#region,#sort,[data-area],[data-price],[data-key],#resetBtn,#emptyReset')) setTimeout(renderAuto, 0);
}));

new MutationObserver(()=>{
  if(!busy && results && autoVenues.length && !results.querySelector('.auto-card')) setTimeout(renderAuto,0);
}).observe(results,{childList:true});

load();
