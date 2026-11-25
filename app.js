'use strict';

const LOCATIONS = {
  nb: { name: 'North Brunswick, NJ', lat: 40.4540, lon: -74.4799 },
  mb: { name: 'Marlboro, NJ', lat: 40.3154, lon: -74.2463 },
};
const TZ = 'America/New_York';
const REFRESH_MS = 10 * 60 * 1000;

const $ = (id) => document.getElementById(id);
let activeLoc = 'nb';
let lastLoad = 0;
let requestId = 0;

/* ---------- Códigos WMO de Open-Meteo ---------- */
const WMO = {
  0: ['Despejado', 'clear'],
  1: ['Mayormente despejado', 'mostly-clear'],
  2: ['Parcialmente nublado', 'partly'],
  3: ['Nublado', 'cloudy'],
  45: ['Niebla', 'fog'],
  48: ['Niebla con escarcha', 'fog'],
  51: ['Llovizna ligera', 'drizzle'],
  53: ['Llovizna', 'drizzle'],
  55: ['Llovizna intensa', 'drizzle'],
  56: ['Llovizna helada ligera', 'sleet'],
  57: ['Llovizna helada', 'sleet'],
  61: ['Lluvia ligera', 'rain'],
  63: ['Lluvia', 'rain'],
  65: ['Lluvia fuerte', 'heavy-rain'],
  66: ['Lluvia helada ligera', 'sleet'],
  67: ['Lluvia helada', 'sleet'],
  71: ['Nevada ligera', 'snow'],
  73: ['Nevada', 'snow'],
  75: ['Nevada fuerte', 'snow'],
  77: ['Granos de nieve', 'snow'],
  80: ['Chubascos ligeros', 'showers'],
  81: ['Chubascos', 'showers'],
  82: ['Chubascos fuertes', 'heavy-rain'],
  85: ['Chubascos de nieve', 'snow'],
  86: ['Chubascos de nieve fuertes', 'snow'],
  95: ['Tormenta eléctrica', 'storm'],
  96: ['Tormenta con granizo', 'storm'],
  99: ['Tormenta con granizo fuerte', 'storm'],
};
const describe = (code) => (WMO[code] || ['Sin datos', 'cloudy']);

/* ---------- Íconos SVG ---------- */
const sun = (cx, cy, r) => {
  let rays = '';
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const x1 = cx + Math.cos(a) * (r + 4), y1 = cy + Math.sin(a) * (r + 4);
    const x2 = cx + Math.cos(a) * (r + 9), y2 = cy + Math.sin(a) * (r + 9);
    rays += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
  }
  return `<g stroke="#f7b733" stroke-width="3.2" stroke-linecap="round">${rays}</g>` +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#gSun)"/>`;
};
const moon = (cx, cy, r) =>
  `<path d="M${cx + r * 0.35} ${cy - r} A${r} ${r} 0 1 0 ${cx + r} ${cy + r * 0.45} A${r * 0.8} ${r * 0.8} 0 0 1 ${cx + r * 0.35} ${cy - r}Z" fill="url(#gMoon)"/>`;
const cloud = (dx = 0, dy = 0, s = 1, dark = false) =>
  `<path transform="translate(${dx} ${dy}) scale(${s})" fill="url(#${dark ? 'gCloudDark' : 'gCloud'})" ` +
  `d="M18 50h30a11 11 0 0 0 1.5-21.9A15 15 0 0 0 21 24.6 12.5 12.5 0 0 0 18 50z"/>`;
const drops = (n, color = '#3d8ef0') => {
  const xs = n === 2 ? [26, 38] : [21, 32, 43];
  return xs.map((x) => `<line x1="${x}" y1="54" x2="${x - 3}" y2="61" stroke="${color}" stroke-width="3" stroke-linecap="round"/>`).join('');
};
const flakes = () => [22, 32, 42].map((x, i) =>
  `<circle cx="${x}" cy="${i % 2 ? 60 : 56}" r="2.6" fill="#a9d4ff" stroke="#5aa7f0" stroke-width="1"/>`).join('');
