/* ==========================================================================
   Sinister Diesel V2 Global Components
   Shared behavior for inactive V2 header, mega menu, search, garage, and cart.
   ========================================================================== */

/* Sticky shadow-on-scroll + mobile drawer/accordion. Mega menu, search
   console, garage panel, and cart drawer behaviors each live in their own
   component file and self-register against the trigger attributes above. */
(function () {
	'use strict';
	var header = document.querySelector('[data-v2-sticky-header]');
	if (header && !header.dataset.v2Ready) {
		header.dataset.v2Ready = '1';
		var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 4); };
		document.addEventListener('scroll', onScroll, { passive: true });
		onScroll();
	}

	var drawer = document.querySelector('[data-v2-drawer]');
	var scrim = document.querySelector('.sd2-v2-scrim');
	if (drawer && scrim && !drawer.dataset.v2Ready) {
		drawer.dataset.v2Ready = '1';
		function openDrawer() { drawer.classList.add('is-open'); scrim.classList.add('is-open'); drawer.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; }
		function closeDrawer() { drawer.classList.remove('is-open'); scrim.classList.remove('is-open'); drawer.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }
		document.querySelectorAll('[data-v2-drawer-open]').forEach(function (b) { b.addEventListener('click', openDrawer); });
		document.querySelectorAll('[data-v2-drawer-close]').forEach(function (b) { b.addEventListener('click', closeDrawer); });
		document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeDrawer(); } });
		drawer.querySelectorAll('[data-v2-acc]').forEach(function (btn) {
			btn.addEventListener('click', function () {
				var group = btn.closest('.sd2-v2-drawer__group');
				var willOpen = !group.classList.contains('is-open');
				group.classList.toggle('is-open', willOpen);
				btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
			});
		});
	}
})();

/* Mega menu controller — single delegated instance, moves the mount's markup
   into the header's [data-v2-mega-mount] so it renders inside the nav row
   (required for absolute positioning against the full nav width), then wires
   hover-intent + keyboard behavior against the header's existing triggers. */
(function () {
	'use strict';
	var mount = document.querySelector('[data-v2-mega-mount]');
	var mega = document.querySelector('[data-v2-mega]');
	if (!mount || !mega || mega.dataset.v2Ready) { return; }
	mega.dataset.v2Ready = '1';
	mount.appendChild(mega);

	var root = document.querySelector('[data-v2-menu-root]');
	if (!root) { return; }
	var triggers = Array.prototype.slice.call(root.querySelectorAll('[data-v2-menu-trigger]'));
	var panels = Array.prototype.slice.call(mega.querySelectorAll('[data-v2-panel]'));
	var closeTimer = 0;
	var current = null;

	function activate(id) {
		window.clearTimeout(closeTimer);
		var matched = false;
		panels.forEach(function (p) { var on = p.getAttribute('data-v2-panel') === id; p.classList.toggle('is-active', on); matched = matched || on; });
		triggers.forEach(function (t) {
			var on = t.getAttribute('data-v2-menu-trigger') === id;
			t.setAttribute('aria-expanded', on ? 'true' : 'false');
			t.closest('.sd2-v2-hdr-nav__item').classList.toggle('is-open', on);
		});
		if (matched) { root.classList.add('is-open'); current = id; } else { close(); }
	}
	function close() {
		window.clearTimeout(closeTimer);
		root.classList.remove('is-open'); current = null;
		panels.forEach(function (p) { p.classList.remove('is-active'); });
		triggers.forEach(function (t) { t.setAttribute('aria-expanded', 'false'); t.closest('.sd2-v2-hdr-nav__item').classList.remove('is-open'); });
	}
	function closeSoon() { window.clearTimeout(closeTimer); closeTimer = window.setTimeout(close, 160); }

	triggers.forEach(function (t) {
		var id = t.getAttribute('data-v2-menu-trigger');
		t.addEventListener('mouseenter', function () { activate(id); });
		t.addEventListener('focus', function () { activate(id); });
		t.addEventListener('click', function (e) { e.preventDefault(); (current === id) ? close() : activate(id); });
		t.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); (current === id) ? close() : activate(id); } });
		t.addEventListener('mouseleave', closeSoon);
	});
	mega.addEventListener('mouseenter', function () { window.clearTimeout(closeTimer); });
	mega.addEventListener('mouseleave', closeSoon);
	document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { close(); } });
	document.addEventListener('click', function (e) { if (!root.contains(e.target)) { close(); } });
})();

