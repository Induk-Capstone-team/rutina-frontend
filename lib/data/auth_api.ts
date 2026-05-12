import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const api = axios.create({
  baseURL: "http://3.35.117.128:8080",
});

export const authApi = {
  ///회원가입 요청 (이메일 로그인 사용자)
  signup: async (
    email: string,
    password?: string,
    nickname?: string,
    age?: number,
    job?: string,
    gender?: string,
  ) => {
    const { data } = await api.post("/api/v1/auth/signup", {
      email,
      password,
      nickname,
      age,
      job,
      gender,
    });
    return data; // 서버에서 토큰(JWT) 등을 보내준다고 가정
  },

  /// 프로필 업데이트 요청 (소셜 로그인 사용자 등 추가 정보 입력용)
  updateProfile: async (age: number, job: string, gender: string) => {
    const token = await AsyncStorage.getItem("userToken");
    const { data } = await api.post(
      "/api/v1/user/profile", // TODO: 실제 백엔드 엔드포인트로 수정 필요
      { age, job, gender },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return data;
  },

  ///이메일 중복 확인 요청
  checkEmail: async (email: string) => {
    const { data } = await api.get(`/api/v1/auth/check-email?email=${encodeURIComponent(email)}`);
    return data;
  },

  ///로그인 요청
  login: async (email: string, password: string) => {
    const { data } = await api.post("/api/v1/auth/login", { email, password });
    return data; // 서버에서 토큰(JWT) 등을 보내준다고 가정
  },

  /// 로그아웃 요청
  logout: async () => {
    const token = await AsyncStorage.getItem("userToken");
    const refreshToken = await AsyncStorage.getItem("refreshToken");

    const { data } = await api.post(
      "/api/v1/auth/logout",
      {
        refreshToken: refreshToken, // 로그아웃 시 리프레쉬 토큰도 함께 보내서 서버에서 만료시킴
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    return data;
  },
};
