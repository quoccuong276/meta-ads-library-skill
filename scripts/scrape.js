#!/usr/bin/env node
// Lấy ads từ Meta Ad Library công khai — không login, không API token.
// Cách làm: mở trang bằng Chromium headless, bắt response GraphQL + JSON nhúng trong HTML,
// tìm mọi object có "ad_archive_id", cuộn trang để tải thêm.

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

function parseArgs(argv) {
  const a = { country: 'VN', status: 'active', media: 'all', max: 200, scrolls: 30, headful: false };
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    const v = argv[i + 1];
    if (k === '--q') { a.q = v; i++; }
    else if (k === '--page-id') { a.pageId = v; i++; }
    else if (k === '--country') { a.country = v.toUpperCase(); i++; }
    else if (k === '--status') { a.status = v; i++; }
    else if (k === '--media') { a.media = v; i++; }
    else if (k === '--max') { a.max = parseInt(v, 10); i++; }
    else if (k === '--scrolls') { a.scrolls = parseInt(v, 10); i++; }
    else if (k === '--out') { a.out = v; i++; }
    else if (k === '--headful') { a.headful = true; }
  }
  if (!a.q && !a.pageId) {
    console.error('Cách dùng: node scripts/scrape.js --q "từ khóa" | --page-id <ID> [--country VN] [--status active|inactive|all] [--media all|image|video] [--max 200] [--headful]');
    process.exit(1);
  }
  return a;
}

function buildUrl(a) {
  const p = new URLSearchParams({
    active_status: a.status,
    ad_type: 'all',
    country: a.country,
    media_type: a.media,
  });
  if (a.pageId) {
    p.set('view_all_page_id', a.pageId);
    p.set('search_type', 'page');
  } else {
    p.set('q', a.q);
    p.set('search_type', 'keyword_unordered');
  }
  return `https://www.facebook.com/ads/library/?${p.toString()}`;
}

// Facebook trả nhiều dòng JSON, đôi khi có tiền tố "for (;;);"
function parseLooseJson(text) {
  const out = [];
  const cleaned = text.replace(/^for \(;;\);/, '');
  for (const line of cleaned.split('\n')) {
    const t = line.trim();
    if (!t || (t[0] !== '{' && t[0] !== '[')) continue;
    try { out.push(JSON.parse(t)); } catch (_) { /* bỏ qua */ }
  }
  return out;
}

function walk(node, found, depth = 0) {
  if (!node || typeof node !== 'object' || depth > 60) return;
  if (Array.isArray(node)) { for (const x of node) walk(x, found, depth + 1); return; }
  if (node.ad_archive_id && (node.snapshot || node.start_date)) found.push(node);
  for (const k of Object.keys(node)) walk(node[k], found, depth + 1);
}

const txt = (v) => (v && typeof v === 'object' ? v.text || '' : v || '');

function normalize(raw) {
  const s = raw.snapshot || {};
  const cards = Array.isArray(s.cards) ? s.cards : [];
  const videos = (s.videos || []).length + cards.filter((c) => c.video_hd_url || c.video_sd_url).length;
  const images = (s.images || []).length + cards.filter((c) => c.original_image_url || c.resized_image_url).length;
  let format = (s.display_format || '').toLowerCase();
  if (!format) format = cards.length > 1 ? 'carousel' : videos ? 'video' : images ? 'image' : 'unknown';

  return {
    ad_archive_id: String(raw.ad_archive_id),
    collation_id: raw.collation_id ? String(raw.collation_id) : null,
    collation_count: raw.collation_count || 1,
    page_id: String(raw.page_id || s.page_id || ''),
    page_name: raw.page_name || s.page_name || '',
    is_active: raw.is_active ?? null,
    start_date: raw.start_date || null, // unix seconds
    end_date: raw.end_date || null,
    platforms: raw.publisher_platform || [],
    body: txt(s.body) || (cards[0] && cards[0].body) || '',
    title: s.title || (cards[0] && cards[0].title) || '',
    caption: s.caption || '',
    link_description: s.link_description || '',
    cta_text: s.cta_text || (cards[0] && cards[0].cta_text) || '',
    cta_type: s.cta_type || (cards[0] && cards[0].cta_type) || '',
    link_url: s.link_url || (cards[0] && cards[0].link_url) || '',
    format,
    cards: cards.map((c) => ({ title: c.title || '', body: c.body || '', cta_text: c.cta_text || '', link_url: c.link_url || '' })),
    media_count: { images, videos },
    ad_url: `https://www.facebook.com/ads/library/?id=${raw.ad_archive_id}`,
  };
}

(async () => {
  const a = parseArgs(process.argv);
  const url = buildUrl(a);
  console.error(`→ Mở: ${url}`);

  const browser = await chromium.launch({ headless: !a.headful });
  const context = await browser.newContext({
    locale: 'vi-VN',
    viewport: { width: 1366, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();
  const ads = new Map();

  const ingest = (objs) => {
    const found = [];
    for (const o of objs) walk(o, found);
    for (const r of found) {
      const n = normalize(r);
      if (!ads.has(n.ad_archive_id)) ads.set(n.ad_archive_id, n);
    }
  };

  page.on('response', async (res) => {
    const u = res.url();
    if (!/\/api\/graphql|\/ads\/library\/async/.test(u)) return;
    try { ingest(parseLooseJson(await res.text())); } catch (_) { /* response đã đóng */ }
  });

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(4000);

  // Đóng banner cookie nếu có (chọn từ chối cookie không cần thiết)
  for (const label of ['Từ chối cookie không bắt buộc', 'Decline optional cookies', 'Only allow essential cookies']) {
    const btn = page.getByRole('button', { name: label });
    if (await btn.count().catch(() => 0)) { await btn.first().click().catch(() => {}); break; }
  }

  // Dữ liệu trang đầu thường nhúng trong <script type="application/json">
  const scripts = await page.$$eval('script[type="application/json"]', (els) =>
    els.map((e) => e.textContent).filter((t) => t && t.includes('ad_archive_id')));
  ingest(scripts.flatMap(parseLooseJson));

  let stale = 0;
  for (let i = 0; i < a.scrolls && ads.size < a.max; i++) {
    const before = ads.size;
    await page.mouse.wheel(0, 4000);
    await page.waitForTimeout(1800 + Math.random() * 1200);
    stale = ads.size === before ? stale + 1 : 0;
    console.error(`  cuộn ${i + 1}: ${ads.size} ads`);
    if (stale >= 4) break;
  }

  await browser.close();

  const list = [...ads.values()].slice(0, a.max);
  const slug = (a.pageId ? `page-${a.pageId}` : a.q)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const day = new Date().toISOString().slice(0, 10);
  const out = a.out || path.join('_runtime', 'ad-library', `${slug}-${a.country}-${day}.json`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify({
    query: { q: a.q || null, page_id: a.pageId || null, country: a.country, status: a.status, media: a.media },
    scraped_at: new Date().toISOString(),
    source_url: url,
    count: list.length,
    ads: list,
  }, null, 2));

  console.error(`✓ ${list.length} ads → ${out}`);
  console.log(out);
  if (!list.length) process.exitCode = 2;
})().catch((e) => { console.error('Lỗi:', e.message); process.exit(1); });