/* Search Console open/close + local-only recent-search memory (no server
   round trip; purely a frontend convenience against localStorage). */
(function () {
	'use strict';
	var root = document.querySelector('[data-v2-search]');
	if (!root || root.dataset.v2Ready) { return; }
	root.dataset.v2Ready = '1';
	var console_ = root.querySelector('.sd2-v2-search-console');
	var scrim = root.querySelector('.sd2-v2-search-scrim');
	var input = root.querySelector('[data-v2-search-input]');
	var form = root.querySelector('form');

	function open() {
		console_.classList.add('is-open'); scrim.classList.add('is-open');
		console_.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden';
		window.setTimeout(function () { input.focus(); }, 200);
	}
	function close() {
		console_.classList.remove('is-open'); scrim.classList.remove('is-open');
		console_.setAttribute('aria-hidden', 'true'); document.body.style.overflow = '';
	}

	document.querySelectorAll('[data-v2-search-open]').forEach(function (b) { b.addEventListener('click', open); });
	root.querySelectorAll('[data-v2-search-close]').forEach(function (b) { b.addEventListener('click', close); });
	document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { close(); } });
	if (form && input) {
		form.addEventListener('submit', function (e) {
			e.preventDefault();
			window.location.assign('/mm5/merchant.mvc?Screen=SRCHV2&Search=' + encodeURIComponent(input.value || ''));
		});
	}

	try {
		var recent = JSON.parse(window.localStorage.getItem('sd2v2_recent_searches') || '[]');
		if (recent.length) {
			var wrap = root.querySelector('[data-v2-search-recent]');
			var list = root.querySelector('[data-v2-search-recent-list]');
			recent.slice(0, 5).forEach(function (term) {
				var a = document.createElement('a');
				a.className = 'sd2-v2-search-console__recent-item'; a.href = '#'; a.textContent = term;
				a.addEventListener('click', function (e) { e.preventDefault(); input.value = term; input.focus(); });
				list.appendChild(a);
			});
			wrap.hidden = false;
		}
	} catch (e) { /* localStorage unavailable; recent searches simply don't render */ }
})();

/* Garage Experience V2 controller — panel open/close, cascading select
   enable/disable, and local persistence (localStorage) so the Vehicle
   Profile card and header trigger reflect the active vehicle across page
   loads. Real fitment matching against Miva product/category data is
   explicitly deferred to a later milestone per this milestone's scope. */
