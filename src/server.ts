import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { crawlPosts, findPosts, cleanPosts } from "./posts.ts";
import { listPages, addPages, removePages } from "./pages.ts";

const reply = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });
const fail = (e: unknown) => ({ isError: true, content: [{ type: "text" as const, text: String(e) }] });

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "dạng YYYY-MM-DD");

const server = new McpServer({ name: "drl-mcp", version: "0.1.0" });

server.registerTool(
  "list_pages",
  {
    description: "Xem danh sách tất cả Facebook page đang được theo dõi trong hệ thống.",
  },
  async () => {
    try {
      return reply(await listPages());
    } catch (e) {
      return fail(e);
    }
  }
);

server.registerTool(
  "add_pages",
  {
    description: "Thêm một hoặc nhiều trang Facebook vào danh sách theo dõi.",
    inputSchema: {
      pages: z
        .array(
          z.object({
            url: z.string().describe("Đường dẫn Facebook page cần theo dõi (ví dụ https://www.facebook.com/it.tdtu)"),
            name: z.string().optional().describe("Tên gợi nhớ của page (ví dụ 'Khoa CNTT')"),
          })
        )
        .describe("Danh sách các trang cần thêm hoặc cập nhật"),
    },
  },
  async ({ pages }) => {
    try {
      return reply(await addPages(pages));
    } catch (e) {
      return fail(e);
    }
  }
);

server.registerTool(
  "remove_pages",
  {
    description: "Xóa một hoặc nhiều trang Facebook khỏi danh sách theo dõi bằng URL hoặc tên.",
    inputSchema: {
      targets: z.array(z.string()).describe("Danh sách URL hoặc tên của các page cần xóa"),
    },
  },
  async ({ targets }) => {
    try {
      return reply(await removePages(targets));
    } catch (e) {
      return fail(e);
    }
  }
);

server.registerTool(
  "crawl_posts",
  {
    description:
      "Cào bài viết mới từ tất cả các trang Facebook theo dõi và lưu vào database. Nếu không truyền `after`, mặc định lấy 15 ngày gần nhất.",
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
      "Tìm kiếm và lọc bài viết đã lưu theo ngày và từ khóa. Bỏ trống hoặc để mảng rỗng `keywords: []` nếu không cần lọc từ khóa.",
    inputSchema: {
      after: date.optional().describe("Lọc bài từ ngày này (YYYY-MM-DD)"),
      before: date.optional().describe("Lọc bài đến ngày này (YYYY-MM-DD)"),
      keywords: z.array(z.string()).optional().describe("Mảng từ khóa cần lọc. Bỏ trống = lấy tất cả bài"),
    },
  },
  async ({ after, before, keywords }) => {
    try {
      return reply(await findPosts({ after, before, keywords }));
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