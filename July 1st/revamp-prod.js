/* Stub for a pre-existing native template bug: the site's GD Filmstrip
   Gallery ImageMachine override calls hideVideoShowGallery?.() as a bare
   global identifier. Optional chaining only guards property/call access,
   not an undeclared identifier, so it throws ReferenceError and aborts
   ImageMachine.prototype.oninitialize before MovingPictures() (Splide
   gallery mount) runs. Defining a no-op here — outside the deferred IIFE,
   so it's available as early as possible — lets that call succeed. */
if (typeof window.hideVideoShowGallery === 'undefined') {
  window.hideVideoShowGallery = function () {};
}

(function () {
  'use strict';

  /* ── 1. HEADER SCROLL EFFECT ── */
  var hdr = document.getElementById('site-header');
  if (hdr) {
    window.addEventListener('scroll', function () {
      hdr.classList.toggle('scrolled', window.scrollY > 50);
    }, { passive: true });
  }

  /* ── 2. PARTICLE BACKGROUND (matches homepage/CTGY) ── */
  function initParticles() {
    if (document.getElementById('sd-particles')) return;

    var canvas = document.createElement('canvas');
    canvas.id = 'sd-particles';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '0';
    canvas.style.opacity = '1';

    var body = document.body || document.getElementsByTagName('body')[0];
    if (!body) return;
    body.appendChild(canvas);

    var ctx = canvas.getContext('2d');
    var W, H, pts = [];
    var COUNT = 70;

    function resize() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    function rand(a, b) { return Math.random() * (b - a) + a; }

    function mkPt(randomY) {
      return {
        x: rand(0, W),
        y: randomY ? rand(0, H) : H + 10,
        r: rand(2, 5),
        vx: rand(-0.25, 0.25),
        vy: rand(-0.5, -0.15),
        alpha: rand(0.4, 0.9),
        fade: rand(0.003, 0.007),
        col: Math.random() < 0.15 ? '212,160,23' : (Math.random() < 0.5 ? '24,51,184' : '34,68,212')
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

  /* ── 3. BUTTON RIPPLE ── */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('input.related_adpr, .x-product-layout-purchase input[type="submit"], .x-product-layout-purchase .c-button, .btn-primary, .btn-outline');
    if (!btn) return;
    var r = btn.getBoundingClientRect();
    var size = Math.max(r.width, r.height) * 2;
    var el = document.createElement('span');
    el.className = 'ripple';
    el.style.cssText = [
      'width:' + size + 'px',
      'height:' + size + 'px',
      'left:' + (e.clientX - r.left - size / 2) + 'px',
      'top:' + (e.clientY - r.top - size / 2) + 'px'
    ].join(';');
    btn.style.position = 'relative';
    btn.style.overflow = 'hidden';
    btn.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 600);
  });

  /* ── 4. SCROLL REVEAL for description/related sections ── */
  var revealTargets = document.querySelectorAll('section.x-product-description, section.t-related-products');
  if ('IntersectionObserver' in window && revealTargets.length) {
    revealTargets.forEach(function (el) {
      el.classList.add('reveal');
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    revealTargets.forEach(function (el) { io.observe(el); });
  }

  /* ── 5. Re-trigger Shopper Approved after any late DOM injection ── */
  (function () {
    function initSA() {
      if (window.sa_product_init) {
        window.sa_product_init();
      } else if (window.shopper_approved && window.shopper_approved.init) {
        window.shopper_approved.init();
      }
    }
    if ('MutationObserver' in window) {
      var saObs = new MutationObserver(function (mutations) {
        for (var i = 0; i < mutations.length; i++) {
          if (mutations[i].addedNodes.length && document.querySelector('.star_container')) {
            setTimeout(initSA, 300);
            saObs.disconnect();
            break;
          }
        }
      });
      saObs.observe(document.body, { childList: true, subtree: true });
    }
    window.addEventListener('load', function () {
      setTimeout(initSA, 500);
    });
  })();

})();
