/* Vivaro Consulting, zajednički skript za stranice sa tekstovima */
(function () {
  "use strict";
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var MESECI = ["januara", "februara", "marta", "aprila", "maja", "juna", "jula", "avgusta", "septembra", "oktobra", "novembra", "decembra"];
  function datum(iso) {
    var p = iso.split("-");
    return parseInt(p[2], 10) + ". " + MESECI[parseInt(p[1], 10) - 1] + " " + p[0] + ".";
  }
  function esc(t) {
    return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }
  var ARROW = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M2 8h11M9 4l4 4-4 4"/></svg>';

  /* Kartice tekstova. container: element sa data-posts; base: putanja do foldera uvidi */
  function renderPosts(el) {
    var list = window.VIVARO_CLANCI || [];
    var base = el.getAttribute("data-base") || "";
    var limit = parseInt(el.getAttribute("data-limit") || "0", 10);
    var skip = el.getAttribute("data-skip") || "";
    var items = list.filter(function (a) { return a.slug !== skip; });
    if (limit) items = items.slice(0, limit);
    if (!items.length) { var sec = el.closest("[data-hide-empty]"); if (sec) sec.hidden = true; return; }
    el.innerHTML = items.map(function (a) {
      var href = base + a.slug + ".html";
      return '<article class="post">' +
        '<div class="post__meta"><span>' + esc(a.tema) + '</span><time datetime="' + a.datum + '">' + datum(a.datum) + '</time><span>' + a.minuta + ' min čitanja</span></div>' +
        '<h3><a href="' + href + '">' + esc(a.naslov) + '</a></h3>' +
        '<p>' + esc(a.uvod) + '</p>' +
        '<a class="post__more" href="' + href + '" aria-label="Pročitajte tekst: ' + esc(a.naslov) + '">Pročitajte tekst ' + ARROW + '</a>' +
        '</article>';
    }).join("");
  }
  window.VivaroPosts = { render: renderPosts, datum: datum };
  $$("[data-posts]").forEach(renderPosts);

  /* Datum na stranici teksta, iz atributa datetime */
  $$("time[data-fmt]").forEach(function (t) { t.textContent = datum(t.getAttribute("datetime")); });

  /* Godina u footeru */
  var yr = $("#yr"); if (yr) yr.textContent = new Date().getFullYear();

  /* Header i mobilni meni (na stranicama koje nemaju sopstveni skript) */
  if (document.body.hasAttribute("data-site-nav")) {
    var hdr = $("#hdr");
    var onScroll = function () { hdr.setAttribute("data-stuck", window.scrollY > 8 ? "true" : "false"); };
    onScroll(); window.addEventListener("scroll", onScroll, { passive: true });
    var burger = $("#burger"), nav = $("#nav");
    var setNav = function (open) {
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Zatvori meni" : "Otvori meni");
      nav.setAttribute("data-open", String(open));
    };
    burger.addEventListener("click", function () { setNav(burger.getAttribute("aria-expanded") !== "true"); });
    $$("#nav a").forEach(function (a) { a.addEventListener("click", function () { setNav(false); }); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && nav.getAttribute("data-open") === "true") { setNav(false); burger.focus(); } });
  }

  /* Deljenje teksta */
  var li = $("#shareLi");
  if (li) li.href = "https://www.linkedin.com/sharing/share-offsite/?url=" + encodeURIComponent(location.href);
  var cp = $("#shareCopy");
  if (cp) cp.addEventListener("click", function () {
    var ok = $("#shareOk");
    var done = function () { ok.textContent = "Link je kopiran."; setTimeout(function () { ok.textContent = ""; }, 2500); };
    if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(location.href).then(done, function () { ok.textContent = "Kopirajte link iz adresne linije."; }); }
    else { ok.textContent = "Kopirajte link iz adresne linije."; }
  });
})();

/* Živa pozadina
   1. tehnički raster u tamnim i svetlim sekcijama, sa osvetljenjem ispod miša
   2. mreža procesa (čvorovi i linije po rasteru) u tamnim sekcijama, sa impulsima koji putuju kroz nju
   3. čvorovi u vrhu stranice zasvetle kad im se miš približi */
