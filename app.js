/* =====================================================================
   ASISTENTE · Ola 1 (núcleo)
   Vanilla JS, sin dependencias externas salvo supabase-js (incluido en /vendor)
   ===================================================================== */
(function () {
'use strict';

const sb = window.supabase.createClient(window.CONFIG.url, window.CONFIG.key, {
  auth: { persistSession: true, autoRefreshToken: true }
});

/* ---------- Estado ---------- */
const S = {
  user: null, view: 'hoy',
  areas: [], tareas: [], eventos: [], notas: [], personas: [], vencimientos: [],
  filtroArea: '', filtroEstado: 'abiertas', agendaDesde: null, textoNotas: '',
  resultados: null, q: '', installPrompt: null,
  prefs: {}, avisos: { soportado: false, activos: false, permiso: 'default' }
};
const PREFS_DEFECTO = { aviso_min: 15, hora_resumen: '08:00', hora_avisos: '09:00', resumen_activo: true };

const AREAS_INICIALES = [
  { nombre: 'Trabajo', ambito: 'profesional', color: '#B93A0B', orden: 1 },
  { nombre: 'Personal', ambito: 'personal', color: '#6B4FA0', orden: 2 },
  { nombre: 'Salud', ambito: 'personal', color: '#2E7D4F', orden: 3 },
  { nombre: 'Deporte', ambito: 'personal', color: '#3D5FA8', orden: 4 },
  { nombre: 'Futsal', ambito: 'personal', color: '#1F7A3A', orden: 5 },
  { nombre: 'Club', ambito: 'personal', color: '#9A6200', orden: 6 },
  { nombre: 'Piso', ambito: 'personal', color: '#1F5F5B', orden: 7 }
];

const CATEGORIAS_VENC = [
  ['documento', 'Documento (DNI, carné…)'], ['vehiculo', 'Vehículo (ITV…)'], ['seguro', 'Seguro'],
  ['contrato', 'Contrato'], ['fiscal', 'Fiscal (IRPF, IBI…)'], ['salud', 'Salud'],
  ['garantia', 'Garantía'], ['suscripcion', 'Suscripción'], ['otro', 'Otro']
];

/* ---------- Iconos ---------- */
const I = {
  hoy: '<path d="M3 12h3M18 12h3M12 3v3M12 18v3"/><circle cx="12" cy="12" r="4"/>',
  agenda: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  tareas: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="m8 12 3 3 5-6"/>',
  notas: '<path d="M6 3h9l5 5v13H6z"/><path d="M14 3v6h6M9 13h7M9 17h5"/>',
  personas: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5c1.7.7 3 2.6 3.5 5.5"/>',
  vencimientos: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/>',
  buscar: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  ajustes: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  mas: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>'
};
const svg = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[k]}</svg>`;

const VISTAS = {
  hoy: 'Hoy', agenda: 'Agenda', tareas: 'Tareas', notas: 'Notas', personas: 'Personas',
  vencimientos: 'Vencimientos', buscar: 'Buscar', ajustes: 'Ajustes', mas: 'Más'
};

/* ---------- Utilidades ---------- */
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
const hoy0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const addDias = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const dia0 = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const hm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const difDias = (a, b) => Math.round((dia0(b) - dia0(a)) / 864e5);
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const fmtLargo = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
const fmtCorto = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
const areaDe = (id) => S.areas.find((a) => a.id === id);
const personaDe = (id) => S.personas.find((p) => p.id === id);

function cuandoTexto(fecha, conHora) {
  const d = new Date(fecha); const n = difDias(hoy0(), d);
  let t = n === 0 ? 'Hoy' : n === 1 ? 'Mañana' : n === -1 ? 'Ayer' : fmtCorto.format(d);
  if (conHora) t += ' ' + hm(d);
  return t;
}
function chipArea(id) {
  const a = areaDe(id); if (!a) return '';
  return `<span class="chip" style="color:${esc(a.color)}"><i style="background:${esc(a.color)}"></i>${esc(a.nombre.toUpperCase())}</span>`;
}
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2600);
}
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

/* ---------- Recurrencia (RRULE simplificada) ---------- */
const DIAS_RR = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const DIAS_TXT = { MO: 'L', TU: 'M', WE: 'X', TH: 'J', FR: 'V', SA: 'S', SU: 'D' };
function parseRR(s) {
  if (!s) return null; const o = {};
  s.split(';').forEach((p) => { const [k, v] = p.split('='); o[k] = v; });
  return { freq: o.FREQ, interval: Math.max(1, +(o.INTERVAL || 1)), byday: o.BYDAY ? o.BYDAY.split(',') : null };
}
function textoRR(s) {
  const r = parseRR(s); if (!r) return '';
  const base = { DAILY: 'cada día', WEEKLY: 'cada semana', MONTHLY: 'cada mes', YEARLY: 'cada año' }[r.freq] || '';
  return r.byday ? `${base} (${r.byday.map((d) => DIAS_TXT[d]).join(' ')})` : base;
}
function siguienteFecha(fecha, rr) {
  const r = parseRR(rr); const d = new Date(fecha);
  if (r.freq === 'DAILY') d.setDate(d.getDate() + r.interval);
  else if (r.freq === 'WEEKLY') {
    if (r.byday && r.byday.length) {
      for (let i = 1; i <= 14; i++) { const x = addDias(fecha, i); if (r.byday.includes(DIAS_RR[x.getDay()])) return x; }
    }
    d.setDate(d.getDate() + 7 * r.interval);
  } else if (r.freq === 'MONTHLY') d.setMonth(d.getMonth() + r.interval);
  else if (r.freq === 'YEARLY') d.setFullYear(d.getFullYear() + r.interval);
  return d;
}
const lunesDe = (d) => { const x = dia0(d); const w = (x.getDay() + 6) % 7; return addDias(x, -w); };
// Ocurrencias de un evento entre dos fechas (expande recurrencias)
function ocurrencias(ev, desde, hasta) {
  const ini = new Date(ev.inicio); const dur = ev.fin ? new Date(ev.fin) - ini : 0;
  if (!ev.recurrencia) {
    const fin = new Date(ini.getTime() + dur);
    return (ini < hasta && (ini >= desde || fin > desde)) ? [{ ev, inicio: ini }] : [];
  }
  const r = parseRR(ev.recurrencia); const out = [];
  let d = dia0(ini > desde ? ini : desde);
  for (let i = 0; i < 400 && d < hasta; i++, d = addDias(d, 1)) {
    const n = difDias(ini, d); if (n < 0) continue;
    let ok = false;
    if (r.freq === 'DAILY') ok = n % r.interval === 0;
    else if (r.freq === 'WEEKLY') {
      const dias = r.byday && r.byday.length ? r.byday : [DIAS_RR[ini.getDay()]];
      const semanas = Math.round((lunesDe(d) - lunesDe(ini)) / (7 * 864e5));
      ok = dias.includes(DIAS_RR[d.getDay()]) && semanas % r.interval === 0;
    } else if (r.freq === 'MONTHLY') {
      const meses = (d.getFullYear() - ini.getFullYear()) * 12 + d.getMonth() - ini.getMonth();
      ok = d.getDate() === ini.getDate() && meses % r.interval === 0;
    } else if (r.freq === 'YEARLY') {
      ok = d.getDate() === ini.getDate() && d.getMonth() === ini.getMonth() && (d.getFullYear() - ini.getFullYear()) % r.interval === 0;
    }
    if (ok) { const x = new Date(d); x.setHours(ini.getHours(), ini.getMinutes(), 0, 0); if (x >= desde) out.push({ ev, inicio: x }); }
  }
  return out;
}
function eventosEntre(desde, hasta) {
  return S.eventos.flatMap((e) => ocurrencias(e, desde, hasta))
    .sort((a, b) => (b.ev.todo_el_dia - a.ev.todo_el_dia) || (a.inicio - b.inicio));
}
function proximoCumple(p) {
  if (!p.cumpleanos) return null;
  const c = parseYmd(p.cumpleanos); const h = hoy0();
  let d = new Date(h.getFullYear(), c.getMonth(), c.getDate());
  if (d < h) d = new Date(h.getFullYear() + 1, c.getMonth(), c.getDate());
  return d;
}

/* ---------- Captura rápida en lenguaje natural (sin IA) ----------
   "mañana a las 10 llamar al banco #piso !"  */
const SEMANA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
function parseRapido(txt) {
  let t = ' ' + txt.trim() + ' '; let fecha = null; let hora = null; let area = null; let prioridad = 3;
  const quitar = (re) => { t = t.replace(re, ' '); };
  const ma = t.match(/\s#([^\s#]+)/);
  if (ma) { area = S.areas.find((a) => norm(a.nombre) === norm(ma[1])) || null; quitar(ma[0]); }
  if (/\s!+\s|\surgente\s/i.test(t)) { prioridad = 1; quitar(/\s!+(?=\s)/); }
  const n = norm(t);
  if (/\spasado manana\s/.test(n)) { fecha = addDias(hoy0(), 2); t = t.replace(/\spasado mañana\s/i, ' '); }
  else if (/\smanana\s/.test(n)) { fecha = addDias(hoy0(), 1); t = t.replace(/\smañana\s/i, ' '); }
  else if (/\shoy\s/.test(n)) { fecha = hoy0(); quitar(/\shoy\s/i); }
  else {
    const mw = n.match(/\s(el\s+)?(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\s/);
    if (mw) {
      const obj = SEMANA.indexOf(mw[2]); const h = hoy0();
      let dif = (obj - h.getDay() + 7) % 7; if (dif === 0) dif = 7;
      fecha = addDias(h, dif);
      t = t.replace(new RegExp('\\s(el\\s+)?' + ['domingo', 'lunes', 'martes', 'mi[eé]rcoles', 'jueves', 'viernes', 's[aá]bado', 'domingo'][obj] + '\\s', 'i'), ' ');
    }
    const md = t.match(/\s(el\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s/);
    if (!fecha && md) {
      const h = hoy0(); let y = md[4] ? +md[4] : h.getFullYear(); if (y < 100) y += 2000;
      fecha = new Date(y, +md[3] - 1, +md[2]); if (!md[4] && fecha < h) fecha.setFullYear(y + 1);
      quitar(md[0]);
    }
  }
  const mh = t.match(/\s(a\s+las?\s+)(\d{1,2})(?:[:.h](\d{2}))?\s/i) || t.match(/\s()(\d{1,2})[:.](\d{2})\s/);
  if (mh) {
    hora = [+mh[2], mh[3] ? +mh[3] : 0];
    if (hora[0] < 24) { quitar(mh[0]); } else hora = null;
    if (hora && hora[0] < 8 && /tarde/.test(norm(t))) hora[0] += 12;
    t = t.replace(/\sde la (tarde|mañana|noche)\s/i, ' ');
  }
  if (hora && !fecha) { fecha = hoy0(); const x = new Date(); if (hora[0] < x.getHours()) fecha = addDias(fecha, 1); }
  let titulo = t.replace(/\s+/g, ' ').trim();
  titulo = titulo.charAt(0).toUpperCase() + titulo.slice(1);
  let vence = null;
  if (fecha) { vence = new Date(fecha); if (hora) vence.setHours(hora[0], hora[1], 0, 0); }
  return { titulo, vence_en: vence ? vence.toISOString() : null, todo_el_dia: !hora, area_id: area ? area.id : null, prioridad };
}

/* ---------- Datos ---------- */
const TABLAS = ['areas', 'tareas', 'eventos', 'notas', 'personas', 'vencimientos'];
async function cargar() {
  const hace30 = addDias(hoy0(), -30).toISOString();
  const consultas = TABLAS.map((t) => {
    let q = sb.from(t).select('*').is('deleted_at', null);
    if (t === 'tareas') q = q.or(`estado.in.(pendiente,en_curso,esperando),completada_en.gte.${hace30}`);
    if (t === 'areas') q = q.order('orden');
    return q;
  });
  consultas.push(sb.from('preferencias').select('clave, valor'));
  const res = await Promise.all(consultas);
  const err = res.find((r) => r.error);
  if (err) throw err.error;
  S.prefs = Object.fromEntries((res[TABLAS.length].data || []).map((r) => [r.clave, r.valor]));
  TABLAS.forEach((t, i) => { S[t] = res[i].data || []; });
  try { localStorage.setItem('asistente-cache', JSON.stringify(Object.fromEntries(TABLAS.map((t) => [t, S[t]])))); } catch (e) { /* sin espacio */ }
}
function cargarCache() {
  try {
    const c = JSON.parse(localStorage.getItem('asistente-cache') || 'null');
    if (c) TABLAS.forEach((t) => { S[t] = c[t] || []; });
    return !!c;
  } catch (e) { return false; }
}
async function asegurarAreas() {
  if (S.areas.length) return;
  const { error } = await sb.from('areas').insert(AREAS_INICIALES);
  if (error) throw error;
  await cargar();
}
async function guardar(tabla, datos, id) {
  const q = id ? sb.from(tabla).update(datos).eq('id', id) : sb.from(tabla).insert(datos);
  const { error } = await q;
  if (error) { toast('No se pudo guardar: ' + error.message); throw error; }
  await refrescar();
}
async function borrar(tabla, id) {
  const { error } = await sb.from(tabla).update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) { toast('No se pudo borrar: ' + error.message); return; }
  toast('Eliminado'); await refrescar();
}
async function refrescar() {
  try { await cargar(); await asegurarAreas(); estadoSync(true); } catch (e) { estadoSync(false); }
  render();
}
function estadoSync(ok) {
  const el = $('#sync-state'); if (!el) return;
  el.classList.toggle('off', !ok);
  el.lastElementChild.textContent = ok ? 'Sincronizado' : 'Sin conexión';
}
let canal = null;
function escucharCambios() {
  if (canal) sb.removeChannel(canal);
  const r = debounce(refrescar, 400);
  canal = sb.channel('cambios');
  TABLAS.forEach((t) => canal.on('postgres_changes', { event: '*', schema: 'public', table: t }, r));
  canal.subscribe();
}

/* ---------- Acciones sobre tareas y vencimientos ---------- */
async function alternarTarea(id) {
  const t = S.tareas.find((x) => x.id === id); if (!t) return;
  if (t.estado === 'hecha') { await guardar('tareas', { estado: 'pendiente', completada_en: null }, id); return; }
  await guardar('tareas', { estado: 'hecha', completada_en: new Date().toISOString() }, id);
  if (t.recurrencia) {
    const base = t.vence_en ? new Date(t.vence_en) : new Date();
    const sig = siguienteFecha(base, t.recurrencia);
    const copia = {
      titulo: t.titulo, notas: t.notas, area_id: t.area_id, prioridad: t.prioridad, persona_id: t.persona_id,
      todo_el_dia: t.todo_el_dia, recurrencia: t.recurrencia, vence_en: sig.toISOString(), origen: t.origen
    };
    await guardar('tareas', copia);
    toast('Hecha · siguiente: ' + cuandoTexto(sig, !t.todo_el_dia));
  } else toast('¡Hecha!');
}
async function resolverVencimiento(id) {
  const v = S.vencimientos.find((x) => x.id === id); if (!v) return;
  if (v.recurrencia) {
    const sig = siguienteFecha(parseYmd(v.fecha), v.recurrencia);
    await guardar('vencimientos', { fecha: ymd(sig) }, id);
    toast('Renovado hasta ' + fmtCorto.format(sig));
  } else {
    await guardar('vencimientos', { resuelto_en: new Date().toISOString() }, id);
    toast('Marcado como resuelto');
  }
}

/* ---------- Avisos (notificaciones push) ---------- */
const pref = (k) => (S.prefs[k] !== undefined ? S.prefs[k] : PREFS_DEFECTO[k]);
async function guardarPref(clave, valor) {
  const { error } = await sb.from('preferencias').upsert({ user_id: S.user.id, clave, valor }, { onConflict: 'user_id,clave' });
  if (error) { toast('No se pudo guardar: ' + error.message); return; }
  S.prefs[clave] = valor; toast('Preferencia guardada');
}
function b64aBytes(b64) {
  const s = (b64 + '='.repeat((4 - b64.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(s); return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}
async function estadoAvisos() {
  const A = S.avisos;
  A.soportado = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (!A.soportado) return;
  A.permiso = Notification.permission;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    A.activos = !!sub && A.permiso === 'granted';
  } catch (e) { A.activos = false; }
}
function nombreDispositivo() {
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return ['Android', 'android'];
  if (/iPhone|iPad/i.test(ua)) return ['iPhone', 'otro'];
  return [/Windows/i.test(ua) ? 'PC Windows' : 'Ordenador', 'otro'];
}
async function activarAvisos() {
  if (!S.avisos.soportado) { toast('Este navegador no admite avisos'); return; }
  if (!window.isSecureContext) { toast('Los avisos solo funcionan desde la dirección https de la app'); return; }
  const permiso = await Notification.requestPermission();
  S.avisos.permiso = permiso;
  if (permiso !== 'granted') { toast('Permiso denegado. Actívalo en los ajustes del navegador para esta web.'); render(); return; }
  toast('Activando avisos…');
  const { data, error } = await sb.functions.invoke('avisos', { body: { accion: 'clave' } });
  if (error || !data || !data.publicKey) { toast('No se pudo contactar con el servidor de avisos'); console.error(error); return; }
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64aBytes(data.publicKey) });
  const j = sub.toJSON();
  const [nombre, tipo] = nombreDispositivo();
  let dispId = localStorage.getItem('asistente-dispositivo');
  if (!dispId) {
    const r = await sb.from('dispositivos').insert({ nombre, tipo, capacidades: ['avisos'] }).select('id').single();
    if (r.error) { toast('Error al registrar el dispositivo: ' + r.error.message); return; }
    dispId = r.data.id; localStorage.setItem('asistente-dispositivo', dispId);
  }
  const { error: e2 } = await sb.from('suscripciones_push').upsert(
    { user_id: S.user.id, dispositivo_id: dispId, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth }, { onConflict: 'endpoint' });
  if (e2) { toast('Error al guardar la suscripción: ' + e2.message); return; }
  S.avisos.activos = true; render();
  await probarAvisos();
}
async function probarAvisos() {
  const { data, error } = await sb.functions.invoke('avisos', { body: { accion: 'prueba' } });
  if (error) { toast('No se pudo enviar la prueba'); console.error(error); return; }
  toast(data && data.enviados ? `Prueba enviada a ${data.enviados} dispositivo(s)` : 'No hay dispositivos con avisos activos');
}
async function desactivarAvisos() {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  if (sub) { await sb.from('suscripciones_push').delete().eq('endpoint', sub.endpoint); await sub.unsubscribe(); }
  S.avisos.activos = false; toast('Avisos desactivados en este dispositivo'); render();
}

/* ---------- Plantillas de elementos ---------- */
function htmlTarea(t) {
  const hecha = t.estado === 'hecha';
  const meta = [];
  if (t.area_id) meta.push(chipArea(t.area_id));
  if (t.vence_en) {
    const atrasada = !hecha && new Date(t.vence_en) < (t.todo_el_dia ? hoy0() : new Date());
    meta.push(`<span class="${atrasada ? 'late' : ''}">${esc(cuandoTexto(t.vence_en, !t.todo_el_dia))}</span>`);
  }
  if (t.estado === 'esperando') {
    const p = personaDe(t.persona_id);
    const dias = t.esperando_desde ? difDias(new Date(t.esperando_desde), new Date()) : 0;
    meta.push(`<span class="${dias >= 3 ? 'late' : ''}">Esperando${p ? ' a ' + esc(p.nombre) : ''}${dias ? ' · ' + dias + ' d' : ''}</span>`);
  } else if (t.persona_id) { const p = personaDe(t.persona_id); if (p) meta.push(`<span>Con ${esc(p.nombre)}</span>`); }
  if (t.recurrencia) meta.push(`<span>↻ ${esc(textoRR(t.recurrencia))}</span>`);
  return `<div class="item ${hecha ? 'done' : ''}">
    <button class="check p${t.prioridad} ${hecha ? 'on' : ''}" data-action="toggle" data-id="${t.id}" aria-label="${hecha ? 'Reabrir' : 'Completar'}: ${esc(t.titulo)}"></button>
    <button class="item-main" data-action="editar" data-tipo="tarea" data-id="${t.id}">
      <span class="item-title">${esc(t.titulo)}</span>
      ${meta.length ? `<span class="item-meta">${meta.join('')}</span>` : ''}
    </button></div>`;
}
function htmlEvento(o) {
  const e = o.ev;
  const hora = e.todo_el_dia ? 'Todo el día' : hm(o.inicio);
  const meta = [chipArea(e.area_id), e.lugar ? esc(e.lugar) : '', e.recurrencia ? '↻ ' + esc(textoRR(e.recurrencia)) : ''].filter(Boolean);
  return `<div class="item"><span class="time" ${e.todo_el_dia ? 'style="font-size:12px"' : ''}>${hora}</span>
    <button class="item-main" data-action="editar" data-tipo="evento" data-id="${e.id}">
      <span class="item-title">${esc(e.titulo)}</span>${meta.length ? `<span class="item-meta">${meta.join('')}</span>` : ''}
    </button></div>`;
}
function badgeDias(n) {
  const cls = n < 0 ? 'urgent' : n <= 7 ? 'urgent' : n <= 30 ? 'warn' : '';
  const txt = n < 0 ? `Vencido ${-n} d` : n === 0 ? 'Hoy' : n === 1 ? 'Mañana' : `${n} días`;
  return `<span class="badge ${cls}">${txt}</span>`;
}
function htmlVencimiento(v) {
  const n = difDias(hoy0(), parseYmd(v.fecha));
  const cat = (CATEGORIAS_VENC.find((c) => c[0] === v.categoria) || [, ''])[1];
  return `<div class="item">
    <button class="item-main" data-action="editar" data-tipo="vencimiento" data-id="${v.id}">
      <span class="item-title">${esc(v.titulo)}</span>
      <span class="item-meta">${chipArea(v.area_id)}<span>${esc(cat)}</span><span>${esc(fmtCorto.format(parseYmd(v.fecha)))}</span>${v.recurrencia ? '<span>↻ ' + esc(textoRR(v.recurrencia)) + '</span>' : ''}</span>
    </button>${badgeDias(n)}
    <button class="btn ghost small" data-action="resolver" data-id="${v.id}">${v.recurrencia ? 'Renovado' : 'Hecho'}</button></div>`;
}
function htmlCumple(p, d) {
  const n = difDias(hoy0(), d);
  return `<div class="item"><button class="item-main" data-action="editar" data-tipo="persona" data-id="${p.id}">
    <span class="item-title">Cumpleaños de ${esc(p.nombre)}</span>
    <span class="item-meta">${esc(fmtCorto.format(d))}${p.relacion ? ' · ' + esc(p.relacion) : ''}</span></button>${badgeDias(n)}</div>`;
}
const vacio = (t) => `<div class="empty">${t}</div>`;
const seccion = (titulo, cuerpo, extra) => `<div class="section"><h2>${titulo}</h2>${extra || ''}</div><div class="card">${cuerpo}</div>`;

/* ---------- Vistas ---------- */
const abiertas = () => S.tareas.filter((t) => ['pendiente', 'en_curso', 'esperando'].includes(t.estado));
const ordenTareas = (a, b) => (a.prioridad - b.prioridad) || ((a.vence_en ? new Date(a.vence_en) : 8e15) - (b.vence_en ? new Date(b.vence_en) : 8e15));

function vistaHoy() {
  const h = hoy0(); const manana = addDias(h, 1); const ahora = new Date();
  const saludo = ahora.getHours() < 13 ? 'Buenos días' : ahora.getHours() < 21 ? 'Buenas tardes' : 'Buenas noches';
  const ab = abiertas();
  const atrasadas = ab.filter((t) => t.vence_en && new Date(t.vence_en) < h).sort(ordenTareas);
  const deHoy = ab.filter((t) => t.vence_en && new Date(t.vence_en) >= h && new Date(t.vence_en) < manana).sort(ordenTareas);
  const hechasHoy = S.tareas.filter((t) => t.estado === 'hecha' && t.completada_en && new Date(t.completada_en) >= h);
  const eventos = eventosEntre(h, manana);
  const esperando = ab.filter((t) => t.estado === 'esperando' && t.esperando_desde && difDias(new Date(t.esperando_desde), ahora) >= 3);
  const venc = S.vencimientos.filter((v) => !v.resuelto_en && difDias(h, parseYmd(v.fecha)) <= Math.max(...(v.avisar_dias || [30])))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  const cumples = S.personas.map((p) => [p, proximoCumple(p)]).filter(([, d]) => d && difDias(h, d) <= 14).sort((a, b) => a[1] - b[1]);
  const nombre = (S.user && S.user.user_metadata && S.user.user_metadata.nombre) || '';

  let html = `<p class="hello">${saludo}${nombre ? ', ' + esc(nombre) : ''} · ${esc(fmtLargo.format(ahora))}</p>
  <form class="quick" data-form="rapido"><label for="rapido" style="position:absolute;left:-9999px">Añadir tarea rápida</label>
    <input id="rapido" name="texto" type="text" placeholder="Ej.: mañana a las 10 llamar al banco #piso" autocomplete="off">
    <button class="btn primary" type="submit">Añadir</button></form>
  <p class="hint">Entiende hoy, mañana, días de la semana, fechas (12/10), horas (a las 10), #área y ! para urgente.</p>`;

  html += '<div class="grid2"><div>';
  html += seccion('Agenda de hoy', eventos.length ? eventos.map(htmlEvento).join('') : vacio('Nada en el calendario hoy.'));
  if (esperando.length) html += seccion('Delegado sin respuesta', esperando.map(htmlTarea).join(''));
  if (venc.length || cumples.length) html += seccion('Se acerca', venc.map(htmlVencimiento).join('') + cumples.map(([p, d]) => htmlCumple(p, d)).join(''));
  html += '</div><div>';
  if (atrasadas.length) html += seccion('Atrasadas', atrasadas.map(htmlTarea).join(''));
  html += seccion('Tareas de hoy', deHoy.length ? deHoy.map(htmlTarea).join('') : vacio(atrasadas.length ? 'Nada más para hoy.' : 'Nada pendiente para hoy.'));
  if (hechasHoy.length) html += seccion(`Hechas hoy · ${hechasHoy.length}`, hechasHoy.map(htmlTarea).join(''));
  html += '</div></div>';
  return html;
}

