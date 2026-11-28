import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, appendFile, writeFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { POSTS_FILE, DRL_POSTS_FILE, META_FILE, readStored, listPages } from "./storage.ts";
import { isDrlPost } from "./filter.ts";

const run = promisify(execFile);
const PY = process.env.PYTHON_PATH ?? (process.platform === "win32" ? "py" : "python3");

async function scrape(url: string, after: string, before?: string, extraArgs: string[] = []) {
  const dir = await mkdtemp(join(tmpdir(), "fbgql-"));
  const out = join(dir, "out.json");
  try {
    await run(
      PY,
      [
        "-m",
        "fbgql.cli",
        "scrape",
        "--page",
        url,
        "--after",
        after,
        ...(before ? ["--before", before] : []),
        "--posts-only",
        ...extraArgs,
        "--out",
        out,
      ],
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

function getDefaultAfter(days = 7): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export async function crawlPosts(
  opts: {
    after?: string;
    before?: string;
    extraArgs?: string[];
    concurrency?: number;
  } = {}
) {
  const pages = await listPages();
  const after = opts.after || getDefaultAfter(7);
  const known = new Set((await readStored(POSTS_FILE)).map((p) => p.link));
  const knownDrl = new Set((await readStored(DRL_POSTS_FILE)).map((p) => p.link));
  const scrapedAt = new Date().toISOString();
  const summary: { page: string; newPosts: number; newDrlPosts: number; error?: string }[] = [];
  const concurrency = Math.max(1, opts.concurrency ?? Number(process.env.CRAWL_CONCURRENCY || 8));

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
          const item = { page, ...post };
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

  const meta = {
    lastCrawledAt: scrapedAt,
    after,
    before: opts.before ?? null,
    newPosts: totalNew,
    newDrlPosts: totalNewDrl,
    totalPosts: known.size,
    totalDrlPosts: knownDrl.size,
    errors: summary.filter((s) => s.error).map((s) => s.page),
  };
  await writeFile(META_FILE, JSON.stringify(meta, null, 2), "utf8");

  return { scrapedAt, newPosts: totalNew, newDrlPosts: totalNewDrl, pages: summary };
}

export async function getCrawlMeta() {
  try {
    const raw = await readFile(META_FILE, "utf8");
    const meta = JSON.parse(raw);
    if (!meta?.lastCrawledAt) return null;
    const ageMinutes = Math.floor((Date.now() - new Date(meta.lastCrawledAt).getTime()) / 60000);
    return {
      ...meta,
      lastCrawlDate: String(meta.lastCrawledAt).slice(0, 10),
      ageMinutes,
      isStale: ageMinutes > 30,
    };
  } catch {
    return null;
  }
}
