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

  // 💡 [추가] 백엔드 주도로 code를 전달해 최종 토큰과 회원 정보를 받아오는 API
  exchangeSocialToken: async (
    code: string,
    provider: string,
  ) => {
    const response = await publicClient.post("/api/v1/auth/oauth2/token", {
      code,
      provider,
    });

    // Axios response 객체의 알맹이(data)만 깔끔하게 반환하여 훅에서 파싱하기 좋게 만듭니다.
    return response.data;
  },

  // 앱 구동 시 토큰 유효성 및 신규 회원 검증 API
  checkNewUser: async (token?: string) => {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await apiClient.get("/api/v1/users/me/new-status", {
      headers,
    }); // 백엔드 엔드포인트에 맞춤
    return response.data;
  },

  getProfile: async () => {
    const response = await apiClient.get("/api/v1/users/me");
    return response.data;
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
  const { data } = await publicClient.post("/api/v1/auth/apple", { // 👈 publicClient로 변경!
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

  /// 비밀번호 변경 요청
  localPasswordChange: async (currentPassword: string, newPassword: string) => {
    const { data } = await apiClient.post("/api/v1/users/me/password", {
      currentPassword,
      newPassword,
    });
    return data;
  },

  /// 회원 탈퇴 요청
  deleteAccount: async () => {
    const { data } = await apiClient.delete("/api/v1/users/me");
    return data;
  },

  /// 비밀번호 재설정 1 - 요청 이메일
  localPasswordReset: async (email: string) => {
    const { data } = await publicClient.post("/api/v1/auth/email/password-reset-code", {
      email,
    });
    return data;
  },

  /// 비밀번호 재설정 2 - 인증 코드 확인
  localPasswordResetVerify: async (email: string, code: string) => {
    const { data } = await publicClient.post("/api/v1/auth/email/password-reset-code/verify", {
      email,
      code,
    });
    return data;
  },

  /// 비밀번호 재설정 3 - 인증 코드 확인 후 비밀번호 변경
  localPasswordResetConfirm: async (email: string, newPassword: string) => {
    const { data } = await publicClient.post("/api/v1/users/password-reset", {
      email,
      newPassword,
    });
    return data;
  },
};
