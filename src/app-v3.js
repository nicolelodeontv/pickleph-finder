const FEEDS = [
  './data/auto-courts.json',
  './data/discovery-1.json',
  './data/discovery-2.json',
  './data/discovery-3.json',
  './data/discovery-4.json',
  './data/discovery-5.json',
  './data/discovery-6.json'
];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (m) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[m]));
const slug = (value) => String(value || '').toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_-]+/g, '-');
const phones = (value) => String(value || '').split(/[\/|,;]/).map((x) => x.trim()).filter(Boolean);
const price = (venue) => venue.price == null ? 'Check venue' : `₱${Number(venue.price).toLocaleString()}/${String(venue.unit || '').includes('player') ? 'player' : 'hr'}`;
const labels = { indoor:'Indoor', outdoor:'Outdoor', aircon:'Aircon', lights:'Night lights', parking:'Parking', paddleRental:'Paddle rental', openPlay:'Open play', cafe:'Food / café' };
const regionNames = { cebu:'Cebu', 'metro-manila':'Metro Manila', davao:'Davao', iloilo:'Iloilo', 'cagayan-de-oro':'Cagayan de Oro', batangas:'Batangas', pampanga:'Pampanga / Clark', 'camarines-sur':'Camarines Sur', bacolod:'Bacolod', bohol:'Bohol', 'negros-oriental':'Dumaguete / Negros Oriental', 'general-santos':'General Santos', palawan:'Palawan', laguna:'Laguna', rizal:'Rizal', cavite:'Cavite' };
const centers = { 'Cebu City':[10.3157,123.8854], Mandaue:[10.3236,123.922], Consolacion:[10.3769,123.9577], Liloan:[10.3997,123.999], Talisay:[10.2447,123.8494], Minglanilla:[10.2466,123.7965], 'Lapu-Lapu':[10.3103,123.9494], Naga:[10.2086,123.7581], Carcar:[10.1061,123.6402], Argao:[9.8825,123.608], Compostela:[10.455,124.01], Bantayan:[11.1684,123.7225], Pinamungahan:[10.2701,123.5836], Balamban:[10.2357,123.7115], 'Davao City':[7.1907,125.4553], 'Quezon City':[14.676,121.0437], Manila:[14.5995,120.9842], Makati:[14.5547,121.0244], Pasig:[14.5764,121.0851], Taguig:[14.5176,121.0509], Marikina:[14.6507,121.1029], Pasay:[14.5378,121.0014], Muntinlupa:[14.4081,121.0415], 'Las Piñas':[14.4508,120.982], Parañaque:[14.4793,121.0198], Mandaluyong:[14.5794,121.0359], Caloocan:[14.6488,120.9647], Valenzuela:[14.7009,120.983], Navotas:[14.6667,120.9417], 'San Juan':[14.6019,121.0355], Bacolod:[10.6765,122.9509], 'Iloilo City':[10.7202,122.5621], Batangas:[13.7565,121.0583], Clark:[15.185,120.5406], 'Angeles City':[15.145,120.5887], 'Cagayan de Oro':[8.4542,124.6319], Dumaguete:[9.3068,123.3054], 'General Santos':[6.1164,125.1716], Bohol:[9.85,124.1435], Palawan:[9.8349,118.7384] };

let venues = [];
let map = null;
let markers = [];
let userPos = null;
let reviews = JSON.parse(localStorage.getItem('pp-reviews') || '{}');
let reports = JSON.parse(localStorage.getItem('pp-reports') || '[]');

const state = {
  region: 'cebu',
  search: '',
  areas: new Set(),
  price: null,
  keys: new Set(),
  quick: new Set(),
  sort: 'recommended',
  view: 'list',
  theme: localStorage.getItem('pp-theme') || 'dark',
  favorites: new Set(JSON.parse(localStorage.getItem('pp-favs') || '[]')),
  compare: new Set(JSON.parse(localStorage.getItem('pp-compare') || '[]'))
};

function persist() {
  localStorage.setItem('pp-theme', state.theme);
  localStorage.setItem('pp-favs', JSON.stringify([...state.favorites]));
  localStorage.setItem('pp-compare', JSON.stringify([...state.compare]));
}

function regionLabel(region) {
  return regionNames[region] || String(region || '').replace(/\b\w/g, (c) => c.toUpperCase());
}

