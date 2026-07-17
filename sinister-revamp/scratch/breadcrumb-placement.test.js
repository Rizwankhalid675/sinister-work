const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const templatesDir = path.join(__dirname, '..', 'templates');

function breadcrumbLocations(source) {
  const locations = [];
  const marker = /<nav\s+class="[^"]*sd2-v2-breadcrumbs[^"]*"/g;
  let match;
  while ((match = marker.exec(source))) {
    const before = source.slice(0, match.index);
    locations.push({
      index: match.index,
      insideHeader: before.lastIndexOf('<header') > before.lastIndexOf('</header>'),
    });
  }
  return locations;
}

test('every V2 breadcrumb is rendered inside its page header or hero', () => {
  const failures = [];
  for (const name of fs.readdirSync(templatesDir).filter((file) => file.endsWith('.mvt'))) {
    const source = fs.readFileSync(path.join(templatesDir, name), 'utf8');
    const locations = breadcrumbLocations(source);
    if (locations.some((location) => !location.insideHeader)) failures.push(name);
  }
  assert.deepEqual(failures, []);
});
