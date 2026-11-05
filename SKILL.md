---
name: meta-ads-library
description: Soi ads đối thủ trên Facebook/Meta Ad Library theo từ khóa hoặc Page ID, xếp hạng ad thắng, phân tích Hook/Offer/CTA, tổng hợp pattern và đề xuất góc test mới. Dùng khi người dùng muốn nghiên cứu quảng cáo đối thủ, tìm ý tưởng creative, hoặc nhắc tới Ad Library / thư viện quảng cáo.
---

# Meta Ads Library – soi ads đối thủ

Không cần đăng nhập Facebook, không cần API token. Script mở trình duyệt headless,
vào trang Ad Library công khai và tự bắt dữ liệu ads từ request mạng.

## Cài đặt (chỉ lần đầu)

```bash
cd <thư-mục-skill>
npm install
npx playwright install chromium
```

## Quy trình

### 1. Hỏi rõ đầu vào (nếu người dùng chưa nói)
- Từ khóa (`--q "kem chống nắng"`) **hoặc** Page ID đối thủ (`--page-id 123456`)
- Quốc gia (mặc định `VN`), trạng thái (`active` | `inactive` | `all`, mặc định `active`)
- Loại media (`all` | `image` | `video`, mặc định `all`)
- Sản phẩm / client của người dùng là gì (để đề xuất góc test phù hợp)

### 2. Lấy ads
```bash
node scripts/scrape.js --q "kem chống nắng" --country VN --status active --media all --max 200
# hoặc
node scripts/scrape.js --page-id 123456789 --country VN
```
Kết quả lưu ở `_runtime/ad-library/<tên>-<ngày>.json`. Script in ra đường dẫn file.

Nếu ra 0 ads: thử lại với `--headful` để xem trang, đổi từ khóa ngắn hơn,
hoặc đổi `--status all`. Facebook đôi khi chặn tạm thời — đợi vài phút rồi chạy lại.

### 3. Xếp hạng ad thắng
```bash
node scripts/rank.js _runtime/ad-library/<file>.json --top 15
```
**Điểm = số ngày chạy + 2 × số biến thể.** Ad chạy lâu và được nhân bản nhiều
thường là ad đang ra tiền (không ai đốt tiền lâu vào ad lỗ).
Script xuất thêm file `*-ranked.md` và `*-ranked.json`.

### 4. Phân tích top ads (Claude tự làm)
Đọc file `*-ranked.json`, với mỗi ad trong top lập bảng:

| # | Page | Hook (câu/khung hình đầu) | Offer (giá, quà, freeship, combo) | Format (video/ảnh/carousel) | CTA | Mục tiêu (nhắn tin / website) | Ngày chạy | Biến thể |

- **Hook**: câu đầu tiên của nội dung / tiêu đề. Ghi rõ dạng hook: nỗi đau, kết quả, giá sốc, câu hỏi, so sánh, review/UGC, gây tò mò…
- **Offer**: trích con số cụ thể (giảm %, giá, mua 1 tặng 1, freeship…). Không có thì ghi "không có offer rõ".
- **Mục tiêu**: `cta_type` là MESSAGE_PAGE / SEND_MESSAGE / WHATSAPP → nhắn tin; có `link_url` website → chuyển đổi web.

### 5. Tổng hợp
1. **Pattern chung** giữa các đối thủ (hook lặp lại, mức offer phổ biến, format chiếm ưu thế, CTA phổ biến).
2. **Khoảng trống chưa ai khai thác** (góc hook, phân khúc khách, format, offer chưa ai dùng).
3. **Đề xuất 3 góc test** cho client — mỗi góc gồm: hook mẫu, offer, format, CTA, lý do (dựa trên dữ liệu nào).

Trả lời bằng tiếng Việt, ngắn gọn, có số liệu dẫn chứng. Kèm link ad
(`https://www.facebook.com/ads/library/?id=<ad_archive_id>`) cho từng ad top.
