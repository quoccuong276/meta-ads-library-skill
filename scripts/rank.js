#!/usr/bin/env node
// Xếp hạng ad thắng. Điểm = số ngày chạy + 2 × số biến thể.
// Dùng: node scripts/rank.js <file.json> [--top 15]

const fs = require('fs');

const args = process.argv.slice(2);
const file = args.find((x) => !x.startsWith('--'));
const topIdx = args.indexOf('--top');
const TOP = topIdx >= 0 ? parseInt(args[topIdx + 1], 10) : 15;
if (!file) { console.error('Cách dùng: node scripts/rank.js <file.json> [--top 15]'); process.exit(1); }

const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const now = Date.now() / 1000;
const DAY = 86400;

// Gom các ad cùng collation_id (cùng 1 creative nhân bản) thành 1 nhóm
const groups = new Map();
for (const ad of data.ads || []) {
  const key = ad.collation_id || ad.ad_archive_id;
  const g = groups.get(key);
  if (!g) groups.set(key, { rep: ad, members: [ad] });
  else g.members.push(ad);
}

const rows = [...groups.values()].map(({ rep, members }) => {
  const starts = members.map((m) => m.start_date).filter(Boolean);
  const ends = members.map((m) => (m.is_active === false && m.end_date ? m.end_date : now));
  const start = starts.length ? Math.min(...starts) : null;
  const end = Math.max(...ends);
  const days = start ? Math.max(1, Math.round((end - start) / DAY)) : 0;
  const variants = Math.max(members.length, ...members.map((m) => m.collation_count || 1));
  const cta = (rep.cta_type || '').toUpperCase();
  const goal = /MESSAGE|MESSENGER|WHATSAPP|INSTAGRAM_MESSAGE/.test(cta)
    ? 'nhắn tin'
    : rep.link_url && !/facebook\.com|fb\.me|m\.me/.test(rep.link_url) ? 'website' : 'khác';
  return {
    score: days + 2 * variants,
    days,
    variants,
    start_date: start ? new Date(start * 1000).toISOString().slice(0, 10) : null,
    is_active: rep.is_active,
    page_name: rep.page_name,
    page_id: rep.page_id,
    format: rep.format,
    cta_text: rep.cta_text,
    cta_type: rep.cta_type,
    goal,
    link_url: rep.link_url,
    title: rep.title,
    body: rep.body,
    cards: rep.cards,
    ad_archive_id: rep.ad_archive_id,
    ad_url: rep.ad_url,
  };
}).sort((a, b) => b.score - a.score);

const top = rows.slice(0, TOP);

// Thống kê nhanh để Claude tổng hợp pattern
const count = (arr) => arr.reduce((m, k) => ((m[k || '(trống)'] = (m[k || '(trống)'] || 0) + 1), m), {});
const summary = {
  total_ads: (data.ads || []).length,
  unique_creatives: rows.length,
  pages: Object.entries(count(rows.map((r) => r.page_name))).sort((a, b) => b[1] - a[1]).slice(0, 10),
  formats: count(rows.map((r) => r.format)),
  goals: count(rows.map((r) => r.goal)),
  cta: count(rows.map((r) => r.cta_text)),
};

const base = file.replace(/\.json$/, '');
fs.writeFileSync(`${base}-ranked.json`, JSON.stringify({ query: data.query, summary, top }, null, 2));

const esc = (s) => String(s || '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
const short = (s, n = 90) => { const t = esc(s); return t.length > n ? t.slice(0, n) + '…' : t; };
const md = [
  `# Top ${top.length} ad thắng — ${data.query?.q || 'Page ' + data.query?.page_id} (${data.query?.country})`,
  '',
  `Tổng ${summary.total_ads} ads, ${summary.unique_creatives} creative khác nhau. Điểm = ngày chạy + 2 × biến thể.`,
  '',
  '| # | Điểm | Page | Ngày | Biến thể | Format | CTA | Mục tiêu | Câu mở đầu | Link |',
  '|---|---|---|---|---|---|---|---|---|---|',
  ...top.map((r, i) => `| ${i + 1} | ${r.score} | ${esc(r.page_name)} | ${r.days} | ${r.variants} | ${r.format} | ${esc(r.cta_text)} | ${r.goal} | ${short((r.body || r.title).split('\n')[0])} | [xem](${r.ad_url}) |`),
  '',
  `**Format:** ${JSON.stringify(summary.formats)}  `,
  `**Mục tiêu:** ${JSON.stringify(summary.goals)}`,
].join('\n');
fs.writeFileSync(`${base}-ranked.md`, md);

console.log(md);
console.error(`\n✓ ${base}-ranked.json\n✓ ${base}-ranked.md`);
