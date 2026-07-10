(function () {
  'use strict';

  /* ── 0. SIDEBAR LAYOUT FIX ──
     Miva's CTGY template outputs .sd-listing-sidebar and .sd-listing-results
     inside .sd-listing-layout. If that wrapper exists, force the flex row
     layout via inline style so it wins over any Miva theme overrides.
     Also handles SearchSpring injecting content after DOMContentLoaded. */
  /* Desktop layout is handled purely by CSS (flex-direction: row-reverse).
     No DOM manipulation needed — SearchSpring always puts results first,
     sidebar second; row-reverse makes sidebar appear on the left visually. */

  /* Mobile sidebar/filters are hidden entirely via CSS (matches current
     live site behavior) — no toggle button, no injection JS needed. */

  /* ── 1. HEADER SCROLL EFFECT ── */
  var hdr = document.getElementById('site-header');
  if (hdr) {
    window.addEventListener('scroll', function () {
      hdr.classList.toggle('scrolled', window.scrollY > 50);
    }, { passive: true });
  }

  /* ── 2. SCROLL REVEAL (.reveal elements) ── */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -36px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ── 3. PRODUCT CARD SCROLL STAGGER ── */
  function observeCards() {
    var cards = document.querySelectorAll('div.o-layout__item.u-text-center.x-product-list__item');
    if (!cards.length) return;

    if ('IntersectionObserver' in window) {
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add('sd-visible');
            cio.unobserve(e.target);
          }
        });
      }, { threshold: 0.06, rootMargin: '0px 0px -20px 0px' });
      cards.forEach(function (c) { cio.observe(c); });
    } else {
      cards.forEach(function (c) { c.classList.add('sd-visible'); });
    }
  }

  /* Run now for any cards already in DOM */
  observeCards();

  /* Re-run when SearchSpring injects new results */
  if ('MutationObserver' in window) {
    var ssContent = document.getElementById('searchspring-content');
    if (ssContent) {
      var mo = new MutationObserver(function () { observeCards(); });
      mo.observe(ssContent, { childList: true, subtree: true });
    }
  }

  /* ── 4. BUTTON RIPPLE ── */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.btn-primary, .btn-outline, .x-product-list__button input[type="submit"], .x-product-list__button .c-button');
    if (!btn) return;
    var r    = btn.getBoundingClientRect();
    var size = Math.max(r.width, r.height) * 2;
    var el   = document.createElement('span');
    el.className = 'ripple';
    el.style.cssText = [
      'width:'  + size + 'px',
      'height:' + size + 'px',
      'left:'   + (e.clientX - r.left - size / 2) + 'px',
      'top:'    + (e.clientY - r.top  - size / 2) + 'px'
    ].join(';');
    btn.style.position = 'relative';
    btn.style.overflow = 'hidden';
    btn.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 600);
  });

  /* ── 5. PARTICLE BACKGROUND ── */
  function initParticles() {
    if (document.getElementById('sd-particles')) return;

    var canvas = document.createElement('canvas');
    canvas.id = 'sd-particles';
    canvas.style.position   = 'fixed';
    canvas.style.top        = '0';
    canvas.style.left       = '0';
    canvas.style.width      = '100%';
    canvas.style.height     = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex     = '0';
    canvas.style.opacity    = '1';

    var body = document.body || document.getElementsByTagName('body')[0];
    if (!body) return;
    body.appendChild(canvas);

    var ctx = canvas.getContext('2d');
    var W, H, pts = [];
    var COUNT = 70;

    function resize() {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    function rand(a, b) { return Math.random() * (b - a) + a; }

    function mkPt(randomY) {
      return {
        x:    rand(0, W),
        y:    randomY ? rand(0, H) : H + 10,
        r:    rand(2, 5),
        vx:   rand(-0.25, 0.25),
        vy:   rand(-0.5, -0.15),
        alpha: rand(0.4, 0.9),
        fade: rand(0.003, 0.007),
        col:  Math.random() < 0.15 ? '212,160,23' : (Math.random() < 0.5 ? '24,51,184' : '34,68,212')
      };
    }

    for (var i = 0; i < COUNT; i++) pts.push(mkPt(true));

    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (var j = 0; j < pts.length; j++) {
        var p = pts[j];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.fade;
        if (p.alpha <= 0 || p.y < -10) {
          pts[j] = mkPt(false);
          continue;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + p.col + ',' + p.alpha + ')';
        ctx.fill();
      }
      requestAnimationFrame(draw);
    }
    draw();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initParticles);
  } else {
    initParticles();
  }

  /* ── 6. TRUCK FINDER FORM ── */

  var forms = document.querySelectorAll('.finder-form, .sd-finder-form, [data-miva-finder]');
  forms.forEach(function (form) {
    form.addEventListener('submit', function (event) {
      var searchInput = form.querySelector('input[name="Search"]');
      if (!searchInput) {
        searchInput = document.createElement('input');
        searchInput.type  = 'hidden';
        searchInput.name  = 'Search';
        form.appendChild(searchInput);
      }
      var values = [];
      form.querySelectorAll('select, input[type="text"], input[type="search"]').forEach(function (field) {
        if (field.name === 'Search') return;
        var value = (field.value || '').trim();
        if (value) values.push(value);
      });
      searchInput.value = values.join(' ');
      if (!searchInput.value) {
        event.preventDefault();
        var first = form.querySelector('select, input');
        if (first) first.focus();
      }
    });
  });

})();