const bolt = () => `<path d="M34 46l-7 10h6l-3 8 10-12h-6l4-6z" fill="#ffc83d" stroke="#e59b00" stroke-width="1" stroke-linejoin="round"/>`;
const fogLines = () => [52, 58].map((y, i) =>
  `<line x1="${14 + i * 6}" y1="${y}" x2="${50 - i * 2}" y2="${y}" stroke="#9fb0c4" stroke-width="3" stroke-linecap="round"/>`).join('');

const DEFS = `<defs>
  <radialGradient id="gSun" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#ffe27a"/><stop offset="1" stop-color="#f9a825"/></radialGradient>
  <linearGradient id="gMoon" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6cf"/><stop offset="1" stop-color="#e7c96a"/></linearGradient>
  <linearGradient id="gCloud" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d5e1ee"/></linearGradient>
  <linearGradient id="gCloudDark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9c6d6"/><stop offset="1" stop-color="#7f90a6"/></linearGradient>
</defs>`;

function weatherIcon(code, isDay = true, label = '') {
  const kind = describe(code)[1];
  const orb = (cx, cy, r) => (isDay ? sun(cx, cy, r) : moon(cx, cy, r));
  let body;
  switch (kind) {
    case 'clear': body = isDay ? sun(32, 32, 13) : moon(32, 32, 15); break;
    case 'mostly-clear': body = orb(24, 22, 10) + cloud(8, 6, 0.72); break;
    case 'partly': body = orb(22, 20, 10) + cloud(4, 4, 0.9); break;
    case 'cloudy': body = cloud(-6, -8, 0.85, true) + cloud(0, 0, 1); break;
    case 'fog': body = cloud(0, -6, 1, true) + fogLines(); break;
    case 'drizzle': body = cloud(0, -6, 1) + drops(2, '#62a6f5'); break;
    case 'rain': body = cloud(0, -6, 1, true) + drops(3); break;
    case 'heavy-rain': body = cloud(0, -6, 1, true) + drops(3, '#1f6fd6') + `<line x1="27" y1="56" x2="25" y2="61" stroke="#1f6fd6" stroke-width="3" stroke-linecap="round"/>`; break;
    case 'showers': body = orb(22, 18, 9) + cloud(2, -4, 0.95) + drops(2); break;
    case 'sleet': body = cloud(0, -6, 1, true) + `<line x1="24" y1="54" x2="21" y2="61" stroke="#3d8ef0" stroke-width="3" stroke-linecap="round"/><circle cx="34" cy="58" r="2.6" fill="#a9d4ff" stroke="#5aa7f0"/><line x1="44" y1="54" x2="41" y2="61" stroke="#3d8ef0" stroke-width="3" stroke-linecap="round"/>`; break;
    case 'snow': body = cloud(0, -6, 1) + flakes(); break;
    case 'storm': body = cloud(0, -8, 1, true) + bolt(); break;
    default: body = cloud();
  }
  const a11y = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"';
  return `<svg viewBox="0 0 64 64" ${a11y}>${DEFS}${body}</svg>`;
}

/* ---------- Utilidades ---------- */
const round = (v) => (v == null || Number.isNaN(v) ? '–' : Math.round(v));
const deg = (v) => `${round(v)}°`;
const CARDINALS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
const cardinal = (d) => (d == null ? '' : CARDINALS[Math.round(d / 45) % 8]);