function coords(venue) {
  const lat = Number(venue?.lat);
  const lng = Number(venue?.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
}

function parseHours(value) {
  const normalized = String(value || '').toLowerCase().replace(/[–—]/g, '-');
  if (/24\s*(hours|hrs|\/7)|always/.test(normalized)) return [0, 1440, true];
  const parts = normalized.split('-');
  if (parts.length !== 2) return null;
  const clock = (input) => {
    const match = input.trim().match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
    if (!match) return null;
    let hour = Number(match[1]);
    const minute = Number(match[2] || 0);
    if (match[3] === 'pm' && hour < 12) hour += 12;
    if (match[3] === 'am' && hour === 12) hour = 0;
    return hour * 60 + minute;
  };
  const start = clock(parts[0]);
  const end = clock(parts[1]);
  return start == null || end == null ? null : [start, end, end <= start];
}

function openNow(venue) {
  const period = parseHours(venue.hours);
  if (!period) return false;
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  return period[2] ? minutes >= period[0] || minutes <= period[1] : minutes >= period[0] && minutes <= period[1];
}

function late(venue) {
  const period = parseHours(venue.hours);
  return Boolean(period && (period[2] || period[1] >= 1320));
}

function freshness(venue) {
  const stamp = venue.verified || venue.updated || venue.addedAt;
  if (!stamp) return ['Needs verification', 'warn'];
  const days = Math.floor((Date.now() - new Date(stamp).getTime()) / 86400000);
  if (!Number.isFinite(days)) return ['Needs verification', 'warn'];
  if (days <= 14) return [`✓ Verified ${stamp}`, 'good'];
  if (days <= 45) return [`Last checked ${days}d ago`, 'ok'];
  return [`⚠ Last checked ${days}d ago`, 'warn'];
}

function isNew(venue) {
  if (!venue.addedAt) return false;
  const age = Date.now() - new Date(venue.addedAt).getTime();
  return Number.isFinite(age) && age <= 14 * 86400000;
}

function distance(venue) {
  if (!userPos) return Infinity;
  const target = coords(venue);
  if (!target) return Infinity;
  const radians = (x) => x * Math.PI / 180;
  const radius = 6371;
  const a = radians(target[0] - userPos[0]);
  const b = radians(target[1] - userPos[1]);
  const q = Math.sin(a / 2) ** 2 + Math.cos(radians(userPos[0])) * Math.cos(radians(target[0])) * Math.sin(b / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(q), Math.sqrt(1 - q));
}

function smart(query) {
  const text = String(query || '').toLowerCase();
  const result = { price: null, keys: [], open: false, late: false, available: false };
  const match = text.match(/(?:under|below|less than|<=|₱)\s*(\d{2,4})/);
  if (match) result.price = Number(match[1]);
  if (/indoor/.test(text)) result.keys.push('indoor');
  if (/outdoor/.test(text)) result.keys.push('outdoor');
  if (/parking/.test(text)) result.keys.push('parking');
  if (/open play/.test(text)) result.keys.push('openPlay');
  if (/paddle/.test(text)) result.keys.push('paddleRental');
  if (/aircon/.test(text)) result.keys.push('aircon');
  result.open = /open now/.test(text);
  result.late = /late|after\s*9|after\s*10|midnight/.test(text);
  result.available = /available today|availability|book today/.test(text);
  return result;
}

function matches(venue) {
  const parsed = smart(state.search);
  const haystack = `${venue.name || ''} ${venue.area || ''} ${venue.address || ''} ${venue.source || ''}`.toLowerCase();
  const ignored = new Set(['near','the','and','with','under','below','less','than','open','now','today','court','courts','pickleball']);
  const words = state.search.toLowerCase().split(/\s+/).filter((word) => word.length > 2 && !ignored.has(word));
  if (state.region !== 'all' && venue.region !== state.region) return false;
  if (words.length && !words.every((word) => haystack.includes(word))) return false;
  if (state.areas.size && !state.areas.has(venue.area)) return false;
  const priceCaps = [state.price, parsed.price].filter((value) => value != null);
  if (priceCaps.length && (venue.price == null || venue.price > Math.min(...priceCaps))) return false;
  for (const key of [...state.keys, ...parsed.keys]) if (!venue.tags?.includes(key)) return false;
  if ((state.quick.has('open') || parsed.open) && !openNow(venue)) return false;
  if ((state.quick.has('late') || parsed.late) && !late(venue)) return false;
  if ((state.quick.has('available') || parsed.available) && !(venue.booking || parseHours(venue.hours))) return false;
  if (state.quick.has('favorites') && !state.favorites.has(slug(venue.name))) return false;
  for (const [key, max] of [['near5',5],['near10',10],['near25',25]]) {
    if (state.quick.has(key) && (!userPos || distance(venue) > max)) return false;
  }
  return true;
}

function sorted() {
  return venues.filter(matches).sort((a, b) => {
    if (state.sort === 'nearest') return distance(a) - distance(b);
    if (state.sort === 'closest-open') return Number(openNow(b)) - Number(openNow(a)) || distance(a) - distance(b);
    if (state.sort === 'price-low') return (a.price ?? 99999) - (b.price ?? 99999);
    if (state.sort === 'price-high') return (b.price ?? -1) - (a.price ?? -1);
    if (state.sort === 'courts-high') return (b.courts || 0) - (a.courts || 0);
    if (state.sort === 'name') return a.name.localeCompare(b.name);
    return Number(isNew(b)) - Number(isNew(a)) || (b.rating ?? 0) - (a.rating ?? 0) || (b.courts || 0) - (a.courts || 0);
  });
}

function mapUrl(venue) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue.name} ${venue.address || ''}`)}`;
}