function vistaAgenda() {
  const desde = S.agendaDesde || lunesDe(new Date()); S.agendaDesde = desde;
  const hasta = addDias(desde, 14); const h = hoy0();
  const evs = eventosEntre(desde, hasta);
  let html = `<div class="weeknav">
    <button class="btn ghost small" data-action="semana" data-d="-7" aria-label="Semana anterior">‹ Anterior</button>
    <button class="btn ghost small" data-action="semana" data-d="0">Esta semana</button>
    <button class="btn ghost small" data-action="semana" data-d="7" aria-label="Semana siguiente">Siguiente ›</button></div>`;
  for (let i = 0; i < 14; i++) {
    const d = addDias(desde, i); const d2 = addDias(d, 1);
    const e = evs.filter((o) => o.inicio >= d && o.inicio < d2);
    const t = S.tareas.filter((x) => x.estado !== 'cancelada' && x.vence_en && new Date(x.vence_en) >= d && new Date(x.vence_en) < d2).sort(ordenTareas);
    const v = S.vencimientos.filter((x) => !x.resuelto_en && x.fecha === ymd(d));
    const c = S.personas.filter((p) => { const pc = proximoCumple(p); return pc && ymd(pc) === ymd(d); });
    const vacioDia = !e.length && !t.length && !v.length && !c.length;
    if (vacioDia && d < h) continue;
    if (vacioDia) { html += `<div class="day libre ${ymd(d) === ymd(h) ? 'today' : ''}"><h3>${esc(fmtLargo.format(d))}</h3><span>· libre</span></div>`; continue; }
    html += `<div class="day ${ymd(d) === ymd(h) ? 'today' : ''}"><h3>${esc(fmtLargo.format(d))}</h3><div class="card">${
      e.map(htmlEvento).join('') + t.map(htmlTarea).join('') + v.map(htmlVencimiento).join('') + c.map((p) => htmlCumple(p, d)).join('')
    }</div></div>`;
  }
  return html;
}

