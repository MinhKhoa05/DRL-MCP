const URL_REGEX = /https?:\/\/[^\s\)\"\'<>]+/gi;
const MAX_COMPACT_LINE_LEN = 350;

// Bỏ dấu, chữ thường: "Đăng ký" -> "dang ky"
export const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/đ/g, "d");

export const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function extractPostLinks(message: string): { forms: string[]; external: string[] } {
  const matches = message.match(URL_REGEX) || [];
  const forms: string[] = [];
  const external: string[] = [];

  for (const rawUrl of matches) {
    const cleaned = rawUrl.replace(/[.,;:]+$/, "");
    if (/forms\.gle|docs\.google\.com\/forms/i.test(cleaned)) {
      if (!forms.includes(cleaned)) forms.push(cleaned);
    } else if (!/facebook\.com|fb\.com|fb\.watch/i.test(cleaned)) {
      if (!external.includes(cleaned)) external.push(cleaned);
    }
  }
  return { forms, external };
}

// 1. Nhắc trực tiếp "điểm rèn luyện / ĐRL / ngày CTXH", HOẶC "ghi nhận / cộng điểm ... theo quy chế / ngoại khóa / tình nguyện"
const RECOGNIZE_DRL =
  /\b(diem ren luyen|drl|ngay ctxh|diem ctxh)\b|(ghi nhan|cong diem|tinh diem)[^\n]{0,80}(quy che|quy dinh|ngoai khoa|hoat dong|tinh nguyen|cong tac xa hoi)/u;

// 2. Hoạt động (cuộc thi, workshop, talkshow, tình nguyện...) có kèm link/form đăng ký
const RECOGNIZE_EVENT =
  /(cuoc thi|hoi thi|contest|competition|vong loai|workshop|talkshow|toa dam|hoi thao|seminar|chuyen de|showcase|co vu|tham quan|tinh nguyen|chu nhat xanh|hien mau)/u;

const RECOGNIZE_ACTION =
  /(forms\.gle|docs\.google\.com\/forms|google form|link dang ky|bieu mau|mo don|dang ky tham gia|tham gia ngay|quet ma qr|bom\.so|bit\.ly)/u;

export const isDrlPost = (message: string) => {
  const norm = normalize(message);
  return RECOGNIZE_DRL.test(norm) || (RECOGNIZE_EVENT.test(norm) && RECOGNIZE_ACTION.test(norm));
};

// Mẫu nhận diện các dòng thông tin cốt lõi khi rút gọn (compact)
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
    ? new RegExp("(" + extraKeywords.map((k) => escapeRegex(normalize(k))).join("|") + ")")
    : null;

  for (const line of lines) {
    if (line.length >= MAX_COMPACT_LINE_LEN || seen.has(line)) continue;
    const norm = normalize(line);
    if (CORE_PATTERN.test(norm) || (extraPattern && extraPattern.test(norm))) {
      seen.add(line);
      keyInfo.push(line);
    }
  }

  return { title, keyInfo };
}
