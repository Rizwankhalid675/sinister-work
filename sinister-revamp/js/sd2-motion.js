/*!
 * sd2-motion.js
 * Lightweight, dependency-free scroll-reveal + 3D tilt engine for Sinister Diesel V2.
 * Respects prefers-reduced-motion. No external libraries required.
 */
(function () {
    "use strict";

    var REDUCE = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ---------------------------------------------------------
     * 1. Scroll reveal (IntersectionObserver)
     *    Usage: add class "sd2-reveal" to any element.
     *    Optional data-reveal-delay="120" (ms) for stagger.
     * --------------------------------------------------------- */
    function initReveal() {
        var els = document.querySelectorAll(".sd2-reveal");
        if (!els.length) return;

        if (REDUCE || !("IntersectionObserver" in window)) {
            els.forEach(function (el) { el.classList.add("is-visible"); });
            return;
        }

        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    var el = entry.target;
                    var delay = el.getAttribute("data-reveal-delay");
                    if (delay) {
                        el.style.transitionDelay = delay + "ms";
                    }
                    el.classList.add("is-visible");
                    io.unobserve(el);
                }
            });
        }, {
            root: null,
            rootMargin: "0px 0px -8% 0px",
            threshold: 0.12
        });

        els.forEach(function (el) { io.observe(el); });
    }

    /* ---------------------------------------------------------
     * 2. 3D tilt (pointer-driven perspective tilt)
     *    Usage: add class "sd2-tilt" to any element.
     *    Optional data-tilt-max="10" (degrees), data-tilt-scale="1.02"
     * --------------------------------------------------------- */
    function initTilt() {
        if (REDUCE) return;
        var els = document.querySelectorAll(".sd2-tilt");
        if (!els.length) return;

        var supportsFinePointer = window.matchMedia && window.matchMedia("(pointer: fine)").matches;
        if (!supportsFinePointer) return;

        els.forEach(function (el) {
            var maxTilt = parseFloat(el.getAttribute("data-tilt-max")) || 8;
            var scale = parseFloat(el.getAttribute("data-tilt-scale")) || 1.015;
            var rafId = null;
            var rect = null;

            function onEnter() {
                rect = el.getBoundingClientRect();
                el.classList.add("is-tilting");
            }

            function onMove(e) {
                if (!rect) rect = el.getBoundingClientRect();
                if (rafId) cancelAnimationFrame(rafId);
                rafId = requestAnimationFrame(function () {
                    var px = (e.clientX - rect.left) / rect.width;
                    var py = (e.clientY - rect.top) / rect.height;
                    var rx = (0.5 - py) * maxTilt;
                    var ry = (px - 0.5) * maxTilt;
                    el.style.transform =
                        "perspective(900px) rotateX(" + rx.toFixed(2) + "deg) rotateY(" +
                        ry.toFixed(2) + "deg) scale3d(" + scale + "," + scale + "," + scale + ")";
                });
            }

            function onLeave() {
                if (rafId) cancelAnimationFrame(rafId);
                el.classList.remove("is-tilting");
                el.style.transform = "";
                rect = null;
            }

            el.addEventListener("pointerenter", onEnter, { passive: true });
            el.addEventListener("pointermove", onMove, { passive: true });
            el.addEventListener("pointerleave", onLeave, { passive: true });
        });
    }

    /* ---------------------------------------------------------
     * 3. Parallax layers (subtle scroll-linked translate)
     *    Usage: add class "sd2-parallax" with data-parallax-speed="0.15"
     * --------------------------------------------------------- */
    function initParallax() {
        if (REDUCE) return;
        var layers = document.querySelectorAll(".sd2-parallax");
        if (!layers.length) return;

        var ticking = false;

        function update() {
            var vh = window.innerHeight;
            layers.forEach(function (el) {
                var speed = parseFloat(el.getAttribute("data-parallax-speed")) || 0.12;
                var rect = el.getBoundingClientRect();
                var center = rect.top + rect.height / 2;
                var offset = (center - vh / 2) * speed * -1;
                el.style.transform = "translate3d(0," + offset.toFixed(1) + "px,0)";
            });
            ticking = false;
        }

        function onScroll() {
            if (!ticking) {
                ticking = true;
                requestAnimationFrame(update);
            }
        }

        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll, { passive: true });
        update();
    }

    function init() {
        initReveal();
        initTilt();
        initParallax();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

    window.SD2Motion = {
        refresh: function () {
            initReveal();
            initTilt();
        }
    };
})();
