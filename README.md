# DRL-MCP

DRL-MCP giúp việc tìm kiếm và tổng hợp thông tin hoạt động sinh viên từ nhiều trang Facebook trở nên thuận tiện hơn.

Thay vì phải tự mở từng trang Facebook, đọc các bài đăng để tìm hoạt động có ghi nhận **Điểm Rèn Luyện (ĐRL)** hay **Công tác Xã hội (CTXH)**, việc của bạn chỉ cần là mở AI Agent lên và nhắn: *"Tìm cho mình các bài điểm rèn luyện mới"*. Agent sẽ tự động thu thập bài viết mới nhất từ toàn bộ các trang đang theo dõi, phân tích và tổng hợp lại danh sách hoạt động cho bạn.

## 1. Tính năng chính

- **Thu thập bài viết:** Lấy bài đăng từ danh sách trang Facebook trong `data/pages.json` (hiện có gần 40 trang thường có hoạt động của TDTU đã được mình tổng hợp sẵn, bạn có thể tùy chỉnh hoặc bổ sung thêm nếu muốn).
- **Phân loại nội dung:** Lọc sơ bộ bài viết theo từ khóa liên quan đến ĐRL, CTXH và hoạt động sinh viên, sau đó lưu trữ riêng.
- **Tìm kiếm linh hoạt:** Hỗ trợ tìm kiếm theo từ khóa, trang Facebook, khoảng thời gian và các điều kiện khác. Chức năng tìm kiếm ĐRL đã được kiểm thử; các trường hợp tìm kiếm ngoài phạm vi này chưa được kiểm thử đầy đủ.
- **Trích xuất thông tin:** Rút gọn nội dung, ưu tiên thời gian, địa điểm, đối tượng, quyền lợi, hạn đăng ký và đường dẫn biểu mẫu.
- **Lưu trữ cục bộ:** Sử dụng JSONL để lưu và tra cứu bài viết.
- **AI Agent Skill:** Hướng dẫn Agent xác định từ khóa, lựa chọn công cụ và tổng hợp kết quả.

## 2. Cài đặt và cấu hình

### Cách 1: Thông qua AI Agent

Mở AI Agent tại một thư mục bất kỳ và yêu cầu:

> Cài đặt và cấu hình dự án DRL-MCP từ https://github.com/MinhKhoa05/DRL-MCP.git để sử dụng MCP Server và Skill.

Agent sẽ thực hiện các bước cần thiết để tải dự án, cài đặt và cấu hình MCP Server theo môi trường đang sử dụng. Cần cấp quyền truy cập Terminal và xác nhận các thao tác khi được yêu cầu.

### Cách 2: Thủ công

Clone dự án:

```bash
git clone https://github.com/MinhKhoa05/DRL-MCP.git
cd DRL-MCP
```

**Yêu cầu:**
- Node.js >= 22.6
- Python 3

Chạy script cài đặt (tự động kiểm tra và cài Node.js, Python, Git, `npm packages` và `fbgql` nếu thiếu):

| Hệ điều hành | Lệnh |
|---|---|
| Windows | `setup.bat` |
| macOS / Linux | `./setup.sh` |

### Cấu hình MCP

Thay `/absolute/path/to/DRL-MCP` bằng đường dẫn tuyệt đối đến thư mục dự án.

**Antigravity** (`~/.gemini/config/mcp_config.json`)

```json
{
  "mcpServers": {
    "drl-mcp": {
      "command": "node",
      "args": ["--experimental-strip-types", "src/server.ts"],
      "cwd": "/absolute/path/to/DRL-MCP",
      "env": { "PYTHON_PATH": "python" }
    }
  }
}
```