function best(venue) {
  const tags = [];
  if (venue.price != null && venue.price <= 300) tags.push('₱ Best budget');
  if (venue.tags?.includes('indoor')) tags.push('Best indoor');
  if (venue.tags?.includes('openPlay')) tags.push('Best open play');
  if (late(venue)) tags.push('🕐 Best late night');
  if ((venue.courts || 0) >= 6) tags.push('Most courts');
  if (venue.rating >= 4.7) tags.push('🔥 Popular');
  return (tags.length ? tags : ['Best local pick']).slice(0, 2).map((tag) => `<span>${esc(tag)}</span>`).join('');
}

function card(venue) {
  const id = slug(venue.name);
  const favorite = state.favorites.has(id);
  const comparing = state.compare.has(id);
  const fresh = freshness(venue);
  const km = distance(venue);
  const phone = phones(venue.phone)[0];
  const distanceBadge = Number.isFinite(km) && coords(venue) ? `<span class="data-badge">📍 ${km.toFixed(1)} km · ~${Math.max(1, Math.round(km * 3.2))} min</span>` : '';
  return `<article class="v-card ${comparing ? 'compare-selected' : ''}"><div class="v-card-top"><div><div class="area">${esc(regionLabel(venue.region))} · ${esc(venue.area)}</div><h3>${esc(venue.name)}</h3></div><button class="icon-btn save-btn ${favorite ? 'active' : ''}" data-fav="${esc(id)}" aria-label="${favorite ? 'Remove from' : 'Save to'} favorites">${favorite ? '♥' : '♡'}</button></div><div class="badges"><span class="data-badge ${fresh[1]}">${esc(fresh[0])}</span>${isNew(venue) ? '<span class="data-badge new">🆕 New</span>' : ''}${openNow(venue) ? '<span class="data-badge open">🟢 Open now</span>' : ''}${late(venue) ? '<span class="data-badge">🕐 Late</span>' : ''}${distanceBadge}</div><div class="v-stats"><span>🏟 <b>${venue.courts ?? '?'}</b> courts</span><span>💸 <b>${esc(price(venue))}</b></span><span>⏰ ${esc(venue.hours || 'Check venue')}</span>${venue.rating ? `<span>★ <b>${venue.rating}</b></span>` : ''}</div><div class="tags">${(venue.tags || []).slice(0, 5).map((tag) => `<span>${labels[tag] || esc(tag)}</span>`).join('')}</div><div class="best-for">${best(venue)}</div><p class="address">${esc(venue.address || 'Address not publicly listed')}</p><div class="v-actions"><a class="v-action primary-btn" href="${mapUrl(venue)}" target="_blank" rel="noopener">Directions</a>${venue.booking ? `<a class="v-action secondary-btn" href="${esc(venue.booking)}" target="_blank" rel="noopener">Book</a>` : ''}${phone ? `<a class="v-action secondary-btn" href="tel:${phone.replace(/[^+\d]/g, '')}">Call</a>` : ''}${venue.fb ? `<a class="v-action secondary-btn" href="${esc(venue.fb)}" target="_blank" rel="noopener">Facebook</a>` : ''}</div><div class="v-footer"><button class="text-btn" data-details="${esc(id)}">View details</button><button class="text-btn ${comparing ? 'active-text' : ''}" data-compare="${esc(id)}">${comparing ? '✓ Comparing' : 'Compare'}</button></div></article>`;
}