(function () {
	'use strict';
	var root = document.querySelector('[data-v2-garage]');
	if (!root || root.dataset.v2Ready) { return; }
	root.dataset.v2Ready = '1';

	var panel = root.querySelector('.sd2-v2-garage-panel');
	var scrim = root.querySelector('.sd2-v2-garage-scrim');
	var form = root.querySelector('[data-v2-garage-form]');
	var makeSel = root.querySelector('[data-v2-garage-field="make"]');
	var engineSel = root.querySelector('[data-v2-garage-field="engine"]');
	var yearSel = root.querySelector('[data-v2-garage-field="year"]');
	var cardEmpty = root.querySelector('[data-v2-garage-card-empty]');
	var cardName = root.querySelector('[data-v2-garage-card-name]');
	var cardSpec = root.querySelector('[data-v2-garage-card-spec]');

	var ENGINES = {
		Ford: ['6.7 Powerstroke', '6.4 Powerstroke', '6.0 Powerstroke'],
		GM: ['Duramax L5P', 'Duramax LML', 'Duramax LB7'],
		'Dodge / Ram': ['6.7 Cummins', '5.9 Cummins']
	};
	var YEARS = ['2024','2023','2022','2021','2020','2019','2018','2017','2016','2015'];

	function open() { panel.classList.add('is-open'); scrim.classList.add('is-open'); panel.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; }
	function close() { panel.classList.remove('is-open'); scrim.classList.remove('is-open'); panel.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }

	document.addEventListener('click', function (event) {
		var toggle = event.target.closest('[data-v2-garage-toggle]');
		if (!toggle) { return; }
		event.preventDefault();
		panel.classList.contains('is-open') ? close() : open();
	});
	root.querySelectorAll('[data-v2-garage-close]').forEach(function (b) { b.addEventListener('click', close); });
	document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { close(); } });

	function fillSelect(sel, items, placeholder) {
		sel.innerHTML = '';
		var opt0 = document.createElement('option'); opt0.value = ''; opt0.textContent = placeholder; sel.appendChild(opt0);
		items.forEach(function (v) { var o = document.createElement('option'); o.value = v; o.textContent = v; sel.appendChild(o); });
		sel.disabled = items.length === 0;
	}

	makeSel.addEventListener('change', function () {
		var list = ENGINES[makeSel.value] || [];
		fillSelect(engineSel, list, list.length ? 'Select Engine' : 'Select Make First');
		fillSelect(yearSel, [], 'Select Engine First');
	});
	engineSel.addEventListener('change', function () {
		fillSelect(yearSel, engineSel.value ? YEARS : [], engineSel.value ? 'Select Year' : 'Select Engine First');
	});

	function renderActiveVehicle(vehicle) {
		var headerLabel = document.querySelectorAll('[data-v2-garage-label]');
		if (!vehicle) {
			cardEmpty.hidden = false; cardName.hidden = true; cardSpec.hidden = true;
			headerLabel.forEach(function (el) { el.textContent = 'Add Your Truck'; el.classList.add('is-empty'); });
			return;
		}
		cardEmpty.hidden = true;
		cardName.hidden = false; cardName.textContent = vehicle.make + ' ' + vehicle.engine;
		cardSpec.hidden = false; cardSpec.textContent = vehicle.year + ' - ' + vehicle.engine;
		headerLabel.forEach(function (el) { el.textContent = vehicle.year + ' ' + vehicle.make; el.classList.remove('is-empty'); });
	}

	function loadVehicles() { try { return JSON.parse(window.localStorage.getItem('sd2v2_garage') || '[]'); } catch (e) { return []; } }
	function saveVehicles(list) { try { window.localStorage.setItem('sd2v2_garage', JSON.stringify(list)); } catch (e) { /* storage unavailable */ } }

	function renderSaved() {
		var list = loadVehicles();
		var wrap = root.querySelector('[data-v2-garage-saved-wrap]');
		var container = root.querySelector('[data-v2-garage-saved-list]');
		container.innerHTML = '';
		wrap.hidden = list.length === 0;
		list.forEach(function (v, i) {
			var row = document.createElement('div');
			row.className = 'sd2-v2-garage-saved__item';
			var label = document.createElement('span'); label.textContent = v.year + ' ' + v.make + ' ' + v.engine;
			var btn = document.createElement('button'); btn.type = 'button'; btn.textContent = 'Remove';
			btn.addEventListener('click', function () { list.splice(i, 1); saveVehicles(list); renderSaved(); if (i === 0) { renderActiveVehicle(list[0] || null); } });
			row.appendChild(label); row.appendChild(btn); container.appendChild(row);
		});
	}

	form.addEventListener('submit', function (e) {
		e.preventDefault();
		if (!makeSel.value || !engineSel.value || !yearSel.value) { return; }
		var vehicle = { make: makeSel.value, engine: engineSel.value, year: yearSel.value };
		var list = loadVehicles(); list.unshift(vehicle); saveVehicles(list);
		renderActiveVehicle(vehicle); renderSaved(); close();
	});

	var existing = loadVehicles();
	renderActiveVehicle(existing[0] || null);
	renderSaved();
})();