function filtrosArea() {
  return `<div class="filters" role="group" aria-label="Filtrar por área">
    <button data-action="filtro-area" data-id="" aria-pressed="${!S.filtroArea}">Todas</button>
    ${S.areas.filter((a) => !a.archivada).map((a) => `<button data-action="filtro-area" data-id="${a.id}" aria-pressed="${S.filtroArea === a.id}">${esc(a.nombre)}</button>`).join('')}
  </div>`;
}
function vistaTareas() {
  const estados = [['abiertas', 'Abiertas'], ['esperando', 'Esperando'], ['hechas', 'Hechas']];
  let html = filtrosArea() + `<div class="filters" role="group" aria-label="Estado">${estados.map(([k, t]) =>
    `<button data-action="filtro-estado" data-id="${k}" aria-pressed="${S.filtroEstado === k}">${t}</button>`).join('')}</div>`;
  let lista = S.tareas.filter((t) => !S.filtroArea || t.area_id === S.filtroArea);
  if (S.filtroEstado === 'hechas') {
    lista = lista.filter((t) => t.estado === 'hecha').sort((a, b) => new Date(b.completada_en) - new Date(a.completada_en));
    return html + seccion('Hechas (últimos 30 días)', lista.length ? lista.map(htmlTarea).join('') : vacio('Nada todavía.'));
  }
  if (S.filtroEstado === 'esperando') {
    lista = lista.filter((t) => t.estado === 'esperando').sort((a, b) => new Date(a.esperando_desde || 0) - new Date(b.esperando_desde || 0));
    return html + seccion('Esperando respuesta', lista.length ? lista.map(htmlTarea).join('') : vacio('No esperas nada de nadie.'));
  }
  lista = lista.filter((t) => ['pendiente', 'en_curso'].includes(t.estado));
  const h = hoy0(); const m = addDias(h, 1); const s = addDias(h, 8);
  const grupos = [
    ['Atrasadas', (t) => t.vence_en && new Date(t.vence_en) < h],
    ['Hoy', (t) => t.vence_en && new Date(t.vence_en) >= h && new Date(t.vence_en) < m],
    ['Próximos 7 días', (t) => t.vence_en && new Date(t.vence_en) >= m && new Date(t.vence_en) < s],
    ['Más adelante', (t) => t.vence_en && new Date(t.vence_en) >= s],
    ['Sin fecha', (t) => !t.vence_en]
  ];
  let alguna = false;
  grupos.forEach(([titulo, f]) => {
    const g = lista.filter(f).sort(ordenTareas);
    if (g.length) { alguna = true; html += seccion(`${titulo} · ${g.length}`, g.map(htmlTarea).join('')); }
  });
  if (!alguna) html += seccion('Tareas', vacio('Todo al día. Añade una con el botón +.'));
  return html;
}

