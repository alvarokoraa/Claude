/* Gestoría del Ahorro — interacción de la landing.
   Sin dependencias ni scripts de terceros: todo se sirve desde el propio dominio. */
(function () {
  "use strict";

  // Reparto típico de una factura doméstica (orientativo). Ajustar con datos reales.
  var PARTS = { potencia: 0.26, energia: 0.48, servicios: 0.05, contador: 0.015, impuestos: 0.195 };
  // Rango de ahorro que se muestra. COMPLETAR con el dato real de vuestros estudios.
  var SAVING_MIN = 0.12;
  var SAVING_MAX = 0.28;

  var eur = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  var eur2 = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function initBill() {
    var range = document.getElementById("importe");
    if (!range) return;
    var out = document.getElementById("importe-out");
    var saving = document.getElementById("ahorro-out");
    var cells = document.querySelectorAll("[data-part]");

    function render() {
      var total = Number(range.value);
      var min = Number(range.min);
      var max = Number(range.max);
      range.style.setProperty("--pct", ((total - min) / (max - min)) * 100 + "%");
      out.textContent = eur.format(total);
      range.setAttribute("aria-valuetext", eur.format(total) + " al mes");
      cells.forEach(function (cell) {
        cell.textContent = eur2.format(total * PARTS[cell.getAttribute("data-part")]);
      });
      var yMin = Math.round((total * SAVING_MIN * 12) / 5) * 5;
      var yMax = Math.round((total * SAVING_MAX * 12) / 5) * 5;
      saving.textContent = eur.format(yMin) + " – " + eur.format(yMax) + " al año";
    }

    range.addEventListener("input", render);
    // Al pedir contacto, preselecciona el tramo de factura del formulario.
    range.addEventListener("change", function () {
      var select = document.getElementById("factura");
      if (!select) return;
      var v = Number(range.value);
      select.value = v < 50 ? "menos-50" : v <= 100 ? "50-100" : v <= 200 ? "100-200" : v <= 500 ? "200-500" : "mas-500";
    });
    render();
  }

  // --- Formulario ---
  var PHONE_RE = /^(?:\+34|0034)?[6789]\d{8}$/;
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function setError(input, msg) {
    var err = document.getElementById(input.id + "-error");
    if (msg) {
      input.setAttribute("aria-invalid", "true");
      input.setAttribute("aria-describedby", err.id);
      err.textContent = msg;
      err.hidden = false;
    } else {
      input.removeAttribute("aria-invalid");
      input.removeAttribute("aria-describedby");
      err.textContent = "";
      err.hidden = true;
    }
  }

  function validate(form) {
    var nombre = form.elements.nombre;
    var telefono = form.elements.telefono;
    var email = form.elements.email;
    var consent = form.elements.consentimiento;
    var firstBad = null;

    function check(input, msg) {
      setError(input, msg);
      if (msg && !firstBad) firstBad = input;
    }

    var n = nombre.value.trim();
    check(nombre, n.length < 2 ? "Escribe tu nombre para saber por quién preguntar." : "");

    var tel = telefono.value.replace(/[\s.\-()]/g, "");
    check(telefono, !tel ? "Necesitamos un teléfono para llamarte."
      : !PHONE_RE.test(tel) ? "Revisa el teléfono: debe tener 9 cifras, por ejemplo 600 123 456." : "");

    var em = email.value.trim();
    check(email, em && !EMAIL_RE.test(em) ? "Revisa el email o déjalo en blanco." : "");

    check(consent, !consent.checked ? "Marca la casilla para que podamos contactarte." : "");

    if (firstBad) firstBad.focus();
    return !firstBad;
  }

  function initForm() {
    var form = document.getElementById("lead-form");
    if (!form) return;
    var status = document.getElementById("form-status");
    var button = form.querySelector('button[type="submit"]');
    var ts = document.getElementById("ts");
    if (ts) ts.value = String(Date.now());

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      status.textContent = "";
      status.classList.remove("is-error");
      if (!validate(form)) return;

      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = typeof v === "string" ? v.trim() : ""; });

      button.disabled = true;
      button.textContent = "Enviando…";

      fetch(form.action, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data),
        credentials: "same-origin"
      })
        .then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status);
          showSuccess(form, data.nombre);
        })
        .catch(function () {
          button.disabled = false;
          button.textContent = "Quiero que me llaméis";
          status.classList.add("is-error");
          status.textContent = "No se ha podido enviar. Comprueba tu conexión e inténtalo de nuevo.";
        });
    });

    // Quita el error de un campo en cuanto el usuario lo corrige.
    form.addEventListener("input", function (e) {
      if (e.target.getAttribute("aria-invalid") === "true") setError(e.target, "");
    });
  }

  function showSuccess(form, nombre) {
    var box = document.createElement("div");
    box.className = "form-success";
    box.setAttribute("tabindex", "-1");
    var h = document.createElement("h3");
    // textContent: nunca insertar datos del usuario como HTML.
    h.textContent = "Gracias, " + (nombre || "") + ". Te llamamos pronto.";
    var p = document.createElement("p");
    p.textContent = "Ten a mano una factura reciente: con ella el estudio va mucho más rápido.";
    box.appendChild(h);
    box.appendChild(p);
    form.replaceChildren(box);
    box.focus();
  }

  // Oculta el botón flotante del móvil mientras el formulario está en pantalla.
  function initMobileCta() {
    var cta = document.querySelector(".mobile-cta");
    var target = document.getElementById("contacto");
    var hero = document.querySelector(".hero .btn-large");
    if (!cta || !target || !("IntersectionObserver" in window)) return;
    var visible = new Set();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) visible.add(en.target); else visible.delete(en.target);
      });
      cta.classList.toggle("is-hidden", visible.size > 0);
    });
    io.observe(target);
    if (hero) io.observe(hero);
  }

  document.addEventListener("DOMContentLoaded", function () {
    initBill();
    initForm();
    initMobileCta();
  });
})();
