import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { crawlPosts, findPosts, cleanPosts } from "./posts.ts";

const reply = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });
const fail = (e: unknown) => ({ isError: true, content: [{ type: "text" as const, text: String(e) }] });

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "dạng YYYY-MM-DD");

const server = new McpServer({ name: "drl-mcp", version: "0.2.0" });

server.registerTool(
  "crawl_posts",
  {
    description:
      "Cào bài viết mới từ tất cả các trang Facebook đang theo dõi (tự động load từ pages.json). Tự động lưu vào posts.jsonl và lọc sạch bài ĐRL vào drl_posts.jsonl.",
    inputSchema: {
      after: date.optional().describe("Lấy bài từ ngày này (YYYY-MM-DD). Bỏ trống = mặc định 15 ngày gần nhất"),
      before: date.optional().describe("Đến ngày này (YYYY-MM-DD), bỏ trống = đến nay"),
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
  "find_posts",
  {
    description:
      "Tìm kiếm và lọc bài viết. Mặc định chỉ tìm trong các bài ĐÃ LỌC LIÊN QUAN ĐRL (drl_posts.jsonl). Nếu allPosts=true thì tìm trong tất cả bài viết gốc.",
    inputSchema: {
      after: date.optional().describe("Lọc bài từ ngày này (YYYY-MM-DD)"),
      before: date.optional().describe("Lọc bài đến ngày này (YYYY-MM-DD)"),
      keywords: z.array(z.string()).optional().describe("Mảng từ khóa cần lọc. Bỏ trống = lấy tất cả bài"),
      allPosts: z.boolean().optional().describe("Đặt true nếu muốn tìm trong toàn bộ bài viết (kể cả bài không liên quan ĐRL). Mặc định false (chỉ tìm trong bài ĐRL)."),
    },
  },
  async ({ after, before, keywords, allPosts }) => {
    try {
      return reply(await findPosts({ after, before, keywords, allPosts }));
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
