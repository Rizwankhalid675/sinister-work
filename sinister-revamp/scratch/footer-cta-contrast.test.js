const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'css', 'sd2-global.css'), 'utf8');
const standaloneInstallTemplates = [
	'install-hub.mvt',
	'install-part-overviews.mvt',
	'install-tutorials-cummins.mvt',
	'install-tutorials-duramax.mvt',
	'install-tutorials-overview.mvt',
	'install-tutorials-powerstroke.mvt'
];

test('footer garage CTA keeps a readable label in default and interactive states', () => {
	assert.match(
		css,
		/\.sd2-v3-footer-cta\s+\.sd2-btn\s*\{[^}]*background:\s*#fff[^}]*color:\s*#07101f\s*!important[^}]*\}/s,
		'expected the white footer CTA to force a dark label over the global primary-button color'
	);
	assert.match(
		css,
		/\.sd2-v3-footer-cta\s+\.sd2-btn:is\(:hover,:focus-visible\)\s*\{[^}]*background:\s*#07101f[^}]*color:\s*#fff\s*!important[^}]*\}/s,
		'expected hover and keyboard focus to share a high-contrast dark state'
	);
});

test('standalone install pages request the current shared stylesheet revision', () => {
	for (const file of standaloneInstallTemplates) {
		const template = fs.readFileSync(path.join(root, 'templates', file), 'utf8');
		assert.doesNotMatch(template, /sd2-global\.css\?T=20260714v44/, `${file} still requests the stale stylesheet`);
		assert.match(template, /sd2-global\.css\?T=20260715v45/, `${file} must request the current stylesheet revision`);
	}
});
