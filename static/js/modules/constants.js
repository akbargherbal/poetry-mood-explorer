/* ============================================================================
   Constants — axis metadata, fixed tag color palette
   ========================================================================= */

export const AXES = ["mood", "genre", "energy", "aesthetic"];

export const AXIS_META = {
  mood:      { label: "Mood — المزاج",       accent: "#D9AE45" },
  genre:     { label: "Genre — الغرض",       accent: "#57998D" },
  energy:    { label: "Energy — الطاقة",      accent: "#C9642E" },
  aesthetic: { label: "Aesthetic — الجمالية", accent: "#9C7FBF" },
};

// Fixed, hand-picked colors per tag
export const TAG_COLORS = {
  mood: {
    "فرح": "#D9AE45", "حزن": "#6E86A8", "غضب": "#B84A3E", "تشاؤم": "#7A6E8C",
    "تفاؤل وأمل": "#9BAA4E", "حنين وشوق": "#57998D", "وحدة": "#4E5A6E",
    "شكوى": "#A8703D", "عتاب": "#B06B8F", "تأمل": "#6E8C86",
  },
  genre: {
    "غزل": "#B06B8F", "خمريات": "#8C3A3A", "رثاء": "#5A5A6E", "مدح": "#D9AE45",
    "هجاء": "#B84A3E", "فخر": "#C98A2E", "حكمة": "#4E8C82", "زهد": "#7A8C4E",
    "وصف": "#6E86A8", "حماسة": "#C9642E",
  },
  energy: {
    "هادئ جدا": "#2E5A54", "هادئ": "#4E8C82", "متوسط": "#9C8F5A",
    "نشيط": "#C98A2E", "شديد الحماس": "#C9642E",
  },
  aesthetic: {
    "تراثي أصيل": "#B8912F", "ملحمي أوركسترالي": "#8C3A3A", "صوفي روحاني": "#7A6E9C",
    "عسكري حماسي": "#C9642E", "رومانسي عاطفي": "#B06B8F", "حزين كئيب": "#5A5A6E",
    "احتفالي شعبي": "#9BAA4E",
  },
};

export function tagColor(axis, tag) {
  return (TAG_COLORS[axis] && TAG_COLORS[axis][tag]) || AXIS_META[axis].accent;
}