function vistaNotas() {
  const q = norm(S.textoNotas);
  const lista = S.notas.filter((n) => (!S.filtroArea || n.area_id === S.filtroArea) &&
    (!q || norm(n.titulo + ' ' + n.contenido + ' ' + (n.etiquetas || []).join(' ')).includes(q)))
    .sort((a, b) => (b.fijada - a.fijada) || (new Date(b.updated_at) - new Date(a.updated_at)));
  return `<label style="margin:6px 0 4px">Filtrar notas<input type="search" data-input="notas" value="${esc(S.textoNotas)}" placeholder="Escribe para filtrar…"></label>
    ${filtrosArea()}
    ${lista.length ? `<div class="notes">${lista.map((n) => `<button class="note" data-action="editar" data-tipo="nota" data-id="${n.id}">
      <span class="item-meta">${n.fijada ? '<span>Fijada</span>' : ''}${chipArea(n.area_id)}<span>${esc(cuandoTexto(n.updated_at))}</span></span>
      ${n.titulo ? `<h3>${esc(n.titulo)}</h3>` : ''}<p>${esc(n.contenido)}</p>
      ${(n.etiquetas || []).length ? `<span class="item-meta">${n.etiquetas.map((e) => '#' + esc(e)).join(' ')}</span>` : ''}</button>`).join('')}</div>`
    : `<div class="card">${vacio('Sin notas. Crea una con el botón +.')}</div>`}`;
}