(function () {
  "use strict";
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function addLit(sec, light) {
    var bp = document.createElement("div"); bp.className = "bp" + (light ? " bp--light" : ""); bp.setAttribute("aria-hidden", "true");
    var lit = document.createElement("div"); lit.className = "bp__lit" + (light ? " bp__lit--light" : ""); lit.setAttribute("aria-hidden", "true");
    sec.insertBefore(lit, sec.firstChild); if (!light) sec.insertBefore(bp, sec.firstChild);
    if (!fine || reduce) return;
    var raf = 0, x = 0, y = 0;
    sec.addEventListener("pointermove", function (e) {
      var r = sec.getBoundingClientRect(); x = e.clientX - r.left; y = e.clientY - r.top;
      if (!raf) raf = requestAnimationFrame(function () { raf = 0; lit.style.setProperty("--mx", x + "px"); lit.style.setProperty("--my", y + "px"); });
      sec.classList.add("bp-on");
    });
    sec.addEventListener("pointerleave", function () { sec.classList.remove("bp-on"); });
  }
  Array.prototype.forEach.call(document.querySelectorAll(".hero, .band--dark"), function (s) { addLit(s, false); });
  Array.prototype.forEach.call(document.querySelectorAll(".band--alt"), function (s) { addLit(s, true); });

  /* mreža procesa u tamnim sekcijama */
  Array.prototype.forEach.call(document.querySelectorAll(".band--dark"), function (sec) {
    var cv = document.createElement("canvas"); cv.className = "net"; cv.setAttribute("aria-hidden", "true");
    sec.insertBefore(cv, sec.firstChild);
    var ctx = cv.getContext("2d"); if (!ctx) return;
    var G = 120, W = 0, H = 0, dpr = 1, nodes = [], edges = [], pulses = [], mx = -9999, my = -9999, running = false, last = 0;
    function rnd(seed) { var x = Math.sin(seed) * 10000; return x - Math.floor(x); }
    function build() {
      var r = sec.getBoundingClientRect(); W = r.width; H = r.height; dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + "px"; cv.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      nodes = []; edges = []; pulses = [];
      var ox = ((W / 2) % G), cols = Math.ceil(W / G) + 1, rows = Math.ceil(H / G) + 1, idx = {};
      for (var c = 0; c < cols; c++) for (var rr = 0; rr < rows; rr++) {
        var k = c * 131 + rr * 17 + (sec.id ? sec.id.length * 7 : 3);
        if (rnd(k) < 0.34) { idx[c + ":" + rr] = nodes.length; nodes.push({ x: ox + c * G - G, y: rr * G, g: 0 }); }
      }
      for (var key in idx) {
        var p = key.split(":"), c2 = +p[0], r2 = +p[1], a = idx[key];
        [[1, 0], [0, 1], [2, 0], [0, 2]].forEach(function (d) {
          var b = idx[(c2 + d[0]) + ":" + (r2 + d[1])];
          if (b !== undefined && rnd(a * 7 + b * 3) < 0.55) edges.push([a, b]);
        });
      }
      for (var i = 0; i < Math.min(8, edges.length); i++) pulses.push({ e: Math.floor(rnd(i * 9.1) * edges.length), t: rnd(i * 3.3), v: 0.08 + rnd(i * 5.7) * 0.1 });
    }
    function draw(now) {
      var dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < nodes.length; i++) { var n = nodes[i], d = Math.hypot(n.x - mx, n.y - my); var tg = d < 260 ? 1 - d / 260 : 0; n.g += (tg - n.g) * 0.12; }
      ctx.lineWidth = 1;
      for (var j = 0; j < edges.length; j++) {
        var a = nodes[edges[j][0]], b = nodes[edges[j][1]], g = Math.max(a.g, b.g);
        ctx.strokeStyle = "rgba(217,169,74," + (0.055 + g * 0.42) + ")";
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      for (var k = 0; k < nodes.length; k++) {
        var q = nodes[k], s = 3 + q.g * 2.5;
        ctx.fillStyle = "#131A1F"; ctx.strokeStyle = "rgba(217,169,74," + (0.18 + q.g * 0.65) + ")";
        ctx.beginPath(); ctx.rect(q.x - s, q.y - s, s * 2, s * 2); ctx.fill(); ctx.stroke();
      }
      if (!reduce) for (var m = 0; m < pulses.length; m++) {
        var P = pulses[m]; P.t += P.v * dt * 1.4;
        if (P.t >= 1) { /* nastavlja na susednu liniju koja deli čvor */
          var endN = edges[P.e][1], next = [];
          for (var z = 0; z < edges.length; z++) if (edges[z][0] === endN) next.push(z);
          P.e = next.length ? next[Math.floor(Math.random() * next.length)] : Math.floor(Math.random() * edges.length); P.t = 0;
        }
        var A = nodes[edges[P.e][0]], B = nodes[edges[P.e][1]], px = A.x + (B.x - A.x) * P.t, py = A.y + (B.y - A.y) * P.t;
        /* mala tačka bez sjaja, kao u vrhu stranice */
        ctx.fillStyle = "rgba(217,169,74,.85)"; ctx.beginPath(); ctx.arc(px, py, 2.4, 0, 6.283); ctx.fill();
      }
      if (running && !reduce) requestAnimationFrame(draw);
    }
    build();
    if (fine) {
      sec.addEventListener("pointermove", function (e) { var r = sec.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; });
      sec.addEventListener("pointerleave", function () { mx = my = -9999; });
    }
    var rt = 0; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { build(); if (reduce) draw(0); }, 150); });
    if (reduce) { draw(0); return; }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { var v = en[0].isIntersecting; if (v && !running) { running = true; last = performance.now(); requestAnimationFrame(draw); } else if (!v) running = false; }).observe(sec);
    } else { running = true; requestAnimationFrame(draw); }
  });

  /* čvorovi u vrhu stranice reaguju na miš */
  var flow = document.querySelector(".flow"), hero = document.querySelector(".hero");
  if (flow && hero && fine && !reduce) {
    var rects = Array.prototype.slice.call(flow.querySelectorAll(".flow__nodes rect")), raf2 = 0, ex = 0, ey = 0;
    hero.addEventListener("pointermove", function (e) {
      ex = e.clientX; ey = e.clientY;
      if (raf2) return;
      raf2 = requestAnimationFrame(function () {
        raf2 = 0;
        rects.forEach(function (r) { var b = r.getBoundingClientRect(), d = Math.hypot(b.left + b.width / 2 - ex, b.top + b.height / 2 - ey); r.classList.toggle("near", d < 170); });
      });
    });
    hero.addEventListener("pointerleave", function () { rects.forEach(function (r) { r.classList.remove("near"); }); });
  }
  if (reduce) { var f = document.querySelector(".flow"); if (f && f.pauseAnimations) f.pauseAnimations(); }
})();
