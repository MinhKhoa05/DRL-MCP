---
name: fb-page-monitor
description: >-
  Hỗ trợ theo dõi, cập nhật thông tin và tra cứu bài viết từ các trang Facebook mà bạn theo dõi.
---

# Facebook Page Monitor

Trợ lý thông minh theo dõi tin tức và tra cứu bài viết từ toàn bộ các trang Facebook trong hệ thống (`D:\DRL-MCP\data\pages.json`).

---

## 1. Các Công Cụ (Tools)

- `find_posts({ keywords, after, before })`: Tìm kiếm trong các bài viết đã lưu. Lọc theo từ khóa và ngày. Bỏ trống `keywords` hoặc truyền `[]` để lấy tất cả bài viết. Trả về bài viết và `lastScrapedAt` của hệ thống.
- `crawl_posts({ after, before })`: Cào bài viết mới từ tất cả các trang. Nếu không truyền `after`, mặc định cào 15 ngày gần nhất.
- `clean_posts({ before })`: Dọn dẹp bài viết cũ có ngày tạo trước ngày `before` (YYYY-MM-DD).
- `list_pages()`: Xem danh sách các trang đang theo dõi.
- `add_pages({ pages: [{ url, name }] })`: Thêm một hoặc nhiều trang mới vào hệ thống theo dõi.
- `remove_pages({ targets: ["url_hoặc_tên"] })`: Xóa một hoặc nhiều trang khỏi danh sách theo dõi bằng URL hoặc tên.

---

## 2. Quy Trình Xử Lý Chuẩn (Workflow)

### Bước 1: Tra cứu & Tùy biến từ khóa
- Mở bảng tra cứu tại [Bảng Tra Cứu Từ Khóa & Thông Tin Cần Tóm Tắt](./references/keywords.md).
- **Chiến lược tìm kiếm & Tùy biến từ khóa:**
  - **Từ khóa trong bảng chỉ là khung gợi ý**: Luôn chủ động bổ sung, mở rộng hoặc tinh chỉnh từ khóa theo sát yêu cầu của user để lọc chính xác và đầy đủ nhất.
  - *Ví dụ*: User hỏi hoạt động *online điểm học thuật* $\rightarrow$ Kết hợp thêm: `học thuật`, `workshop`, `online`, `trực tuyến`, `zoom`, `meet`...
  - *Ví dụ*: User hỏi cuộc thi *tiếng Anh* $\rightarrow$ Thêm `tiếng anh`, `english`, `ielts`, `toeic`...
  - **Điểm rèn luyện & Hoạt động sinh viên**: Sử dụng nhóm tổng hợp **Điểm rèn luyện & Hoạt động phong trào** (đã bao quát ĐRL, CTXH, workshop, cuộc thi, ngày hội, thể thao...).
  - **Học vụ / Tuyển dụng / Chủ đề khác**: Lấy nhóm tương ứng hoặc tự sinh 5–10 từ khóa liên quan.
  - **Xem toàn bộ bài mới**: Để mảng rỗng `keywords: []`.

### Bước 2: Tìm bài trong dữ liệu đã lưu (`find_posts`)
- Gọi `find_posts({ keywords, after?, before? })`.
- Kiểm tra danh sách bài viết và thời điểm cào gần nhất `lastScrapedAt`.

### Bước 3: Cào bổ sung bài mới (Chỉ khi cần thiết)
Chỉ gọi `crawl_posts` khi:
1. `find_posts` trả về 0 bài, hoặc user yêu cầu rõ *"cập nhật lại / cào bài mới"*.
2. Lần cào gần nhất `lastScrapedAt` đã cũ (> 30 - 60 phút).
- Khi gọi `crawl_posts`:
  - Thông thường: chỉ cần gọi `crawl_posts({})` (hệ thống tự lấy 15 ngày gần nhất).
  - Hoặc truyền `after: "YYYY-MM-DD"` nếu cần cào từ một ngày chỉ định.
- Cào xong, gọi lại `find_posts` với từ khóa để lấy kết quả mới nhất.

### Bước 4: Trích xuất thông tin và trả lời
- **Chiến lược trích xuất thông tin:**
  - Tập trung vào các **thông tin quan trọng nhất mà người đọc cần**: Tên hoạt động & hình thức $\rightarrow$ Quyền lợi $\rightarrow$ Điều kiện tham gia/ghi nhận $\rightarrow$ Link đăng ký $\rightarrow$ Hạn chót.
  - Nếu không có thông tin, ghi *"Không đề cập"*, tuyệt đối không tự suy đoán.
- **Trường thông tin chuẩn hóa khi tổng hợp:**
  - `title`: Tên hoạt động / thông báo
  - `category`: Chủ đề phân loại
  - `summary`: Nội dung chính (1–2 câu)
  - `target_audience`: Đối tượng tham gia
  - `time`: Thời gian diễn ra
  - `location`: Địa điểm (Offline hoặc Online)
  - `benefits`: Quyền lợi, ĐRL, CTXH
  - `requirements`: Điều kiện tham gia / ghi nhận
  - `deadline`: Hạn chót
  - `registration_url`: Link đăng ký / nộp CV
  - `source_url`: Link bài viết gốc
- Nếu nhiều bài (> 15-20 bài): xuất file artifact markdown có cấu trúc rõ ràng.
- Nếu ít bài (< 15 bài): trả lời trực tiếp trong chat theo cấu trúc chuẩn hóa.
