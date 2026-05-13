import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const BASE_URL = "http://3.35.117.128:8080/api/v1";

export const apiClient = async (
  endpoint: string,
  options?: {
    method?: string;
    body?: string;
  },
) => {
  const token = await AsyncStorage.getItem("userToken");
  console.log(`[API 요청] ${endpoint} | 토큰 존재 여부: ${!!token}`);

  try {
    const response = await axios({
      url: `${BASE_URL}${endpoint}`,
      method: options?.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      data: options?.body ? JSON.parse(options.body) : undefined,
      maxRedirects: 0, // 리다이렉트 차단
    });

    if (
      typeof response.data === "string" &&
      response.data.includes("<!DOCTYPE html>")
    ) {
      await AsyncStorage.removeItem("userToken");
      throw new Error("인증 세션이 만료되었거나 권한이 없습니다.");
    }

    console.log("응답 데이터:", JSON.stringify(response.data));

    if (response.data?.success === false) {
      throw new Error(response.data.message ?? "API 오류");
    }

    return response.data?.data ?? response.data;
  } catch (error: any) {
    if (error.response?.status === 401 || error.response?.status === 403) {
      await AsyncStorage.removeItem("userToken");
      console.error("인증 에러: 토큰 만료 또는 권한 없음");
    }
    console.error("[API 에러 상세]", {
      status: error.response?.status,
      data: JSON.stringify(error.response?.data),
      url: error.config?.url,
      method: error.config?.method,
      requestBody: error.config?.data,
    });
    throw error;
  }
};
