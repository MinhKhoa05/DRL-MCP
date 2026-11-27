---
name: fb-drl-tracker
description: >-
  Theo dõi, cào bài viết và tra cứu các hoạt động cộng Điểm Rèn Luyện (ĐRL) từ các trang Facebook theo dõi.
---

# Facebook ĐRL Tracker (Theo Dõi Điểm Rèn Luyện)

Trợ lý thông minh theo dõi, trích xuất và tra cứu các bài viết, sự kiện, hoạt động trực tuyến có cộng Điểm Rèn Luyện (ĐRL) cho sinh viên từ hệ thống các trang theo dõi (`data/pages.json`).

---

## 1. Cơ Chế Lưu Trữ Dữ Liệu (2 Lớp Lọc)

- `data/posts.jsonl`: Lưu toàn bộ bài viết cào được từ các trang (kể cả bài truyền thông, chúc mừng, recap...).
- `data/drl_posts.jsonl`: **Database riêng chỉ chứa bài viết liên quan Điểm Rèn Luyện (ĐRL)**. Tự động lọc sạch rác ngay khi cào bài mới qua bộ lọc kép (`RECOGNIZE_BENEFIT` + `RECOGNIZE_EVENT`).

---

## 2. Các Công Cụ (Tools)

- `find_posts({ keywords, after, before, allPosts })`: Tìm kiếm và lọc bài viết.
  - **Mặc định**: Tự động tra cứu trong `data/drl_posts.jsonl` (bài đã lọc ĐRL).
  - `allPosts: true`: Khi muốn tra cứu trong toàn bộ bài viết gốc `data/posts.jsonl`.
  - Bỏ trống `keywords` hoặc truyền `[]` để lấy tất cả bài trong file.
- `crawl_posts({ after, before })`: Cào bài viết mới từ tất cả các trang theo dõi (`data/pages.json`). Hệ thống tự động load danh sách trang, ghi bài mới vào `data/posts.jsonl` và tự động trích lọc bài ĐRL vào `data/drl_posts.jsonl`.
- `clean_posts({ before })`: Dọn dẹp bài viết cũ có ngày tạo trước ngày `before` (YYYY-MM-DD) trên cả 2 file.
- **Quản lý danh sách trang:** Agent có thể trực tiếp đọc hoặc chỉnh sửa danh sách theo dõi tại `data/pages.json` khi người dùng yêu cầu thêm/xóa/xem các trang theo dõi.

---

## 3. Bảng Tra Cứu Từ Khóa Cốt Lõi (Keywords Lookup)

Khi người dùng hỏi về bất kỳ chủ đề nào, Agent sử dụng chùm từ khóa tiếng Việt chuẩn có dấu tương ứng dưới đây để truyền vào `find_posts({ keywords: [...] })` nhằm lọc dữ liệu trước:

| Nhóm chủ đề | Chùm từ khóa chuẩn có dấu (`keywords`) | Dấu hiệu đặc trưng tại TDTU |
| :--- | :--- | :--- |
| **Làm bài Online / Trắc nghiệm / Tìm hiểu** | `trực tuyến`, `tìm hiểu`, `trắc nghiệm`, `câu hỏi`, `google form`, `forms.gle`, `online`, `vòng loại` | **Bài trắc nghiệm trực tuyến nhận ĐRL:** Trả lời đạt số câu đúng (vd: 20/30 câu, 60/80 câu), thi tìm hiểu nghị quyết/luật/ngày lễ qua Google Form/QR. Phân biệt với khảo sát ý kiến (survey). |
| **Khảo sát ý kiến (Survey)** | `khảo sát`, `survey`, `bảng hỏi`, `ý kiến sinh viên` | Điền form khảo sát tâm lý, khảo sát đào tạo... Chỉ trả về khi user yêu cầu khảo sát, loại bỏ khi user chỉ cần bài trắc nghiệm. |
| **Học thuật / Workshop / Cuộc thi** | `học thuật`, `chuyên đề`, `tọa đàm`, `seminar`, `nghiên cứu`, `kiến thức`, `workshop`, `talkshow`, `kỹ năng`, `chia sẻ`, `hướng nghiệp`, `cuộc thi`, `hội thi`, `contest`, `competition` | **Nhóm phát triển học thuật & chuyên môn (ĐRL Điều 1):** Bao gồm hội thảo, báo cáo chuyên đề, tọa đàm hướng nghiệp/kỹ năng với doanh nghiệp, và các cuộc thi học thuật, sáng tạo có cơ cấu giải thưởng. |
| **Tình nguyện / CTXH** | `tình nguyện`, `chủ nhật xanh`, `thứ 7 xanh`, `vệ sinh`, `hiến máu` | Hoạt động vì môi trường, cộng đồng, vừa được cộng ĐRL (Điều 3) vừa được tính ngày CTXH. |
| **Văn nghệ / Thể thao** | `thể thao`, `hội thao`, `bóng đá`, `giải chạy`, `văn nghệ`, `cổ vũ` | Thi đấu hoặc tham gia cổ vũ các giải thể thao, showcase âm nhạc, đêm kịch. |

