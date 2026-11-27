# Facebook Page Monitor (DRL-MCP)

MCP server (stdio) theo dõi, cào và tự động tổng hợp bài viết từ các Fanpage Facebook (mặc định sẵn 36 trang TDTU). Cho phép trợ lý AI hỗ trợ sinh viên săn **Điểm Rèn Luyện (ĐRL)**, ngày **Công Tác Xã Hội (CTXH)**, workshop, webinar, cuộc thi và tin tức học vụ.

---

## Tính năng

- **Tra cứu:** `find_posts` — tìm bài viết đã lưu theo từ khóa (ĐRL, CTXH, workshop...) và khoảng thời gian (`after`, `before`).
- **Cào dữ liệu:** `crawl_posts` — cào bài viết mới từ Facebook (tự động cập nhật `lastScrapedAt` tránh cào trùng).
- **Quản lý trang:** `list_pages`, `add_pages`, `remove_pages` — xem, thêm hoặc xóa Fanpage cần theo dõi.
- **Bảo trì:** `clean_posts` — dọn dẹp các bài viết cũ trước một mốc thời gian để tối ưu dung lượng.
- **AI Skill thông minh:** `.agents/skills/fb-page-monitor` — tự động phân loại, trích xuất quyền lợi, thời gian, hình thức và link đăng ký.

---

## Yêu cầu

- **Node.js** `>= 22.6` (chạy trực tiếp TypeScript bằng `--experimental-strip-types`, không cần bước build).
- **Python 3.x** có cài thư viện `fbgql` (`pip install fbgql`).

---

## Cài đặt

### Cách 1: Để Agent tự cài (Khuyên dùng)
Gửi prompt sau cho AI Agent của bạn:

```text
Hãy cài đặt DRL-MCP giúp tôi:
1. Clone repo https://github.com/MinhKhoa05/DRL-MCP.git vào thư mục hiện tại.
2. Chạy `npm install` và `pip install fbgql`.
3. Thêm MCP server tên "drl-mcp" vào file cấu hình MCP của bạn (command: "node", args: ["--experimental-strip-types", "src/server.ts"], cwd trỏ tới thư mục DRL-MCP).
4. Nhắc tôi Reload Agent sau khi hoàn tất.
```

### Cách 2: Cài đặt thủ công
```bash
git clone https://github.com/MinhKhoa05/DRL-MCP.git
cd DRL-MCP
npm install
pip install fbgql
```

---

## Kết nối với AI client

Tất cả client đều cấu hình chạy lệnh: `node --experimental-strip-types src/server.ts` tại thư mục của dự án. Thay `/ABS/PATH/TO/DRL-MCP` bằng đường dẫn thực tế trên máy bạn.

### Antigravity / Claude Desktop / Cursor
Thêm vào file cấu hình MCP (`mcp_config.json` hoặc cấu hình MCP tương ứng của client):

```json
{
  "mcpServers": {
    "drl-mcp": {
      "command": "node",
      "args": ["--experimental-strip-types", "src/server.ts"],
      "cwd": "/ABS/PATH/TO/DRL-MCP"
    }
  }
}
```

### VS Code
Thêm vào `.vscode/mcp.json`:

```json
{
  "servers": {
    "drl-mcp": {
      "type": "stdio",
      "command": "node",
      "args": ["--experimental-strip-types", "src/server.ts"],
      "cwd": "/ABS/PATH/TO/DRL-MCP"
    }
  }
}
```

> **Lưu ý:** Sau khi lưu cấu hình, khởi động lại (Reload / Restart) AI client để nhận danh sách tool và skill.

---

## Cách dùng nhanh

Vài prompt gợi ý sau khi kết nối MCP:

- *"Tìm các hoạt động có cộng điểm rèn luyện (ĐRL) mới nhất trong 7 ngày qua. Tóm tắt rõ thời gian, quyền lợi và link đăng ký."*
- *"Tổng hợp các sự kiện, hoạt động diễn ra từ ngày 15/11/2026 đến nay."*
- *"Cào và cập nhật các bài viết mới nhất hôm nay từ tất cả các trang, lọc ra những tin nổi bật."*
- *"Có workshop, tọa đàm hoặc webinar online nào sắp diễn ra không?"*
- *"Xem danh sách các fanpage đang theo dõi và thêm trang https://www.facebook.com/it.tdtu vào hệ thống."*

---

## Danh sách tool

| Tool | Mô tả |
| :--- | :--- |
| `find_posts` | Tìm kiếm bài viết đã lưu theo từ khóa (`keywords`) và ngày (`after`, `before`) |
| `crawl_posts` | Cào bài viết mới từ Facebook (mặc định lấy 15 ngày gần nhất nếu không chỉ định `after`) |
| `list_pages` | Liệt kê danh sách tất cả các Facebook page đang theo dõi kèm thời điểm cào gần nhất |
| `add_pages` | Thêm một hoặc nhiều page mới vào danh sách theo dõi |
| `remove_pages` | Xóa một hoặc nhiều page khỏi hệ thống theo URL hoặc tên |
| `clean_posts` | Xóa các bài viết cũ trước mốc ngày chỉ định (`before`) |

---

## Cấu trúc dự án

```text
DRL-MCP/
├── .agents/
│   └── skills/
│       └── fb-page-monitor/   # Skill AI tự động phân loại, trích xuất thông tin
├── data/
│   ├── pages.json             # Danh sách 36 Fanpage và lastScrapedAt
│   └── posts.jsonl            # Cơ sở dữ liệu bài viết (JSON Lines)
├── src/
│   ├── server.ts              # Entry point MCP server
│   ├── pages.ts               # Thao tác danh sách page
│   ├── posts.ts               # Tra cứu và lọc bài viết
│   └── scraper.py             # Script cào Facebook GraphQL (fbgql)
├── package.json
└── README.md
```
