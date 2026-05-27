import { authApi } from "@/lib/data/auth_api";
import { authStore } from "@/store/authStore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Alert, Platform } from "react-native";

WebBrowser.maybeCompleteAuthSession();

export const useSocialAuth = () => {
  const [isSocialLoading, setIsSocialLoading] = useState(false);
  const router = useRouter();

  // 공통 소셜 로그인 핸들러 (백엔드 주도로 처리)
  const handleSocialLogin = async (provider: "kakao" | "naver" | "google") => {
    setIsSocialLoading(true);
    try {
      // 1. 백엔드의 소셜 로그인 시작 엔드포인트
      // Spring Security OAuth2 기본 경로는 보통 /oauth2/authorization/{provider} 입니다.
      const BACKEND_AUTH_URL = `https://rutina.co.kr/oauth2/authorization/${provider}`;

      // 모바일 딥링크 주소 생성 (예: exp://192.../--/oauth 또는 rutinafrontend://oauth)
      const DEEP_LINK_URI = Linking.createURL(
        "exp://rutina.co.kr/oauth/callback",
      );

      // 브라우저 열기 (프론트 -> 백엔드로 이동)
      // 주의: 백엔드에서 인증 완료 후, 최종적으로 DEEP_LINK_URI 로 리다이렉트 시켜줘야 모바일 앱으로 브라우저가 닫히면서 돌아옵니다.
      const result = await WebBrowser.openAuthSessionAsync(
        BACKEND_AUTH_URL,
        DEEP_LINK_URI,
      );
      console.log("result", result);
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
            // 최초 로그인 (회원가입 필요 시) -> 추가 정보 화면으로 이동
            router.replace({
              pathname: "/onboarding/signup2",
              params: { email, nickname, isSocial: "true" },
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
      Alert.alert(
        "소셜 로그인 오류",
        error.message || "로그인 중 문제가 발생했습니다.",
      );
    } finally {
      setIsSocialLoading(false);
    }
  };

  // Apple 로그인 핸들러 (네이티브 SDK 사용)
  const handleAppleLogin = async () => {
    if (Platform.OS !== "ios") {
      Alert.alert("알림", "Apple 로그인은 iOS에서만 사용할 수 있습니다.");
      return;
    }

    setIsSocialLoading(true);
    try {
      // 1. Apple 네이티브 인증 요청
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const identityToken = credential.identityToken;
      if (!identityToken) {
        throw new Error("Apple로부터 인증 토큰을 받지 못했습니다.");
      }

      // 2. 최초 로그인 시에만 email, fullName이 제공됨
      const email = credential.email || null;
      const nickname = credential.fullName
        ? [credential.fullName.familyName, credential.fullName.givenName]
            .filter(Boolean)
            .join("")
        : null;

      // 3. 백엔드에 identityToken + email/nickname 전송
      const data = await authApi.appleLogin(identityToken, email, nickname);

      const accessToken =
        data?.data?.accessToken || data?.accessToken || data?.token;
      const refreshToken = data?.data?.refreshToken || data?.refreshToken;
      const isNewUser =
        data?.data?.isNewUser ?? data?.isNewUser ?? false;
      const responseEmail =
        data?.data?.email || data?.email || email || "";
      const responseNickname =
        data?.data?.nickname || data?.nickname || nickname || "";

      if (accessToken) {
        // 토큰 저장
        await AsyncStorage.setItem("userToken", accessToken);
        if (refreshToken) {
          await AsyncStorage.setItem("refreshToken", refreshToken);
        }

        if (isNewUser === true || isNewUser === "true") {
          // 최초 회원가입 -> 추가 정보 입력 화면으로 이동
          router.replace({
            pathname: "/onboarding/signup2",
            params: {
              email: responseEmail,
              nickname: responseNickname,
              isSocial: "true",
            },
          });
        } else {
          // 기존 회원 -> 메인 화면으로 이동
          authStore.setLoggedIn(true);
          router.replace("/(tabs)");
        }
      } else {
        throw new Error("백엔드로부터 토큰을 받지 못했습니다.");
      }
    } catch (error: any) {
      // 사용자가 Apple 로그인을 취소한 경우
      if (error.code === "ERR_REQUEST_CANCELED") {
        console.log("Apple 로그인 취소됨");
        return;
      }
      console.log("Apple Login Error:", error);
      Alert.alert(
        "Apple 로그인 오류",
        error.message || "로그인 중 문제가 발생했습니다.",
      );
    } finally {
      setIsSocialLoading(false);
    }
  };

  return {
    handleKakaoLogin: () => handleSocialLogin("kakao"),
    handleNaverLogin: () => handleSocialLogin("naver"),
    handleGoogleLogin: () => handleSocialLogin("google"),
    handleAppleLogin,
    isSocialLoading,
  };
};

