import { POSTS_FILE, DRL_POSTS_FILE, MAX_CHARS, readStored, writeStored } from "./storage.ts";
import { normalize, extractPostLinks, isDrlPost } from "./filter.ts";

export interface FindOptions {
  after?: string;
  before?: string;
  keywords?: string[];
  page?: string;
  hasForm?: boolean;
  compact?: boolean;
  compactKeywords?: string[];
  limit?: number;
}

const CORE_PATTERN = new RegExp(
  [
    "thoi gian|han chot|deadline|dong link|mo link|mo don|thoi han|ngay dien ra|ngay to chuc|ngay thuc hien|tu ngay",
    "dia diem|hinh thuc|san van dong|hoi truong|phong|co so|truc tuyen|online",
    "doi tuong|danh cho|sinh vien khoa|sinh vien noi tru|toan the sinh vien",
    "quyen loi|diem ren luyen|drl|ctxh|ngay ctxh|cong diem|chung nhan|gcn|giay khen|giai thuong",
    "yeu cau|dieu kien|tieu chuan|cau dung|dat tu|luu y|chu y",
    "dang ky|cach thuc|huong dan|link form|bieu mau|forms\\.gle",
  ].join("|")
);

export function extractCompactInfo(
  message: string,
  extraKeywords: string[] = []
): { title: string; keyInfo: string[] } {
  const lines = message.split("\n").map((l) => l.trim()).filter(Boolean);
  const title = lines.slice(0, 2).join(" | ");
  const keyInfo: string[] = [];
  const seen = new Set<string>();

  const extraPattern = extraKeywords.length
    ? new RegExp("(" + extraKeywords.map((k) => normalize(k).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")")
    : null;

  for (const line of lines) {
    if (line.length >= 350) continue;
    const normalizedLine = normalize(line);

    if ((CORE_PATTERN.test(normalizedLine) || (extraPattern && extraPattern.test(normalizedLine))) && !seen.has(line)) {
      seen.add(line);
      keyInfo.push(line);
    }
  }

  return { title, keyInfo };
}

// Logic tìm kiếm tái sử dụng trên bất kỳ file jsonl cục bộ nào
async function findInFile(filePath: string, opts: FindOptions = {}) {
  const { after, page: pageFilter, hasForm, compact, compactKeywords, limit } = opts;
  const keywords = opts.keywords ?? [];
  const before = opts.before?.length === 10 ? opts.before + "T23:59:59.999Z" : opts.before;

  const wanted = keywords.map((k) => ({
    k,
    re: new RegExp(`(?<![\\p{L}\\p{N}])${normalize(k).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}])`, "u"),
  }));

  const normalizedPageFilter = pageFilter ? normalize(pageFilter) : null;

  const stored = await readStored(filePath);
  const posts = [];

  for (const s of stored) {
    if ((after && !(s.date >= after)) || (before && !(s.date <= before))) continue;
    if (normalizedPageFilter && !normalize(s.page).includes(normalizedPageFilter)) continue;

    const text = normalize(s.message);
    const matched = wanted.filter((w) => w.re.test(text)).map((w) => w.k);
    if (wanted.length && !matched.length) continue;

    const { forms, external } = extractPostLinks(s.message);
    if (hasForm && forms.length === 0) continue;

    if (compact) {
      const { title, keyInfo } = extractCompactInfo(s.message, compactKeywords);
      posts.push({
        page: s.page,
        link: s.link,
        forms,
        externalLinks: external,
        date: s.date,
        title,
        keyInfo,
        ...(wanted.length ? { matched } : {}),
      });
    } else {
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
  }

  posts.sort((a, b) => b.date.localeCompare(a.date));

  const total = posts.length;
  const returnedPosts = typeof limit === "number" && limit > 0 ? posts.slice(0, limit) : posts;

  return { total, posts: returnedPosts };
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
