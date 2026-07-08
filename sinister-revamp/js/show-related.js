/**
 +-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 |s|h|o|w| |d|o|n|t| |t|e|l|l|
 +-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 *
 * This extension will toggle the display state of a targeted element.
 */

let showDontTell = (function () {
	'use strict';

	let triggers = document.querySelectorAll('[data-hook~="show-related"]');
	let publicAPIs = {};

	publicAPIs.init = function () {
		if (triggers.length > 0) {
			let activeClass;
			let activeTarget;
			let activeTrigger;

			triggers.forEach(function (trigger) {
				let target = '[data-hook~="' + trigger.getAttribute('data-target') + '"]';
				let relatedTarget = document.querySelector(target);
				let openClass = trigger.getAttribute('data-active-class') ? trigger.getAttribute('data-active-class') : 'is-open';

				trigger.addEventListener('click', function (clickEvent) {
					clickEvent.preventDefault();
					trigger.classList.toggle('is-active');
					relatedTarget.classList.toggle(openClass);

					activeClass = openClass;
					activeTarget = relatedTarget;
					activeTrigger = trigger;
				}, false);
			});

			document.addEventListener('mousedown', function (mouseEvent) {
				let mouseEventTarget = mouseEvent.target;

				if (activeTarget && activeTarget.classList.contains(activeClass)) {
					if (!activeTarget.contains(mouseEventTarget) && mouseEventTarget !== activeTrigger) {
						mouseEvent.preventDefault();
						activeTrigger.classList.toggle('is-active');
						activeTarget.classList.toggle(activeClass);
					}
				}
			}, false);

		}
	};

	return publicAPIs.init();
}());