function renderMap(list) {
  if (state.view !== 'map' || !window.L) return;
  $('#map').hidden = false;
  if (!map) {
    map = L.map('map', { scrollWheelZoom: false }).setView(centers['Cebu City'], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap contributors' }).addTo(map);
  }
  markers.forEach((marker) => marker.remove());
  markers = [];
  const bounds = [];
  for (const venue of list) {
    const point = coords(venue);
    if (!point) continue;
    bounds.push(point);
    const marker = L.marker(point).addTo(map).bindPopup(`<b>${esc(venue.name)}</b><br>${esc(price(venue))}<br><button class="map-details" data-map-open="${esc(slug(venue.name))}">View details</button>`);
    markers.push(marker);
  }
  if (userPos) {
    bounds.push(userPos);
    markers.push(L.circleMarker(userPos, { radius: 8 }).addTo(map).bindPopup('You are here'));
  }
  const missing = list.filter((venue) => !coords(venue)).length;
  const panel = $('#map');
  if (missing && !panel.querySelector('.map-data-note')) {
    panel.insertAdjacentHTML('afterbegin', `<div class="map-data-note">Map pins use verified latitude/longitude only. ${missing} matching venue${missing === 1 ? '' : 's'} still need exact coordinates, so they are not placed on a false city-center pin.</div>`);
  }
  if (!missing) panel.querySelector('.map-data-note')?.remove();
  if (bounds.length) map.fitBounds(bounds, { padding: [25, 25], maxZoom: 13 });
}

function closeModal() {
  const modal = $('#detailsModal');
  modal.hidden = true;
  document.body.classList.remove('modal-open');
}

function openModal(venue) {
  const id = slug(venue.name);
  const fresh = freshness(venue);
  const phone = phones(venue.phone)[0];
  const venueReviews = reviews[id] || [];
  $('#modalContent').innerHTML = `<div class="modal-header"><div><div class="area">${esc(regionLabel(venue.region))} · ${esc(venue.area)}</div><h2>${esc(venue.name)}</h2><div class="modal-sub">${esc(fresh[0])} · ${esc(venue.source || 'Public directory')}</div></div><button class="icon-btn" data-close>×</button></div><div class="photo-placeholder"><span>🏓</span><b>${venue.photos?.length ? 'Venue photos available' : 'Venue photo'}</b><small>${venue.photos?.length ? 'Open the venue media links below.' : 'Public photo gallery can be added when photo hosting is connected.'}</small></div><div class="modal-grid"><div><span class="modal-label">Address</span><p>${esc(venue.address || 'Not publicly listed')}</p><a class="text-link" href="${mapUrl(venue)}" target="_blank" rel="noopener">Open Google Maps ↗</a></div><div><span class="modal-label">Court setup</span><p>${venue.courts ?? '?'} courts · ${venue.tags?.includes('indoor') ? 'Indoor' : 'Outdoor'}${venue.tags?.includes('aircon') ? ' · Aircon' : ''}</p></div><div><span class="modal-label">Price</span><p>${esc(price(venue))}</p></div><div><span class="modal-label">Hours</span><p>${esc(venue.hours || 'Check venue')} ${openNow(venue) ? '<b class="open-text">· Open now</b>' : ''}</p></div><div><span class="modal-label">Phone</span><p>${phone ? `<a class="text-link" href="tel:${phone.replace(/[^+\d]/g, '')}">${esc(venue.phone)}</a>` : 'Not publicly listed'}</p></div><div><span class="modal-label">Booking</span><p>${venue.booking ? '<span class="good-text">Online booking link available</span>' : 'Not publicly listed'}</p></div><div class="modal-wide"><span class="modal-label">Best for</span><div class="best-for">${best(venue)}</div></div><div class="modal-wide"><span class="modal-label">Amenities</span><div class="tags">${(venue.tags || []).map((tag) => `<span>${labels[tag] || esc(tag)}</span>`).join('')}</div></div><div class="modal-wide"><span class="modal-label">Community reports</span><div class="report-grid">${['Price accurate','Court condition','Parking','Lighting','Crowded','Beginner friendly'].map((label) => `<button class="chip" data-report="${esc(label)}">${label === 'Crowded' || label === 'Beginner friendly' ? label : `✓ ${label}`}</button>`).join('')}</div></div><div class="modal-wide reviews"><div class="review-head"><span class="modal-label">Reviews</span><button class="secondary-btn" data-review>Leave a review</button></div>${venueReviews.length ? venueReviews.map((review) => `<div class="review"><b>★★★★★</b><p>${esc(review.text)}</p><small>${esc(review.date)}</small></div>`).join('') : '<p class="muted">No local reviews yet.</p>'}</div><div class="modal-wide modal-foot-actions"><button class="secondary-btn" data-share>Share court</button><button class="secondary-btn" data-report-info>Report incorrect info</button></div></div>`;
  $('#detailsModal').hidden = false;
  document.body.classList.add('modal-open');
  $$('[data-close]').forEach((button) => button.onclick = closeModal);
  $$('[data-report]').forEach((button) => button.onclick = () => {
    reports.push({ venue: venue.name, report: button.dataset.report, submittedAt: new Date().toISOString() });
    localStorage.setItem('pp-reports', JSON.stringify(reports));
    toast('Report saved on this device only.');
  });
  $$('[data-review]').forEach((button) => button.onclick = () => {
    const text = prompt(`Review ${venue.name}`);
    if (!text?.trim()) return;
    (reviews[id] ??= []).push({ text: text.trim(), date: new Date().toLocaleDateString() });
    localStorage.setItem('pp-reviews', JSON.stringify(reviews));
    openModal(venue);
  });
  $$('[data-share]').forEach((button) => button.onclick = () => {
    const url = `${location.origin}/courts/${id}`;
    if (navigator.share) navigator.share({ title: venue.name, url }).catch(() => {});
    else navigator.clipboard?.writeText(url).then(() => toast('Court link copied.')).catch(() => prompt('Copy court link:', url));
  });
  $$('[data-report-info]').forEach((button) => button.onclick = () => {
    reports.push({ venue: venue.name, report: 'Incorrect venue information', submittedAt: new Date().toISOString() });
    localStorage.setItem('pp-reports', JSON.stringify(reports));
    toast('Report saved on this device only.');
  });
}

function compareView() {
  const selected = [...state.compare].map((id) => venues.find((venue) => slug(venue.name) === id)).filter(Boolean);
  if (selected.length < 2) return toast('Select at least 2 courts.');
  const rows = [['Price', (v) => price(v)], ['Courts', (v) => v.courts], ['Indoor', (v) => v.tags?.includes('indoor') ? '✓' : '—'], ['Parking', (v) => v.tags?.includes('parking') ? '✓' : '—'], ['Open Play', (v) => v.tags?.includes('openPlay') ? '✓' : '—'], ['Paddle Rental', (v) => v.tags?.includes('paddleRental') ? '✓' : '—'], ['Aircon', (v) => v.tags?.includes('aircon') ? '✓' : '—'], ['Booking', (v) => v.booking ? '✓' : '—']];
  $('#modalContent').innerHTML = `<div class="modal-header"><div><div class="area">COURT INTELLIGENCE</div><h2>Compare courts</h2></div><button class="icon-btn" data-close>×</button></div><div class="compare-table"><div class="compare-row head"><div> </div>${selected.map((venue) => `<div><b>${esc(venue.name)}</b></div>`).join('')}</div>${rows.map(([label, fn]) => `<div class="compare-row"><div>${label}</div>${selected.map((venue) => `<div>${esc(fn(venue))}</div>`).join('')}</div>`).join('')}</div>`;
  $('#detailsModal').hidden = false;
  document.body.classList.add('modal-open');
  $$('[data-close]').forEach((button) => button.onclick = closeModal);
}

function renderCompare() {
  let bar = $('#compareBar');
  if (!state.compare.size) { bar?.remove(); return; }
  const selected = [...state.compare].map((id) => venues.find((venue) => slug(venue.name) === id)).filter(Boolean);
  if (!bar) { bar = document.createElement('div'); bar.id = 'compareBar'; document.body.appendChild(bar); }
  bar.innerHTML = `<div><b>${selected.length}/4 comparing</b><span>${selected.map((venue) => esc(venue.name)).join(' · ')}</span></div><div><button class="secondary-btn" data-cclear>Clear</button><button class="primary-btn" data-ccompare>Compare courts</button></div>`;
  bar.querySelector('[data-cclear]').onclick = () => { state.compare.clear(); persist(); render(); };
  bar.querySelector('[data-ccompare]').onclick = compareView;
}

function toast(message) {
  let element = $('#toast');
  if (!element) { element = document.createElement('div'); element.id = 'toast'; document.body.appendChild(element); }
  element.textContent = message;
  element.classList.add('show');
  clearTimeout(element._timer);
  element._timer = setTimeout(() => element.classList.remove('show'), 2200);
}

function submitCourt() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `<div class="modal-panel"><div class="modal-header"><div><div class="area">COMMUNITY DIRECTORY</div><h2>Add a Court</h2></div><button class="icon-btn" data-submit-close>×</button></div><p class="muted">This form is saved on this device only. It is not sent to PicklePH or published automatically.</p><form class="submit-form"><input name="name" required placeholder="Venue name"><input name="address" required placeholder="Address"><input name="phone" placeholder="Phone"><input name="fb" type="url" placeholder="Facebook URL"><input name="booking" type="url" placeholder="Booking URL"><input name="courts" type="number" min="1" placeholder="Court count"><input name="price" type="number" min="0" placeholder="Price / hour"><select name="setup"><option>Indoor</option><option>Outdoor</option><option>Indoor + outdoor</option></select><input name="photo" type="url" placeholder="Photo URL (optional)"><label><input name="parking" type="checkbox"> Parking</label><label><input name="lights" type="checkbox"> Night lights</label><label><input name="openPlay" type="checkbox"> Open play</label><button class="primary-btn" type="submit">Save on this device</button></form></div>`;
  document.body.appendChild(modal);
  modal.querySelector('[data-submit-close]').onclick = () => modal.remove();
  modal.querySelector('form').onsubmit = (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    data.status = 'Pending verification';
    data.submittedAt = new Date().toISOString();
    const saved = JSON.parse(localStorage.getItem('pp-submissions') || '[]');
    saved.push(data);
    localStorage.setItem('pp-submissions', JSON.stringify(saved));
    modal.remove();
    toast('Saved on this device only.');
  };
}