/* Cart Drawer controller — open/close + reads the Garage Experience's
   localStorage vehicle so the reminder strip reflects the active truck.
   Shipping progress bar uses a placeholder threshold pending real order
   total wiring in the Cart & Checkout milestone. */
(function () {
	'use strict';
	var root = document.querySelector('[data-v2-cart]');
	if (!root || root.dataset.v2Ready) { return; }
	root.dataset.v2Ready = '1';
	var panel = root.querySelector('.sd2-v2-cart-panel');
	var scrim = root.querySelector('.sd2-v2-cart-scrim');
	var vehicleBox = root.querySelector('[data-v2-cart-vehicle]');
	var vehicleText = root.querySelector('[data-v2-cart-vehicle-text]');

	function open() {
		panel.classList.add('is-open'); scrim.classList.add('is-open');
		panel.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden';
		refreshVehicle();
	}
	function close() { panel.classList.remove('is-open'); scrim.classList.remove('is-open'); panel.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }

	function refreshVehicle() {
		try {
			var list = JSON.parse(window.localStorage.getItem('sd2v2_garage') || '[]');
			if (list[0]) {
				vehicleBox.classList.remove('is-empty');
				vehicleText.textContent = 'Fits your ' + list[0].year + ' ' + list[0].make + ' ' + list[0].engine;
			} else {
				vehicleBox.classList.add('is-empty');
				vehicleText.textContent = 'Add your truck to confirm fitment';
			}
		} catch (e) { /* storage unavailable; reminder stays in empty state */ }
	}

document.querySelectorAll('[data-v2-cart-open]').forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); open(); }); });
	root.querySelectorAll('[data-v2-cart-close]').forEach(function (b) { b.addEventListener('click', close); });
	document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { close(); } });
})();

/* Customer Dashboard V2. Inactive account enhancements for Garage previews
   and optional account section disclosure. */
(function () {
	'use strict';
	function loadGarage() {
		try {
			return JSON.parse(window.localStorage.getItem('sd2v2_garage') || '[]');
		} catch (e) {
			return [];
		}
	}
	function vehicleLabel(vehicle) {
		return [vehicle.year, vehicle.make, vehicle.model, vehicle.engine].filter(Boolean).join(' ');
	}
	function renderGarage() {
		var vehicles = loadGarage();
		document.querySelectorAll('[data-v2-account-garage-copy]').forEach(function (node) {
			node.textContent = vehicles[0] ? vehicleLabel(vehicles[0]) : 'No active vehicle selected.';
		});
		document.querySelectorAll('[data-v2-account-garage-list]').forEach(function (list) {
			if (list.dataset.v2AccountManual) { return; }
			if (!vehicles.length) {
				list.innerHTML = '<p>[Placeholder] No saved vehicles yet. Add a truck in Garage to personalize fitment.</p>';
				return;
			}
			list.innerHTML = '';
			vehicles.forEach(function (vehicle, index) {
				var card = document.createElement('article');
				card.className = 'sd2-v2-account-vehicle-card' + (index === 0 ? ' is-active' : '');
				card.innerHTML = '<strong></strong><span></span><div><span class="sd2-v2-badge sd2-v2-badge--fitment"></span><button class="sd2-v2-link-button" type="button" data-v2-garage-toggle>Edit</button></div>';
				card.querySelector('strong').textContent = vehicleLabel(vehicle) || 'Saved Vehicle';
				card.querySelector('span').textContent = index === 0 ? 'Active vehicle' : 'Saved vehicle';
				card.querySelector('.sd2-v2-badge').textContent = index === 0 ? 'Active' : 'Saved';
				list.appendChild(card);
			});
		});
	}
	document.querySelectorAll('[data-v2-account-section-toggle]').forEach(function (toggle) {
		var target = document.getElementById(toggle.getAttribute('aria-controls') || '');
		if (!target) { return; }
		toggle.addEventListener('click', function () {
			var open = toggle.getAttribute('aria-expanded') === 'true';
			toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
			target.hidden = open;
		});
	});
	renderGarage();
	window.addEventListener('storage', function (event) {
		if (event.key === 'sd2v2_garage') { renderGarage(); }
	});
})();