function vistaPersonas() {
  const lista = [...S.personas].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  const h = hoy0();
  return seccion(`Personas · ${lista.length}`, lista.length ? lista.map((p) => {
    const c = proximoCumple(p); const n = c ? difDias(h, c) : null;
    return `<div class="item"><button class="item-main" data-action="editar" data-tipo="persona" data-id="${p.id}">
      <span class="item-title">${esc(p.nombre)}</span>
      <span class="item-meta">${chipArea(p.area_id)}${p.relacion ? `<span>${esc(p.relacion)}</span>` : ''}${c ? `<span>Cumple ${esc(fmtCorto.format(c))}</span>` : ''}</span>
      </button>${n !== null && n <= 30 ? badgeDias(n) : ''}</div>`;
  }).join('') : vacio('Añade a las personas importantes: compañeros, familia, amigos, jugadoras…'));
}

function vistaVencimientos() {
  const act = S.vencimientos.filter((v) => !v.resuelto_en).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const res = S.vencimientos.filter((v) => v.resuelto_en);
  return seccion('Próximos vencimientos', act.length ? act.map(htmlVencimiento).join('') :
    vacio('Registra DNI, carné, ITV, seguros, garantías, IRPF, fechas del contrato del piso… y te avisaré con tiempo.'))
    + (res.length ? seccion('Resueltos', res.map((v) => `<div class="item done"><button class="item-main" data-action="editar" data-tipo="vencimiento" data-id="${v.id}"><span class="item-title">${esc(v.titulo)}</span></button></div>`).join('')) : '');
}

function vistaBuscar() {
  let html = `<form class="quick" data-form="buscar"><label for="q" style="position:absolute;left:-9999px">Buscar</label>
    <input id="q" name="q" type="search" value="${esc(S.q)}" placeholder="Busca en tareas, notas, personas, agenda…" autocomplete="off">
    <button class="btn primary" type="submit">Buscar</button></form>`;
  if (S.resultados) {
    html += seccion(`Resultados · ${S.resultados.length}`, S.resultados.length ? S.resultados.map((r) => {
      const frag = String(r.fragmento || '').split(/<\/?b>/).map((p, i) => i % 2 ? `<b>${esc(p)}</b>` : esc(p)).join('');
      const editable = ['tarea', 'evento', 'nota', 'persona', 'vencimiento'].includes(r.tipo);
      return `<div class="item"><button class="item-main" ${editable ? `data-action="editar" data-tipo="${r.tipo}" data-id="${r.id}"` : ''}>
        <span class="result-type">${esc(r.tipo)}</span><span class="item-title">${esc(r.titulo)}</span>
        <span class="item-meta result-frag">${frag}</span></button></div>`;
    }).join('') : vacio('Sin resultados.'));
  }
  return html;
}

function vistaMas() {
  const items = [['personas', 'Personas'], ['vencimientos', 'Vencimientos'], ['buscar', 'Buscar'], ['ajustes', 'Ajustes']];
  return `<div class="card menu-list">${items.map(([v, t]) => `<button data-action="goto" data-view="${v}">${svg(v)}${t}</button>`).join('')}</div>`;
}

function seccionAvisos() {
  const A = S.avisos;
  let estado;
  if (!A.soportado) estado = '<span class="item-meta">Este navegador no admite avisos. En el móvil, usa Chrome e instala la app.</span>';
  else if (A.permiso === 'denied') estado = '<span class="item-meta late">Bloqueados por el navegador: permite las notificaciones para esta web en los ajustes del navegador.</span>';
  else if (A.activos) estado = '<span class="item-meta">Activados en este dispositivo</span>';
  else estado = '<span class="item-meta">Desactivados en este dispositivo</span>';
  const boton = !A.soportado || A.permiso === 'denied' ? '' : A.activos
    ? '<button class="btn ghost small" data-action="probar-avisos">Probar</button><button class="btn ghost small" data-action="desactivar-avisos">Desactivar</button>'
    : '<button class="btn primary small" data-action="activar-avisos">Activar</button>';
  const minutos = [5, 10, 15, 30, 60].map((m) => `<option value="${m}" ${+pref('aviso_min') === m ? 'selected' : ''}>${m} min antes</option>`).join('');
  return seccion('Avisos', `<div class="item"><span class="item-main"><span class="item-title">Avisos en este dispositivo</span>${estado}</span><span style="display:flex;gap:6px;flex-wrap:wrap">${boton}</span></div>
    <div class="item" style="flex-wrap:wrap">
      <label style="flex:1;min-width:150px">Antelación (eventos y tareas con hora)<select data-pref="aviso_min" data-tipo-pref="num">${minutos}</select></label>
      <label style="flex:1;min-width:130px">Resumen diario<input type="time" data-pref="hora_resumen" value="${esc(pref('hora_resumen'))}"></label>
      <label style="flex:1;min-width:130px">Vencimientos y cumpleaños<input type="time" data-pref="hora_avisos" value="${esc(pref('hora_avisos'))}"></label>
    </div>
    <div class="item"><label class="check-line"><input type="checkbox" data-pref="resumen_activo" data-tipo-pref="bool" ${pref('resumen_activo') ? 'checked' : ''}>Enviar el resumen de cada mañana</label></div>`);
}
function vistaAjustes() {
  const areas = S.areas.map((a) => `<div class="area-row">
    <input type="color" value="${esc(a.color)}" data-area="${a.id}" data-campo="color" aria-label="Color de ${esc(a.nombre)}">
    <input type="text" value="${esc(a.nombre)}" data-area="${a.id}" data-campo="nombre" aria-label="Nombre del área">
    <select data-area="${a.id}" data-campo="ambito" aria-label="Ámbito"><option value="personal" ${a.ambito === 'personal' ? 'selected' : ''}>Personal</option><option value="profesional" ${a.ambito === 'profesional' ? 'selected' : ''}>Profesional</option></select>
    <button class="btn ghost small" data-action="archivar-area" data-id="${a.id}">${a.archivada ? 'Reactivar' : 'Archivar'}</button></div>`).join('');
  return seccion('Cuenta', `<div class="item"><span class="item-main"><span class="item-title">${esc(S.user.email)}</span><span class="item-meta">Datos sincronizados entre todos tus dispositivos</span></span>
      <button class="btn ghost small" data-action="salir">Cerrar sesión</button></div>
    ${S.installPrompt ? '<div class="item"><span class="item-main"><span class="item-title">Instalar la app</span><span class="item-meta">Acceso directo como una app más</span></span><button class="btn primary small" data-action="instalar">Instalar</button></div>' : ''}`)
    + seccionAvisos()
    + seccion('Áreas', areas + `<div class="item"><button class="btn ghost small" data-action="nueva-area">+ Nueva área</button></div>`)
    + `<p class="hint">Asistente · versión 3 (núcleo y avisos). Próximamente: el asistente con IA y el nodo del PC.</p>`;
}

