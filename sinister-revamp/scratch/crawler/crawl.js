// Crawls the live Miva site to map category pages and product pages.
// Category pages render their product grid client-side via Searchspring, so
// this uses Puppeteer to render pages and read the DOM after the grid loads.
// Usage: node crawl.js
'use strict';

const https = require('https');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const ORIGIN = 'https://sinisterdiesel.com';
const OUTPUT_DIR = path.join(__dirname, 'output');
const MAX_DEPTH = 4;
const MAX_PAGES = 4000;
const REQUEST_DELAY_MS = 300;
const NAV_TIMEOUT_MS = 30000;

const CATEGORY_URL_PATTERNS = [
  /-for-powerstroke/i, /for-powerstroke/i,
  /-for-duramax/i, /for-duramax/i,
  /-for-cummins/i, /for-cummins/i,
  /_ford_powerstroke/i, /_gm_duramax/i, /_dodge_cummins/i,
  /^\/shop\?\?/i,
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function fetchUrl(url) {
  return new Promise((resolve) => {
    https
      .get(url, { headers: { 'User-Agent': 'SinisterDieselAuditBot/1.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          resolve({ status: res.statusCode, redirect: res.headers.location, body: '' });
          res.resume();
          return;
        }
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      })
      .on('error', (err) => resolve({ status: 0, body: '', error: err.message }));
  });
}

function normalizeUrl(href, baseUrl) {
  if (!href) return null;
  href = href.trim();
  if (
    href.startsWith('#') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:') ||
    href.startsWith('javascript:')
  )
    return null;
  try {
    const resolved = new URL(href, baseUrl);
    if (resolved.origin !== ORIGIN) return null;
    resolved.hash = '';
    return resolved.toString();
  } catch {
    return null;
  }
}

function extractLinks(html, baseUrl) {
  const links = new Set();
  const re = /<a\s+[^>]*href\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const norm = normalizeUrl(m[1], baseUrl);
    if (norm) links.add(norm);
  }
  return [...links];
}

function extractTitle(html) {
  const m = /<title[^>]*>([^<]*)<\/title>/i.exec(html);
  return m ? m[1].trim().replace(/\s+/g, ' ') : '';
}

// Miva Merchant stamps a page-type marker on <body id="js-XXXX" class="... t-page-xxxx">
// (PROD = product detail, CTGY = category listing, SRCH = search, etc).
function detectMivaPageType(html) {
  const m = /<body[^>]*\bid=["']js-([A-Z0-9]+)["']/i.exec(html);
  return m ? m[1].toUpperCase() : null;
}

function looksLikeProductPage(html) {
  const mivaType = detectMivaPageType(html);
  if (mivaType === 'PROD') return true;
  if (mivaType) return false;
  return /id=["']AddToCart["']/i.test(html) || /mvte-product/i.test(html);
}

function looksLikeCategoryPage(urlPath, html) {
  const mivaType = detectMivaPageType(html);
  if (mivaType === 'CTGY') return true;
  if (mivaType) return false;
  if (CATEGORY_URL_PATTERNS.some((re) => re.test(urlPath))) return true;
  const productCardMatches = (html.match(/x-product-list__item/gi) || []).length;
  return productCardMatches >= 3;
}

async function fetchSitemapProductUrls() {
  const res = await fetchUrl(`${ORIGIN}/sitemap.xml`);
  const urls = new Set();
  if (res.status === 200) {
    const re = /<loc>([^<]+)<\/loc>/gi;
    let m;
    while ((m = re.exec(res.body)) !== null) urls.add(m[1].trim());
  }
  return urls;
}

// Renders a category page with Puppeteer, waits for the Searchspring product
// grid to populate, and returns the rendered HTML plus extracted product links.
async function renderCategoryPage(browser, url) {
  const page = await browser.newPage();
  try {
    await page.setUserAgent('SinisterDieselAuditBot/1.0');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: NAV_TIMEOUT_MS });
    try {
      await page.waitForSelector('.x-product-list__item a[href], .ss__results a[href]', {
        timeout: 8000,
      });
    } catch {
      // grid may be genuinely empty or use a different selector; continue with whatever loaded
    }
    await sleep(500);
    const html = await page.content();
    const productLinks = await page.evaluate(() => {
      const anchors = document.querySelectorAll(
        '.x-product-list__item a[href], .ss__result a[href], .ss__results a[href]'
      );
      return [...new Set([...anchors].map((a) => a.href))];
    });
    return { html, productLinks };
  } finally {
    await page.close();
  }
}

