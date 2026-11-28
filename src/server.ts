import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { crawlPosts, getCrawlMeta } from "./crawler.ts";
import { findDrlPosts, findAllPosts, cleanPosts } from "./search.ts";

const reply = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });
const fail = (e: unknown) => ({ isError: true, content: [{ type: "text" as const, text: String(e) }] });

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "dạng YYYY-MM-DD");

const findSchema = {
  after: date.optional().describe("Lọc bài từ ngày này (YYYY-MM-DD)"),
  before: date.optional().describe("Lọc bài đến ngày này (YYYY-MM-DD)"),
  keywords: z.array(z.string()).optional().describe("Mảng từ khóa cần lọc. Bỏ trống = lấy tất cả bài"),
  page: z.string().optional().describe("Lọc theo tên Page / Khoa / CLB (ví dụ: 'Khoa Ngoại ngữ', 'KTX', 'FEEE')"),
  hasForm: z.boolean().optional().describe("Chỉ lấy những bài có mở form đăng ký (Google Forms)"),
  compact: z.boolean().optional().describe("true = rút gọn thông tin bài viết (tiêu đề + mốc thời gian + quyền lợi + đối tượng + hình thức), giúp tiết kiệm token"),
  compactKeywords: z.array(z.string()).optional().describe("Mảng từ khóa bổ sung mà Agent muốn trích xuất thêm dòng liên quan (bên cạnh các từ khóa mặc định)"),
  limit: z.number().optional().describe("Giới hạn số lượng bài trả về"),
};

const server = new McpServer({ name: "drl-mcp", version: "0.3.0" });

server.registerTool(
  "get_crawl_meta",
  {
    description:
      "Lấy thông tin lần cào gần nhất (lastCrawledAt, lastCrawlDate, ageMinutes, isStale). Trả về null nếu chưa có dữ liệu.",
    inputSchema: {},
  },
  async () => {
    try {
      return reply(await getCrawlMeta());
    } catch (e) {
      return fail(e);
    }
  }
);

server.registerTool(
  "crawl_posts",
  {
    description:
      "Cào bài viết mới từ tất cả các trang Facebook đang theo dõi (tự động load từ pages.json). Hỗ trợ cào theo khoảng thời gian [after, before]. Tự động lưu vào posts.jsonl và lọc sạch bài ĐRL vào drl_posts.jsonl.",
    inputSchema: {
      after: date.optional().describe("Lấy bài từ ngày này (YYYY-MM-DD). Bỏ trống = mặc định 7 ngày gần nhất"),
      before: date.optional().describe("Đến ngày này (YYYY-MM-DD). Bỏ trống = đến nay"),
    },
  },
  async ({ after, before }) => {
    try {
      return reply(await crawlPosts({ after, before }));
    } catch (e) {
      return fail(e);
    }
  }
);

server.registerTool(
  "find_drl_posts",
  {
    description: "Tìm kiếm và lọc bài viết trong danh sách bài ĐÃ LỌC LIÊN QUAN ĐRL (drl_posts.jsonl). Hỗ trợ lọc theo page, form, compact rút gọn, compactKeywords và limit.",
    inputSchema: findSchema,
  },
  async (args) => {
    try {
      return reply(await findDrlPosts(args));
    } catch (e) {
      return fail(e);
    }
  }
);

server.registerTool(
  "find_all_posts",
  {
    description:
      "Tìm kiếm trên TOÀN BỘ bài viết gốc đã cào (posts.jsonl, bao gồm cả bài không liên quan ĐRL). Chỉ dùng khi người dùng yêu cầu rõ ràng.",
    inputSchema: findSchema,
  },
  async (args) => {
    try {
      return reply(await findAllPosts(args));
    } catch (e) {
      return fail(e);
    }
  }
);

server.registerTool(
  "clean_posts",
  {
    description: "Dọn dẹp bài viết cũ trong database. Xóa tất cả các bài viết có ngày tạo trước ngày `before` (YYYY-MM-DD).",
    inputSchema: {
      before: date.describe("Xóa các bài viết có ngày tạo trước ngày này (YYYY-MM-DD)"),
    },
  },
  async ({ before }) => {
    try {
      return reply(await cleanPosts(before));
    } catch (e) {
      return fail(e);
    }
  }
);

await server.connect(new StdioServerTransport());
