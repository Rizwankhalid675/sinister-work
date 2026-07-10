(function () {
	'use strict';

	/* ── Conversion-focused section order ── */
	var bottomCta = document.querySelector('.bottom-cta');
	var sectionOrder = [
		'.trucks',
		'.doorbusters',
		'.categories',
		'.oem',
		'.favorites',
		'.why',
		'.under250',
		'.reviews'
	];
	if (bottomCta && bottomCta.parentNode) {
		for (var sectionIndex = 0; sectionIndex < sectionOrder.length; sectionIndex++) {
			var orderedSection = document.querySelector(sectionOrder[sectionIndex]);
			if (orderedSection) bottomCta.parentNode.insertBefore(orderedSection, bottomCta);
		}
	}

	/* ── Announcement bar dismiss ── */
	var announceBar  = document.getElementById('announce');
	var announceBtn  = document.getElementById('announceClose');
	var siteNav      = document.getElementById('siteNav');
	var mobileNav    = document.getElementById('navMobile');
	function setNavTop() {
		if (!siteNav) return;
		var h = (announceBar && announceBar.style.display !== 'none') ? announceBar.offsetHeight : 0;
		siteNav.style.top = h + 'px';
		if (mobileNav) mobileNav.style.top = (h + siteNav.offsetHeight) + 'px';
	}
	setNavTop();
	window.addEventListener('resize', setNavTop);

	if (announceBtn && announceBar) {
		announceBtn.addEventListener('click', function () {
			announceBar.style.display = 'none';
			setNavTop();
		});
	}

	/* ── Nav: transparent → dark on scroll ── */
	function updateNav() {
		if (!siteNav) return;
		siteNav.classList.toggle('stuck', window.scrollY > 60);
	}
	window.addEventListener('scroll', updateNav, { passive: true });
	updateNav();

	/* ── Nav: mobile hamburger ── */
	var burger = document.getElementById('navBurger');
	if (burger && mobileNav) {
		burger.addEventListener('click', function () {
			var open = mobileNav.classList.toggle('open');
			burger.setAttribute('aria-expanded', open ? 'true' : 'false');
			mobileNav.setAttribute('aria-hidden', open ? 'false' : 'true');
		});
		mobileNav.addEventListener('click', function (e) {
			if (e.target.tagName === 'A') {
				mobileNav.classList.remove('open');
				burger.setAttribute('aria-expanded', 'false');
				mobileNav.setAttribute('aria-hidden', 'true');
			}
		});
	}

	/* ── Scroll reveal ── */
	var revEls = document.querySelectorAll('[data-reveal]');
	if (!('IntersectionObserver' in window)) {
		for (var i = 0; i < revEls.length; i++) revEls[i].classList.add('in');
	} else {
		var revObs = new IntersectionObserver(function (entries) {
			entries.forEach(function (en) {
				if (en.isIntersecting) { en.target.classList.add('in'); revObs.unobserve(en.target); }
			});
		}, { threshold: 0.1 });
		for (var j = 0; j < revEls.length; j++) revObs.observe(revEls[j]);
	}

	/* ── Live countdown to June 27, 2026 00:00:00 ── */
	var end = new Date('2026-06-27T00:00:00').getTime();
	var elD = document.getElementById('cdDays');
	var elH = document.getElementById('cdHours');
	var elM = document.getElementById('cdMins');
	var elS = document.getElementById('cdSecs');
	function pad(n) { return n < 10 ? '0' + n : '' + n; }
	function tick() {
		var diff = Math.max(0, end - Date.now());
		if (elD) elD.textContent = pad(Math.floor(diff / 86400000));
		if (elH) elH.textContent = pad(Math.floor((diff % 86400000) / 3600000));
		if (elM) elM.textContent = pad(Math.floor((diff % 3600000) / 60000));
		if (elS) elS.textContent = pad(Math.floor((diff % 60000) / 1000));
	}
	tick();
	setInterval(tick, 1000);

	/* ── Copy to clipboard ── */
	var toastEl = document.getElementById('toast');
	var toastTimer;
	function showToast() {
		if (!toastEl) return;
		clearTimeout(toastTimer);
		toastEl.classList.add('show');
		toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2200);
	}
	function handleCopy(el) {
		var code = el.getAttribute('data-copy') || el.textContent.trim();
		if (navigator.clipboard && navigator.clipboard.writeText) {
			navigator.clipboard.writeText(code).then(showToast).catch(function () { fallbackCopy(code); });
		} else {
			fallbackCopy(code);
		}
	}
	function fallbackCopy(text) {
		var ta = document.createElement('textarea');
		ta.value = text;
		ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0';
		document.body.appendChild(ta);
		ta.select();
		try { document.execCommand('copy'); showToast(); } catch (e) {}
		document.body.removeChild(ta);
	}
	var copyEls = document.querySelectorAll('.js-copy');
	for (var k = 0; k < copyEls.length; k++) {
		(function (el) {
			el.addEventListener('click', function () { handleCopy(el); });
			el.addEventListener('keydown', function (e) {
				if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCopy(el); }
			});
		})(copyEls[k]);
	}

}());
