# Bảng Tra Cứu Từ Khóa & Thông Tin Quan Trọng Theo Chủ Đề

Bảng hướng dẫn Agent chọn từ khóa khi gọi `find_posts` và các thông tin quan trọng cần trích xuất khi tóm tắt bài viết cho người dùng.

| Chủ đề | Từ khóa tìm kiếm gợi ý (`find_posts`) | Thông tin quan trọng cần trích xuất |
| :--- | :--- | :--- |
| **Điểm rèn luyện & Hoạt động phong trào**<br>*(ĐRL, CTXH, Tình nguyện, Workshop, Cuộc thi, Ngày hội, Thể thao)* | `điểm rèn luyện`, `ĐRL`, `rèn luyện`, `cộng điểm`, `điểm cộng`, `minh chứng`, `điểm ngoại khóa`, `công tác xã hội`, `CTXH`, `tình nguyện`, `thiện nguyện`, `mùa hè xanh`, `tiếp sức mùa thi`, `hiến máu`, `chủ nhật xanh`, `quyên góp`, `workshop`, `hội thảo`, `tọa đàm`, `seminar`, `talkshow`, `tập huấn`, `chuyên đề`, `kỹ năng mềm`, `cuộc thi`, `hội thi`, `tranh tài`, `contest`, `competition`, `ngày hội`, `festival`, `ngoại khóa`, `hoạt động phong trào`, `teambuilding`, `giải chạy`, `marathon`, `hội thao`, `thể thao`, `mở đơn`, `đăng ký`, `tham gia` | • Tên hoạt động & hình thức (Offline/Online, thời gian, địa điểm)<br>• Quyền lợi (ĐRL, CTXH, chứng nhận, giải thưởng)<br>• Điều kiện tham gia & cách ghi nhận điểm<br>• Link đăng ký / nộp bài / minh chứng<br>• Hạn chót (Deadline) |
| **Học vụ & Đào tạo** | `học phí`, `học bổng`, `đăng ký học phần`, `tốt nghiệp`, `đồ án`, `khóa luận`, `tín chỉ`, `lịch thi`, `điểm thi`, `tiếng Anh`, `chuẩn đầu ra` | • Nội dung quy định / thông báo & đối tượng liên quan<br>• Thời hạn & các mốc cần lưu ý<br>• Link hướng dẫn / biểu mẫu thực hiện |
| **Tuyển dụng & Cơ hội nghề nghiệp** | `tuyển dụng`, `tuyển CTV`, `cộng tác viên`, `thực tập`, `internship`, `career fair`, `việc làm`, `hướng nghiệp`, `mở đơn` | • Vị trí tuyển dụng, đơn vị & quyền lợi<br>• Yêu cầu, hạn nộp hồ sơ & link nộp CV |
| **Toàn bộ bài viết** | `[]` *(mảng rỗng)* | • Tóm tắt nội dung chính (1–2 câu)<br>• Thời gian quan trọng & Link bài viết gốc |

---

## Quy Tắc Cho Agent

### 1. Chiến lược tìm kiếm & Tùy biến từ khóa
- **Từ khóa trong bảng chỉ là gợi ý cơ bản**: Không cứng nhắc rập khuôn. Ưu tiên mở rộng, bổ sung hoặc tùy chỉnh từ khóa theo sát yêu cầu cụ thể của người dùng để lọc chính xác và đầy đủ nhất:
  - *Ví dụ 1*: User hỏi *"Có hoạt động nào online cộng điểm học thuật không?"* $\rightarrow$ Chủ động kết hợp mở rộng các từ khóa: `học thuật`, `workshop`, `tọa đàm`, `seminar`, `online`, `trực tuyến`, `zoom`, `meet`, `teams`...
  - *Ví dụ 2*: User hỏi *"Cuộc thi tiếng Anh nào đang mở đơn?"* $\rightarrow$ Bổ sung thêm các từ: `tiếng anh`, `english`, `ielts`, `toeic`, `mở đơn`, `cuộc thi`...
  - *Ví dụ 3*: User hỏi về *"hoạt động cuối tuần"* $\rightarrow$ Thêm `thứ 7`, `chủ nhật`, `cuối tuần`, `weekend`...
- **Chủ đề nằm trong bảng**: Lấy nhóm từ khóa tương ứng làm khung ban đầu, sau đó chọn lọc hoặc bổ sung thêm từ khóa theo ý hỏi của user.
- **Chủ đề không nằm trong bảng**: Tự sinh 5–10 từ khóa liên quan (bao gồm từ viết tắt, tiếng Việt có dấu/không dấu, tiếng Anh).
- Có thể gọi `find_posts` nhiều lần với các nhóm từ khóa khác nhau nếu câu hỏi đa chiều.
- Không tìm kiếm lại những từ khóa đã tìm nếu kết quả trước đó đã bao phủ chúng.

### 2. Chiến lược trích xuất thông tin
Chỉ tập trung trích xuất các **thông tin quan trọng nhất mà người đọc cần quan tâm**, tránh lan man chi tiết thừa:
1. **Tên hoạt động & hình thức** (Online/Offline, thời gian, địa điểm).
2. **Quyền lợi** (số điểm ĐRL, ngày CTXH, giải thưởng).
3. **Điều kiện tham gia / ghi nhận** (làm quiz, điểm danh, nộp minh chứng...).
4. **Link đăng ký / nộp bài** (ưu tiên hàng đầu).
5. **Hạn chót (Deadline)** nếu có.
6. Nếu bài viết không đề cập, ghi rõ *"Không đề cập"*, tuyệt đối không tự suy đoán.

### 3. Những trường thông tin nên chuẩn hóa
Khi tổng hợp thông tin chi tiết (bảng tóm tắt hoặc file artifact), Agent tuân theo cấu trúc sau:

| Trường | Ý nghĩa |
| :--- | :--- |
| `title` | Tên hoạt động / thông báo |
| `category` | Chủ đề phân loại (ĐRL, CTXH, Workshop, Cuộc thi, Tuyển dụng, Học vụ...) |
| `summary` | Tóm tắt ngắn gọn 1-2 câu về nội dung chính |
| `target_audience` | Đối tượng tham gia |
| `time` | Thời gian diễn ra |
| `location` | Địa điểm (Offline hoặc Online) |
| `benefits` | Quyền lợi (ĐRL, CTXH, giải thưởng...) |
| `requirements` | Điều kiện tham gia / ghi nhận |
| `deadline` | Hạn chót đăng ký hoặc hoàn thành |
| `registration_url` | Link đăng ký / nộp bài / nộp CV |
| `source_url` | Link bài viết gốc |
