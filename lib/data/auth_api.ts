import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "./api_client";

export const authApi = {
  ///회원가입 요청 (이메일 로그인 사용자)
  signup: async (
    email: string,
    password?: string,
    nickname?: string,
    age?: number,
    job?: string,
    gender?: number | string,
  ) => {
    const { data } = await apiClient.post("/api/v1/auth/signup", {
      email,
      password,
      nickname,
      age,
      job,
      gender,
    });
    return data; // 서버에서 토큰(JWT) 등을 보내준다고 가정
  },

  /// 프로필 업데이트 요청 (나이, 직업, 성별 추가 정보 입력용)
  updateProfile: async (
    age: number,
    job: string,
    gender: number | string,
  ) => {
    const { data } = await apiClient.patch("/api/v1/users/me/profile", {
      age,
      job,
      gender,
    });
    return data;
  },

  /// 프로필 조회 요청
  getProfile: async () => {
    const { data } = await apiClient.get("/api/v1/users/me");
    return data;
  },

  ///이메일 중복 확인 요청
  checkEmail: async (email: string) => {
    const { data } = await apiClient.get(
      `/api/v1/auth/check-email?email=${encodeURIComponent(email)}`,
    );
    return data;
  },

  /// 이메일 인증 코드 발송
  sendVerificationCode: async (email: string) => {
    const { data } = await apiClient.post("/api/v1/auth/email/verification-code", {
      email,
    });
    return data;
  },

  /// 이메일 인증 코드 확인
  verifyCode: async (email: string, code: string) => {
    const { data } = await apiClient.post(
      "/api/v1/auth/email/verification-code/verify",
      { email, code },
    );
    return data;
  },

  ///로그인 요청
  login: async (email: string, password: string) => {
    const { data } = await apiClient.post("/api/v1/auth/login", {
      email,
      password,
    });
    return data; // 서버에서 토큰(JWT) 등을 보내준다고 가정
  },

  /// 로그아웃 요청
  logout: async () => {
    const refreshToken = await AsyncStorage.getItem("refreshToken");

    const { data } = await apiClient.post("/api/v1/auth/logout", {
      refreshToken: refreshToken, // 로그아웃 시 리프레쉬 토큰도 함께 보내서 서버에서 만료시킴
    });
    return data;
  },
};
