import { POSTS_FILE, DRL_POSTS_FILE, MAX_CHARS, readStored, writeStored } from "./storage.ts";
import { normalize, extractPostLinks, isDrlPost } from "./filter.ts";

export interface FindOptions {
  after?: string;
  before?: string;
  keywords?: string[];
}

// Logic tìm kiếm tái sử dụng trên bất kỳ file jsonl cục bộ nào
async function findInFile(filePath: string, opts: FindOptions = {}) {
  const { after } = opts;
  const keywords = opts.keywords ?? [];
  const before = opts.before?.length === 10 ? opts.before + "T23:59:59.999Z" : opts.before;

  const wanted = keywords.map((k) => ({
    k,
    re: new RegExp(`(?<![\\p{L}\\p{N}])${normalize(k).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}])`, "u"),
  }));

  const stored = await readStored(filePath);
  const posts = [];
  for (const s of stored) {
    if ((after && !(s.date >= after)) || (before && !(s.date <= before))) continue;
    const text = normalize(s.message);
    const matched = wanted.filter((w) => w.re.test(text)).map((w) => w.k);
    if (wanted.length && !matched.length) continue;
    const { forms, external } = extractPostLinks(s.message);
    posts.push({
      page: s.page,
      link: s.link,
      forms,
      externalLinks: external,
      date: s.date,
      message: s.message.length > MAX_CHARS ? s.message.slice(0, MAX_CHARS) + "…" : s.message,
      ...(wanted.length ? { matched } : {}),
    });
  }
  posts.sort((a, b) => b.date.localeCompare(a.date));

  return { total: posts.length, posts };
}

// Chỉ tìm trong các bài đã lọc ĐRL (drl_posts.jsonl)
export async function findDrlPosts(opts: FindOptions = {}) {
  return findInFile(DRL_POSTS_FILE, opts);
}

// Tìm trong toàn bộ bài viết gốc đã cào (posts.jsonl)
export async function findAllPosts(opts: FindOptions = {}) {
  return findInFile(POSTS_FILE, opts);
}

// Đồng bộ lại drl_posts.jsonl từ posts.jsonl
export async function syncDrlPosts(): Promise<{ totalAll: number; totalDrl: number }> {
  const allPosts = await readStored(POSTS_FILE);
  const drlPosts = allPosts.filter((p) => isDrlPost(p.message));
  await writeStored(DRL_POSTS_FILE, drlPosts);
  return { totalAll: allPosts.length, totalDrl: drlPosts.length };
}

// Dọn dẹp bài viết cũ có ngày tạo trước `before` (YYYY-MM-DD) trên cả 2 file
export async function cleanPosts(before: string): Promise<{ deleted: number; remaining: number }> {
  const cutoff = before.length === 10 ? before + "T00:00:00.000Z" : before;

  const stored = await readStored(POSTS_FILE);
  const kept = stored.filter((p) => p.date >= cutoff);
  const deleted = stored.length - kept.length;
  if (deleted > 0) {
    await writeStored(POSTS_FILE, kept);
  }

  const storedDrl = await readStored(DRL_POSTS_FILE);
  const keptDrl = storedDrl.filter((p) => p.date >= cutoff);
  if (storedDrl.length !== keptDrl.length) {
    await writeStored(DRL_POSTS_FILE, keptDrl);
  }

  return { deleted, remaining: kept.length };
}
