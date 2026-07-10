(function () {
  'use strict';

  /* ── CTGY PAGE: inject CSS + JS if on category page ── */
  if (document.getElementById('js-CTGY') || document.body && document.body.id === 'js-CTGY') {
    var link = document.createElement('link');
    link.rel  = 'stylesheet';
    link.type = 'text/css';
    link.href = '/mm5/css/00000001/b36/revamp-ctgy.css';
    document.head.appendChild(link);

    var script = document.createElement('script');
    script.defer = true;
    script.src   = '/mm5/scripts/00000001/b36/revamp-ctgy.js';
    document.head.appendChild(script);
  }

  /* ── 1. PARTICLE CANVAS ──────────────────────────── */
  var canvas = document.getElementById('sd-particles');
  var ctx    = canvas ? canvas.getContext('2d') : null;
  var W, H, pts = [];

  var BLUE_C = 'rgba(24,51,184,';
  var GOLD_C = 'rgba(180,120,0,';

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function Dot() { this.init(); }
  Dot.prototype.init = function () {
    this.x  = Math.random() * W;
    this.y  = Math.random() * H;
    this.r  = Math.random() * 2.5 + 1;
    this.vx = (Math.random() - 0.5) * 0.28;
    this.vy = (Math.random() - 0.5) * 0.28;
    this.a  = Math.random() * 0.28 + 0.10;
    this.c  = Math.random() > 0.88 ? GOLD_C : BLUE_C;
  };
  Dot.prototype.step = function () {
    this.x += this.vx;
    this.y += this.vy;
    if (this.x < -10 || this.x > W + 10 ||
        this.y < -10 || this.y > H + 10) { this.init(); }
  };

  function initDots(n) {
    pts = [];
    for (var i = 0; i < n; i++) { pts.push(new Dot()); }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    var len = pts.length;

    /* dots */
    for (var i = 0; i < len; i++) {
      pts[i].step();
      ctx.beginPath();
      ctx.arc(pts[i].x, pts[i].y, pts[i].r, 0, Math.PI * 2);
      ctx.fillStyle = pts[i].c + pts[i].a + ')';
      ctx.fill();
    }

    /* connecting lines between close pairs */
    for (var a = 0; a < len; a++) {
      for (var b = a + 1; b < len; b++) {
        var dx = pts[a].x - pts[b].x;
        var dy = pts[a].y - pts[b].y;
        var d  = Math.sqrt(dx * dx + dy * dy);
        if (d < 130) {
          ctx.beginPath();
          ctx.moveTo(pts[a].x, pts[a].y);
          ctx.lineTo(pts[b].x, pts[b].y);
          ctx.strokeStyle = BLUE_C + (0.12 * (1 - d / 130)) + ')';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(draw);
  }

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (canvas && ctx && !reduced) {
    resize();
    initDots(90);
    draw();
    window.addEventListener('resize', function () { resize(); initDots(90); }, { passive: true });
  }

  /* ── 2. HERO ENTRANCE ─────────────────────────────── */
  setTimeout(function () {
    var hero = document.getElementById('hero');
    if (hero) hero.classList.add('ready');
  }, 80);

  /* ── 3. HEADER SCROLL EFFECT ──────────────────────── */
  var hdr = document.getElementById('site-header');
  if (hdr) {
    window.addEventListener('scroll', function () {
      hdr.classList.toggle('scrolled', window.scrollY > 50);
    }, { passive: true });
  }

  /* ── 4. SCROLL REVEAL (IntersectionObserver) ─────── */
  var revealEls = document.querySelectorAll('.reveal, .trust-item');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -36px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });

    /* stagger trust items */
    document.querySelectorAll('.trust-item').forEach(function (el, i) {
      el.style.transitionDelay = (i * 80) + 'ms';
    });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ── 5. COUNTER ANIMATION ─────────────────────────── */
  var counters = document.querySelectorAll('.counter-num[data-target]');
  var counted  = false;
  var ribbon   = document.querySelector('.counter-ribbon');

  function runCounters() {
    if (!counters.length) return;
    counters.forEach(function (el) {
      var target = parseInt(el.dataset.target, 10);
      var suf    = el.dataset.suf || '';
      var start  = 0;
      var dur    = 1800;
      var fps    = 60;
      var steps  = (dur / 1000) * fps;
      var inc    = target / steps;
      var t      = 0;

      var id = setInterval(function () {
        t += inc;
        if (t >= target) { t = target; clearInterval(id); }
        el.innerHTML = Math.round(t) + '<span class="suf">' + suf + '</span>';
      }, 1000 / fps);
    });
  }

  if (ribbon && 'IntersectionObserver' in window) {
    var co = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting && !counted) {
        counted = true;
        runCounters();
        co.disconnect();
      }
    }, { threshold: 0.4 });
    co.observe(ribbon);
  } else if (counters.length) {
    runCounters();
  }

  /* ── 6. BUTTON RIPPLE ─────────────────────────────── */
  document.querySelectorAll('.btn-primary, .btn-outline').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      var r    = btn.getBoundingClientRect();
      var size = Math.max(r.width, r.height) * 2;
      var el   = document.createElement('span');
      el.className = 'ripple';
      el.style.cssText = [
        'width:'  + size + 'px',
        'height:' + size + 'px',
        'left:'   + (e.clientX - r.left  - size / 2) + 'px',
        'top:'    + (e.clientY - r.top   - size / 2) + 'px',
      ].join(';');
      btn.appendChild(el);
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 600);
    });
  });

  /* ── 7. MAGNETIC HOVER ON CTA ────────────────────── */
  if (!reduced && window.innerWidth > 768) {
    document.querySelectorAll('.magnetic').forEach(function (btn) {
      btn.addEventListener('mousemove', function (e) {
        var r = btn.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width  / 2) * 0.18;
        var y = (e.clientY - r.top  - r.height / 2) * 0.18;
        btn.style.transform = 'translate(' + x + 'px,' + y + 'px) translateY(-3px)';
      });
      btn.addEventListener('mouseleave', function () {
        btn.style.transform = '';
      });
    });
  }

  /* ── 8. STAGGER CAT CARDS ─────────────────────────── */
  var cards = document.querySelectorAll('.cat-card');
  if ('IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          var i = Array.prototype.indexOf.call(cards, e.target);
          e.target.style.transitionDelay = (i % 4 * 55) + 'ms';
          e.target.style.opacity  = '1';
          e.target.style.transform = 'none';
          cio.unobserve(e.target);
        }
      });
    }, { threshold: 0.08 });
    cards.forEach(function (c) {
      c.style.opacity   = '0';
      c.style.transform = 'translateY(20px)';
      c.style.transition = 'opacity 0.5s ease, transform 0.5s var(--ease-out), box-shadow 0.4s ease, border-color 0.2s ease';
      cio.observe(c);
    });
  }

  /* ── 9. STAGGER REVIEW CARDS ─────────────────────── */
  var rvCards = document.querySelectorAll('.review-card');
  if ('IntersectionObserver' in window) {
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          var i = Array.prototype.indexOf.call(rvCards, e.target);
          e.target.style.transitionDelay = (i * 100) + 'ms';
          e.target.style.opacity  = '1';
          e.target.style.transform = 'none';
          rio.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    rvCards.forEach(function (c) {
      c.style.opacity   = '0';
      c.style.transform = 'translateY(22px)';
      c.style.transition = 'opacity 0.6s ease, transform 0.6s var(--ease-out), box-shadow 0.35s ease';
      rio.observe(c);
    });
  }

  /* ── 10. BANNER SLIDESHOW ───────────────────────────
     Handles two cases:
     A) Hardcoded .bv-slide/.bv-dot markup (single-box test)
     B) Miva readytheme contentsection('sfnt_banners') output
        wrapped in .sd-miva-banners — Slick-rendered links get
        our hover overlay + CTA injected automatically.
  ─────────────────────────────────────────────────── */
  var bvUrlEl = document.getElementById('bv-url-text');
  var bvUrls  = [
    '<strong>Shop Parts</strong> — Powerstroke · Duramax · Cummins',
    '<strong>Sinister Blue</strong> — Iconic Performance Color',
    '<strong>Made in USA</strong> — Roseville, CA Since 2008'
  ];

  /* ── Case A: hardcoded slides ── */
  var bvSlides = document.querySelectorAll('.bv-slide');
  var bvDots   = document.querySelectorAll('.bv-dot');
  var bvCur    = 0;
  var bvTimer;

  function bvGo(n) {
    if (!bvSlides.length || !bvDots.length) return;
    bvSlides[bvCur].classList.remove('active');
    bvDots[bvCur].classList.remove('active');
    bvCur = (n + bvSlides.length) % bvSlides.length;
    bvSlides[bvCur].classList.add('active');
    bvDots[bvCur].classList.add('active');
    if (bvUrlEl) {
      bvUrlEl.style.opacity = '0';
      setTimeout(function () {
        bvUrlEl.innerHTML = bvUrls[bvCur % bvUrls.length];
        bvUrlEl.style.opacity = '1';
      }, 150);
    }
  }

  if (bvSlides.length && bvDots.length) {
    bvDots.forEach(function (d) {
      d.addEventListener('click', function () {
        bvGo(parseInt(this.dataset.bv, 10));
        clearInterval(bvTimer);
        if (!reduced) bvTimer = setInterval(function () { bvGo(bvCur + 1); }, 4000);
      });
    });
    if (!reduced) bvTimer = setInterval(function () { bvGo(bvCur + 1); }, 4000);
  }

  /* ── Case B: Miva readytheme content section banners ──
     After Slick initialises (or on load if no Slick),
     inject hover overlay + CTA button into each banner link
     inside .sd-miva-banners so our CSS effects still apply.
  ── */
  function injectMivaBannerOverlays() {
    var vp = document.querySelector('.sd-miva-banners');
    if (!vp) return;
    /* Miva banners render as <a> tags (Slick wraps them in .slick-slide) */
    var links = vp.querySelectorAll('a.bv-link, .slick-slide a, .t-storefront-banner__item a');
    links.forEach(function (link, idx) {
      link.classList.add('bv-link');
      /* only inject once */
      if (link.querySelector('.bv-hover-overlay')) return;
      var hov = document.createElement('div');
      hov.className = 'bv-hover-overlay';
      var cta = document.createElement('div');
      cta.className = 'bv-cta';
      cta.innerHTML = 'Shop Now <span class="bv-cta-arrow">&rarr;</span>';
      link.appendChild(hov);
      link.appendChild(cta);
      /* update address bar text on Slick afterChange */
      if (bvUrlEl && idx === 0) {
        bvUrlEl.innerHTML = bvUrls[0];
      }
    });

    /* Wire address bar to Slick afterChange if jQuery/Slick present */
    if (window.jQuery && jQuery(vp).find('.slick-slider').length) {
      jQuery(vp).find('.slick-slider').on('afterChange', function (e, slick, cur) {
        if (!bvUrlEl) return;
        bvUrlEl.style.opacity = '0';
        setTimeout(function () {
          bvUrlEl.innerHTML = bvUrls[cur % bvUrls.length];
          bvUrlEl.style.opacity = '1';
        }, 150);
      });
    }
  }

  /* Run after page load so Slick has had time to init */
  if (document.readyState === 'complete') {
    injectMivaBannerOverlays();
  } else {
    window.addEventListener('load', injectMivaBannerOverlays);
  }

  /* ── 11. DEVICE FRAME MOUSE PARALLAX TILT ────────── */
  var dw = document.getElementById('device-wrap');
  if (dw && !reduced && window.innerWidth > 900) {
    var heroEl2 = document.getElementById('hero');
    if (heroEl2) {
      heroEl2.addEventListener('mousemove', function (e) {
        var r  = heroEl2.getBoundingClientRect();
        var cx = r.left + r.width  / 2;
        var cy = r.top  + r.height / 2;
        var dx = (e.clientX - cx) / (r.width  / 2);
        var dy = (e.clientY - cy) / (r.height / 2);
        /* subtle tilt: max +-6deg Y, +-3deg X */
        var ry = -8 + dx * 5;
        var rx =  2 - dy * 3;
        dw.style.transform = 'perspective(1100px) rotateY(' + ry + 'deg) rotateX(' + rx + 'deg)';
      });
      heroEl2.addEventListener('mouseleave', function () {
        dw.style.transform = 'perspective(1100px) rotateY(-8deg) rotateX(2deg)';
      });
    }
  }

  /* ── 12. RATING RING ANIMATION ───────────────────── */
  var drFill   = document.getElementById('dr-fill');
  var drRating = document.querySelector('.device-rating');
  var ringRan  = false;

  function runRing() {
    if (ringRan) return;
    ringRan = true;
    if (drFill) drFill.classList.add('run');
  }

  if (drRating && 'IntersectionObserver' in window) {
    var pio = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { runRing(); pio.disconnect(); }
    }, { threshold: 0.3 });
    pio.observe(drRating);
  } else {
    runRing();
  }

  /* also fire when hero becomes visible on load */
  setTimeout(runRing, 900);

})();
/* Miva truck finder search */
(function () {
  var forms = document.querySelectorAll('.finder-form, .sd-finder-form, [data-miva-finder]');
  if (!forms.length) return;

  forms.forEach(function (form) {
    form.addEventListener('submit', function (event) {
      var searchInput = form.querySelector('input[name="Search"]');
      if (!searchInput) {
        searchInput = document.createElement('input');
        searchInput.type = 'hidden';
        searchInput.name = 'Search';
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
