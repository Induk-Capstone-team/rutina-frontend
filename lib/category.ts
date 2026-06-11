//lib/category.ts
import type { ScheduleRoutine } from "@/types/routine";

export type CustomCategory = {
  name: string;
  color: string;
};

export function normalizeHexColor(color: string): string {
  const value = color.trim().toUpperCase();
  return value.startsWith("#") ? value : `#${value}`;
}

export function uniqueColors(colors: string[]): string[] {
  return Array.from(new Set(colors.map(normalizeHexColor)));
}

export function uniqueCustomCategories(
  categories: CustomCategory[],
): CustomCategory[] {
  const map = new Map<string, CustomCategory>();
  categories.forEach((item) => {
    const name = item.name.trim();
    if (!name) return;
    map.set(name.toLowerCase(), {
      name,
      color: normalizeHexColor(item.color),
    });
  });
  return Array.from(map.values());
}

export function getCategoryBadgeStyle(
  categoryName: string,
  categoryColor: string,
): { backgroundColor: string; textColor: string; borderColor: string } {
  const fixed = EVENT_TYPES[categoryName];
  if (fixed) {
    return {
      backgroundColor: fixed.bg,
      textColor: fixed.text,
      borderColor: fixed.dot,
    };
  }
  return {
    backgroundColor: `${categoryColor}22`,
    textColor: categoryColor,
    borderColor: categoryColor,
  };
}
// 타입
export type EventTypeStyle = {
  bg: string;
  dot: string;
  text: string;
};

// 상수

export const EVENT_TYPES: Record<string, EventTypeStyle> = {
  기상: { bg: "#FAEEEE", dot: "#E79A95", text: "#5D4645" },
  운동: { bg: "#FDF4EC", dot: "#EFB996", text: "#675141" },
  공부: { bg: "#F1F1FB", dot: "#9FA2D6", text: "#3E426F" },
  명상: { bg: "#F1F7EE", dot: "#A8CD9B", text: "#4C5D44" },
  저녁: { bg: "#FEF9EE", dot: "#E6CF8A", text: "#685A3F" },
  기타: { bg: "#F3F4F8", dot: "#C4C6D0", text: "#8A8C9A" },
};
export const DEFAULT_CATEGORIES = Object.keys(
  EVENT_TYPES,
) as (keyof typeof EVENT_TYPES)[];
export const DEFAULT_CATEGORY_NAME = "기타";
// 유틸 함수
export function hexToRgba(hex: string, alpha: number): string {
  const cleaned = hex.replace("#", "");
  if (cleaned.length !== 6) return hex;
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function normalizeCategoryName(categoryName?: string | null): string {
  const trimmed = categoryName?.trim();
  return trimmed ? trimmed : DEFAULT_CATEGORY_NAME;
}

// 루틴 기반 스타일 반환
export function getCategoryStyle(
  routine: ScheduleRoutine,
  isDark = false,
): EventTypeStyle {
  // 서버 색상이 있으면 항상 우선 적용
  if (routine.color) {
    return {
      bg: hexToRgba(routine.color, 0.14),
      dot: routine.color,
      text: routine.color,
    };
  }
  const name = routine.categoryName ?? DEFAULT_CATEGORY_NAME;
  const fixed = EVENT_TYPES[name];
  if (fixed)
    return isDark ? { ...fixed, bg: hexToRgba(fixed.dot, 0.2) } : fixed;
  const fallback = EVENT_TYPES[DEFAULT_CATEGORY_NAME];
  return isDark ? { ...fallback, bg: hexToRgba(fallback.dot, 0.2) } : fallback;
}

// 카테고리명 + 커스텀 색상 맵 기반 스타일 반환
export function getCategoryChipStyle(
  categoryName: string,
  customCategoryColorMap: Record<string, string>,
  isDark = false,
): EventTypeStyle {
  const fixed = EVENT_TYPES[categoryName];
  if (fixed)
    return isDark ? { ...fixed, bg: hexToRgba(fixed.dot, 0.2) } : fixed;
  const customColor = customCategoryColorMap[categoryName];
  if (customColor) {
    return {
      bg: hexToRgba(customColor, 0.14),
      dot: customColor,
      text: customColor,
    };
  }
  const fallback = EVENT_TYPES[DEFAULT_CATEGORY_NAME];
  return isDark ? { ...fallback, bg: hexToRgba(fallback.dot, 0.2) } : fallback;
}
