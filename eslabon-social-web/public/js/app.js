/* Mejoras progresivas. El sitio funciona completo sin este archivo. */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var meta = doc.querySelector('meta[name="csrf-token"]');
  var token = meta ? meta.getAttribute('content') : '';
  var canFetch = typeof window.fetch === 'function';

  function post(url, data) {
    return window.fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-Token': token },
      body: JSON.stringify(data),
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    });
  }

  /* ---------- Aviso de cookies: responder sin recargar ---------- */
  var consentForm = doc.querySelector('[data-consentimiento]');
  if (consentForm && canFetch) {
    consentForm.addEventListener('click', function (event) {
      var button = event.target.closest ? event.target.closest('button[name="accion"]') : null;
      if (!button) return;
      event.preventDefault();
      post(consentForm.action, { accion: button.value })
        .then(function () {
          var banner = doc.getElementById('aviso-cookies');
          if (banner) banner.hidden = true;
          var main = doc.getElementById('contenido');
          if (main) main.focus();
        })
        .catch(function () { button.form.submit(); });
    });
  }

  /* ---------- Tema claro / oscuro ---------- */
  var themeForm = doc.querySelector('[data-tema]');
  if (themeForm && canFetch) {
    themeForm.addEventListener('submit', function (event) {
      event.preventDefault();
      var current = root.getAttribute('data-theme');
      if (!current) {
        var dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        current = dark ? 'oscuro' : 'claro';
      }
      var next = current === 'oscuro' ? 'claro' : 'oscuro';
      root.setAttribute('data-theme', next);
      // El servidor solo lo recuerda si se aceptaron las cookies de preferencias.
      post(themeForm.action, { tema: next }).catch(function () {});
    });
  }

  /* ---------- Formulario de contacto: contador y doble envío ---------- */
  var contactForm = doc.querySelector('[data-contacto]');
  if (contactForm) {
    var area = contactForm.querySelector('textarea[name="mensaje"]');
    var help = area ? area.parentNode.querySelector('.campo__ayuda') : null;
    if (area && help) {
      var base = help.textContent;
      var update = function () {
        help.textContent = base + ' Llevas ' + area.value.length + '.';
      };
      area.addEventListener('input', update);
    }
    contactForm.addEventListener('submit', function () {
      var button = contactForm.querySelector('button[type="submit"]');
      if (button) {
        // Se desactiva tras el envío para que el valor del formulario viaje completo.
        window.setTimeout(function () { button.disabled = true; button.textContent = 'Enviando…'; }, 0);
      }
    });
    var firstError = contactForm.querySelector('[aria-invalid="true"]');
    if (firstError) firstError.focus();
  }

  /* ---------- Enlaces externos en pestaña nueva ---------- */
  var links = doc.querySelectorAll('a[rel~="external"]');
  for (var i = 0; i < links.length; i += 1) links[i].setAttribute('target', '_blank');
})();
