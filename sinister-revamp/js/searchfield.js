/**
 * Global search controls.
 */
(function () {
	'use strict';

	let searchOpeners = document.querySelectorAll('[data-hook="open-search"]');
	let searchCloser = document.querySelector('[data-hook="close-search"]');

	/**
	 * Open global search and set focus to the input field.
	 */
	searchOpeners.forEach(function (searchOpener) {
		searchOpener.addEventListener('click', function (event) {
			event.preventDefault();
			document.documentElement.classList.toggle('has-active-search-preview');
			var globalSearch = document.querySelector('[data-hook="global-search"]');
			if (globalSearch) {
				globalSearch.focus();
			}
		});
	});

	/**
	 * Close global search.
	 */
	if (searchCloser) {
		searchCloser.addEventListener('click', function (event) {
			event.preventDefault();

			document.documentElement.classList.toggle('has-active-search-preview');
		});
	}

	/**
	 * Close global search when the `Esc` key is pressed.
	 */
	window.addEventListener('keydown', function (keyEvent) {
		if (keyEvent.defaultPrevented) {
			return; // Do nothing if the event was already processed
		}

		switch (keyEvent.key) {
			case 'Escape':
				if (document.documentElement.classList.contains('has-active-search-preview')) {
					document.documentElement.classList.toggle('has-active-search-preview');
				}
				break;
			default:
				return;
		}

		keyEvent.preventDefault();
	}, true);

}());