async function main() {
  console.log('Fetching sitemap.xml for product URL universe...');
  const sitemapProductUrls = await fetchSitemapProductUrls();
  console.log(`  -> ${sitemapProductUrls.size} product URLs in sitemap`);

  const visited = new Map(); // url -> { status, title, type, depth }
  const linkedFrom = new Map(); // url -> Set(parent urls)
  const categoryProductLinks = new Map(); // categoryUrl -> Set(productUrl)
  const queue = [];

  const addLinks = (links, parentUrl, depth) => {
    for (const l of links) {
      if (!linkedFrom.has(l)) linkedFrom.set(l, new Set());
      linkedFrom.get(l).add(parentUrl);
      queue.push({ url: l, depth });
    }
  };

  console.log('Fetching homepage...');
  const homeRes = await fetchUrl(`${ORIGIN}/`);
  if (homeRes.status === 200) addLinks(extractLinks(homeRes.body, `${ORIGIN}/`), `${ORIGIN}/`, 1);
  await sleep(REQUEST_DELAY_MS);

  console.log('Fetching /site-map.html for secondary discovery...');
  const siteMapRes = await fetchUrl(`${ORIGIN}/site-map.html`);
  if (siteMapRes.status === 200) {
    const links = extractLinks(siteMapRes.body, `${ORIGIN}/site-map.html`);
    addLinks(links, `${ORIGIN}/site-map.html`, 1);
    console.log(`  -> ${links.length} links found on site-map.html`);
  } else {
    console.log(`  -> site-map.html returned status ${siteMapRes.status}, skipping`);
  }
  await sleep(REQUEST_DELAY_MS);

  console.log('Launching headless browser for category-page rendering...');
  const browser = await puppeteer.launch({ headless: true });

  let pageCount = 0;
  try {
    while (queue.length > 0 && pageCount < MAX_PAGES) {
      const { url, depth } = queue.shift();
      if (visited.has(url)) continue;

      const urlObj = new URL(url);
      const isSitemapProduct = sitemapProductUrls.has(url);
      const withinDepth = depth <= MAX_DEPTH;
      if (!withinDepth && !isSitemapProduct) continue;

      visited.set(url, { status: 'pending' });
      pageCount++;
      if (pageCount % 25 === 0) console.log(`  crawled ${pageCount} pages, queue=${queue.length}`);

      const res = await fetchUrl(url);
      await sleep(REQUEST_DELAY_MS);

      if (res.status !== 200) {
        visited.set(url, { status: res.status, title: '', type: 'error', depth });
        continue;
      }

      const title = extractTitle(res.body);
      const mivaType = detectMivaPageType(res.body);
      let type = 'other';
      if (mivaType === 'PROD' || (!mivaType && isSitemapProduct)) {
        type = 'product';
      } else if (mivaType === 'CTGY' || (!mivaType && looksLikeCategoryPage(urlObj.pathname + urlObj.search, res.body))) {
        type = 'category';
      } else if (looksLikeProductPage(res.body)) {
        type = 'product';
      }

      visited.set(url, { status: res.status, title, type, depth });

      if (type === 'category') {
        // Render with Puppeteer to capture the JS-loaded Searchspring product grid.
        try {
          const { productLinks } = await renderCategoryPage(browser, url);
          const normalized = productLinks
            .map((l) => normalizeUrl(l, url))
            .filter(Boolean);
          if (!categoryProductLinks.has(url)) categoryProductLinks.set(url, new Set());
          for (const p of normalized) {
            categoryProductLinks.get(url).add(p);
            if (!linkedFrom.has(p)) linkedFrom.set(p, new Set());
            linkedFrom.get(p).add(url);
            if (!visited.has(p)) queue.push({ url: p, depth: depth + 1 });
          }
        } catch (err) {
          console.log(`  ! failed to render category ${url}: ${err.message}`);
        }
      }

      // Follow static links from category/other pages within depth budget.
      if (type !== 'product' && depth < MAX_DEPTH) {
        const links = extractLinks(res.body, url);
        addLinks(links, url, depth + 1);
      }
    }
  } finally {
    await browser.close();
  }

  console.log(`\nCrawl complete. ${visited.size} pages visited.`);

  const categories = [];
  const products = [];
  const others = [];

  for (const [url, info] of visited.entries()) {
    if (info.status !== 200) continue;
    const parents = [...(linkedFrom.get(url) || [])];
    const entry = { url, title: info.title, depth: info.depth, linkedFrom: parents };
    if (info.type === 'category') {
      entry.productLinks = [...(categoryProductLinks.get(url) || [])];
      categories.push(entry);
    } else if (info.type === 'product') {
      entry.inSitemap = sitemapProductUrls.has(url);
      products.push(entry);
    } else {
      others.push(entry);
    }
  }

  const crawledProductUrls = new Set(products.map((p) => p.url));
  const orphanedSitemapProducts = [...sitemapProductUrls].filter((u) => !crawledProductUrls.has(u));
  const crawledNotInSitemap = products.filter((p) => !p.inSitemap).map((p) => p.url);

  const summary = {
    crawledAt: new Date().toISOString(),
    pagesVisited: visited.size,
    categoriesFound: categories.length,
    productsFound: products.length,
    otherPagesFound: others.length,
    sitemapProductCount: sitemapProductUrls.size,
    productsInSitemapNotReachedByCrawl: orphanedSitemapProducts.length,
    productsReachedByCrawlNotInSitemap: crawledNotInSitemap.length,
    orphanedSitemapProductUrls: orphanedSitemapProducts,
    crawledNotInSitemapUrls: crawledNotInSitemap,
  };

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUTPUT_DIR, 'categories.json'), JSON.stringify(categories, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'products.json'), JSON.stringify(products, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'others.json'), JSON.stringify(others, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));

  writeCsv(
    path.join(OUTPUT_DIR, 'categories.csv'),
    ['url', 'title', 'depth', 'linkedFrom', 'productCount'],
    categories.map((c) => [c.url, c.title, c.depth, c.linkedFrom.join(' | '), c.productLinks.length])
  );
  writeCsv(
    path.join(OUTPUT_DIR, 'products.csv'),
    ['url', 'title', 'depth', 'inSitemap', 'linkedFrom'],
    products.map((p) => [p.url, p.title, p.depth, p.inSitemap, p.linkedFrom.join(' | ')])
  );

  console.log('\n=== Summary ===');
  console.log(JSON.stringify(summary, (k, v) => (Array.isArray(v) && v.length > 10 ? `[${v.length} items]` : v), 2));
  console.log(`\nOutput written to ${OUTPUT_DIR}`);
}

function csvEscape(val) {
  const s = String(val ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function writeCsv(filePath, headers, rows) {
  const lines = [headers.join(',')];
  for (const row of rows) lines.push(row.map(csvEscape).join(','));
  fs.writeFileSync(filePath, lines.join('\n'));
}

main().catch((err) => {
  console.error('Crawler failed:', err);
  process.exit(1);
});
