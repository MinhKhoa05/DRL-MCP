const URL_REGEX = /https?:\/\/[^\s\)\"\'<>]+/gi;

// Bỏ dấu, chữ thường: "Đăng ký" khớp "dang ky"
export const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/đ/g, "d");

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

export const isDrlPost = (m: string) => {
  const norm = normalize(m);
  return RECOGNIZE_DRL.test(norm) || (RECOGNIZE_EVENT.test(norm) && RECOGNIZE_ACTION.test(norm));
};