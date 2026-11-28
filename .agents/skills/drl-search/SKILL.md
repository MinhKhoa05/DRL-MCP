---
name: drl-search
description: Find posts about student activities earning Training Points (ĐRL) or Social Work days (CTXH). Checks freshness via get_crawl_meta, crawls if needed, searches by topic keywords, verifies results, and reports in Vietnamese.
---

# DRL Search

## Overview

Help students find ĐRL / CTXH activities using `drl-mcp` tools (`get_crawl_meta`, `crawl_posts`, `find_posts`).
**Always reply to the user in Vietnamese.**

## When to Use

- Finding activities earning ĐRL or CTXH days.
- Online quizzes, Google Forms, surveys, workshops, contests, volunteering, arts, sports.
- Filtering activities by date, deadline, or format (Online / Offline / Hybrid).

## Workflow

### Step 1 — Check freshness & crawl

1. Call `get_crawl_meta({})`.
2. Decide action (convert any user date to `YYYY-MM-DD`):

| Condition | Action |
|---|---|
| User specifies a date range or asks to refresh | `crawl_posts({ after: "<user_after>", before?: "<user_before>" })` (highest priority) |
| Meta is `null` (no data yet) | `crawl_posts({})` (defaults to 7 days) |
| `meta.isStale` is `true` (> 30 min old) | `crawl_posts({ after: meta.lastCrawlDate })` |
| `meta.isStale` is `false` (≤ 30 min) | Skip crawl |

### Step 2 — Select keywords & search

1. Match user intent to topic group(s) in [Keyword Lookup](#keyword-lookup) and pass the **entire keyword cluster** (use `keywords: []` for general requests).
2. Call `find_posts({ keywords, after?, before? })`.
   - If few results, broaden `keywords` (merge groups or use `[]`).
   - Only call `find_all_posts` if the user explicitly asks to search all raw crawled posts (including non-ĐRL).

### Step 3 — Verify & sort

Inspect every returned post:
1. **Filter:** Keep real activities matching the topic; drop news, result announcements, and duplicates. Separate knowledge quizzes from opinion surveys.
2. **Status:** Compare deadline with today → `🟢 Còn hạn` / `🟡 Hết hạn hôm nay` / `🔴 Đã hết hạn` / `⚪ Không rõ hạn`.
3. **Sort priority:**
   - 🟢 Bài viết **mới nhất** (ngày đăng gần nhất, còn hạn).
   - 🟡 **Hết hạn hôm nay** (cần nhắc gấp để kịp tham gia).
   - 🟢 Các bài **còn hạn** tiếp theo / ⚪ **Không rõ hạn**.
   - 🔴 **Đã hết hạn** (gom gọn cuối cùng hoặc tóm tắt ngắn).
4. Extract only facts explicitly stated in the post.

### Step 4 — Report (in Vietnamese)

**Header:**
Mở đầu bằng thông báo phạm vi dữ liệu:
> *"Dưới đây là các hoạt động ĐRL/CTXH được cập nhật trong 7 ngày gần nhất (từ ngày DD/MM/YYYY đến nay):"* (hoặc theo yêu cầu của user).

**Mỗi hoạt động trình bày gọn gàng (chỉ các thông tin cần thiết nhất):**
```markdown
### 🟢 <Tên hoạt động>
- **Tổ chức:** <Khoa / CLB / Page> | **Hình thức:** Online / Offline (địa điểm)
- **Đối tượng:** <Đối tượng tham gia>
- **Thời hạn / Diễn ra:** <Hạn chót đăng ký & ngày diễn ra>
- **Tóm tắt nội dung:** <1–2 câu tóm tắt nội dung chính và yêu cầu tham gia>
- **Quyền lợi:** <ĐRL / CTXH / GCN / giải thưởng cụ thể theo bài viết>
- **Link đăng ký / Form:** <URL nguyên vẹn hoặc "Không có">
- **Bài viết gốc:** <URL Facebook nguyên vẹn>
```

- Missing fields → ghi `"Chưa công bố"` hoặc bỏ qua dòng nếu không áp dụng.

**Ghi chú cuối (Footer):**
> *📌 Ghi chú: Dữ liệu được thu thập từ các Fanpage theo dõi trong 7 ngày gần nhất (từ ngày DD/MM/YYYY đến nay). Nếu bạn muốn tìm kiếm xa hơn để tránh bỏ sót các cuộc thi mở đơn sớm, cứ nói để mình cào thêm nhé!*

## Keyword Lookup

| Topic group | `keywords` cluster |
|---|---|
| **Online / Quiz** | `trực tuyến`, `tìm hiểu`, `trắc nghiệm`, `câu hỏi`, `google form`, `forms.gle`, `online`, `vòng loại` |
| **Survey** | `khảo sát`, `survey`, `bảng hỏi`, `ý kiến sinh viên` |
| **Academic / Workshop / Contest** | `học thuật`, `chuyên đề`, `tọa đàm`, `seminar`, `nghiên cứu`, `kiến thức`, `workshop`, `talkshow`, `kỹ năng`, `chia sẻ`, `hướng nghiệp`, `cuộc thi`, `hội thi`, `contest`, `competition` |
| **Volunteering / CTXH** | `tình nguyện`, `chủ nhật xanh`, `thứ 7 xanh`, `vệ sinh`, `hiến máu` |
| **Arts / Sports** | `thể thao`, `hội thao`, `bóng đá`, `giải chạy`, `văn nghệ`, `cổ vũ` |

## Red Flags

- Skipping `get_crawl_meta` or searching when `isStale: true` without crawling.
- Ignoring user's requested start date when crawling.
- Calling `find_all_posts` without an explicit user request to search all raw posts.
- Picking only 1–2 keywords instead of the full topic cluster.
- Trimming the result list to a few items or mixing surveys with ĐRL quizzes.
- Hallucinating ĐRL points/deadlines or altering/shortening URLs.