/* ---------- Render y navegación ---------- */
const NAV_SIDE = ['hoy', 'agenda', 'tareas', 'notas', 'personas', 'vencimientos', 'buscar', 'ajustes'];
const NAV_BOTTOM = ['hoy', 'agenda', 'tareas', 'notas', 'mas'];
function render() {
  if (!S.user) return;
  const v = S.view;
  $('#view-title').textContent = VISTAS[v];
  const actual = (k) => (k === v || (k === 'mas' && ['personas', 'vencimientos', 'buscar', 'ajustes', 'mas'].includes(v))) ? 'aria-current="page"' : '';
  $('#nav-side').innerHTML = NAV_SIDE.map((k) => `<button data-action="goto" data-view="${k}" ${k === v ? 'aria-current="page"' : ''}>${svg(k)}${VISTAS[k]}</button>`).join('');
  $('#nav-bottom').innerHTML = NAV_BOTTOM.map((k) => `<button data-action="goto" data-view="${k}" ${actual(k)}>${svg(k)}${VISTAS[k]}</button>`).join('');
  const vistas = { hoy: vistaHoy, agenda: vistaAgenda, tareas: vistaTareas, notas: vistaNotas, personas: vistaPersonas,
    vencimientos: vistaVencimientos, buscar: vistaBuscar, ajustes: vistaAjustes, mas: vistaMas };
  const foco = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.input : null;
  $('#main').innerHTML = vistas[v]();
  if (foco) { const el = document.querySelector(`[data-input="${foco}"]`); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }
}
function irA(v) {
  S.view = v; if (v !== 'tareas' && v !== 'notas') S.filtroArea = '';
  render(); window.scrollTo(0, 0);
  try { history.replaceState(null, '', '#' + v); } catch (e) { /* nada */ }
}

/* ---------- Formularios ---------- */
const opcionesArea = (sel) => `<option value="">Sin área</option>` + S.areas.filter((a) => !a.archivada || a.id === sel)
  .map((a) => `<option value="${a.id}" ${a.id === sel ? 'selected' : ''}>${esc(a.nombre)}</option>`).join('');
const opcionesPersona = (sel) => `<option value="">Nadie</option>` + [...S.personas].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  .map((p) => `<option value="${p.id}" ${p.id === sel ? 'selected' : ''}>${esc(p.nombre)}</option>`).join('');
function selectRR(nombre, valor, conDias) {
  const r = parseRR(valor) || {}; const f = r.freq || '';
  const ops = [['', 'No se repite'], ['DAILY', 'Cada día'], ['WEEKLY', 'Cada semana'], ['MONTHLY', 'Cada mes'], ['YEARLY', 'Cada año']];
  let h = `<label>Repetir<select name="${nombre}" data-rr>${ops.map(([k, t]) => `<option value="${k}" ${k === f ? 'selected' : ''}>${t}</option>`).join('')}</select></label>`;
  if (conDias) {
    const sel = r.byday || [];
    h += `<div class="days" data-dias ${f === 'WEEKLY' ? '' : 'hidden'}>${['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'].map((d) =>
      `<label><input type="checkbox" name="byday" value="${d}" ${sel.includes(d) ? 'checked' : ''}>${DIAS_TXT[d]}</label>`).join('')}</div>`;
  }
  return h;
}
function leerRR(fd) {
  const f = fd.get('recurrencia'); if (!f) return null;
  const dias = fd.getAll('byday');
  return 'FREQ=' + f + (f === 'WEEKLY' && dias.length ? ';BYDAY=' + dias.join(',') : '');
}
const fechaDe = (iso) => iso ? ymd(new Date(iso)) : '';
const horaDe = (iso, todoDia) => iso && !todoDia ? hm(new Date(iso)) : '';
function combinar(fecha, hora) {
  if (!fecha) return null; const d = parseYmd(fecha);
  if (hora) { const [h, m] = hora.split(':').map(Number); d.setHours(h, m, 0, 0); }
  return d.toISOString();
}

