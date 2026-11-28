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

// 1. Động từ ghi nhận ... trong vòng ~80 ký tự ... đối tượng ĐRL / quy chế / hoạt động
const RECOGNIZE_BENEFIT =
  /(ghi nhan|cong diem|tinh diem|xem xet ghi nhan)[^\n]{0,80}(diem ren luyen|ren luyen|quy che|quy dinh|ngoai khoa|hoat dong|tinh nguyen)/u;

// 2. Quyền lợi ĐRL trực tiếp: "điểm rèn luyện theo quy định / quy chế hiện hành"
const RECOGNIZE_DRL_DIRECT = /(diem ren luyen|drl)[^\n]{0,40}(theo quy dinh|theo quy che|hien hanh)/u;

// 3. Hoạt động có dấu hiệu cuộc thi, workshop, tọa đàm, tham quan... có mở form/link đăng ký tham gia
const RECOGNIZE_EVENT =
  /(cuoc thi|hoi thi|contest|competition|vong loai|workshop|toa dam|seminar|chuyen de|showcase|co vu|tham quan)/u;
const RECOGNIZE_ACTION = /(forms\.gle|google form|link dang ky|mo don|dang ky tham gia|tham gia ngay|bom\.so)/u;

export const isDrlPost = (m: string) => {
  const norm = normalize(m);
  if (RECOGNIZE_BENEFIT.test(norm) || RECOGNIZE_DRL_DIRECT.test(norm)) return true;
  return RECOGNIZE_EVENT.test(norm) && RECOGNIZE_ACTION.test(norm);
};
