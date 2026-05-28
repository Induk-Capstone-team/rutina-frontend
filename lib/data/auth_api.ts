import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient, { publicClient } from "./api_client";



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

  // ★ 2. 여기에 새 메서드를 추가하고 publicClient로 호출합니다.
  exchangeSocialToken: async (
    code: string, 
    provider: string, 
    identityToken?: string | null, 
    email?: string | null, 
    nickname?: string | null
  ) => {
    // 인터셉터가 없는 순수 publicClient를 사용하므로 토큰 충돌이 나지 않습니다.
    const response = await publicClient.post("/api/v1/auth/oauth2/token", {
      code,
      provider,
      identityToken,
      email,
      nickname
    });
    return response.data;
  },

  checkIsNewUser: async () => {
    const { data } = await publicClient.get(
      "/api/v1/users/me/new-status",
    );
    return data.isNewUser;
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

  /// Apple 소셜 로그인 요청
  appleLogin: async (identityToken: string, email?: string | null, nickname?: string | null) => {
    const { data } = await apiClient.post("/api/v1/auth/apple", {
      identityToken,
      email,
      nickname,
    });
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

  /// 닉네임 수정 요청
  updateNickname: async (nickname: string) => {
    const { data } = await apiClient.patch("/api/v1/users/me/nickname", {
      nickname,
    });
    return data;
  },

  /// 회원 탈퇴 요청
  deleteAccount: async () => {
    const { data } = await apiClient.delete("/api/v1/users/me");
    return data;
  },
};
