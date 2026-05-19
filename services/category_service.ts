// services/category_service.ts
import { api } from "@/lib/data/api";

export interface Category {
  id: number;
  name: string;
  colorCode: string;
  rtSum: string;
  sortOrder: number;
  hidden: boolean;
}

export const CategoryService = {
  // 기본 목록 조회 (hidden=false만)
  getAll: async (): Promise<Category[]> => {
    return await api("/categories");
  },

  // 숨김 포함 전체 조회
  getAllIncludingHidden: async (): Promise<Category[]> => {
    return await api("/categories/all");
  },

  // 숨김 카테고리만 조회
  getHidden: async (): Promise<Category[]> => {
    return await api("/categories/hidden");
  },

  // 생성
  create: async (name: string, colorCode: string): Promise<Category> => {
    return await api("/categories", {
      method: "POST",
      body: JSON.stringify({ name, colorCode }),
    });
  },

  // 수정 (이름, 색상, 숨김 여부)
  update: async (
    categoryId: number,
    data: { name?: string; colorCode?: string; hidden?: boolean },
  ): Promise<Category> => {
    return await api(`/categories/${categoryId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // 삭제 (주의: 속한 루틴도 함께 삭제됨)
  delete: async (categoryId: number): Promise<void> => {
    await api(`/categories/${categoryId}`, { method: "DELETE" });
  },

  // 순서 변경
  reorder: async (categoryIds: number[]): Promise<void> => {
    await api("/categories/reorder", {
      method: "PUT",
      body: JSON.stringify({ categoryIds }),
    });
  },
};
