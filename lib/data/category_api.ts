import type { CategoryRequest, RoutineCategory } from "@/types/routine";
import axios from "axios";

const api = axios.create({
  baseURL: "http://3.35.117.128:8080",
});

type ApiResponse<T> = {
  success: boolean;
  code: string;
  message: string;
  data: T;
};

export const CategoryApi = {
  // 내 카테고리 목록 조회
  getAll: async (): Promise<RoutineCategory[]> => {
    const response =
      await api.get<ApiResponse<RoutineCategory[]>>("/api/v1/categories");

    return Array.isArray(response.data.data) ? response.data.data : [];
  },

  // 카테고리 단건 조회
  getById: async (categoryId: number): Promise<RoutineCategory> => {
    const response = await api.get<ApiResponse<RoutineCategory>>(
      `/api/v1/categories/${categoryId}`,
    );

    return response.data.data;
  },

  // 카테고리 생성
  create: async (body: CategoryRequest): Promise<RoutineCategory> => {
    const response = await api.post<ApiResponse<RoutineCategory>>(
      "/api/v1/categories",
      body,
    );

    return response.data.data;
  },

  //카테고리 수정
  update: async (
    categoryId: number,
    body: CategoryRequest,
  ): Promise<RoutineCategory> => {
    const response = await api.put<ApiResponse<RoutineCategory>>(
      `/api/v1/categories/${categoryId}`,
      body,
    );

    return response.data.data;
  },

  // 카테고리 삭제
  delete: async (categoryId: number): Promise<string> => {
    const response = await api.delete<ApiResponse<string>>(
      `/api/v1/categories/${categoryId}`,
    );

    return response.data.data;
  },

  //카테고리 순서 변경
  reorder: async (categoryIds: number[]): Promise<string> => {
    const response = await api.put<ApiResponse<string>>(
      "/api/v1/categories/reorder",
      {
        categoryIds,
      },
    );

    return response.data.data;
  },
};