/* Cart + Checkout V2. Inactive flow enhancements for reusable partials:
   mobile summary disclosure, editable sections, selectable cards, and cart progress. */
(function () {
	'use strict';
	document.querySelectorAll('[data-v2-mobile-checkout]').forEach(function (root) {
		if (root.dataset.v2Ready) { return; }
		root.dataset.v2Ready = '1';
		var toggle = root.querySelector('[data-v2-mobile-summary-toggle]');
		var summary = root.querySelector('[data-v2-mobile-summary]');
		if (!toggle || !summary) { return; }
		toggle.addEventListener('click', function () {
			var open = toggle.getAttribute('aria-expanded') === 'true';
			toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
			summary.hidden = open;
		});
	});

	document.querySelectorAll('[data-v2-editable-section]').forEach(function (section) {
		if (section.dataset.v2Ready) { return; }
		section.dataset.v2Ready = '1';
		var toggle = section.querySelector('[data-v2-editable-toggle]');
		var body = section.querySelector('[data-v2-editable-body]');
		if (!toggle || !body) { return; }
		toggle.setAttribute('aria-expanded', 'true');
		toggle.addEventListener('click', function () {
			var open = toggle.getAttribute('aria-expanded') === 'true';
			toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
			body.hidden = open;
		});
	});

	document.querySelectorAll('.sd2-v2-address-card, .sd2-v2-method-card, .sd2-v2-payment-card').forEach(function (card) {
		var input = card.querySelector('input[type="radio"]');
		if (!input || !input.name) { return; }
		function refresh() { card.classList.toggle('is-selected', input.checked); }
		input.addEventListener('change', function () {
			document.querySelectorAll('input[name="' + input.name + '"]').forEach(function (item) {
				var parent = item.closest('.sd2-v2-address-card, .sd2-v2-method-card, .sd2-v2-payment-card');
				if (parent) { parent.classList.toggle('is-selected', item.checked); }
			});
		});
		refresh();
	});

})();

/* Listing Filter Sheet V2. Mobile-only bottom sheet for existing filter rail markup. */
(function () {
	'use strict';
	var sheet = document.querySelector('[data-v2-filter-sheet]');
	if (!sheet || sheet.dataset.v2Ready) { return; }
	sheet.dataset.v2Ready = '1';
	var openers = Array.prototype.slice.call(document.querySelectorAll('[data-v2-filter-open]'));
	var closers = Array.prototype.slice.call(document.querySelectorAll('[data-v2-filter-close]'));
	var scrim = document.querySelector('.sd2-v2-filter-sheet-scrim');

	function openSheet() {
		sheet.hidden = false;
		if (scrim) { scrim.hidden = false; }
		window.requestAnimationFrame(function () {
			sheet.classList.add('is-open');
			if (scrim) { scrim.classList.add('is-open'); }
		});
		sheet.setAttribute('aria-hidden', 'false');
		openers.forEach(function (button) { button.setAttribute('aria-expanded', 'true'); });
		document.body.style.overflow = 'hidden';
	}
	function closeSheet() {
		sheet.classList.remove('is-open');
		if (scrim) { scrim.classList.remove('is-open'); }
		sheet.setAttribute('aria-hidden', 'true');
		openers.forEach(function (button) { button.setAttribute('aria-expanded', 'false'); });
		document.body.style.overflow = '';
		window.setTimeout(function () {
			if (sheet.getAttribute('aria-hidden') === 'true') { sheet.hidden = true; }
			if (scrim && !scrim.classList.contains('is-open')) { scrim.hidden = true; }
		}, 260);
	}

	openers.forEach(function (button) { button.addEventListener('click', openSheet); });
	closers.forEach(function (button) { button.addEventListener('click', closeSheet); });
	document.addEventListener('keydown', function (event) {
		if (event.key === 'Escape' && sheet.classList.contains('is-open')) { closeSheet(); }
	});
})();

