import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, appendFile, writeFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { type Page, listPages } from "./pages.ts";

const run = promisify(execFile);
const PY = process.env.PYTHON_PATH ?? (process.platform === "win32" ? "py" : "python3");
const POSTS_FILE = process.env.POSTS_FILE ?? fileURLToPath(new URL("../data/posts.jsonl", import.meta.url)); // mỗi dòng 1 bài
const MAX_CHARS = 3000; // cắt nội dung bài quá dài

export type { Page };

interface Stored {
  page: string;
  link: string;
  date: string; // ISO
  message: string;
  tags?: string[];
  scrapedAt: string;
}

// Bỏ dấu, chữ thường: "Đăng ký" khớp "dang ky"
const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/đ/g, "d");

export function extractTags(message: string): string[] {
  const norm = normalize(message);
  const tags = new Set<string>();

  // 1. Điểm rèn luyện & Ngoại khóa
  if (/(diem ren luyen|drl|ren luyen|cong diem|diem cong|diem ngoai khoa|hoat dong ren luyen)/u.test(norm)) {
    tags.add("drl");
  }

  // 2. CTXH / Tình nguyện
  if (/(cong tac xa hoi|ctxh|tinh nguyen|thien nguyen|mua he xanh|tiep suc mua thi|hien mau|chu nhat xanh|quyen gop)/u.test(norm)) {
    tags.add("ctxh");
  }

  // 3. Quiz / Làm bài trắc nghiệm / Câu hỏi online
  if (
    /(trac nghiem|\/30 cau|\/20 cau|cau hoi|cau dung|lam bai qua|tra loi dung)/u.test(norm) ||
    /forms\.gle|docs\.google\.com\/forms/i.test(message)
  ) {
    if (/(cau hoi|cau dung|\/30|\/20|trac nghiem)/u.test(norm)) {
      tags.add("quiz");
    }
  }

  // 4. Form đăng ký
  if (
    /forms\.gle|docs\.google\.com\/forms|bit\.ly/i.test(message) ||
    /(dang ky|mo form|link form|bieu mau|mo don|ung tuyen)/u.test(norm)
  ) {
    tags.add("form");
  }

  // 5. Workshop / Hội thảo / Tọa đàm
  if (/(workshop|hoi thao|toa dam|seminar|talkshow|chuyen de|tap huan)/u.test(norm)) {
    tags.add("workshop");
  }

  // 6. Cuộc thi
  if (/(cuoc thi|hoi thi|tranh tai|contest|competition)/u.test(norm)) {
    tags.add("contest");
  }

  return Array.from(tags);
}

async function readStored(): Promise<Stored[]> {
  let text = "";
  try { text = await readFile(POSTS_FILE, "utf8"); } catch { return []; }
  const posts: Stored[] = [];
  for (const line of text.split("\n")) {
    try {
      if (line.trim()) {
        const item = JSON.parse(line);
        if (!item.tags) {
          item.tags = extractTags(item.message ?? "");
        }
        posts.push(item);
      }
    } catch {}
  }
  return posts;
}