---

## 4. Chiến Lược Truy Vấn Của Agent (Toàn Diện & Không Giới Hạn)

Agent tuân theo nguyên tắc **lọc đúng điều kiện thì TRẢ VỀ TOÀN BỘ, TUYỆT ĐỐI KHÔNG TỰ Ý GIỚI HẠN SỐ LƯỢNG (không cắt tỉa 1-4 bài)**:

### 1. Nguyên Tắc Lọc và Trả Kết Quả Đầy Đủ
- **Dùng hàm gọi theo từ khóa để lọc trước:** Khi người dùng hỏi theo chủ đề, luôn gọi `find_posts({ keywords: [...] })` (tra cứu theo bảng ở Mục 3) để lọc trước toàn bộ các bài viết khớp chùm từ khóa liên quan từ database.
- **Đọc, phân tích và trả về ĐẦY ĐỦ 100%:** Sau khi lọc thô bằng từ khóa, Agent mới tiến hành đọc và phân tích ngữ cảnh toàn bộ danh sách bài thu được. Tuyệt đối **không tự ý giới hạn số lượng (không cắt tỉa 1-4 bài hay 5-15 bài "tiêu biểu")**, bài nào liên quan là phải trả về đầy đủ.
- **Tự động đối chiếu hạn chót (Deadline):** Sau khi phân tích, Agent đối chiếu thời hạn với thời gian hiện tại:
  - **Ưu tiên hiển thị danh sách bài CÒN HẠN** (hoặc hết hạn hôm nay) lên đầu tiên với đầy đủ link form, thời gian, điều kiện đạt ĐRL.
  - Phân loại rõ ràng các bài đã hết hạn để người dùng theo dõi đầy đủ bối cảnh, không tự ý giấu hay cắt bớt bài.

### 2. Xử Lý Khi Người Dùng Hỏi Về "Hoạt Động Online / Điền Form / Trắc Nghiệm"
- Đây là dạng bài cực kỳ phổ biến tại TDTU, thường có tiêu đề: **"HOẠT ĐỘNG TRỰC TUYẾN"**, **"TÌM HIỂU KIẾN THỨC..."**, **"CUỘC THI TRỰC TUYẾN"** với yêu cầu trả lời câu hỏi trắc nghiệm qua Google Form (đạt vd: 21/30 câu đúng).
- **Phân biệt rõ ràng 2 dạng:**
  - **Dạng Trắc nghiệm kiến thức / Hoạt động trực tuyến:** Bài thi kiến thức, tìm hiểu nghị quyết/luật/ngày lễ bằng form trắc nghiệm.
  - **Dạng Khảo sát (Survey):** Bảng hỏi ý kiến, khảo sát sức khỏe tâm lý... (Lưu ý: Nếu người dùng yêu cầu bài trắc nghiệm/không lấy khảo sát, phải loại bỏ ngay các bài có từ khóa `khảo sát`, `survey`).

---

## 5. Trích Xuất Thông Tin & Trả Lời Chuẩn Hóa

Khi phản hồi cho người dùng, Agent cần tổng hợp thông tin mạch lạc, rõ ràng và trích xuất đầy đủ **6 thông tin cốt lõi** cho mỗi hoạt động:

1. **Tên hoạt động & Hình thức:** Ghi rõ tiêu đề và hình thức (Trực tuyến qua Google Form, Offline tại hội trường, Hybrid...).
2. **Đối tượng tham gia:** Nêu rõ dành cho toàn trường, riêng sinh viên của khoa, hay mở rộng cho các khoa khác.
3. **Quyền lợi ĐRL:** Ghi nhận theo Điều mấy, bao nhiêu điểm rèn luyện hoặc ngày CTXH theo quy chế hiện hành.
4. **Điều kiện ghi nhận:** Số câu trả lời đúng yêu cầu (vd: $\ge$ 21/30 câu), yêu cầu like/share bài viết, nộp sản phẩm...
5. **Thời gian & Hạn chót (Deadline):** Đối chiếu thời gian thực tế để gắn nhãn rõ ràng:
   - 🟢 **ĐANG DIỄN RA / CÒN HẠN** (hoặc 🟡 **HẾT HẠN HÔM NAY**).
   - 🔴 **ĐÃ KẾT THÚC / ĐÓNG FORM**.
6. **Đường dẫn (Links):** Cung cấp trực tiếp **Link Form đăng ký/làm bài** và **Link bài viết gốc trên Facebook** để sinh viên tiện thao tác.