function buildHome() {
  document.querySelector('main').innerHTML = `<section class="hero-v2"><div><p class="eyebrow">CEBU FIRST · PHILIPPINES READY</p><h1>Find your next pickleball game.</h1><p class="hero-copy">Search, locate, compare and save pickleball courts across Cebu and the Philippines.</p><div class="hero-actions"><button class="primary-btn" data-find>Find a court</button><button class="secondary-btn" data-add>+ Add a Court</button></div></div><div id="stats" class="stats"></div></section><section class="cebu-hub"><div><p class="eyebrow">CEBU FIRST</p><h2>Play around Cebu</h2><p>Jump straight into the strongest local areas.</p></div><div id="cebuAreas" class="chips"></div></section><section class="explore-ph"><div><p class="eyebrow">EXPLORE PHILIPPINES</p><h2>Courts across the country</h2></div><div id="phRegions" class="chips"></div></section><section class="finder-v2" id="finder"><div class="search-row"><label class="search-box"><span>⌕</span><input id="search" type="search" placeholder="Try “indoor Cebu under ₱400” or “open play Mandaue”…"></label><select id="region"></select><select id="sort"><option value="recommended">Recommended</option><option value="nearest">Nearest</option><option value="closest-open">Closest open</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="courts-high">Most courts</option><option value="name">Name A–Z</option></select></div><div class="quick"><button class="chip" data-quick="near5">📍 Within 5 km</button><button class="chip" data-quick="near10">Within 10 km</button><button class="chip" data-quick="near25">Within 25 km</button><button class="chip" data-quick="open">🟢 Open now</button><button class="chip" data-quick="late">🕐 Open late</button><button class="chip" data-quick="available">Available today</button><button class="chip" data-quick="favorites">♥ My courts</button><button class="chip" data-view="map">🗺 Map</button><button class="chip" data-view="list">☷ List</button><button class="chip" data-more>More filters</button></div><div class="filters-collapsed" hidden><div class="filter-group"><span class="filter-label">Area</span><div id="areaChips" class="chips"></div></div><div class="filter-group"><span class="filter-label">Price</span><div class="chips"><button class="chip" data-price="400">≤ ₱400</button><button class="chip" data-price="300">≤ ₱300</button><button class="chip" data-price="200">≤ ₱200</button></div></div><div class="filter-group"><span class="filter-label">Setup</span><div class="chips"><button class="chip" data-key="indoor">Indoor</button><button class="chip" data-key="outdoor">Outdoor</button><button class="chip" data-key="aircon">Aircon</button><button class="chip" data-key="lights">Night lights</button></div></div><div class="filter-group"><span class="filter-label">Amenities</span><div class="chips"><button class="chip" data-key="parking">Parking</button><button class="chip" data-key="paddleRental">Paddle rental</button><button class="chip" data-key="openPlay">Open play</button><button class="chip" data-key="cafe">Food / café</button></div></div></div><div class="filter-footer"><button id="resetBtn" class="text-btn">Reset filters</button><span id="filterSummary"></span></div></section><section class="results-head"><div><h2>Courts near you</h2><p id="resultMeta">Loading courts…</p></div><span class="status-pill">✓ Freshness-aware public directory</span></section><div id="map" class="map-panel" hidden></div><section id="results" class="grid"></section><section class="empty" id="empty" hidden><div class="empty-icon">🥒</div><h3>No courts match those filters</h3><p>Try a wider area or remove a filter.</p><button id="emptyReset" class="primary-btn">Clear filters</button></section><section class="new-strip"><div><p class="eyebrow">RECENTLY ADDED</p><h2>New this week</h2></div><div id="recentlyAdded" class="recent-grid"></div></section><section class="how"><div><p class="eyebrow">COURT INTELLIGENCE</p><h2>Find the right court, faster.</h2><p>Use location, price, schedule, amenities, freshness and popularity together.</p></div><div class="how-grid"><div><b>01</b><span>Locate</span><p>Real browser location</p></div><div><b>02</b><span>Compare</span><p>Up to four courts</p></div><div><b>03</b><span>Play</span><p>Directions and booking</p></div></div></section>`;
}