// py -m fbgql.cli scrape --page <url> --after <d> [--before <d>] --posts-only --out <file>
async function scrape(url: string, after: string, before?: string, extraArgs: string[] = []) {
  const dir = await mkdtemp(join(tmpdir(), "fbgql-"));
  const out = join(dir, "out.json");
  try {
    await run(
      PY,
      ["-m", "fbgql.cli", "scrape", "--page", url, "--after", after,
        ...(before ? ["--before", before] : []), "--posts-only", ...extraArgs, "--out", out],
      { timeout: 120000, env: { ...process.env, PYTHONIOENCODING: "utf-8" } }
    );
    const raw = JSON.parse(await readFile(out, "utf8"));
    return (raw.posts ?? []).map(({ post }: any) => ({
      link: post.permalink as string,
      date: post.created_time ? new Date(post.created_time * 1000).toISOString() : "",
      message: (post.text ?? "") as string,
    }));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function getDefaultAfter(days = 15): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

// Cào toàn bộ các page từ ngày `after` (mặc định 15 ngày trước) rồi lưu bài mới vào file
export async function crawlPosts(opts: {
  pages?: Page[];
  after?: string;
  before?: string;
  extraArgs?: string[]; // ví dụ ["--cookies", "cookies.txt"]
  concurrency?: number;
} = {}) {
  const pages = await listPages();
  const after = opts.after || getDefaultAfter(15);
  const known = new Set((await readStored()).map((p) => p.link));
  const scrapedAt = new Date().toISOString();
  const summary: { page: string; newPosts: number; error?: string }[] = [];
  const concurrency = Math.max(1, opts.concurrency ?? Number(process.env.CRAWL_CONCURRENCY || 8));

  await mkdir(dirname(POSTS_FILE), { recursive: true });

  const queue = [...pages];
  let totalNew = 0;

  async function worker() {
    while (queue.length > 0) {
      const p = queue.shift();
      if (!p) break;
      const page = p.name ?? p.url;
      try {
        const posts = await scrape(p.url, after, opts.before, opts.extraArgs);
        const lines: string[] = [];
        let n = 0;
        for (const post of posts) {
          if (!post.link || known.has(post.link)) continue;
          known.add(post.link);
          const tags = extractTags(post.message ?? "");
          lines.push(JSON.stringify({ page, ...post, tags, scrapedAt }));
          n++;
        }
        if (lines.length) {
          await appendFile(POSTS_FILE, lines.join("\n") + "\n", "utf8");
        }
        totalNew += n;
        summary.push({ page, newPosts: n });
      } catch (e) {
        summary.push({ page, newPosts: 0, error: String(e) });
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, pages.length) }, () => worker());
  await Promise.all(workers);

  return { scrapedAt, newPosts: totalNew, pages: summary };
}

// Đọc bài đã lưu, lọc theo ngày và từ khóa, mới nhất trước.
export async function findPosts(opts: {
  after?: string;
  before?: string;
  keywords?: string[];
  tags?: string[];
} = {}) {
  const { after, tags } = opts;
  const keywords = opts.keywords ?? [];
  const before = opts.before?.length === 10 ? opts.before + "T23:59:59.999Z" : opts.before;
  const wanted = keywords.map((k) => ({
    k,
    re: new RegExp(`(?<![\\p{L}\\p{N}])${normalize(k).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}])`, "u"),
  }));

  const stored = await readStored();
  const posts = [];
  for (const s of stored) {
    if ((after && !(s.date >= after)) || (before && !(s.date <= before))) continue;
    if (tags?.length && !tags.some((t) => s.tags?.includes(t.toLowerCase()))) continue;
    const text = normalize(s.message);
    const matched = wanted.filter((w) => w.re.test(text)).map((w) => w.k);
    if (wanted.length && !matched.length) continue;
    posts.push({
      page: s.page,
      link: s.link,
      date: s.date,
      tags: s.tags,
      message: s.message.length > MAX_CHARS ? s.message.slice(0, MAX_CHARS) + "…" : s.message,
      ...(wanted.length ? { matched } : {}),
    });
  }
  posts.sort((a, b) => b.date.localeCompare(a.date));

  const lastScrapedAt = stored.reduce<string | null>((m, s) => (!m || s.scrapedAt > m ? s.scrapedAt : m), null);
  return { total: posts.length, lastScrapedAt, posts };
}

// Dọn dẹp bài viết cũ có ngày tạo trước ngày `before` (YYYY-MM-DD)
export async function cleanPosts(before: string): Promise<{ deleted: number; remaining: number }> {
  const cutoff = before.length === 10 ? before + "T00:00:00.000Z" : before;
  const stored = await readStored();
  const kept = stored.filter((p) => p.date >= cutoff);
  const deleted = stored.length - kept.length;

  if (deleted > 0) {
    const content = kept.map((p) => JSON.stringify(p)).join("\n") + (kept.length ? "\n" : "");
    await writeFile(POSTS_FILE, content, "utf8");
  }

  return { deleted, remaining: kept.length };
}