**Claude Desktop / Cursor** (`claude_desktop_config.json` / `.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "drl-mcp": {
      "command": "node",
      "args": ["--experimental-strip-types", "src/server.ts"],
      "cwd": "/absolute/path/to/DRL-MCP"
    }
  }
}
```

**GitHub Copilot / VS Code** (`.vscode/mcp.json`)

```json
{
  "servers": {
    "drl-mcp": {
      "type": "stdio",
      "command": "node",
      "args": ["--experimental-strip-types", "src/server.ts"],
      "cwd": "/absolute/path/to/DRL-MCP"
    }
  }
}
```

Sau khi cấu hình, khởi động lại MCP Client để kết nối.

> **Lưu ý:** Dự án đã được kiểm thử trên Antigravity. Các AI Agent và MCP Client khác có thể cần điều chỉnh thêm cấu hình tùy theo môi trường sử dụng.

## 3. AI Agent Skill

Skill `drl-search` hướng dẫn AI Agent sử dụng MCP Tools để tìm kiếm hoạt động ĐRL và CTXH.

Các nhiệm vụ chính:

- Phân tích yêu cầu và xác định chủ đề tìm kiếm.
- Lựa chọn, kết hợp từ khóa theo từng nhóm hoạt động.
- Kiểm tra dữ liệu và quyết định thời điểm thu thập.
- Tùy chỉnh điều kiện tìm kiếm và trích xuất bằng `compact`.
- Kiểm tra thời hạn và tổng hợp kết quả bằng tiếng Việt.

## 4. Ví dụ sử dụng

| Yêu cầu | Mục đích |
|---|---|
| "Hôm nay có bài điểm rèn luyện nào mới không?" | Tìm hoạt động ĐRL mới |
| "Tìm các bài làm form trắc nghiệm online lấy ĐRL còn hạn." | Tìm hoạt động có biểu mẫu đăng ký |
| "Tuần này có hoạt động tình nguyện, Chủ Nhật Xanh hoặc hiến máu nào không?" | Tìm hoạt động CTXH |
| "Tìm các workshop hoặc tọa đàm của Khoa CNTT từ đầu tháng đến nay." | Tìm theo chủ đề và thời gian |
| "Tìm thông báo học bổng trong toàn bộ bài đã thu thập." | Tìm kiếm ngoài phạm vi ĐRL |

> **Lưu ý:** Việc tìm kiếm ngoài phạm vi Điểm Rèn Luyện (qua `find_all_posts`) chưa được kiểm chứng đầy đủ, có thể tốn nhiều token hơn và cần kiểm tra lại kỹ nội dung bài viết gốc.

## 5. MCP Tools

| Tool | Chức năng | Tham số chính |
|---|---|---|
| `get_crawl_meta` | Kiểm tra thời điểm thu thập và trạng thái dữ liệu. | Không có |
| `crawl_posts` | Thu thập bài viết từ danh sách trang Facebook. | `after`, `before` |
| `find_drl_posts` | Tìm kiếm trong tập bài viết đã lọc theo chủ đề ĐRL. | `after`, `before`, `keywords`, `page`, `hasForm`, `compact`, `compactKeywords`, `limit` |
| `find_all_posts` | Tìm kiếm trên toàn bộ bài viết đã thu thập. | Tương tự `find_drl_posts` |
| `clean_posts` | Xóa các bài viết cũ trước ngày chỉ định. | `before` |

**Lưu ý:** `crawl_posts` mặc định thu thập các bài đăng trong 7 ngày gần nhất.

## 6. Cấu trúc thư mục

```text
DRL-MCP/
├── .agents/
│   └── skills/
│       └── drl-search/
│           └── SKILL.md      # Bộ hướng dẫn (Skill) quy trình tìm kiếm ĐRL cho AI Agent
├── data/
│   ├── pages.json            # Danh sách các trang Facebook đang theo dõi
│   ├── posts.jsonl           # Toàn bộ bài viết gốc đã cào về
│   ├── drl_posts.jsonl       # Các bài viết đã qua bộ lọc từ khóa ĐRL / CTXH
│   └── crawl_meta.json       # Lưu thời điểm và thống kê của lần cào gần nhất
├── src/
│   ├── crawler.ts            # Gọi thư viện fbgql cào bài đa luồng và lưu dữ liệu
│   ├── filter.ts             # Chuẩn hóa tiếng Việt không dấu, tách link và lọc bài ĐRL
│   ├── search.ts             # Tìm kiếm theo từ khóa và rút gọn nội dung (compact)
│   ├── server.ts             # Khởi tạo MCP Server và đăng ký 5 công cụ (Tools)
│   └── storage.ts            # Đọc/ghi các tệp dữ liệu JSON và JSONL
├── setup.bat                 # Script tự động cài đặt môi trường trên Windows
├── setup.sh                  # Script tự động cài đặt môi trường trên macOS / Linux
├── package.json              # Khai báo thông tin dự án và thư viện Node.js
├── tsconfig.json             # Cấu hình TypeScript
├── README.md                 # Tài liệu hướng dẫn sử dụng dự án
└── LICENSE                   # Giấy phép mã nguồn mở MIT
```

## 7. Hạn chế

- **Phụ thuộc vào Facebook và `fbgql`:** Việc thu thập có thể bị ảnh hưởng khi Facebook thay đổi GraphQL, giới hạn truy cập hoặc yêu cầu đăng nhập. Hiện chỉ hỗ trợ trang Facebook công khai, không hỗ trợ Group kín.
- **Phân loại theo từ khóa:** Có thể bỏ sót bài viết có thông tin nằm trong hình ảnh, bình luận hoặc cách diễn đạt chưa có trong bộ từ khóa. Cần điều chỉnh thêm
- **Không đọc nội dung Google Form:** Chỉ trích xuất đường dẫn từ bài đăng, không kiểm tra trạng thái mở/đóng hoặc nội dung biểu mẫu.
- **Giới hạn của `compact`:** Có thể lược bỏ thông tin quan trọng không khớp với từ khóa trích xuất. Cần điều chỉnh thêm.

## License

[MIT](LICENSE)