function bind() {
  document.documentElement.dataset.theme = state.theme;
  $('#themeBtn').textContent = state.theme === 'dark' ? '☼' : '☾';
  $('#themeBtn').onclick = () => { state.theme = state.theme === 'dark' ? 'light' : 'dark'; persist(); document.documentElement.dataset.theme = state.theme; $('#themeBtn').textContent = state.theme === 'dark' ? '☼' : '☾'; };
  $('#locateBtn').onclick = () => {
    if (!navigator.geolocation) return toast('Geolocation is unavailable.');
    navigator.geolocation.getCurrentPosition((position) => { userPos = [position.coords.latitude, position.coords.longitude]; state.sort = 'nearest'; render(); toast('Location enabled — nearest courts sorted first.'); }, () => toast('Location access was not granted.'));
  };
  $('#addCourtBtn').onclick = submitCourt;
  $('#search').oninput = (event) => { state.search = event.target.value; render(); };
  $('#region').onchange = (event) => { state.region = event.target.value; state.areas.clear(); render(); };
  $('#sort').onchange = (event) => { state.sort = event.target.value; render(); };
  $('#resetBtn').onclick = $('#emptyReset').onclick = () => { state.search=''; state.areas.clear(); state.price=null; state.keys.clear(); state.quick.clear(); state.sort='recommended'; $('#search').value=''; render(); };
  document.addEventListener('click', (event) => {
    const favorite = event.target.closest('[data-fav]');
    if (favorite) { const id = favorite.dataset.fav; state.favorites.has(id) ? state.favorites.delete(id) : state.favorites.add(id); persist(); render(); return; }
    const compare = event.target.closest('[data-compare]');
    if (compare) { const id = compare.dataset.compare; if (state.compare.has(id)) state.compare.delete(id); else if (state.compare.size < 4) state.compare.add(id); else return toast('Compare up to 4 courts.'); persist(); render(); return; }
    const detail = event.target.closest('[data-details],[data-map-open]');
    if (detail) { const id = detail.dataset.details || detail.dataset.mapOpen; const venue = venues.find((item) => slug(item.name) === id); if (venue) openModal(venue); return; }
    const priceButton = event.target.closest('[data-price]');
    if (priceButton) { const value = Number(priceButton.dataset.price); state.price = state.price === value ? null : value; render(); return; }
    const keyButton = event.target.closest('[data-key]');
    if (keyButton) { const key = keyButton.dataset.key; state.keys.has(key) ? state.keys.delete(key) : state.keys.add(key); render(); return; }
    const quick = event.target.closest('[data-quick]');
    if (quick) { const key = quick.dataset.quick; if ((key === 'near5' || key === 'near10' || key === 'near25') && !userPos) return toast('Use “Use my location” first.'); state.quick.has(key) ? state.quick.delete(key) : state.quick.add(key); render(); return; }
    const view = event.target.closest('[data-view]');
    if (view) { state.view = view.dataset.view; $('#map').hidden = state.view !== 'map'; render(); return; }
    const more = event.target.closest('[data-more]');
    if (more) { const filters = $('.filters-collapsed'); filters.hidden = !filters.hidden; return; }
    const area = event.target.closest('[data-area-jump]');
    if (area) { state.region = 'cebu'; state.areas = new Set([area.dataset.areaJump]); render(); $('#finder').scrollIntoView({ behavior:'smooth', block:'center' }); return; }
    const region = event.target.closest('[data-region-jump]');
    if (region) { state.region = region.dataset.regionJump; state.areas.clear(); render(); $('#finder').scrollIntoView({ behavior:'smooth', block:'center' }); return; }
    if (event.target.closest('[data-find]')) { $('#finder').scrollIntoView({ behavior:'smooth', block:'center' }); setTimeout(() => $('#search').focus(), 300); return; }
    if (event.target.closest('[data-add]')) submitCourt();
  });
  $('#detailsModal').onclick = (event) => { if (event.target.id === 'detailsModal') closeModal(); };
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeModal(); });
}

