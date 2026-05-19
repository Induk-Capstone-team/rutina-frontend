import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const apiClient = axios.create({
  baseURL: "https://rutina.co.kr",
});

apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("userToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    // 만약 Spring Security가 200 OK와 함께 HTML 로그인 페이지를 반환한 경우 (인증 만료/실패)
    if (
      response.data &&
      typeof response.data === "string" &&
      (response.data.includes("<!DOCTYPE html>") || response.data.includes("<html"))
    ) {
      console.warn("⚠️ [apiClient] API 응답으로 JSON 대신 HTML이 수신되었습니다. 인증 세션 만료로 간주하여 401 에러를 유발합니다.");
      const error = new Error("인증 세션이 만료되었습니다. 다시 로그인해주세요.");
      (error as any).status = 401;
      (error as any).response = {
        status: 401,
        data: { message: "인증 세션이 만료되었습니다. 다시 로그인해주세요." }
      };
      return Promise.reject(error);
    }
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;
