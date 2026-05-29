import { authApi } from "@/lib/data/auth_api";
import { authStore } from "@/store/authStore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as AppleAuthentication from "expo-apple-authentication";
import * as AuthSession from "expo-auth-session";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Alert, Platform } from "react-native";

WebBrowser.maybeCompleteAuthSession();

export const useSocialAuth = () => {
  const [isSocialLoading, setIsSocialLoading] = useState(false);
  const router = useRouter();

  /**
   * OAuth Redirect URI
   *
   * Expo Go:
   * exp://.../--/oauth/callback
   *
   * Dev Build / Production:
   * rutina://oauth/callback
   */
  const redirectUri = AuthSession.makeRedirectUri({
  scheme: "rutinafrontend",
  path: "oauth/callback",
  preferLocalhost: false,
});

  /**
   * 공통 응답 처리
   */
  const handleAuthResponse = async (
    resBody: any,
    defaultEmail = "",
    defaultNickname = ""
  ) => {
    console.log(
      "🎯 서버 응답:",
      JSON.stringify(resBody, null, 2)
    );

    // 다양한 응답 구조 대응
    const accessToken =
      resBody?.data?.accessToken ??
      resBody?.accessToken ??
      resBody?.token;

    const refreshToken =
      resBody?.data?.refreshToken ??
      resBody?.refreshToken;

    const isNewUser =
      resBody?.data?.isNewUser ??
      resBody?.isNewUser ??
      false;

    const responseEmail =
      resBody?.data?.email ??
      resBody?.email ??
      defaultEmail;

    const responseNickname =
      resBody?.data?.nickname ??
      resBody?.nickname ??
      defaultNickname;

    console.log("👤 isNewUser:", isNewUser);
    console.log("👤 isNewUser type:", typeof isNewUser);

    if (!accessToken) {
      throw new Error(
        "백엔드로부터 유효한 accessToken을 받지 못했습니다."
      );
    }

    // 토큰 저장
    await AsyncStorage.setItem("userToken", accessToken);

    if (refreshToken) {
      await AsyncStorage.setItem(
        "refreshToken",
        refreshToken
      );
    }

    console.log("✅ 토큰 저장 완료");

    // 신규 유저
    if (isNewUser === true || isNewUser === "true") {
      router.replace({
        pathname: "/onboarding/signup2",
        params: {
          email: responseEmail,
          nickname: responseNickname,
          isSocial: "true",
        },
      });

      return;
    }

    // 기존 유저
    authStore.setLoggedIn(true);
    router.replace("/(tabs)");
  };

  /**
   * 카카오 / 네이버 / 구글
   */
  const handleSocialLogin = async (
    provider: "kakao" | "naver" | "google"
  ) => {
    setIsSocialLoading(true);

    try {
      /**
       * 백엔드 OAuth 시작 URL
       *
       * redirectUri를 query로 넘기는 방식 추천
       */
      const BACKEND_AUTH_URL =
        `https://rutina.co.kr/oauth2/authorization/${provider}` +
        `?redirect_uri=${encodeURIComponent(redirectUri)}`;

      console.log("🌐 BACKEND_AUTH_URL:", BACKEND_AUTH_URL);

      const result = await WebBrowser.openAuthSessionAsync(
        BACKEND_AUTH_URL,
        redirectUri
      );

      console.log(
        `🎯 ${provider} 로그인 결과:`,
        JSON.stringify(result, null, 2)
      );

      if (result.type !== "success") {
        return;
      }

      if (!result.url) {
        throw new Error("Redirect URL이 없습니다.");
      }

      const url = new URL(result.url);

      console.log("🔗 Redirect Result URL:", result.url);

      const code = url.searchParams.get("code");

      if (!code) {
        throw new Error("Authorization code가 없습니다.");
      }

      console.log("✅ Authorization Code:", code);

      /**
       * 백엔드 토큰 교환
       */
      const response =
        await authApi.exchangeSocialToken(
          code,
          provider
        );

      await handleAuthResponse(response);
    } catch (error: any) {
      console.log(
        `❌ ${provider} Login Error:`,
        error
      );

      Alert.alert(
        "소셜 로그인 오류",
        error?.message ??
          "로그인 중 문제가 발생했습니다."
      );
    } finally {
      setIsSocialLoading(false);
    }
  };

  /**
   * Apple Login
   */
// 🍎 2. Apple 로그인 핸들러 (네이티브 SDK -> API 요청 구조 통합)
  /**
   * Apple Login
   */
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

      const identityToken = credential.identityToken;

      console.log("Apple Credential:", credential);
      console.log("Identity Token:", identityToken);

      if (!identityToken) {
        throw new Error("Apple 인증 토큰(identityToken) 발급에 실패했습니다.");
      }

      // 최초 로그인(가입)인 경우에만 Apple이 email과 fullName을 내려줍니다.
      const email = credential.email || "";
      const nickname = credential.fullName
        ? [credential.fullName.familyName, credential.fullName.givenName].filter(Boolean).join("")
        : "";

      // 1️⃣ 애플 로그인 API를 호출하여 로그인 토큰을 발급받습니다.
      const resultBody = await authApi.appleLogin(
        identityToken,
        email,
        nickname
      );
      console.log("Apple API 토큰 교환 응답 본문:", resultBody);

      // 다양한 응답 구조에 대응하여 토큰 추출
      const accessToken =
        resultBody?.data?.accessToken ??
        resultBody?.accessToken ??
        resultBody?.token;

      const refreshToken =
        resultBody?.data?.refreshToken ??
        resultBody?.refreshToken;

      if (!accessToken) {
        throw new Error("백엔드로부터 유효한 accessToken을 받지 못했습니다.");
      }

      // 2️⃣ checkNewUser 호출 시 헤더에 토큰이 담기도록 AsyncStorage에 먼저 저장합니다.
      await AsyncStorage.setItem("userToken", accessToken);
      if (refreshToken) {
        await AsyncStorage.setItem("refreshToken", refreshToken);
      }

      // 3️⃣ 토큰을 기반으로 신규 유저(isNewUser) 여부를 판별하는 API를 한 번 더 직접 호출합니다.
      // AsyncStorage 저장 완료 타이밍 문제를 방지하기 위해 토큰을 파라미터로 직접 전달합니다.
      const newUserRes = await authApi.checkNewUser(accessToken);
      console.log("Apple 신규 회원 검증 결과:", newUserRes);

      const isNewUser =
        newUserRes?.isNewUser ??
        newUserRes?.data?.isNewUser ??
        false;

      // 4️⃣ 기존 응답 데이터와 추출한 신규 유저 상태를 병합하여 공통 응답 처리기로 전달합니다.
      const mergedResult = {
        ...resultBody,
        isNewUser,
      };

      await handleAuthResponse(mergedResult, email, nickname);

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
    handleKakaoLogin: () =>
      handleSocialLogin("kakao"),

    handleNaverLogin: () =>
      handleSocialLogin("naver"),

    handleGoogleLogin: () =>
      handleSocialLogin("google"),

    handleAppleLogin,

    isSocialLoading,
  };
};