import { authStore } from "@/store/authStore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const apiClient = axios.create({
  baseURL: "https://rutina.co.kr",
});
//커스텀 에러 클래스
export class NoTokenError extends Error {
  constructor() {
    super("토큰 없음: 요청 취소");
    this.name = "NoTokenError";
  }
}

const PUBLIC_ENDPOINTS = [
  "/api/v1/auth/login",
  "/api/v1/auth/signup",
  "/api/v1/auth/check-email",
  "/api/v1/auth/email/verification-code",
  "/api/v1/auth/email/verification-code/verify",
];
apiClient.interceptors.request.use(async (config) => {
  // 공개 엔드포인트는 토큰 체크 건너뜀
  const isPublic = PUBLIC_ENDPOINTS.some((endpoint) =>
    config.url?.includes(endpoint),
  );

  if (isPublic) return config;

  const token = await AsyncStorage.getItem("userToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    authStore.setLoggedIn(false);
    return Promise.reject(new NoTokenError());
  }
  return config;
});
apiClient.interceptors.response.use(
  (response) => {
    if (
      typeof response.data === "string" &&
      response.data.includes("<!DOCTYPE html>")
    ) {
      AsyncStorage.removeItem("userToken");
      throw new Error("인증 세션이 만료되었거나 권한이 없습니다.");
    }
    return response;
  },
  async (error) => {
    if ((error as any)?.name === "NoTokenError") return Promise.reject(error);
    if (axios.isCancel(error)) return Promise.reject(error);
    if (error.response?.status === 401 || error.response?.status === 403) {
      await AsyncStorage.removeItem("userToken");
      authStore.setLoggedIn(false);
      return Promise.reject(error);
    }

    return Promise.reject(error);
  },
);
export default apiClient;
