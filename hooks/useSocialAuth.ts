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

  // 토큰 저장 및 라우팅을 처리하는 공통 로직
  const handleAuthResponse = async (data: any, defaultEmail = "", defaultNickname = "") => {
    // 백엔드 응답 구조에 맞춰 옵셔널 체이닝 처리
    const accessToken = data?.data?.accessToken || data?.accessToken || data?.token;
    const refreshToken = data?.data?.refreshToken || data?.refreshToken;
    const isNewUser = data?.data?.isNewUser ?? data?.isNewUser ?? false;
    const responseEmail = data?.data?.email || data?.email || defaultEmail;
    const responseNickname = data?.data?.nickname || data?.nickname || defaultNickname;

    if (!accessToken) {
      throw new Error("백엔드로부터 엑세스 토큰을 받지 못했습니다.");
    }

    // 토큰 로컬 저장
    await AsyncStorage.setItem("userToken", accessToken);
    if (refreshToken) {
      await AsyncStorage.setItem("refreshToken", refreshToken);
    }

    // 회원 구분 후 화면 이동
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

  // 1. 카카오, 네이버, 구글 핸들러 (Authorization Code 방식)
  const handleSocialLogin = async (provider: "kakao" | "naver" | "google") => {
    setIsSocialLoading(true);
    try {
      const BACKEND_AUTH_URL = `https://rutina.co.kr/oauth2/authorization/${provider}`;
      const DEEP_LINK_URI = Linking.createURL("exp://rutina.co.kr/oauth/callback");

      // 웹브라우저로 백엔드 로그인창 실행
      const result = await WebBrowser.openAuthSessionAsync(BACKEND_AUTH_URL, DEEP_LINK_URI);
      console.log(`${provider} 브라우저 인증 결과:`, result);

      if (result.type === "success" && result.url) {
        // 이제 백엔드가 토큰 대신 ?code=... 주소로 리다이렉트 해줍니다.
        const urlObj = new URL(result.url);
        const code = urlObj.searchParams.get("code");
        console.log(`${provider}에서 받은 인증 코드:`, code);

        if (!code) {
          throw new Error("인증 코드(code)를 찾을 수 없습니다.");
        }

        // [변경 핵심] 추출한 code로 백엔드에 토큰 교환 API 요청
        // (필요 시 provider 정보나 email 등을 body/query에 함께 담아야 할 수 있습니다)
        const responseData = await authApi.exchangeSocialToken(code, provider);
        console.log(`${provider} 토큰 교환 성공:`, responseData.data);
        
        // 공통 저장 및 이동 함수 실행
        await handleAuthResponse(responseData.data);
      }
    } catch (error: any) {
      console.log(`${provider} Login Error:`, error);
      Alert.alert("소셜 로그인 오류", error.message || "로그인 중 문제가 발생했습니다.");
    } finally {
      setIsSocialLoading(false);
    }
  };

  // 2. Apple 로그인 핸들러 (네이티브 SDK -> Authorization Code 전달 방식)
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

      // 백엔드가 code 방식을 요구하므로 authorizationCode를 추출합니다.
      const authorizationCode = credential.authorizationCode;
      const identityToken = credential.identityToken; // 기존 JWT (필요시 함께 전송)

      if (!authorizationCode) {
        throw new Error("Apple로부터 인증 코드(code)를 받지 못했습니다.");
      }

      // 최초 로그인 시에만 제공되는 유저 정보 포맷팅
      const email = credential.email || "";
      const nickname = credential.fullName
        ? [credential.fullName.familyName, credential.fullName.givenName].filter(Boolean).join("")
        : "";

      // [변경 핵심] 타 소셜과 동일한 토큰 교환 API 호출 구조로 변경
      // 백엔드 명세서에 맞추어 body 구조를 조율하세요. (예: authorizationCode 전달)
      const responseData = await authApi.exchangeSocialToken(
        authorizationCode,
        "apple",
        identityToken,
        email,
        nickname
      );
      await handleAuthResponse(responseData, email, nickname);

      console.log("Apple 토큰 교환 성공:", responseData.data);

      // 공통 저장 및 이동 함수 실행 (최초 정보 유실을 방지하기 위해 기본값 세팅)

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