/* Product Detail V2. Page-scoped progressive enhancements for inactive PDP:
   tabs, gallery counters, keyboard thumbnail navigation, and Garage fitment copy. */
(function () {
	'use strict';
	function readGarageVehicle() {
		try {
			var list = JSON.parse(window.localStorage.getItem('sd2v2_garage') || '[]');
			return list && list[0] ? list[0] : null;
		} catch (e) {
			return null;
		}
	}
	function formatVehicle(vehicle) {
		if (!vehicle) { return ''; }
		return [vehicle.year, vehicle.make, vehicle.model, vehicle.engine].filter(Boolean).join(' ');
	}
	function refreshFitmentCopy() {
		var vehicle = readGarageVehicle();
		var label = formatVehicle(vehicle);
		document.querySelectorAll('[data-v2-fitment-copy]').forEach(function (node) {
			node.textContent = label ? 'Garage fitment context: checking against your ' + label + '.' : 'No vehicle selected. Open Garage to verify fitment before ordering.';
		});
	}
	document.querySelectorAll('[data-v2-pdp-tabs]').forEach(function (root) {
		if (root.dataset.v2PdpReady) { return; }
		root.dataset.v2PdpReady = '1';
		var tabs = Array.prototype.slice.call(root.querySelectorAll('[data-v2-pdp-tab]'));
		var panels = Array.prototype.slice.call(root.querySelectorAll('[data-v2-pdp-panel]'));
		function activate(tab) {
			tabs.forEach(function (item) { item.setAttribute('aria-selected', item === tab ? 'true' : 'false'); });
			panels.forEach(function (panel) { panel.hidden = panel.id !== tab.getAttribute('aria-controls'); });
			tab.focus();
		}
		tabs.forEach(function (tab, index) {
			tab.addEventListener('click', function () { activate(tab); });
			tab.addEventListener('keydown', function (event) {
				var nextIndex = index;
				if (event.key === 'ArrowRight') { nextIndex = (index + 1) % tabs.length; }
				if (event.key === 'ArrowLeft') { nextIndex = (index - 1 + tabs.length) % tabs.length; }
				if (event.key === 'Home') { nextIndex = 0; }
				if (event.key === 'End') { nextIndex = tabs.length - 1; }
				if (nextIndex !== index) {
					event.preventDefault();
					activate(tabs[nextIndex]);
				}
			});
		});
	});
	refreshFitmentCopy();
	window.addEventListener('storage', function (event) {
		if (event.key === 'sd2v2_garage') { refreshFitmentCopy(); }
	});
})();

/* Homepage Performance Strip count-up. Progressive enhancement only; initial
   text remains usable without JS, and reduced-motion users keep static text. */
