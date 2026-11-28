import { POSTS_FILE, DRL_POSTS_FILE, MAX_CHARS, readStored, writeStored } from "./storage.ts";
import { normalize, escapeRegex, extractPostLinks, extractCompactInfo } from "./filter.ts";
import { ensureFreshData } from "./crawler.ts";

export interface FindOptions {
  after?: string;
  before?: string;
  keywords?: string[];
  page?: string;
  compact?: boolean;
  compactKeywords?: string[];
  limit?: number;
}

async function findInFile(filePath: string, opts: FindOptions = {}) {
  await ensureFreshData();

  const { after, page, compact, compactKeywords, limit, keywords = [] } = opts;
  const before = opts.before?.length === 10 ? opts.before + "T23:59:59.999Z" : opts.before;
  const pageFilter = page ? normalize(page) : null;

  const wanted = keywords.map((k) => ({
    k,
    re: new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegex(normalize(k))}(?![\\p{L}\\p{N}])`, "u"),
  }));

  const stored = await readStored(filePath);
  const posts = [];

  for (const s of stored) {
    if ((after && s.date < after) || (before && s.date > before)) continue;
    if (pageFilter && !normalize(s.page).includes(pageFilter)) continue;

    const text = normalize(s.message);
    const matched = wanted.filter((w) => w.re.test(text)).map((w) => w.k);
    if (wanted.length && !matched.length) continue;

    const { forms, external } = extractPostLinks(s.message);
    const base = {
      page: s.page,
      link: s.link,
      forms,
      externalLinks: external,
      date: s.date,
    };

    if (compact) {
      const { title, keyInfo } = extractCompactInfo(s.message, compactKeywords);
      posts.push({ ...base, title, keyInfo, ...(wanted.length ? { matched } : {}) });
    } else {
      const message = s.message.length > MAX_CHARS ? s.message.slice(0, MAX_CHARS) + "…" : s.message;
      posts.push({ ...base, message, ...(wanted.length ? { matched } : {}) });
    }
  }

  posts.sort((a, b) => b.date.localeCompare(a.date));

  return {
    total: posts.length,
    posts: typeof limit === "number" && limit > 0 ? posts.slice(0, limit) : posts,
  };
}

export const findDrlPosts = (opts: FindOptions = {}) => findInFile(DRL_POSTS_FILE, opts);
export const findAllPosts = (opts: FindOptions = {}) => findInFile(POSTS_FILE, opts);

export async function cleanPosts(before: string) {
  const cutoff = before.length === 10 ? before + "T00:00:00.000Z" : before;

  const cleanFile = async (file: string) => {
    const stored = await readStored(file);
    const kept = stored.filter((p) => p.date >= cutoff);
    if (kept.length !== stored.length) await writeStored(file, kept);
    return { deleted: stored.length - kept.length, remaining: kept.length };
  };

  const [all] = await Promise.all([cleanFile(POSTS_FILE), cleanFile(DRL_POSTS_FILE)]);
  return all;
}
