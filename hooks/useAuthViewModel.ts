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
      console.log("로그인 성공:", data);

      // 서버에서 응답받은 데이터에 토큰이 있다면 AsyncStorage에 저장
      if (data && data.token) {
        await AsyncStorage.setItem("userToken", data.token);
      } else if (data && data.accessToken) {
        await AsyncStorage.setItem("userToken", data.accessToken);
      }

      authStore.setLoggedIn(true);
      router.replace("/(tabs)"); // 메인 화면으로 이동
    } catch (err) {
      console.error("로그인 에러:", err);
      setError("이메일 또는 비밀번호를 확인해주세요.");
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
      console.error("회원가입 에러:", err);
      setError(err.response.data.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { login, signup, isLoading, error, setError };
};