(function () {
	'use strict';
	var counters = Array.prototype.slice.call(document.querySelectorAll('[data-v2-count-to]'));
	if (!counters.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { return; }
	var run = function (el) {
		if (el.dataset.v2CountReady) { return; }
		el.dataset.v2CountReady = '1';
		var target = parseInt(el.getAttribute('data-v2-count-to'), 10);
		if (!target) { return; }
		var start = Math.max(0, target - 16);
		var duration = 700;
		var startTime = 0;
		function frame(time) {
			if (!startTime) { startTime = time; }
			var progress = Math.min((time - startTime) / duration, 1);
			el.textContent = String(Math.round(start + ((target - start) * progress)));
			if (progress < 1) { window.requestAnimationFrame(frame); }
		}
		window.requestAnimationFrame(frame);
	};
	if ('IntersectionObserver' in window) {
		var observer = new IntersectionObserver(function (entries) {
			entries.forEach(function (entry) {
				if (entry.isIntersecting) {
					run(entry.target);
					observer.unobserve(entry.target);
				}
			});
		}, { threshold: 0.35 });
		counters.forEach(function (el) { observer.observe(el); });
		return;
	}
counters.forEach(run);
})();

/* Search Experience V2. Syncs query fields, stores recent searches locally,
   and reflects the active Garage vehicle in page copy. Progressive only. */
(function () {
	'use strict';
	var root = document.querySelector('[data-v2-search-page]');
	if (!root || root.dataset.v2Ready) { return; }
	root.dataset.v2Ready = '1';

	var input = root.querySelector('[data-v2-search-page-input]');
	var recentWrap = root.querySelector('[data-v2-search-page-recent]');
	var recentList = root.querySelector('[data-v2-search-page-recent-list]');
	var vehicleBox = root.querySelector('[data-v2-search-page-vehicle]');
	var storageKey = 'sd2v2_recent_searches';

	function parseSearchFromUrl() {
		try { return new URLSearchParams(window.location.search).get('Search') || ''; }
		catch (e) { return ''; }
	}
	function loadRecent() {
		try { return JSON.parse(window.localStorage.getItem(storageKey) || '[]'); }
		catch (e) { return []; }
	}
	function saveRecent(list) {
		try { window.localStorage.setItem(storageKey, JSON.stringify(list.slice(0, 8))); }
		catch (e) { /* storage unavailable */ }
	}
	function renderRecent() {
		if (!recentWrap || !recentList) { return; }
		var recent = loadRecent();
		recentList.innerHTML = '';
		recentWrap.hidden = recent.length === 0;
		recent.forEach(function (term) {
			var link = document.createElement('a');
			link.href = window.location.pathname + '?Search=' + encodeURIComponent(term);
			link.textContent = term;
			link.addEventListener('click', function (e) {
				if (!input) { return; }
				e.preventDefault();
				input.value = term;
				input.form && input.form.submit();
			});
			recentList.appendChild(link);
		});
	}
	function remember(term) {
		term = (term || '').trim();
		if (!term) { return; }
		var recent = loadRecent().filter(function (item) { return item.toLowerCase() !== term.toLowerCase(); });
		recent.unshift(term);
		saveRecent(recent);
		renderRecent();
	}
	function refreshVehicle() {
		if (!vehicleBox) { return; }
		try {
			var list = JSON.parse(window.localStorage.getItem('sd2v2_garage') || '[]');
			if (list[0]) {
				vehicleBox.classList.remove('is-empty');
				vehicleBox.textContent = 'Search context: prioritizing copy for your ' + list[0].year + ' ' + list[0].make + ' ' + list[0].engine + '.';
			} else {
				vehicleBox.classList.add('is-empty');
				vehicleBox.textContent = 'Add your truck to make search context vehicle-aware.';
			}
		} catch (e) { /* keep empty message */ }
	}
	if (input && !input.value) { input.value = parseSearchFromUrl(); }
	if (input && input.form) {
		input.form.addEventListener('submit', function () { remember(input.value); });
	}
	if (input && input.value) { remember(input.value); }
	renderRecent();
	refreshVehicle();
	window.addEventListener('storage', function (e) {
		if (e.key === 'sd2v2_garage') { refreshVehicle(); }
		if (e.key === storageKey) { renderRecent(); }
	});
})();

/* Commerce Foundation V2. Shared progressive behavior for inactive commerce
   partials: quantity, accordion, media gallery/zoom, and sticky buy bar. */
(function () {
	'use strict';
	document.querySelectorAll('[data-v2-qty]').forEach(function (root) {
		if (root.dataset.v2Ready) { return; }
		root.dataset.v2Ready = '1';
		var input = root.querySelector('[data-v2-qty-input]');
		var minus = root.querySelector('[data-v2-qty-minus]');
		var plus = root.querySelector('[data-v2-qty-plus]');
		if (!input) { return; }
		function step(delta) {
			var min = parseInt(input.getAttribute('min') || '1', 10);
			var value = parseInt(input.value || String(min), 10);
			input.value = String(Math.max(min, value + delta));
			input.dispatchEvent(new Event('change', { bubbles: true }));
		}
		if (minus) { minus.addEventListener('click', function () { step(-1); }); }
		if (plus) { plus.addEventListener('click', function () { step(1); }); }
	});

	document.querySelectorAll('[data-v2-accordion]').forEach(function (root) {
		if (root.dataset.v2Ready) { return; }
		root.dataset.v2Ready = '1';
		root.querySelectorAll('[data-v2-accordion-trigger]').forEach(function (trigger) {
			trigger.addEventListener('click', function () {
				var panel = trigger.parentElement && trigger.parentElement.querySelector('[data-v2-accordion-panel]');
				var open = trigger.getAttribute('aria-expanded') === 'true';
				trigger.setAttribute('aria-expanded', open ? 'false' : 'true');
				if (panel) { panel.hidden = open; }
			});
		});
	});

	document.querySelectorAll('[data-v2-gallery]').forEach(function (root) {
		if (root.dataset.v2Ready) { return; }
		root.dataset.v2Ready = '1';
		var main = root.querySelector('[data-v2-gallery-main]');
		var viewer = root.querySelector('[data-v2-zoom-viewer]');
		var thumbs = Array.prototype.slice.call(root.querySelectorAll('[data-v2-gallery-thumb]'));
		var current = root.querySelector('[data-v2-gallery-count-current]');
		var total = root.querySelector('[data-v2-gallery-count-total]');
		if (total) { total.textContent = String(thumbs.length); }
		function activateThumb(thumb) {
			var src = thumb.getAttribute('data-v2-gallery-src');
			var index = thumbs.indexOf(thumb);
			if (main && src) { main.setAttribute('src', src); }
			thumbs.forEach(function (item) { item.classList.remove('is-active'); });
			thumb.classList.add('is-active');
			if (viewer) { viewer.classList.remove('is-zoomed'); }
			if (current) { current.textContent = String(index >= 0 ? index + 1 : 1); }
		}
		thumbs.forEach(function (thumb, index) {
			thumb.addEventListener('click', function () {
				activateThumb(thumb);
			});
			thumb.addEventListener('keydown', function (event) {
				var nextIndex = index;
				if (event.key === 'ArrowDown' || event.key === 'ArrowRight') { nextIndex = (index + 1) % thumbs.length; }
				if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') { nextIndex = (index - 1 + thumbs.length) % thumbs.length; }
				if (nextIndex !== index) {
					event.preventDefault();
					thumbs[nextIndex].focus();
					activateThumb(thumbs[nextIndex]);
				}
			});
		});
		root.querySelectorAll('[data-v2-zoom-toggle]').forEach(function (button) {
			button.addEventListener('click', function () {
				if (viewer) { viewer.classList.toggle('is-zoomed'); }
			});
		});
	});

	document.querySelectorAll('[data-v2-sticky-buy]').forEach(function (bar) {
		if (bar.dataset.v2Ready) { return; }
		bar.dataset.v2Ready = '1';
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) { return; }
		var target = document.querySelector('[data-v2-buy-button]');
		if (!target) { return; }
		var observer = new IntersectionObserver(function (entries) {
			entries.forEach(function (entry) {
				bar.classList.toggle('is-visible', !entry.isIntersecting);
			});
		});
		observer.observe(target);
	});
})();
