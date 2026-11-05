# Meta Ads Library Skill — Soi ads đối thủ trên Facebook Ad Library

> Skill cho **Claude Code** / **Codex**: lấy ads đối thủ theo từ khóa hoặc Page ID, xếp hạng ad thắng, phân tích Hook/Offer/CTA và đề xuất góc test mới.
> **FREE** · Không cần login Facebook · Không cần API token (khỏi lỗi code 10).

---

## ✨ Tính năng

1. **Lấy ads đối thủ** theo từ khóa (`--q "kem chống nắng"`) hoặc Page ID (`--page-id`)
   - Lọc đang chạy / đã tắt (`--status`), ảnh / video (`--media`), quốc gia (`--country`)
   - Trình duyệt headless tự bắt request mạng của trang Ad Library công khai
2. **Xếp hạng ad thắng** — `Điểm = số ngày chạy + 2 × số biến thể`
   Ad chạy lâu và được nhân bản nhiều thường là ad đang ra tiền.
3. **AI phân tích top ads** theo bảng: Hook · Offer · Format · CTA · Mục tiêu · Ngày chạy · Biến thể
4. **Tổng hợp** pattern chung giữa các đối thủ, khoảng trống chưa ai khai thác, và **3 góc test** cho client.

## 📦 Cài đặt

Yêu cầu: [Node.js](https://nodejs.org) 18+ và Claude Code (hoặc Codex).

```bash
# Dùng cho mọi project
git clone https://github.com/quoccuong276/meta-ads-library-skill.git ~/.claude/skills/meta-ads-library

# Hoặc chỉ cho 1 project
git clone https://github.com/quoccuong276/meta-ads-library-skill.git .claude/skills/meta-ads-library

cd ~/.claude/skills/meta-ads-library
npm install
npx playwright install chromium
```

> **Codex:** chép thư mục vào `.agents/skills/meta-ads-library/` trong project và nhắc tới skill trong `AGENTS.md`.

## 🚀 Cách dùng

Mở Claude Code và nói tự nhiên:

```
Soi ads đối thủ từ khóa "váy công sở", client mình bán váy công sở giá 300k, chạy inbox
```

Claude sẽ tự: lấy ads → xếp hạng → phân tích → trả bảng + 3 góc test kèm link từng ad.

### Chạy tay

```bash
# Lấy ads theo từ khóa
node scripts/scrape.js --q "kem chống nắng" --country VN --status active --media all --max 200

# Hoặc theo Page ID đối thủ
node scripts/scrape.js --page-id 123456789 --country VN

# Xếp hạng
node scripts/rank.js _runtime/ad-library/<file>.json --top 15
```

| Tham số | Giá trị | Mặc định |
|---|---|---|
| `--q` | từ khóa tìm kiếm | — |
| `--page-id` | ID page đối thủ | — |
| `--country` | mã quốc gia (VN, US, TH…) | `VN` |
| `--status` | `active` \| `inactive` \| `all` | `active` |
| `--media` | `all` \| `image` \| `video` | `all` |
| `--max` | số ads tối đa | `200` |
| `--headful` | hiện trình duyệt để debug | tắt |

Kết quả lưu ở `_runtime/ad-library/`:
- `<tên>-<ngày>.json` — dữ liệu thô
- `<tên>-<ngày>-ranked.json` / `-ranked.md` — bảng xếp hạng + thống kê format, CTA, mục tiêu

## 🔎 Lấy Page ID đối thủ ở đâu?

Vào [Facebook Ad Library](https://www.facebook.com/ads/library/), tìm tên page → bấm vào page → trên URL có `view_all_page_id=<ID>`.

## ⚠️ Lưu ý

- **Không xem được ngân sách thật**: Meta chỉ công khai chi tiêu cho ads chính trị/xã hội. Dùng số ad active, số biến thể, thời gian chạy làm tín hiệu thay thế.
- Facebook đổi cấu trúc trang thường xuyên. Nếu ra **0 ads**: chạy `--headful` để xem trang, rút ngắn từ khóa, hoặc đổi `--status all`.
- Bị chặn tạm thời thì đợi vài phút rồi chạy lại. Đừng chạy liên tục số lượng lớn.
- Chỉ đọc dữ liệu công khai. Người dùng tự chịu trách nhiệm tuân thủ điều khoản của Meta.

## 📁 Cấu trúc

```
meta-ads-library/
├── SKILL.md          # Hướng dẫn cho AI agent
├── package.json
├── scripts/
│   ├── scrape.js     # Lấy ads từ Ad Library
│   └── rank.js       # Xếp hạng ad thắng
└── _runtime/         # Kết quả (bị git ignore)
```

## 📄 License

MIT — dùng, sửa, chia sẻ thoải mái.
