// lib/data/api.ts
import apiClient from "./api_client";

export const api = async (
  endpoint: string,
  options?: { method?: string; body?: string },
) => {
  const response = await apiClient({
    url: `/api/v1${endpoint}`,
    method: options?.method ?? "GET",
    data: options?.body ? JSON.parse(options.body) : undefined,
  });

  if (response.data?.success === false) {
    throw new Error(response.data.message ?? "API 오류");
  }

  return response.data?.data ?? response.data;
};
