/* Canje de la tarjeta Fundador (/canje/) y lista de espera (/pronto/). Sin cookies, sin pixels, sin analítica.
   Habla con el workflow de n8n "FUTURO · 5 · Canje" (contrato en side-session-notes/…/canje-entrega.md).
   ?mock=1 responde con las respuestas fijas del contrato, sin red (para probar mientras el workflow está apagado). */
(function(){
'use strict';

// Endpoints de producción (responden cuando el workflow esté activo). CORS solo desde santiagocaballero007.github.io.
var API = {
  validar: 'https://santiagocaba2026.app.n8n.cloud/webhook/futuro/canje/validar',
  registro: 'https://santiagocaba2026.app.n8n.cloud/webhook/futuro/canje/registro',
  apartar: 'https://santiagocaba2026.app.n8n.cloud/webhook/futuro/canje/apartar'
};
// Apertura de FUTURO en ISO con zona de CDMX, p. ej. '2026-12-01T10:00:00-06:00'. Vacío = "Muy pronto" (fecha por confirmar).
var LANZAMIENTO = '';
// Versión del texto de la casilla; n8n la pide y la guarda con el registro.
var AVISO_VERSION = 'v1-2026-11';
// Link de Instagram de FUTURO. Vacío = el botón no aparece.
var INSTAGRAM_URL = '';
var BENEFICIO = 'Entras antes que todos y te llevas un extra de lanzamiento.';

var TXT = {
  formato: 'Revisa el código: son 8 caracteres, como ABCD-2345.',
  letras: 'Los códigos no usan 0, O, 1 ni I. Revisa tu tarjeta.',
  ya_usado: 'Este código ya se usó.',
  ya_canjeado: 'Este correo ya tiene una tarjeta Fundador.',
  ya_registrado: 'Este código ya está registrado con tu correo.',
  espera: 'Espera un momento e inténtalo otra vez.',
  datos_invalidos: 'Revisa tus datos: falta algo o no tiene el formato correcto.',
  muy_grande: 'Algún dato es demasiado largo. Revísalo e inténtalo otra vez.',
  red: 'No pudimos conectar. Revisa tu internet e inténtalo otra vez.',
  menores_pausado: document.body.getAttribute('data-page') === 'pronto'
    ? 'Por ahora la lista es solo para mayores de 18. Muy pronto podrás entrar con permiso de tu tutor.'
    : 'Por ahora el canje es solo para mayores de 18. Muy pronto podrás hacerlo con permiso de tu tutor.'
};

var $ = function(s, r){ return (r || document).querySelector(s); };
var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var params = new URLSearchParams(location.search);
var MOCK = params.get('mock') === '1' && /^(localhost|127\.0\.0\.1)$/.test(location.hostname);   // nunca en la página publicada
var lanzamiento = (MOCK && params.get('fecha')) || LANZAMIENTO;
var page = document.body.getAttribute('data-page');
var state = { codigo: '', tipo: 'general', numero: null, estado: '', apartado: false };

/* ---------- Código: normalizar y formatear ---------- */
var CODE_RE = /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;
var EVENTO = 'STARTUPNOW';
function raw(v){ return String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
function fmt(r){
  if (r.length >= 5 && EVENTO.indexOf(r) === 0) return r;          // STARTUPNOW va sin guion
  r = r.slice(0, 8);
  return r.length > 4 ? r.slice(0, 4) + '-' + r.slice(4) : r;
}
function codeError(v){
  if (v === EVENTO || CODE_RE.test(v)) return '';
  return /[01OI]/.test(v.replace('-', '')) && v.length === 9 ? TXT.letras : TXT.formato;
}

/* ---------- Red (o simulación) ---------- */
function post(url, body){
  if (MOCK) return mock(url, body);
  var ctrl = 'AbortController' in window ? new AbortController() : null;
  var timer = ctrl && setTimeout(function(){ ctrl.abort(); }, 15000);
  return fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal: ctrl && ctrl.signal, credentials: 'omit', referrerPolicy: 'no-referrer'
  }).then(function(res){
    return res.json().catch(function(){ return {}; }).then(function(data){ return { status: res.status, data: data }; });
  }).finally(function(){ clearTimeout(timer); });
}

// Ningún código de aquí es real: los ejemplos (TEST-2345, ABCD-2345) no están en codigos-fundador.csv.
// Respuestas fijas del contrato. Códigos que empiezan con AAAA = no existe, UUUU = ya usado, ZZZZ = 413, XXXX = sin red.
// Correos con "repetido" = ya_registrado, "canjeado" = ya_canjeado, "usado" = ya_usado, "invalido" = datos_invalidos,
// "grande" = 413; "espera" = 429; "pausado" = 503 menores_pausado (respaldo); "sinred" = sin red.
// Los menores nunca llegan aquí: no se les piden datos ni se llama a /registro.
function mock(url, b){
  var r;
  if (url === API.validar){
    var c = raw(b.codigo); c = c === EVENTO ? c : fmt(c);
    if (c.indexOf('XXXX') === 0) r = null;
    else if (c.indexOf('ZZZZ') === 0) r = { status: 413, data: { valido: false, motivo: 'muy_grande' } };
    else if (codeError(c)) r = { status: 200, data: { valido: false, motivo: 'formato' } };
    else if (c === EVENTO) r = { status: 200, data: { valido: true, tipo: 'evento', numero: null } };
    else if (c.indexOf('AAAA') === 0) r = { status: 200, data: { valido: false, motivo: 'no_existe' } };
    else if (c.indexOf('UUUU') === 0) r = { status: 200, data: { valido: false, motivo: 'ya_usado' } };
    else r = { status: 200, data: { valido: true, tipo: 'fundador', numero: '023', apartado: c.indexOf('QAPA') === 0 } };
  } else if (url === API.apartar){
    // QRED falla la primera vez y responde bien al reintentar; QUSA = ya_usado; QNXE = no_existe; QEVE = evento;
    // QFXR = formato; QGRA = 413 muy_grande; Q5ZZ = error del servidor.
    var ca = b.codigo;
    if (ca.indexOf('QRED') === 0 && !mock.reintento){ mock.reintento = true; r = null; }
    else if (ca.indexOf('QUSA') === 0) r = { status: 400, data: { ok: false, error: 'ya_usado' } };
    else if (ca.indexOf('QNXE') === 0) r = { status: 400, data: { ok: false, error: 'no_existe' } };
    else if (ca.indexOf('QEVE') === 0) r = { status: 400, data: { ok: false, error: 'evento' } };
    else if (ca.indexOf('QFXR') === 0) r = { status: 400, data: { ok: false, error: 'formato' } };
    else if (ca.indexOf('QGRA') === 0) r = { status: 413, data: { ok: false, error: 'muy_grande' } };
    else if (ca.indexOf('Q5ZZ') === 0) r = { status: 500, data: {} };
    else r = { status: 200, data: { ok: true, estado: 'apartado', numero: '023' } };
  } else {
    var tipo = !b.codigo ? 'general' : b.codigo === EVENTO ? 'evento' : 'fundador';
    var numero = tipo === 'fundador' ? '023' : null;
    var m = b.correo || '';
    if (/sinred/.test(m)) r = null;
    else if (b.sitio) r = { status: 200, data: { ok: true, estado: 'lista_de_espera', tipo: tipo, numero: numero } };
    else if (/grande/.test(m)) r = { status: 413, data: { ok: false, error: 'muy_grande' } };
    else if (/invalido/.test(m)) r = { status: 400, data: { ok: false, error: 'datos_invalidos' } };
    else if (/canjeado/.test(m)) r = { status: 400, data: { ok: false, error: 'ya_canjeado' } };
    else if (/usado/.test(m)) r = { status: 400, data: { ok: false, error: 'ya_usado' } };
    else if (/repetido/.test(m)) r = { status: 200, data: { ok: true, estado: 'ya_registrado', tipo: tipo, numero: numero } };
    else if (/espera/.test(m)) r = { status: 429, data: { ok: false, error: 'espera' } };
    else if (/pausado/.test(m)) r = { status: 503, data: { ok: false, error: 'menores_pausado' } };
    else r = { status: 200, data: { ok: true, estado: 'lista_de_espera', tipo: tipo, numero: numero } };
  }
  return new Promise(function(ok, fail){
    setTimeout(function(){ r ? ok(r) : fail(new Error('sin red')); }, params.get('paso') ? 0 : 650);
  });
}

/* ---------- Pantallas ---------- */
var screens = Array.prototype.slice.call(document.querySelectorAll('.screen'));
function show(id, focusSel){
  var el;
  screens.forEach(function(s){ var on = s.getAttribute('data-screen') === id; s.hidden = !on; if (on) el = s; });
  if (!reduce){ el.classList.remove('enter'); void el.offsetWidth; el.classList.add('enter'); }
  window.scrollTo(0, 0);
  var f = focusSel === false ? null : $(focusSel || '[data-focus]', el);
  if (f){ if (!f.matches('input,button,a')) f.setAttribute('tabindex', '-1'); f.focus({ preventScroll: true }); }
  return el;
}
function busy(btn, on, text){
  if (on){ btn.dataset.txt = btn.innerHTML; btn.textContent = text; btn.setAttribute('aria-busy', 'true'); btn.disabled = true; }
  else { btn.innerHTML = btn.dataset.txt || btn.innerHTML; btn.removeAttribute('aria-busy'); btn.disabled = false; }
}
function shake(el){ if (reduce) return; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }

/* ---------- Cuenta regresiva ---------- */
function pad(n){ return (n < 10 ? '0' : '') + n; }
function clock(root){
  var nums = $('[data-clock]', root), soon = $('[data-soon]', root), sr = $('[data-clock-sr]', root), lab = $('[data-clock-l]', root);
  var target = lanzamiento ? Date.parse(lanzamiento) : NaN;
  function tick(){
    var left = target - Date.now();
    if (isNaN(target)){
      nums.hidden = true; soon.hidden = false; soon.textContent = 'Muy pronto'; lab.textContent = 'FUTURO abre';
      sr.textContent = 'FUTURO abre muy pronto. La fecha está por confirmar.'; return false;
    }
    if (left <= 0){
      nums.hidden = true; soon.hidden = false; soon.textContent = 'Ya abrió'; lab.textContent = 'FUTURO';
      sr.textContent = 'FUTURO ya abrió.'; return false;
    }
    var m = Math.floor(left / 60000), d = Math.floor(m / 1440), h = Math.floor(m % 1440 / 60); m = m % 60;
    nums.hidden = false; soon.hidden = true; lab.textContent = 'FUTURO abre en';
    $('[data-d]', nums).textContent = d; $('[data-h]', nums).textContent = pad(h); $('[data-m]', nums).textContent = pad(m);
    sr.textContent = 'FUTURO abre en ' + d + ' días, ' + h + ' horas y ' + m + ' minutos.';
    return true;
  }
  if (tick()) setInterval(tick, 15000);
}

/* ---------- Registro: primero la edad. Menores: sin datos y sin llamar a /registro. ---------- */
var MAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/;
function setErr(input, msg){
  var e = document.getElementById(input.getAttribute('aria-describedby').split(' ')[0]);
  e.textContent = msg || '';
  if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
}
function initForm(form, onDone, onMenor){
  var nombre = form.nombre, correo = form.correo, aviso = form.aviso;
  var adulto = $('[data-adulto]', form), edadErr = $('#err-edad', form), avisoErr = $('#err-aviso', form), top = $('[data-form-err]', form);
  var btn = $('button[type=submit]', form);

  Array.prototype.forEach.call(form.mayor, function(r){
    r.addEventListener('change', function(){
      edadErr.textContent = ''; top.textContent = '';
      if (form.mayor.value === 'no'){
        nombre.value = ''; correo.value = ''; aviso.checked = false; adulto.hidden = true;
        onMenor(); return;
      }
      adulto.hidden = false;
      if (!reduce){ adulto.classList.remove('enter'); void adulto.offsetWidth; adulto.classList.add('enter'); }
      nombre.focus({ preventScroll: true });
    });
  });
  [nombre, correo].forEach(function(i){ i.addEventListener('input', function(){ if (i.getAttribute('aria-invalid')) setErr(i, ''); }); });
  aviso.addEventListener('change', function(){ if (aviso.checked) avisoErr.textContent = ''; });

  function check(){
    var bad = [], n = nombre.value.trim(), c = correo.value.trim().toLowerCase();
    if (n.length < 2 || n.length > 80){ setErr(nombre, 'Escribe tu nombre (de 2 a 80 letras).'); bad.push(nombre); }
    else if (/[<>]/.test(n)){ setErr(nombre, 'Tu nombre no puede llevar < ni >.'); bad.push(nombre); }
    else setErr(nombre, '');
    if (!MAIL_RE.test(c)){ setErr(correo, 'Escribe un correo válido, como nombre@gmail.com.'); bad.push(correo); } else setErr(correo, '');
    if (!aviso.checked){ avisoErr.textContent = 'Para seguir, marca la casilla.'; bad.push(aviso); }
    return bad;
  }

  form.addEventListener('submit', function(ev){
    ev.preventDefault();
    top.textContent = '';
    if (form.mayor.value !== 'si'){ edadErr.textContent = 'Elige sí o no.'; form.mayor[0].focus(); return; }
    var bad = check();
    if (bad.length){ bad[0].focus(); shake(btn); return; }
    var body = {
      codigo: state.codigo, nombre: nombre.value.trim(), correo: correo.value.trim().toLowerCase(),
      mayor_de_18: true, aviso_version: AVISO_VERSION, sitio: form.sitio.value
    };
    busy(btn, true, 'Enviando…');
    post(API.registro, body).then(function(r){
      busy(btn, false);
      var d = r.data || {};
      if (r.status === 200 && d.ok){
        state.estado = d.estado; state.tipo = d.tipo || state.tipo; state.numero = d.numero || state.numero;
        onDone(); return;
      }
      var e = r.status === 429 ? 'espera' : r.status === 413 ? 'muy_grande' : d.error;
      // Respaldo: aquí solo llegan mayores, pero n8n sigue respondiendo 503 si le llega un menor.
      if (e === 'menores_pausado'){ top.textContent = TXT.menores_pausado; top.focus(); return; }
      if (e === 'ya_canjeado'){ setErr(correo, TXT.ya_canjeado); correo.focus(); return; }
      if (e === 'formato' || e === 'no_existe' || e === 'ya_usado'){
        top.textContent = e === 'ya_usado' ? TXT.ya_usado : TXT.formato; showBack(form, true);
      } else top.textContent = TXT[e] || TXT.red;
      shake(btn); top.focus();
    }).catch(function(){ busy(btn, false); top.textContent = TXT.red; shake(btn); top.focus(); });
  });
}
function showBack(form, on){ var b = $('[data-back]', form); if (b) b.hidden = !on; }
// Solo capturas en modo simulado: &menor=1 marca "No"; &adulto=1 marca "Sí"; &enviar=1 además llena datos de ejemplo y envía.
function demoFill(form){
  if (params.get('menor') === '1'){ form.mayor[1].checked = true; form.mayor[1].dispatchEvent(new Event('change')); return; }
  if (params.get('adulto') === '1' || params.get('enviar') === '1'){ form.mayor[0].checked = true; form.mayor[0].dispatchEvent(new Event('change')); }
  if (params.get('enviar') === '1'){
    form.nombre.value = 'Ana López'; form.correo.value = params.get('correo') || 'ana@gmail.com'; form.aviso.checked = true;
    form.requestSubmit();
  }
}
// "Me equivoqué": vuelve a preguntar la edad, sin nada marcado.
function resetEdad(form){
  Array.prototype.forEach.call(form.mayor, function(r){ r.checked = false; });
  $('[data-adulto]', form).hidden = true;
}

/* ---------- Pantalla final (estado + reloj) ---------- */
function renderFin(root){
  var st = $('[data-status]', root), ben = $('[data-benefit]', root);
  var fundador = state.tipo === 'fundador' && state.numero;
  var txt;
  if (state.estado === 'ya_registrado') txt = state.codigo ? TXT.ya_registrado : 'Este correo ya está en la lista.';
  else if (fundador) txt = 'Ya eres Fundador #' + state.numero + '.';
  else if (state.tipo === 'evento') txt = 'Ya estás en la lista. Tu regalo está apartado.';
  else txt = 'Ya estás en la lista.';
  st.textContent = txt;
  st.classList.toggle('long', txt.length > 40);
  ben.hidden = !fundador;
  $('[data-benefit-txt]', root).textContent = BENEFICIO;
}

/* ---------- /canje/ ---------- */
function canje(){
  var input = $('#codigo'), cForm = $('#form-codigo'), cBtn = $('button[type=submit]', cForm), cErr = $('#err-codigo');
  var skip = $('#saltar'), timers = [];
  var pre = raw(params.get('c'));
  // El código no se queda en el historial ni en la barra (por si alguien hace captura); los utm sí.
  if (params.has('c') && history.replaceState){
    var q = new URLSearchParams(location.search); q.delete('c');
    history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash);
  }

  input.addEventListener('input', function(){
    var f = fmt(raw(input.value));
    if (input.value !== f) input.value = f;
    if (input.getAttribute('aria-invalid')){ input.removeAttribute('aria-invalid'); cErr.textContent = ''; }
  });

  function toCode(){
    timers.forEach(clearTimeout); skip.hidden = true;
    show('c', pre ? '[data-focus]' : '#codigo');
    if (!pre) return;
    var target = pre === EVENTO ? pre : raw(fmt(pre));
    input.readOnly = true; input.setAttribute('aria-busy', 'true');
    if (reduce){ input.value = fmt(target); done(); return; }
    var i = 0;
    (function type(){
      i++; input.value = fmt(target.slice(0, i));
      if (i < target.length) timers.push(setTimeout(type, 40)); else timers.push(setTimeout(done, 260));
    })();
    function done(){ input.readOnly = false; input.removeAttribute('aria-busy'); validar(); }
  }

  function validar(){
    var v = input.value;
    cErr.textContent = ''; input.classList.remove('ok');
    var e = codeError(v);
    if (e){ cErr.textContent = e; input.setAttribute('aria-invalid', 'true'); shake(input); input.focus(); return; }
    busy(cBtn, true, 'Revisando…');
    post(API.validar, { codigo: v }).then(function(r){
      busy(cBtn, false);
      var d = r.data || {};
      if (r.status === 200 && d.valido){
        state.codigo = v; state.tipo = d.tipo; state.numero = d.numero || null; state.apartado = !!d.apartado;
        input.classList.add('ok');
        setTimeout(toOk, reduce ? 0 : 350); return;
      }
      cErr.textContent = d.motivo === 'ya_usado' ? TXT.ya_usado : r.status === 200 || r.status === 413 ? TXT.formato : TXT.red;
      input.setAttribute('aria-invalid', 'true'); shake(input); input.focus();
    }).catch(function(){ busy(cBtn, false); cErr.textContent = TXT.red; shake(input); input.focus(); });
  }
  cForm.addEventListener('submit', function(ev){ ev.preventDefault(); validar(); });

  function toOk(){
    var el = $('[data-screen=d]');
    var f = state.tipo === 'fundador' && state.numero;
    $('[data-ok-line]', el).textContent = f ? 'Eres Fundador #' + state.numero + '.' : 'Tu regalo está apartado.';
    $('[data-ok-code]', el).textContent = state.codigo;
    $('.meta', el).classList.toggle('stack', state.codigo === EVENTO);
    $('.pill', el).hidden = state.codigo === EVENTO;
    $('[data-ok-tipo-l]', el).textContent = f ? 'Fundador' : 'Tipo';
    $('[data-ok-tipo]', el).textContent = f ? '#' + state.numero : 'Regalo de evento';
    show('d');
  }
  $('#ir-registro').addEventListener('click', toForm);
  $('#otro-codigo').addEventListener('click', otro);
  function otro(){ pre = ''; pedido++; input.value = ''; input.classList.remove('ok'); state.codigo = ''; state.apartado = false; show('c', '#codigo'); }
  function toForm(){
    var el = $('[data-screen=e]');
    $('[data-chip]', el).textContent = state.codigo + (state.tipo === 'fundador' && state.numero ? ' · Fundador #' + state.numero : ' · Regalo de evento');
    show('e');
  }
  var form = $('#form-registro');
  initForm(form, toFin, toMenor);
  // Menor: no pedimos datos. Con tarjeta solo se guarda el código en /apartar; con el código del video no se llama a nada
  // y no le decimos que guarde una tarjeta que no tiene.
  var EVENTO_MENOR = 'Tu regalo está apartado. Canjéalo con el código STARTUPNOW cuando FUTURO abra.';
  var APARTADO = 'Tu regalo queda apartado. Guarda tu tarjeta: la canjeas cuando FUTURO abra.';
  var pedido = 0;
  function textoMenor(txt, reintentar){
    $('[data-menor]').textContent = txt;
    $('[data-reintentar]').hidden = !reintentar;
  }
  function apartar(){
    var este = ++pedido;
    textoMenor('Apartando tu regalo…', false);
    post(API.apartar, { codigo: state.codigo }).then(function(r){
      if (este !== pedido) return;
      var d = r.data || {};
      if (r.status === 200 && d.ok){ state.apartado = true; textoMenor(APARTADO, false); }
      else if (d.error === 'ya_usado') textoMenor(TXT.ya_usado, false);
      else if (d.error === 'no_existe' || d.error === 'formato' || d.error === 'muy_grande') textoMenor(TXT.formato, false);
      else if (d.error === 'evento') textoMenor(EVENTO_MENOR, false);
      else textoMenor('Guarda tu tarjeta e inténtalo de nuevo.', true);
    }).catch(function(){
      if (este === pedido) textoMenor('Guarda tu tarjeta e inténtalo de nuevo.', true);
    });
  }
  function toMenor(){
    if (state.codigo === EVENTO) textoMenor(EVENTO_MENOR, false);
    else if (state.apartado) textoMenor(APARTADO, false);
    else apartar();
    show('m');
  }
  $('[data-reintentar]').addEventListener('click', apartar);
  $('[data-edad-otra]').addEventListener('click', function(){ pedido++; resetEdad(form); show('e'); });
  clock($('[data-screen=m]'));
  $('[data-back]', form).addEventListener('click', function(){ showBack(form, false); otro(); });
  function toFin(){ var el = $('[data-screen=f]'); renderFin(el); show('f'); }
  clock($('[data-screen=f]'));

  // Saltos directos para capturas en modo simulado: ?mock=1&paso=a…f
  var paso = MOCK && params.get('paso');
  if (paso){
    state.codigo = pre === EVENTO ? EVENTO : fmt(pre || 'TEST2345');
    state.tipo = state.codigo === EVENTO ? 'evento' : 'fundador'; state.numero = state.tipo === 'fundador' ? '023' : null;
    state.estado = params.get('estado') || 'lista_de_espera';
    skip.hidden = paso !== 'a' && paso !== 'b';
    if (paso === 'a'){ show('a', false); setTimeout(function(){ $('#u-imp').classList.add('on'); }, 300); }
    else if (paso === 'b') show('b', false);
    else if (paso === 'c'){ if (pre) toCode(); else show('c', '#codigo'); }
    else if (paso === 'd'){ input.value = state.codigo; toOk(); }
    else if (paso === 'e'){
      toForm();
      demoFill(form);
    }
    else if (paso === 'f') toFin();
    return;
  }

  // a → b → c
  skip.addEventListener('click', toCode);
  show('a', false);
  requestAnimationFrame(function(){ requestAnimationFrame(function(){ $('#u-imp').classList.add('on'); }); });
  timers.push(setTimeout(function(){
    show('b', false);
    timers.push(setTimeout(toCode, reduce ? 1600 : 2200));
  }, reduce ? 1800 : 2700));
}

/* ---------- /pronto/: cuenta regresiva + lista de espera sin código ---------- */
function pronto(){
  var form = $('#form-registro');
  clock($('[data-screen=p]')); clock($('[data-screen=f]')); clock($('[data-screen=m]'));
  initForm(form, function(){ renderFin($('[data-screen=f]')); show('f'); }, function(){ show('m'); });
  $('[data-edad-otra]').addEventListener('click', function(){ resetEdad(form); show('p'); });
  var paso = MOCK && params.get('paso');
  if (paso === 'f'){ state.estado = params.get('estado') || 'lista_de_espera'; renderFin($('[data-screen=f]')); show('f'); }
  else if (paso){ show('p', false); demoFill(form); }
}

// Instagram: el botón sale solo cuando hay link.
var ig = (MOCK && params.get('ig')) || INSTAGRAM_URL;
if (ig) Array.prototype.forEach.call(document.querySelectorAll('[data-instagram]'), function(a){ a.href = ig; a.hidden = false; });

if (page === 'canje') canje();
if (page === 'pronto') pronto();
})();
