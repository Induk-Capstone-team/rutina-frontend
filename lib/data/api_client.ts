import { authStore } from "@/store/authStore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const apiClient = axios.create({
  baseURL: "https://rutina.co.kr",
});

export class NoTokenError extends Error {
  constructor() {
    super("토큰 없음: 요청 취소");
    this.name = "NoTokenError";
  }
}

// 💡 인증 인터셉터가 없는 순수 퍼블릭 클라이언트
const publicClient = axios.create({
  baseURL: "https://rutina.co.kr",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// 💡 새 토큰 교환 주소(/api/v1/auth/oauth2/token)를 퍼블릭 목록에 추가
const PUBLIC_ENDPOINTS = [
  "/api/v1/auth/login",
  "/api/v1/auth/signup",
  "/api/v1/auth/check-email",
  "/api/v1/auth/email/verification-code",
  "/api/v1/auth/email/verification-code/verify",
  "/api/v1/auth/apple",
  "/api/v1/auth/oauth2/token", 
];

apiClient.interceptors.request.use(async (config) => {
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
    
    // ⚠️ 주의: 백엔드 로그인 검증 API 세팅이 덜 끝났을 때 토큰이 날아가는 걸 방지하기 위해 
    // 실제 주소가 /api/v1/auth/oauth2/token 인 경우는 세션을 끊지 않도록 방어하는 것도 좋습니다.
    if (error.response?.status === 401 || error.response?.status === 403) {
      await AsyncStorage.removeItem("userToken");
      authStore.setLoggedIn(false);
      return Promise.reject(error);
    }

    return Promise.reject(error);
  },
);

export default apiClient;
export { publicClient };
