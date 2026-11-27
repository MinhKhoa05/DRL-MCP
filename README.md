# Facebook Page Monitor (DRL-MCP)

MCP Server theo dõi, cào và tra cứu bài viết từ các Fanpage Facebook (hiện cấu hình 36 trang TDTU trong `data/pages.json`).

---

## 🛠️ Công Cụ (Tools)

- `find_posts({ after, before, page, keywords })`: Lọc bài viết đã lưu theo ngày, page và từ khóa. Bỏ trống `keywords` để lấy tất cả.
- `crawl_posts({ after, before, urls })`: Cào bài viết mới từ ngày `after`. Truyền `urls` để cào trang cụ thể, bỏ trống để cào toàn bộ.
- `list_pages()`: Xem danh sách các trang đang theo dõi kèm `lastScrapedAt`.
- `add_page({ url, name })`: Thêm trang mới vào `data/pages.json`.
- `remove_page({ target })`: Xóa trang khỏi danh sách theo dõi.
- `clean_posts({ before })`: Dọn dẹp bài viết cũ có ngày tạo trước ngày `before` (YYYY-MM-DD).

---

## 📁 Cấu Trúc Dữ Liệu

- `data/pages.json`: Danh sách trang theo dõi và mốc thời gian cào lần cuối (`lastScrapedAt`).
- `data/posts.jsonl`: Toàn bộ nội dung bài viết đã cào (mỗi dòng 1 bài dạng JSON).

---

## 🚀 Cài Đặt & Chạy

```bash
npm install
npm start
```

Yêu cầu: Node.js 22.6+ và Python có cài `fbgql` (`pip install fbgql`).
