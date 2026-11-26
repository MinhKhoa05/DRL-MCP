#!/usr/bin/env node
import fs from "fs";
import { z } from "zod";
import { chromium, type BrowserContext } from "playwright";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const CONCURRENCY = 4;
const MAX_SCROLLS = 35;
const CRAWL_FILE = "data/crawl.json";

type Page = { url: string; name?: string; last_scanned_date?: string };
type Post = { link: string; date: string; content: string };

const DAY = 864e5;
const fmt = (d: Date) =>
  `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

// "DD/MM/YYYY" hoặc "YYYY-MM-DD" -> Date, tối đa 30 ngày kể từ hiện tại
function parseSince(s?: string): Date {
  const maxLimit = new Date(Date.now() - 30 * DAY);
  maxLimit.setHours(0, 0, 0, 0);

  const m = s?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/) ?? s?.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    const [a, b, c] = m.slice(1).map(Number);
    const target = s!.includes("/") ? new Date(c, b - 1, a) : new Date(a, b - 1, c);
    target.setHours(0, 0, 0, 0);
    return target < maxLimit ? maxLimit : target;
  }
  return maxLimit;
}

// Bóc tách ngày đăng từ text Facebook: "25 Tháng 11", "3 ngày", "vừa xong"
function parsePostDate(text: string): Date | null {
  const full = text.match(/(\d{1,2})\s+Tháng\s+(\d{1,2})(?:[,\s]+(\d{4}))?/i);
  if (full) return new Date(full[3] ? +full[3] : new Date().getFullYear(), +full[2] - 1, +full[1]);
  const days = text.match(/(\d+)\s*ngày/i);
  if (days) return new Date(Date.now() - +days[1] * DAY);
  if (/phút|giờ|vừa xong/i.test(text)) return new Date();
  return null;
}

async function crawlPage(ctx: BrowserContext, p: Page) {
  const pageName = p.name || p.url.split("/").filter(Boolean).pop() || p.url;
  console.error(`[CRAWL] Đang cào page: ${pageName}`);
  const since = parseSince(p.last_scanned_date);
  const page = await ctx.newPage();
  const posts = new Map<string, Post>();

  try {
    const targetUrl = `${p.url}${p.url.includes("?") ? "&" : "?"}locale=vi_VN`;
    const sel = 'a[href*="/posts/"], a[href*="/reel/"]';
    
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 25000 });
    await page.waitForSelector(sel, { timeout: 4000 }).catch(() => {});

    // Facebook thường hiện lỗi tạm "Trang này hiện không hiển thị", chỉ cần reload là thấy bài
    if ((await page.locator(sel).count()) === 0) {
      await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
      await page.waitForSelector(sel, { timeout: 6000 }).catch(() => {});
    }

    let staleCount = 0;
    let lastPostCount = 0;

    for (let i = 0; i < MAX_SCROLLS; i++) {
      // Đóng popup đăng nhập nếu có
      const close = page.locator('div[aria-label="Đóng"], div[aria-label="Close"]').first();
      if (await close.isVisible().catch(() => false)) await close.click().catch(() => {});

      // Bấm "Xem thêm" để bung nội dung
      await page.evaluate(() => {
        document.querySelectorAll<HTMLElement>('div[role="button"]').forEach((b) => {
          if (/^(Xem thêm|See more)$/i.test(b.innerText?.trim())) b.click();
        });
      });

      const batch = await page.evaluate(() => {
        const links = document.querySelectorAll<HTMLAnchorElement>(
          'a[href*="/posts/"], a[href*="story_fbid="], a[href*="/videos/"], a[href*="/reel/"]'
        );
        return [...links].map((a) => {
          let box: HTMLElement = a;
          for (let j = 0; j < 14 && box.parentElement && !(box.innerText.length > 150 && box.innerText.includes("Thích")); j++) {
            box = box.parentElement;
          }
          let text = box.innerText || "";
          for (const stop of ["\nTất cả cảm xúc:", "\nThích\nBình luận", "\nXem thêm bình luận", "\nViết bình luận", "\nPhù hợp nhất"]) {
            const k = text.indexOf(stop);
            if (k !== -1) text = text.slice(0, k);
          }
          text = text.replace(/^(Nội dung do AI tạo|Gửi tin nhắn|Đang hoạt động|\s*·\s*)+\n+/gi, "").trim();
          return { link: a.href.split("?")[0], date: a.innerText.trim(), content: text.slice(0, 1500) };
        });
      });

      let reachedOlderThanSince = false;

      for (const b of batch) {
        if (b.content.length < 50) continue;
        const d = parsePostDate(`${b.date}\n${b.content.slice(0, 200)}`);
        if (d && d < since) {
          reachedOlderThanSince = true;
          continue;
        }
        posts.set(b.link, { ...b, date: d ? fmt(d) : b.date });
      }

      // Đã cuộn sâu tới các bài cũ hơn ngày yêu cầu -> dừng sớm
      if (reachedOlderThanSince) break;

      // Kiểm tra nếu feed không load thêm bài mới sau 3 lần cuộn liên tiếp
      if (posts.size === lastPostCount) {
        staleCount++;
        if (staleCount >= 4) break;
      } else {
        staleCount = 0;
        lastPostCount = posts.size;
      }

      await page.mouse.wheel(0, 1800);
      await page.waitForTimeout(800);
    }

    console.error(`[CRAWL] Hoàn tất ${pageName}: thu thập được ${posts.size} bài.`);
    return { url: p.url, status: "success", posts: [...posts.values()] };
  } catch (e) {
    console.error(`[CRAWL] Thất bại ${pageName}: ${e}`);
    return { url: p.url, status: "failed", error: String(e), posts: [] };
  } finally {
    await page.close().catch(() => {});
  }
}

export async function crawlAll(pages: Page[]) {
  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const results = [];
  try {
    const ctx = await browser.newContext({
      locale: "vi-VN",
      viewport: { width: 1280, height: 950 },
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    });
    await ctx.route("**/*", (r) => (["media", "font"].includes(r.request().resourceType()) ? r.abort() : r.continue()));

    for (let i = 0; i < pages.length; i += CONCURRENCY) {
      results.push(...(await Promise.all(pages.slice(i, i + CONCURRENCY).map((p) => crawlPage(ctx, p)))));
    }
  } finally {
    await browser.close().catch(() => {});
  }

  fs.writeFileSync(CRAWL_FILE, JSON.stringify({ crawled_at: fmt(new Date()), results }, null, 2));
  const failed = results.filter((r) => r.status === "failed").map((r) => r.url);
  const total = results.reduce((n, r) => n + r.posts.length, 0);

  return { file: CRAWL_FILE, total_posts: total, failed };
}

const server = new McpServer({ name: "fb-drl-mcp", version: "1.0.0" });

server.registerTool(
  "crawl_pages",
  {
    description:
      `Cào bài viết thô từ danh sách Fanpage (mỗi đợt ${CONCURRENCY} trang), lưu trữ toàn bộ dữ liệu thô vào ${CRAWL_FILE}. ` +
      `LƯU Ý: LUÔN GIỮ FILE ${CRAWL_FILE} ĐỂ LÀM DỮ LIỆU THÔ (KHÔNG XÓA). ` +
      `Agent đọc ${CRAWL_FILE}, lọc các bài Điểm rèn luyện và cập nhật vào data/posts.json (quản lý theo khoảng ngày from_date - to_date). data/pages.json là cấu hình tĩnh (id, name, url), không cập nhật pages.json.`,
    inputSchema: {
      pages: z.array(
        z.object({
          url: z.string().url(),
          name: z.string().optional(),
          last_scanned_date: z.string().optional(),
        })
      ).min(1),
    },
  },
  async ({ pages }) => {
    const res = await crawlAll(pages);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  },
);

if (process.argv.includes("--run")) {
  const raw = JSON.parse(fs.readFileSync("data/pages.json", "utf8"));
  const sinceArg = process.argv.find((a) => a.startsWith("--since="))?.split("=")[1] || "15/11/2026";
  const pagesList = raw.map((p: any) => ({ url: p.url, name: p.name, last_scanned_date: sinceArg }));
  console.error(`Bắt đầu cào ${pagesList.length} trang từ ngày ${sinceArg}...`);
  const res = await crawlAll(pagesList);
  console.error(`\nHoàn tất: ${res.total_posts} bài viết đã lưu vào ${res.file}`);
  process.exit(0);
} else {
  await server.connect(new StdioServerTransport());
}