// Open-Meteo devuelve horas locales ("2026-11-25T14:00") por el parámetro timezone.
function parseLocal(iso) {
  const [d, t = '00:00'] = iso.split('T');
  const [y, m, day] = d.split('-').map(Number);
  const [hh, mm] = t.split(':').map(Number);
  return new Date(y, m - 1, day, hh, mm);
}
const fmtHour = (iso) => parseLocal(iso).toLocaleTimeString('es-US', { hour: 'numeric' }).replace(/\s/g, '').replace('.', '').replace('.', '');
const fmtTime = (iso) => parseLocal(iso).toLocaleTimeString('es-US', { hour: 'numeric', minute: '2-digit' });
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/* ---------- API ---------- */
function apiUrl(loc) {
  const p = new URLSearchParams({
    latitude: loc.lat,
    longitude: loc.lon,
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
    hourly: 'temperature_2m,precipitation_probability,weather_code,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max',
    temperature_unit: 'fahrenheit',
    wind_speed_unit: 'mph',
    precipitation_unit: 'inch',
    timezone: TZ,
    forecast_days: '16',
  });
  return `https://api.open-meteo.com/v1/forecast?${p}`;
}

async function load(force = false) {
  const id = ++requestId;
  const loc = LOCATIONS[activeLoc];
  $('refresh').classList.add('spin');
  if (force || !document.querySelector('.hero-temp')) {
    $('hero').innerHTML = '<div class="loading">Cargando clima…</div>';
  }
  try {
    const res = await fetch(apiUrl(loc), { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.reason || 'Error de la API');
    if (id !== requestId) return;
    render(loc, data);
    lastLoad = Date.now();
  } catch (err) {
    if (id !== requestId) return;
    console.error(err);
    $('hero').classList.remove('night');
    $('hero').innerHTML = `<div class="error"><div><strong>No se pudo cargar el clima.</strong></div>
      <div>${navigator.onLine ? 'Intenta de nuevo en un momento.' : 'Sin conexión a internet.'}</div>
      <button type="button" id="retry">Reintentar</button></div>`;
    $('hourly').innerHTML = '';
    $('daily').innerHTML = '';
    $('status').textContent = '';
    $('retry').addEventListener('click', () => load(true));
  } finally {
    if (id === requestId) $('refresh').classList.remove('spin');
  }
}

/* ---------- Render ---------- */
function render(loc, data) {
  const c = data.current;
  const d = data.daily;
  const h = data.hourly;
  const today = c.time.slice(0, 10);
  const [desc] = describe(c.weather_code);
  const isDay = c.is_day === 1;
  const ti = d.time.indexOf(today);
  const t = ti >= 0 ? ti : 0;

  $('hero').classList.toggle('night', !isDay);
  $('hero').innerHTML = `
    <div class="hero-place">${loc.name}</div>
    <div class="hero-time">${cap(parseLocal(c.time).toLocaleDateString('es-US', { weekday: 'long', day: 'numeric', month: 'long' }))} · ${fmtTime(c.time)}</div>
    <div class="hero-main">
      <div class="hero-temp">${round(c.temperature_2m)}<sup>°F</sup></div>
      <div class="hero-icon">${weatherIcon(c.weather_code, isDay, desc)}</div>
    </div>
    <div class="hero-desc">${desc}</div>
    <div class="hero-hilo">Máx ${deg(d.temperature_2m_max[t])} · Mín ${deg(d.temperature_2m_min[t])} · Sensación ${deg(c.apparent_temperature)}</div>
    <div class="stats">
      <div class="stat"><div class="stat-label">Viento</div><div class="stat-value">${round(c.wind_speed_10m)} mph ${cardinal(c.wind_direction_10m)}</div></div>
      <div class="stat"><div class="stat-label">Ráfagas</div><div class="stat-value">${round(c.wind_gusts_10m)} mph</div></div>
      <div class="stat"><div class="stat-label">Humedad</div><div class="stat-value">${round(c.relative_humidity_2m)}%</div></div>
      <div class="stat"><div class="stat-label">Lluvia</div><div class="stat-value">${d.precipitation_probability_max[t] ?? '–'}%</div></div>
      <div class="stat"><div class="stat-label">Amanecer</div><div class="stat-value">${fmtTime(d.sunrise[t])}</div></div>
      <div class="stat"><div class="stat-label">Atardecer</div><div class="stat-value">${fmtTime(d.sunset[t])}</div></div>
    </div>`;

  // Por hora: todas las horas de hoy
  const nowHour = c.time.slice(0, 13);
  let html = '';
  for (let i = 0; i < h.time.length; i++) {
    const time = h.time[i];
    if (time.slice(0, 10) !== today) continue;
    const key = time.slice(0, 13);
    const cls = key === nowHour ? 'now' : key < nowHour ? 'past' : '';
    const pop = h.precipitation_probability[i];
    const [hd] = describe(h.weather_code[i]);
    html += `<div class="hour ${cls}">
      <div class="hour-time">${key === nowHour ? 'Ahora' : fmtHour(time)}</div>
      ${weatherIcon(h.weather_code[i], h.is_day[i] === 1, hd)}
      <div class="hour-temp">${deg(h.temperature_2m[i])}</div>
      <div class="hour-pop">${pop != null && pop >= 10 ? `${pop}%` : ''}</div>
    </div>`;
  }
  const hourly = $('hourly');
  hourly.innerHTML = html;
  const nowEl = hourly.querySelector('.hour.now');
  if (nowEl) hourly.scrollLeft = Math.max(0, nowEl.offsetLeft - hourly.offsetLeft - 16);

  // Diario: 16 días
  const lo = Math.min(...d.temperature_2m_min.filter((v) => v != null));
  const hi = Math.max(...d.temperature_2m_max.filter((v) => v != null));
  const span = Math.max(1, hi - lo);
  $('daily').innerHTML = d.time.map((day, i) => {
    const date = parseLocal(day);
    const name = day === today ? 'Hoy' : cap(date.toLocaleDateString('es-US', { weekday: 'short' }).replace('.', ''));
    const sub = date.toLocaleDateString('es-US', { day: 'numeric', month: 'short' }).replace('.', '');
    const mn = d.temperature_2m_min[i], mx = d.temperature_2m_max[i];
    const left = ((mn - lo) / span) * 100, width = ((mx - mn) / span) * 100;
    const pop = d.precipitation_probability_max[i];
    const [dd] = describe(d.weather_code[i]);
    return `<li class="day">
      <div class="day-name">${name}<small>${sub}</small></div>
      ${weatherIcon(d.weather_code[i], true, dd)}
      <div class="day-pop">${pop != null && pop >= 10 ? `${pop}%` : ''}</div>
      <div class="range"><span class="lo">${deg(mn)}</span><div class="bar"><span style="left:${left}%;width:${Math.max(width, 4)}%"></span></div><span class="hi">${deg(mx)}</span></div>
    </li>`;
  }).join('');

  const stale = !navigator.onLine;
  $('status').innerHTML = stale
    ? `<span class="offline">Sin conexión</span> · mostrando datos de las ${fmtTime(c.time)}`
    : `Actualizado a las ${fmtTime(c.time)} (hora de NJ)`;
}

/* ---------- Selector ---------- */
function setLocation(key) {
  if (!LOCATIONS[key]) key = 'nb';
  activeLoc = key;
  const sw = document.querySelector('.switcher');
  sw.dataset.active = key;
  sw.querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.loc === key)));
  try { localStorage.setItem('clima-loc', key); } catch (_) { /* sin almacenamiento */ }
}

document.querySelectorAll('.switcher button').forEach((b) =>
  b.addEventListener('click', () => {
    if (b.dataset.loc === activeLoc) return;
    setLocation(b.dataset.loc);
    load(true);
  }));
$('refresh').addEventListener('click', () => load(false));

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && Date.now() - lastLoad > REFRESH_MS) load();
});
window.addEventListener('online', () => load());
setInterval(() => { if (document.visibilityState === 'visible') load(); }, REFRESH_MS);

let saved = 'nb';
try { saved = localStorage.getItem('clima-loc') || 'nb'; } catch (_) { /* sin almacenamiento */ }
setLocation(saved);
load(true);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(console.error));
}
