import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, appendFile, writeFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { type Page, listPages } from "./pages.ts";

const run = promisify(execFile);
const PY = process.env.PYTHON_PATH ?? (process.platform === "win32" ? "py" : "python3");
const POSTS_FILE = process.env.POSTS_FILE ?? fileURLToPath(new URL("../data/posts.jsonl", import.meta.url)); // tất cả bài cào
const DRL_POSTS_FILE = process.env.DRL_POSTS_FILE ?? fileURLToPath(new URL("../data/drl_posts.jsonl", import.meta.url)); // các bài ĐRL đã lọc sạch rác
const MAX_CHARS = 3000; // cắt nội dung bài quá dài

export type { Page };

interface Stored {
  page: string;
  link: string;
  date: string; // ISO
  message: string;
  scrapedAt: string;
}

// Bỏ dấu, chữ thường: "Đăng ký" khớp "dang ky"
const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/đ/g, "d");

// 1. Động từ ghi nhận ... trong vòng ~80 ký tự ... đối tượng ĐRL / quy chế / hoạt động
const RECOGNIZE_BENEFIT = /(ghi nhan|cong diem|tinh diem|xem xet ghi nhan)[^\n]{0,80}(diem ren luyen|ren luyen|quy che|quy dinh|ngoai khoa|hoat dong|tinh nguyen)/u;

// 2. Quyền lợi ĐRL trực tiếp: "Điểm rèn luyện theo quy định / quy chế hiện hành"
const RECOGNIZE_DRL_DIRECT = /(diem ren luyen|drl)[^\n]{0,40}(theo quy dinh|theo quy che|hien hanh)/u;

// 3. Hoạt động có dấu hiệu cuộc thi, workshop, tọa đàm, tham quan... có mở form/link đăng ký tham gia
const RECOGNIZE_EVENT = /(cuoc thi|hoi thi|contest|competition|vong loai|workshop|toa dam|seminar|chuyen de|chieu phim|showcase|co vu|tham quan doanh nghiep)/u;
const RECOGNIZE_ACTION = /(forms\.gle|google form|link dang ky|mo don|dang ky tham gia|tham gia ngay|bom\.so)/u;

export const isDrlPost = (m: string) => {
  const norm = normalize(m);
  if (RECOGNIZE_BENEFIT.test(norm) || RECOGNIZE_DRL_DIRECT.test(norm)) return true;
  return RECOGNIZE_EVENT.test(norm) && RECOGNIZE_ACTION.test(norm);
};

