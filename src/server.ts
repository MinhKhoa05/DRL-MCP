import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { crawlPosts } from "./crawler.ts";
import { findDrlPosts, findAllPosts, cleanPosts } from "./search.ts";

const reply = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });
const fail = (e: unknown) => ({ isError: true, content: [{ type: "text" as const, text: String(e) }] });

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "dạng YYYY-MM-DD");

const findSchema = {
  after: date.optional().describe("Lọc bài từ ngày này (YYYY-MM-DD)"),
  before: date.optional().describe("Lọc bài đến ngày này (YYYY-MM-DD)"),
  keywords: z.array(z.string()).optional().describe("Mảng từ khóa cần lọc. Bỏ trống = lấy tất cả bài"),
  page: z.string().optional().describe("Lọc theo tên Page / Khoa / CLB (ví dụ: 'Khoa Ngoại ngữ', 'KTX', 'FEEE')"),
  compact: z.boolean().optional().describe("true = rút gọn thông tin bài viết (tiêu đề + mốc thời gian + quyền lợi + đối tượng + hình thức), giúp tiết kiệm token"),
  compactKeywords: z.array(z.string()).optional().describe("Mảng từ khóa bổ sung cần trích xuất thêm dòng liên quan khi bật compact"),
  limit: z.number().optional().describe("Giới hạn số lượng bài trả về"),
};

const server = new McpServer({ name: "drl-mcp", version: "0.3.0" });

server.registerTool(
  "find_drl_posts",
  {
    description:
      "Tìm kiếm bài viết hoạt động ĐRL / CTXH (tự động kiểm tra và cào bài mới nếu dữ liệu đã cũ quá 30 phút). Hỗ trợ lọc theo từ khóa, page, khoảng ngày, compact rút gọn và limit.",
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
      "Tìm kiếm trên TOÀN BỘ bài viết gốc đã cào (bao gồm cả bài không liên quan ĐRL, tự động cào mới nếu dữ liệu cũ quá 30 phút). Chỉ dùng khi người dùng yêu cầu tìm ngoài phạm vi ĐRL.",
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
  "crawl_posts",
  {
    description:
      "Chủ động cào bài viết từ các trang Facebook theo khoảng thời gian [after, before] (chỉ dùng khi người dùng yêu cầu cào dữ liệu xa hơn 7 ngày hoặc ép cào lại).",
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
  "clean_posts",
  {
    description: "Dọn dẹp bài viết cũ trong database có ngày tạo trước ngày `before` (YYYY-MM-DD).",
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
