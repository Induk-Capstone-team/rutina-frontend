import axios from "axios";

const api = axios.create({
  baseURL: "http://3.35.117.128:8080",
});

export const authApi = {
  ///회원가입 요청
  signup: async (email: string, password: string, nickname: string) => {
    const { data } = await api.post("/api/v1/auth/signup", {
      email,
      password,
      nickname,
    });
    return data; // 서버에서 토큰(JWT) 등을 보내준다고 가정
  },

  ///로그인 요청
  login: async (email: string, password: string) => {
    const { data } = await api.post("/api/v1/auth/login", { email, password });
    return data; // 서버에서 토큰(JWT) 등을 보내준다고 가정
  },

  /// 로그아웃 요청
  logout: async () => {
    const { data } = await api.post("/api/v1/auth/logout");
    return data;
  },
};