const FORMS = {
  tarea: {
    titulo: 'Tarea', tabla: 'tareas',
    campos: (t = {}) => `
      <label>Qué hay que hacer<input type="text" name="titulo" required value="${esc(t.titulo)}"></label>
      <div class="row"><label>Fecha<input type="date" name="fecha" value="${fechaDe(t.vence_en)}"></label>
      <label>Hora (opcional)<input type="time" name="hora" value="${horaDe(t.vence_en, t.todo_el_dia)}"></label></div>
      <div class="row"><label>Área<select name="area_id">${opcionesArea(t.area_id)}</select></label>
      <label>Prioridad<select name="prioridad">${[[1, 'Urgente'], [2, 'Alta'], [3, 'Normal'], [4, 'Baja']].map(([k, x]) => `<option value="${k}" ${(t.prioridad || 3) === k ? 'selected' : ''}>${x}</option>`).join('')}</select></label></div>
      <div class="row"><label>Estado<select name="estado">${[['pendiente', 'Pendiente'], ['en_curso', 'En curso'], ['esperando', 'Esperando a alguien'], ['hecha', 'Hecha'], ['cancelada', 'Cancelada']].map(([k, x]) => `<option value="${k}" ${(t.estado || 'pendiente') === k ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
      <label>Persona<select name="persona_id">${opcionesPersona(t.persona_id)}</select></label></div>
      ${selectRR('recurrencia', t.recurrencia, false)}
      <label>Notas<textarea name="notas">${esc(t.notas)}</textarea></label>`,
    leer: (fd, t = {}) => {
      const estado = fd.get('estado');
      return {
        titulo: fd.get('titulo').trim(), vence_en: combinar(fd.get('fecha'), fd.get('hora')), todo_el_dia: !fd.get('hora'),
        area_id: fd.get('area_id') || null, prioridad: +fd.get('prioridad'), estado, persona_id: fd.get('persona_id') || null,
        recurrencia: leerRR(fd), notas: fd.get('notas') || null,
        esperando_desde: estado === 'esperando' ? (t.esperando_desde || new Date().toISOString()) : null,
        completada_en: estado === 'hecha' ? (t.completada_en || new Date().toISOString()) : null
      };
    }
  },
  evento: {
    titulo: 'Evento', tabla: 'eventos',
    campos: (e = {}) => `
      <label>Título<input type="text" name="titulo" required value="${esc(e.titulo)}"></label>
      <div class="row"><label>Fecha<input type="date" name="fecha" required value="${fechaDe(e.inicio) || ymd(new Date())}"></label>
      <label>Inicio<input type="time" name="hora" value="${horaDe(e.inicio, e.todo_el_dia)}"></label>
      <label>Fin<input type="time" name="hora_fin" value="${e.fin && !e.todo_el_dia ? hm(new Date(e.fin)) : ''}"></label></div>
      <label class="check-line"><input type="checkbox" name="todo_el_dia" ${e.todo_el_dia ? 'checked' : ''}>Todo el día</label>
      <div class="row"><label>Área<select name="area_id">${opcionesArea(e.area_id)}</select></label>
      <label>Lugar<input type="text" name="lugar" value="${esc(e.lugar)}"></label></div>
      ${selectRR('recurrencia', e.recurrencia, true)}
      <label>Descripción<textarea name="descripcion">${esc(e.descripcion)}</textarea></label>`,
    leer: (fd) => {
      const todo = !!fd.get('todo_el_dia') || !fd.get('hora');
      const inicio = combinar(fd.get('fecha'), todo ? null : fd.get('hora'));
      let fin = !todo && fd.get('hora_fin') ? combinar(fd.get('fecha'), fd.get('hora_fin')) : null;
      if (fin && new Date(fin) < new Date(inicio)) fin = null;
      return { titulo: fd.get('titulo').trim(), inicio, fin, todo_el_dia: todo, area_id: fd.get('area_id') || null,
        lugar: fd.get('lugar') || null, recurrencia: leerRR(fd), descripcion: fd.get('descripcion') || null };
    }
  },
  nota: {
    titulo: 'Nota', tabla: 'notas',
    campos: (n = {}) => `
      <label>Título (opcional)<input type="text" name="titulo" value="${esc(n.titulo)}"></label>
      <label>Contenido<textarea name="contenido" style="min-height:200px">${esc(n.contenido)}</textarea></label>
      <div class="row"><label>Área<select name="area_id">${opcionesArea(n.area_id)}</select></label>
      <label>Persona<select name="persona_id">${opcionesPersona(n.persona_id)}</select></label></div>
      <label>Etiquetas (separadas por comas)<input type="text" name="etiquetas" value="${esc((n.etiquetas || []).join(', '))}"></label>
      <label class="check-line"><input type="checkbox" name="fijada" ${n.fijada ? 'checked' : ''}>Fijar arriba</label>`,
    leer: (fd) => ({ titulo: fd.get('titulo') || null, contenido: fd.get('contenido') || '', area_id: fd.get('area_id') || null,
      persona_id: fd.get('persona_id') || null, fijada: !!fd.get('fijada'),
      etiquetas: String(fd.get('etiquetas') || '').split(',').map((s) => s.trim().replace(/^#/, '')).filter(Boolean) })
  },
  persona: {
    titulo: 'Persona', tabla: 'personas',
    campos: (p = {}) => `
      <label>Nombre<input type="text" name="nombre" required value="${esc(p.nombre)}"></label>
      <div class="row"><label>Relación<input type="text" name="relacion" placeholder="compañero, hermana, jugadora…" value="${esc(p.relacion)}"></label>
      <label>Área<select name="area_id">${opcionesArea(p.area_id)}</select></label></div>
      <div class="row"><label>Cumpleaños<input type="date" name="cumpleanos" value="${esc(p.cumpleanos)}"></label>
      <label>Teléfono<input type="text" name="telefono" inputmode="tel" value="${esc(p.telefono)}"></label></div>
      <label>Correo<input type="email" name="email" value="${esc(p.email)}"></label>
      <label>Notas (gustos, ideas de regalo, de qué hablamos…)<textarea name="notas">${esc(p.notas)}</textarea></label>`,
    leer: (fd) => ({ nombre: fd.get('nombre').trim(), relacion: fd.get('relacion') || null, area_id: fd.get('area_id') || null,
      cumpleanos: fd.get('cumpleanos') || null, telefono: fd.get('telefono') || null, email: fd.get('email') || null, notas: fd.get('notas') || null })
  },
  vencimiento: {
    titulo: 'Vencimiento', tabla: 'vencimientos',
    campos: (v = {}) => `
      <label>Qué vence<input type="text" name="titulo" required placeholder="Renovar DNI, ITV, seguro del coche…" value="${esc(v.titulo)}"></label>
      <div class="row"><label>Fecha<input type="date" name="fecha" required value="${esc(v.fecha)}"></label>
      <label>Tipo<select name="categoria">${CATEGORIAS_VENC.map(([k, t]) => `<option value="${k}" ${(v.categoria || 'otro') === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label></div>
      <div class="row"><label>Área<select name="area_id">${opcionesArea(v.area_id)}</select></label>
      <label>Repetir<select name="recurrencia">${[['', 'Una vez'], ['FREQ=YEARLY', 'Cada año'], ['FREQ=MONTHLY', 'Cada mes'], ['FREQ=YEARLY;INTERVAL=2', 'Cada 2 años'], ['FREQ=YEARLY;INTERVAL=5', 'Cada 5 años'], ['FREQ=YEARLY;INTERVAL=10', 'Cada 10 años']].map(([k, t]) => `<option value="${k}" ${(v.recurrencia || '') === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label></div>
      <label>Avisar con antelación (días, separados por comas)<input type="text" name="avisar_dias" value="${esc((v.avisar_dias || [30, 7, 1]).join(', '))}"></label>
      <label>Notas<textarea name="notas">${esc(v.notas)}</textarea></label>`,
    leer: (fd) => ({ titulo: fd.get('titulo').trim(), fecha: fd.get('fecha'), categoria: fd.get('categoria'), area_id: fd.get('area_id') || null,
      recurrencia: fd.get('recurrencia') || null, notas: fd.get('notas') || null,
      avisar_dias: String(fd.get('avisar_dias') || '').split(',').map((x) => parseInt(x, 10)).filter((x) => x >= 0) })
  }
};

const LISTAS = { tarea: 'tareas', evento: 'eventos', nota: 'notas', persona: 'personas', vencimiento: 'vencimientos' };
function abrirForm(tipo, id, preset) {
  const F = FORMS[tipo]; const item = id ? S[LISTAS[tipo]].find((x) => x.id === id) : null;
  if (id && !item) { toast('No encontrado (¿está sincronizado?)'); return; }
  const datos = item || preset || {};
  const m = $('#modal');
  m.innerHTML = `<form method="dialog" data-form="entidad" data-tipo="${tipo}" data-id="${id || ''}">
    <h2>${item ? 'Editar' : 'Nueva'} ${F.titulo.toLowerCase()}</h2>${F.campos(datos)}
    <div class="actions">${item ? '<button type="button" class="btn danger" data-action="borrar">Eliminar</button><span class="spacer"></span>' : ''}
      <button type="button" class="btn ghost" data-action="cerrar">Cancelar</button>
      <button type="submit" class="btn primary">Guardar</button></div></form>`;
  m.showModal();
  const primero = m.querySelector('input[type=text],textarea'); if (primero && !item) primero.focus();
}
function abrirNuevo() {
  const m = $('#modal');
  const tipos = [['tarea', 'tareas', 'Tarea'], ['evento', 'agenda', 'Evento'], ['nota', 'notas', 'Nota'], ['persona', 'personas', 'Persona'], ['vencimiento', 'vencimientos', 'Vencimiento']];
  m.innerHTML = `<form method="dialog"><h2>Añadir</h2><div class="sheet">${tipos.map(([t, ic, x]) =>
    `<button type="button" data-action="nuevo-tipo" data-tipo="${t}">${svg(ic)}${x}</button>`).join('')}</div>
    <div class="actions"><button type="button" class="btn ghost" data-action="cerrar">Cancelar</button></div></form>`;
  m.showModal();
}
function presetSegunVista() {
  const p = {}; if (S.filtroArea) p.area_id = S.filtroArea; return p;
}

/* ---------- Eventos de la interfaz ---------- */
document.addEventListener('click', async (ev) => {
  const b = ev.target.closest('[data-action]'); if (!b) return;
  const a = b.dataset.action; const id = b.dataset.id;
  const m = $('#modal');
  try {
    if (a === 'goto') irA(b.dataset.view);
    else if (a === 'toggle') await alternarTarea(id);
    else if (a === 'editar') abrirForm(b.dataset.tipo, id);
    else if (a === 'nuevo') abrirNuevo();
    else if (a === 'nuevo-tipo') abrirForm(b.dataset.tipo, null, presetSegunVista());
    else if (a === 'cerrar') m.close();
    else if (a === 'borrar') {
      const f = m.querySelector('form');
      if (confirm('¿Eliminar este elemento?')) { m.close(); await borrar(FORMS[f.dataset.tipo].tabla, f.dataset.id); }
    }
    else if (a === 'resolver') await resolverVencimiento(id);
    else if (a === 'filtro-area') { S.filtroArea = id; render(); }
    else if (a === 'filtro-estado') { S.filtroEstado = id; render(); }
    else if (a === 'semana') { const d = +b.dataset.d; S.agendaDesde = d === 0 ? lunesDe(new Date()) : addDias(S.agendaDesde, d); render(); }
    else if (a === 'salir') { await sb.auth.signOut(); localStorage.removeItem('asistente-cache'); location.reload(); }
    else if (a === 'instalar' && S.installPrompt) { S.installPrompt.prompt(); S.installPrompt = null; render(); }
    else if (a === 'nueva-area') { await guardar('areas', { nombre: 'Nueva área', orden: S.areas.length + 1 }); }
    else if (a === 'archivar-area') { const ar = areaDe(id); await guardar('areas', { archivada: !ar.archivada }, id); }
    else if (a === 'signup') await registrarse();
    else if (a === 'activar-avisos') await activarAvisos();
    else if (a === 'probar-avisos') await probarAvisos();
    else if (a === 'desactivar-avisos') await desactivarAvisos();
  } catch (e) { console.error(e); }
});

document.addEventListener('change', async (ev) => {
  const el = ev.target;
  if (el.matches('[data-rr]')) {
    const d = el.form.querySelector('[data-dias]'); if (d) d.hidden = el.value !== 'WEEKLY';
  }
  if (el.dataset.pref) {
    const t = el.dataset.tipoPref;
    const v = t === 'num' ? +el.value : t === 'bool' ? el.checked : el.value;
    if (v === '' || v === null) return;
    await guardarPref(el.dataset.pref, v);
    return;
  }
  if (el.dataset.area) {
    const v = el.value.trim(); if (!v) return;
    await guardar('areas', { [el.dataset.campo]: v }, el.dataset.area);
  }
});

document.addEventListener('input', (ev) => {
  if (ev.target.dataset.input === 'notas') { S.textoNotas = ev.target.value; render(); }
});

document.addEventListener('submit', async (ev) => {
  const f = ev.target; const tipo = f.dataset.form;
  if (!tipo) return;
  ev.preventDefault();
  const fd = new FormData(f);
  try {
    if (tipo === 'rapido') {
      const txt = String(fd.get('texto') || '').trim(); if (!txt) return;
      const r = parseRapido(txt); if (!r.titulo) return;
      await guardar('tareas', { ...r, origen: 'manual' });
      toast('Añadida' + (r.vence_en ? ' · ' + cuandoTexto(r.vence_en, !r.todo_el_dia) : ''));
      const i = $('#rapido'); if (i) { i.value = ''; i.focus(); }
    } else if (tipo === 'buscar') {
      S.q = String(fd.get('q') || '').trim(); if (!S.q) return;
      const { data, error } = await sb.rpc('buscar', { q: S.q, limite: 40 });
      if (error) { toast('Error al buscar: ' + error.message); return; }
      S.resultados = data || []; render();
    } else if (tipo === 'entidad') {
      const F = FORMS[f.dataset.tipo]; const id = f.dataset.id || null;
      const actual = id ? S[LISTAS[f.dataset.tipo]].find((x) => x.id === id) : undefined;
      const datos = F.leer(fd, actual);
      $('#modal').close();
      await guardar(F.tabla, datos, id);
      toast('Guardado');
    }
  } catch (e) { console.error(e); }
});

/* ---------- Acceso ---------- */
async function entrar(ev) {
  ev.preventDefault();
  const fd = new FormData(ev.target); const msg = $('#login-msg'); msg.textContent = 'Entrando…';
  const { error } = await sb.auth.signInWithPassword({ email: fd.get('email'), password: fd.get('password') });
  msg.textContent = error ? traducirError(error.message) : '';
}
async function registrarse() {
  const f = $('#login-form'); if (!f.reportValidity()) return;
  const fd = new FormData(f); const msg = $('#login-msg'); msg.textContent = 'Creando cuenta…';
  const { data, error } = await sb.auth.signUp({ email: fd.get('email'), password: fd.get('password'),
    options: { emailRedirectTo: location.origin + location.pathname } });
  if (error) msg.textContent = traducirError(error.message);
  else if (!data.session) msg.textContent = 'Cuenta creada. Revisa tu correo y pulsa el enlace de confirmación; después entra aquí.';
}
function traducirError(m) {
  if (/invalid login/i.test(m)) return 'Correo o contraseña incorrectos.';
  if (/not confirmed/i.test(m)) return 'Falta confirmar el correo: revisa tu bandeja de entrada.';
  if (/already registered/i.test(m)) return 'Ese correo ya tiene cuenta: pulsa Entrar.';
  if (/fetch/i.test(m)) return 'No hay conexión con el servidor.';
  return m;
}

async function arrancarSesion(session) {
  S.user = session ? session.user : null;
  $('#login').hidden = !!S.user; $('#app').hidden = !S.user;
  if (!S.user) return;
  const hayCache = cargarCache();
  const v = (location.hash || '').slice(1); if (VISTAS[v]) S.view = v;
  if (hayCache) render();
  try { await cargar(); await asegurarAreas(); estadoSync(true); }
  catch (e) { console.error(e); estadoSync(false); if (!hayCache) toast('No se pudieron cargar los datos'); }
  await estadoAvisos(); render(); escucharCambios();
}

/* ---------- Arranque ---------- */
$('#login-form').addEventListener('submit', entrar);
let sesionIniciada; // undefined hasta el primer aviso (así también se muestra el acceso sin sesión)
sb.auth.onAuthStateChange((evento, session) => {
  const uid = session ? session.user.id : null;
  if (uid === sesionIniciada) { if (session) S.user = session.user; return; }
  sesionIniciada = uid; arrancarSesion(session);
});
const actualizarRed = () => { $('#offline').hidden = navigator.onLine; if (navigator.onLine && S.user) refrescar(); };
window.addEventListener('online', actualizarRed); window.addEventListener('offline', actualizarRed);
$('#offline').hidden = navigator.onLine;
document.addEventListener('visibilitychange', () => { if (!document.hidden && S.user && navigator.onLine) refrescar(); });
window.addEventListener('hashchange', () => { const v = location.hash.slice(1); if (S.user && VISTAS[v] && v !== S.view) { S.view = v; render(); } });
if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', (e) => { if (e.data && e.data.vista && VISTAS[e.data.vista]) irA(e.data.vista); });
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); S.installPrompt = e; if (S.view === 'ajustes') render(); });
// Cada minuto: refrescar "Hoy" (horas, atrasadas) sin recargar datos
setInterval(() => { if (S.user && !$('#modal').open && ['hoy', 'agenda'].includes(S.view) && !document.activeElement.matches('input,textarea')) render(); }, 60000);
if ('serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register('sw.js').catch(() => {});

// Exponer para pruebas
window.__asistente = { S, parseRapido, ocurrencias, siguienteFecha };
})();