async function readStored(filePath: string = POSTS_FILE): Promise<Stored[]> {
  let text = "";
  try { text = await readFile(filePath, "utf8"); } catch { return []; }
  const posts: Stored[] = [];
  for (const line of text.split("\n")) {
    try { if (line.trim()) posts.push(JSON.parse(line)); } catch {}
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

// Cào toàn bộ các page từ ngày `after` (mặc định 15 ngày trước), lưu bài mới vào posts.jsonl và lọc bài ĐRL vào drl_posts.jsonl
export async function crawlPosts(opts: {
  after?: string;
  before?: string;
  extraArgs?: string[];
  concurrency?: number;
} = {}) {
  const pages = await listPages();
  const after = opts.after || getDefaultAfter(15);
  const known = new Set((await readStored(POSTS_FILE)).map((p) => p.link));
  const knownDrl = new Set((await readStored(DRL_POSTS_FILE)).map((p) => p.link));
  const scrapedAt = new Date().toISOString();
  const summary: { page: string; newPosts: number; newDrlPosts: number; error?: string }[] = [];
  const concurrency = Math.max(1, opts.concurrency ?? Number(process.env.CRAWL_CONCURRENCY || 3));

  await mkdir(dirname(POSTS_FILE), { recursive: true });
  await mkdir(dirname(DRL_POSTS_FILE), { recursive: true });

  const queue = [...pages];
  let totalNew = 0;
  let totalNewDrl = 0;

  async function worker() {
    while (queue.length > 0) {
      const p = queue.shift();
      if (!p) break;
      const page = p.name ?? p.url;
      try {
        const posts = await scrape(p.url, after, opts.before, opts.extraArgs);
        const allLines: string[] = [];
        const drlLines: string[] = [];
        let n = 0;
        let nDrl = 0;
        for (const post of posts) {
          if (!post.link || known.has(post.link)) continue;
          known.add(post.link);
          const item = { page, ...post, scrapedAt };
          const itemJson = JSON.stringify(item);
          allLines.push(itemJson);
          n++;

          if (isDrlPost(post.message) && !knownDrl.has(post.link)) {
            knownDrl.add(post.link);
            drlLines.push(itemJson);
            nDrl++;
          }
        }
        if (allLines.length) {
          await appendFile(POSTS_FILE, allLines.join("\n") + "\n", "utf8");
        }
        if (drlLines.length) {
          await appendFile(DRL_POSTS_FILE, drlLines.join("\n") + "\n", "utf8");
        }
        totalNew += n;
        totalNewDrl += nDrl;
        summary.push({ page, newPosts: n, newDrlPosts: nDrl });
      } catch (e) {
        summary.push({ page, newPosts: 0, newDrlPosts: 0, error: String(e) });
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, pages.length) }, () => worker());
  await Promise.all(workers);

  return { scrapedAt, newPosts: totalNew, newDrlPosts: totalNewDrl, pages: summary };
}

// Đọc bài từ drl_posts.jsonl (mặc định) hoặc posts.jsonl, lọc theo ngày và từ khóa, mới nhất trước.
export async function findPosts(opts: {
  after?: string;
  before?: string;
  keywords?: string[];
  allPosts?: boolean; // nếu true thì đọc posts.jsonl, mặc định false đọc drl_posts.jsonl
} = {}) {
  const { after } = opts;
  const keywords = opts.keywords ?? [];
  const before = opts.before?.length === 10 ? opts.before + "T23:59:59.999Z" : opts.before;
  const targetFile = opts.allPosts ? POSTS_FILE : DRL_POSTS_FILE;

  const wanted = keywords.map((k) => ({
    k,
    re: new RegExp(`(?<![\\p{L}\\p{N}])${normalize(k).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}])`, "u"),
  }));

  const stored = await readStored(targetFile);
  const posts = [];
  for (const s of stored) {
    if ((after && !(s.date >= after)) || (before && !(s.date <= before))) continue;
    const text = normalize(s.message);
    const matched = wanted.filter((w) => w.re.test(text)).map((w) => w.k);
    if (wanted.length && !matched.length) continue;
    posts.push({
      page: s.page,
      link: s.link,
      date: s.date,
      message: s.message.length > MAX_CHARS ? s.message.slice(0, MAX_CHARS) + "…" : s.message,
      ...(wanted.length ? { matched } : {}),
    });
  }
  posts.sort((a, b) => b.date.localeCompare(a.date));

  const lastScrapedAt = stored.reduce<string | null>((m, s) => (!m || s.scrapedAt > m ? s.scrapedAt : m), null);
  return { total: posts.length, isDrlOnly: !opts.allPosts, lastScrapedAt, posts };
}

// Lọc lại toàn bộ posts.jsonl hiện có sang drl_posts.jsonl
export async function syncDrlPosts(): Promise<{ totalAll: number; totalDrl: number }> {
  const allPosts = await readStored(POSTS_FILE);
  const drlPosts = allPosts.filter((p) => isDrlPost(p.message));
  const content = drlPosts.map((p) => JSON.stringify(p)).join("\n") + (drlPosts.length ? "\n" : "");
  await writeFile(DRL_POSTS_FILE, content, "utf8");
  return { totalAll: allPosts.length, totalDrl: drlPosts.length };
}

// Dọn dẹp bài viết cũ có ngày tạo trước ngày `before` (YYYY-MM-DD) trên cả 2 file
export async function cleanPosts(before: string): Promise<{ deleted: number; remaining: number }> {
  const cutoff = before.length === 10 ? before + "T00:00:00.000Z" : before;
  
  // Dọn posts.jsonl
  const stored = await readStored(POSTS_FILE);
  const kept = stored.filter((p) => p.date >= cutoff);
  const deleted = stored.length - kept.length;
  if (deleted > 0) {
    const content = kept.map((p) => JSON.stringify(p)).join("\n") + (kept.length ? "\n" : "");
    await writeFile(POSTS_FILE, content, "utf8");
  }

  // Dọn drl_posts.jsonl
  const storedDrl = await readStored(DRL_POSTS_FILE);
  const keptDrl = storedDrl.filter((p) => p.date >= cutoff);
  if (storedDrl.length !== keptDrl.length) {
    const contentDrl = keptDrl.map((p) => JSON.stringify(p)).join("\n") + (keptDrl.length ? "\n" : "");
    await writeFile(DRL_POSTS_FILE, contentDrl, "utf8");
  }

  return { deleted, remaining: kept.length };
}
