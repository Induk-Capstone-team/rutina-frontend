import { authStore } from "@/store/authStore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Alert } from "react-native";

WebBrowser.maybeCompleteAuthSession();

export const useSocialAuth = () => {
  const [isSocialLoading, setIsSocialLoading] = useState(false);
  const router = useRouter();

  // 공통 소셜 로그인 핸들러 (백엔드 주도로 처리)
  const handleSocialLogin = async (provider: "kakao" | "naver") => {
    setIsSocialLoading(true);
    try {
      // 1. 백엔드의 소셜 로그인 시작 엔드포인트
      // Spring Security OAuth2 기본 경로는 보통 /oauth2/authorization/{provider} 입니다.
      const BACKEND_AUTH_URL = `http://3.35.117.128:8080/oauth2/authorization/${provider}`;

      // 모바일 딥링크 주소 생성 (예: exp://192.../--/oauth 또는 rutinafrontend://oauth)
      const DEEP_LINK_URI = Linking.createURL('http://localhost:3000/oauth/callback');

      // 브라우저 열기 (프론트 -> 백엔드로 이동)
      // 주의: 백엔드에서 인증 완료 후, 최종적으로 DEEP_LINK_URI 로 리다이렉트 시켜줘야 모바일 앱으로 브라우저가 닫히면서 돌아옵니다.
      const result = await WebBrowser.openAuthSessionAsync(BACKEND_AUTH_URL, DEEP_LINK_URI);

      if (result.type === "success" && result.url) {
        // 3. 백엔드에서 프론트로 토큰과 함께 리다이렉트 해준 url을 파싱합니다.
        // 예: rutinafrontend://oauth?accessToken=...&refreshToken=...&isNewUser=true
        const urlParams = new URL(result.url);
        const accessToken = urlParams.searchParams.get("accessToken");
        const refreshToken = urlParams.searchParams.get("refreshToken");
        const isNewUser = urlParams.searchParams.get("isNewUser");
        const email = urlParams.searchParams.get("email") || "";
        const nickname = urlParams.searchParams.get("nickname") || "";

        if (accessToken) {
          // 토큰 저장
          await AsyncStorage.setItem("userToken", accessToken);
          if (refreshToken) {
            await AsyncStorage.setItem("refreshToken", refreshToken);
          }

          if (isNewUser === "true") {
            // 최초 로그인 (회원가입 필요 시)
            router.replace({
              pathname: "/onboarding/signup",
              params: { email, nickname }
            });
          } else {
            // 기존 회원 (메인 화면으로 이동)
            authStore.setLoggedIn(true);
            router.replace("/(tabs)");
          }
        } else {
          throw new Error("백엔드로부터 토큰을 받지 못했습니다.");
        }
      }
    } catch (error: any) {
      console.log(`${provider} Login Error:`, error);
      Alert.alert("소셜 로그인 오류", error.message || "로그인 중 문제가 발생했습니다.");
    } finally {
      setIsSocialLoading(false);
    }
  };

  return {
    handleKakaoLogin: () => handleSocialLogin("kakao"),
    handleNaverLogin: () => handleSocialLogin("naver"),
    isSocialLoading,
  };
};
