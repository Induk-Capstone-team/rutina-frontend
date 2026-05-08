import { authApi } from "@/lib/data/auth_api";
import { authStore } from "@/store/authStore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useState } from "react";

export const useAuthViewModel = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await authApi.login(email, password);

      const accessToken =
        data?.data?.accessToken || data?.accessToken || data?.token;

      const refreshToken = data?.data?.refreshToken || data?.refreshToken;

      // 토큰이 없으나 응답 메시지에 "성공"이 들어있다면 성공으로 간주
      const isSuccess =
        accessToken ||
        (data?.message && data.message.includes("성공")) ||
        data?.success;

      if (!isSuccess) {
        throw new Error(data?.message || "로그인에 실패했습니다.");
      }

      console.log("로그인 성공 응답 전체:", JSON.stringify(data));

      if (accessToken) {
        await AsyncStorage.setItem("userToken", accessToken);
      }

      if (refreshToken) {
        await AsyncStorage.setItem("refreshToken", refreshToken);
      }

      authStore.setLoggedIn(true);
      router.replace("/(tabs)"); // 메인 화면으로 이동
    } catch (err: any) {
      console.log("로그인 에러:", err);
      // 서버에서 보내는 에러 메시지가 있다면 사용하고, 없다면 기본 메시지 출력
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "이메일 또는 비밀번호를 확인해주세요.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, password: string, nickname: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await authApi.signup(email, password, nickname);
      console.log("회원가입 성공:", data);
      return true; // 성공 여부 반환
    } catch (err: any) {
      console.log("회원가입 에러:", err);
      setError(err.response?.data?.message || err.message || "회원가입 실패");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await authApi.logout();
    } catch (err: any) {
      console.log("서버 로그아웃 에러:", err);
      // 서버 오류가 나더라도 디바이스 내부에서는 무조건 로그아웃 처리
      setError(
        err.response?.data?.message || "서버 로그아웃 중 예외가 발생했습니다.",
      );
    } finally {
      await AsyncStorage.removeItem("userToken");
      await AsyncStorage.removeItem("refreshToken");
      authStore.setLoggedIn(false);
      router.replace("/onboarding/login");
      setIsLoading(false);
    }
  };

  const checkEmail = async (email: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await authApi.checkEmail(email);
      return data;
    } catch (err: any) {
      console.log("이메일 중복 확인 에러:", err);
      // 서버 에러 메시지가 있으면 사용
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { login, signup, logout, checkEmail, isLoading, error, setError };
};