function fillHome() {
  const regions = [...new Set(venues.map((venue) => venue.region).filter(Boolean))].sort((a, b) => regionLabel(a).localeCompare(regionLabel(b)));
  $('#region').innerHTML = `<option value="all">All regions</option>${regions.map((region) => `<option value="${esc(region)}">${esc(regionLabel(region))}</option>`).join('')}`;
  $('#region').value = state.region;
  $('#cebuAreas').innerHTML = ['Cebu City','Mandaue','Consolacion','Lapu-Lapu','Talisay','Minglanilla','Liloan'].map((area) => `<button class="chip" data-area-jump="${esc(area)}">${esc(area)}</button>`).join('');
  $('#phRegions').innerHTML = regions.filter((region) => region !== 'cebu').slice(0, 18).map((region) => `<button class="chip" data-region-jump="${esc(region)}">${esc(regionLabel(region))}</button>`).join('');
  $('#recentlyAdded').innerHTML = venues.filter(isNew).slice(0, 6).map((venue) => `<button class="recent-card" data-details="${esc(slug(venue.name))}"><span>🆕</span><b>${esc(venue.name)}</b><small>${esc(venue.area)}</small></button>`).join('') || '<p class="muted">Fresh listings will appear here when added with an Added date.</p>';
}

function render() {
  const list = sorted();
  $('#results').className = state.view === 'map' ? 'results-map' : 'grid';
  $('#results').innerHTML = list.map(card).join('');
  $('#empty').hidden = list.length > 0;
  const label = state.region === 'all' ? 'Philippines' : regionLabel(state.region);
  $('#resultMeta').textContent = `${list.length} venue${list.length === 1 ? '' : 's'} found · ${label}${state.sort === 'nearest' ? ' · Sorted by distance' : ''}`;
  const parsed = smart(state.search);
  $('#filterSummary').textContent = [parsed.price ? `Smart ≤ ₱${parsed.price}` : '', parsed.open ? 'Open now' : '', parsed.late ? 'Open late' : '', parsed.available ? 'Schedule/booking info' : ''].filter(Boolean).join(' · ');
  $('#stats').innerHTML = `<div><b>${list.length}</b><span>Shown</span></div><div><b>${venues.length}</b><span>Venues</span></div><div><b>${venues.reduce((total, venue) => total + (Number(venue.courts) || 0), 0)}</b><span>Listed courts</span></div>`;
  $('#areaChips').innerHTML = [...new Set(venues.filter((venue) => state.region === 'all' || venue.region === state.region).map((venue) => venue.area).filter(Boolean))].sort().slice(0, 24).map((area) => `<button class="chip ${state.areas.has(area) ? 'active' : ''}" data-area-jump="${esc(area)}">${esc(area)}</button>`).join('');
  $$('[data-quick]').forEach((button) => button.classList.toggle('active', state.quick.has(button.dataset.quick)));
  $$('[data-price]').forEach((button) => button.classList.toggle('active', Number(button.dataset.price) === state.price));
  $$('[data-key]').forEach((button) => button.classList.toggle('active', state.keys.has(button.dataset.key)));
  if (state.view === 'map') renderMap(list);
  renderCompare();
}

