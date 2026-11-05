# Meta Ads Library Skill

Soi ads đối thủ trên Thư viện quảng cáo Meta — không login, không API token.

## Cài
1. Cần Node.js 18+.
2. Chép thư mục này vào `~/.claude/skills/meta-ads-library/` (dùng cho mọi project)
   hoặc `<project>/.claude/skills/meta-ads-library/`.
3. Trong thư mục skill:
   ```bash
   npm install
   npx playwright install chromium
   ```

## Dùng
Mở Claude Code và nói: *"Soi ads đối thủ từ khóa 'váy công sở', client mình bán váy công sở giá 300k"*.
Claude sẽ tự chạy `scrape.js` → `rank.js` → phân tích Hook/Offer/CTA → đề xuất 3 góc test.

Chạy tay:
```bash
node scripts/scrape.js --q "váy công sở" --country VN --status active --max 200
node scripts/rank.js _runtime/ad-library/<file>.json --top 15
```

## Lưu ý
- Facebook đổi cấu trúc trang thường xuyên; nếu ra 0 ads, chạy `--headful` để xem.
- Không cuộn quá nhanh/quá nhiều để tránh bị chặn tạm thời.
- Chỉ đọc dữ liệu công khai; tuân thủ điều khoản sử dụng của Meta.
