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

  // 💡 토큰 저장 및 분기 라우팅 처리 공통 로직
  const handleAuthResponse = async (resBody: any, defaultEmail = "", defaultNickname = "") => {
    // 백엔드의 다양한 데이터 반환 뎁스(Depth) 구조 방어막 형성
    const accessToken = resBody?.data?.accessToken || resBody?.accessToken || resBody?.token;
    const refreshToken = resBody?.data?.refreshToken || resBody?.refreshToken;
    const isNewUser = resBody?.data?.isNewUser ?? resBody?.isNewUser ?? false;
    const responseEmail = resBody?.data?.email || resBody?.email || defaultEmail;
    const responseNickname = resBody?.data?.nickname || resBody?.nickname || defaultNickname;

    if (!accessToken) {
      throw new Error("백엔드로부터 유효한 엑세스 토큰을 받지 못했습니다.");
    }

    // 로컬 스토리지에 토큰 세팅
    await AsyncStorage.setItem("userToken", accessToken);
    console.log("엑세스 토큰 저장 완료:", accessToken);
    if (refreshToken) {
      await AsyncStorage.setItem("refreshToken", refreshToken);
    }

    // 신규/기존 유저 판별 매니징
    if (isNewUser === true || isNewUser === "true") {
      router.replace({
        pathname: "/onboarding/signup2",
        params: {
          email: responseEmail,
          nickname: responseNickname,
          isSocial: "true",
        },
      });
    } else {
      authStore.setLoggedIn(true);
      router.replace("/(tabs)");
    }
  };

  // 🏃‍♂️ 1. 카카오, 네이버, 구글 핸들러 (Authorization Code 파싱 방식)
  const handleSocialLogin = async (provider: "kakao" | "naver" | "google") => {
    setIsSocialLoading(true);
    try {
      const BACKEND_AUTH_URL = `https://rutina.co.kr/oauth2/authorization/${provider}`;
      const DEEP_LINK_URI = Linking.createURL("exp://rutina.co.kr/oauth/callback");

      // 웹브라우저로 백엔드 로그인창 실행
      const result = await WebBrowser.openAuthSessionAsync(BACKEND_AUTH_URL, DEEP_LINK_URI);
      console.log(`${provider} 브라우저 인증 결과:`, result);

      if (result.type === "success" && result.url) {
        const urlObj = new URL(result.url);
        const code = urlObj.searchParams.get("code");

        if (!code) throw new Error("인증 코드가 없습니다.");

        // 백엔드 API 호출
        const response = await authApi.exchangeSocialToken(code, provider);

        // 내 눈으로 서버가 준 진짜 데이터 구조를 터미널에서 확인합니다.
        console.log(`🎯 서버가 준 실제 응답 원본 (${provider}):`, JSON.stringify(response, null, 2));

        const apiData = response.data ? response.data : response;

        // 알맹이 데이터만 공통 저장소로 토스!
        await handleAuthResponse(apiData);
      }
    } catch (error: any) {
      console.log(`${provider} Login Error:`, error);
      Alert.alert("소셜 로그인 오류", error.message || "로그인 중 문제가 발생했습니다.");
    } finally {
      setIsSocialLoading(false);
    }
  };

  // 🍎 2. Apple 로그인 핸들러 (네이티브 SDK -> API 요청 구조 통합)
  const handleAppleLogin = async () => {
    if (Platform.OS !== "ios") {
      Alert.alert("알림", "Apple 로그인은 iOS에서만 사용할 수 있습니다.");
      return;
    }

    setIsSocialLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const authorizationCode = credential.authorizationCode;
      const identityToken = credential.identityToken;

      if (!authorizationCode) {
        throw new Error("Apple 인증 코드(authorizationCode) 발급에 실패했습니다.");
      }

      // 최초 로그인인 경우에만 들어오는 데이터 포맷화
      const email = credential.email || "";
      const nickname = credential.fullName
        ? [credential.fullName.familyName, credential.fullName.givenName].filter(Boolean).join("")
        : "";

      // 🔥 [핵심 변경] 애플도 타 소셜과 동일하게 백엔드 전용 API 요청구조로 데이터 통합 전송
      const resultBody = await authApi.exchangeSocialToken(
        authorizationCode,
        "apple",
        identityToken,
        email,
        nickname
      );
      console.log("Apple API 토큰 교환 응답 본문:", resultBody);

      // 알맹이 데이터와 기본값 전달 처리 기조 일치 유도
      await handleAuthResponse(resultBody, email, nickname);

    } catch (error: any) {
      if (error.code === "ERR_REQUEST_CANCELED") {
        console.log("Apple 로그인 취소됨");
        return;
      }
      console.log("Apple Login Error:", error);
      Alert.alert("Apple 로그인 오류", error.message || "로그인 중 문제가 발생했습니다.");
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