async function getJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Failed to load ${url}: ${response.status}`);
  const data = await response.json();
  return Array.isArray(data) ? data : data;
}

async function loadData() {
  let core = { venues: [], detailOverrides: {} };
  try {
    const data = await getJson('./data/venues.json');
    core = { venues: Array.isArray(data?.venues) ? data.venues : [], detailOverrides: data?.detailOverrides && typeof data.detailOverrides === 'object' ? data.detailOverrides : {} };
  } catch (error) {
    console.error('PicklePH core data failed to load:', error);
  }

  const feeds = await Promise.all(FEEDS.map(async (feed) => {
    try {
      const data = await getJson(feed);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.warn(`PicklePH feed unavailable: ${feed}`, error);
      return [];
    }
  }));

  const merged = new Map();
  [...core.venues, ...feeds.flat()].forEach((venue) => {
    if (!venue?.name) return;
    const id = slug(venue.name);
    merged.set(id, merged.has(id) ? { ...merged.get(id), ...venue } : { ...venue });
  });

  for (const [name, override] of Object.entries(core.detailOverrides)) {
    const id = slug(name);
    const venue = merged.get(id);
    if (venue) merged.set(id, { ...venue, ...override });
  }

  venues = [...merged.values()];
  fillHome();
  render();
}

(async () => {
  buildHome();
  bind();
  await loadData();
  const path = location.pathname.split('/').filter(Boolean);
  const queryCourt = new URLSearchParams(location.search).get('court');
  const id = queryCourt || (path[0] === 'courts' ? path[1] : null);
  if (id) {
    const venue = venues.find((item) => slug(item.name) === id);
    if (venue) setTimeout(() => openModal(venue), 250);
  }
})();
