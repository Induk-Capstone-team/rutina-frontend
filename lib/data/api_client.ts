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

// 💡 새 토큰 교환 및 갱신 주소를 퍼블릭 목록에 추가
const PUBLIC_ENDPOINTS = [
  "/api/v1/auth/login",
  "/api/v1/auth/signup",
  "/api/v1/auth/check-email",
  "/api/v1/auth/email/verification-code",
  "/api/v1/auth/email/verification-code/verify",
  "/api/v1/auth/apple",
  "/api/v1/auth/oauth2/token",
  "/api/v1/auth/reissue", // 🔥 토큰 재발급 주소 추가
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
      AsyncStorage.removeItem("refreshToken"); // 함께 삭제
      throw new Error("인증 세션이 만료되었거나 권한이 없습니다.");
    }
    return response;
  },
  async (error) => {
    if ((error as any)?.name === "NoTokenError") return Promise.reject(error);
    if (axios.isCancel(error)) return Promise.reject(error);

    const originalRequest = error.config;

    // 🔥 401(인증 만료) 에러 발생 시 자동 갱신 처리
    if (error.response?.status === 401 && !originalRequest._retry) {
      // 재발급 요청 주소 자체에서 401이 터진 거라면 무한 루프 방지를 위해 즉시 로그아웃
      if (originalRequest.url?.includes("/api/v1/auth/reissue")) {
        await AsyncStorage.removeItem("userToken");
        await AsyncStorage.removeItem("refreshToken");
        authStore.setLoggedIn(false);
        return Promise.reject(error);
      }

      originalRequest._retry = true; // 중복 요청 방지 플래그 설정

      try {
        // 1. 저장소에서 리프레시 토큰 가져오기
        const refreshToken = await AsyncStorage.getItem("refreshToken");
        
        if (!refreshToken) {
          throw new Error("리프레시 토큰이 없습니다.");
        }

        // 2. 인증 헤더가 없는 publicClient를 사용해 reissue API 호출
        const response = await publicClient.post(
          "/api/v1/auth/reissue",
          {},
          {
            headers: {
              Authorization: `Bearer ${refreshToken}`,
            },
          }
        );

        // 3. 새로 발급받은 토큰 추출 (백엔드 응답 포맷인 accessToken / refreshToken 구조에 맞춰 확인 필요)
        const newAccessToken = response.data?.accessToken || response.data?.data?.accessToken;
        const newRefreshToken = response.data?.refreshToken || response.data?.data?.refreshToken;

        if (newAccessToken) {
          // 4. 새 토큰 저장소에 업데이트
          await AsyncStorage.setItem("userToken", newAccessToken);
          if (newRefreshToken) {
            await AsyncStorage.setItem("refreshToken", newRefreshToken);
          }

          // 5. 실패했던 기존 요청의 헤더를 새 토큰으로 교체한 뒤 재시도
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        }
      } catch (reissueError) {
        // 리프레시 토큰마저 만료되었거나 에러가 발생한 경우 -> 완전한 세션 만료 처리
        console.error("토큰 재발급 실패, 로그아웃 처리:", reissueError);
        await AsyncStorage.removeItem("userToken");
        await AsyncStorage.removeItem("refreshToken");
        authStore.setLoggedIn(false);
        return Promise.reject(reissueError);
      }
    }

    // 💡 403(권한 없음) 에러는 만료와 다르므로 재발급하지 않고 reject 처리합니다.
    if (error.response?.status === 403) {
      return Promise.reject(error);
    }

    return Promise.reject(error);
  },
);

export default apiClient;
export { publicClient };
