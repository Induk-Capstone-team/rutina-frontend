import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import {
  Stack,
  useRootNavigationState,
  useRouter,
  useSegments,
} from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SplashScreen from "expo-splash-screen";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { authStore } from "@/store/authStore";
import { useFonts } from "expo-font";
import { useEffect, useState } from "react";

// 스플래시 화면이 자동으로 숨겨지는 것을 방지합니다.
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [loaded] = useFonts({
    Pretendard: require("../assets/fonts/Pretendard-Regular.ttf"),
    PretendardBold: require("../assets/fonts/Pretendard-Bold.ttf"),
    PretendardSemiBold: require("../assets/fonts/Pretendard-SemiBold.ttf"),
    PretendardMedium: require("../assets/fonts/Pretendard-Medium.ttf"),
  });

  const [isReady, setIsReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(authStore.isLoggedIn); // 전역 상태와 동기화
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    return authStore.subscribe(() => {
      setIsLoggedIn(authStore.isLoggedIn);
    });
  }, []);

  // 앱 시작 시 토큰 확인하여 로그인 상태 복구
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        if (token) {
          authStore.setLoggedIn(true);
        }
      } catch (e) {
        console.error("Token load error", e);
      } finally {
        setIsReady(true);
      }
    };

    checkLoginStatus();
  }, []);

  // 1. 네비게이션 엔진의 준비 상태를 체크합니다.
  const navigationState = useRootNavigationState();

  useEffect(() => {
    // 2. 엔진이 준비되지 않았거나 아직 데이터가 로드되지 않았다면 중단
    if (!navigationState?.key || !loaded || !isReady) return;

    // 회원가입, 약관 동의 화면 등 로그인 전 화면인지 판별 (배열에 등록된 화면 그룹)
    const inAuthGroup = segments[0] === "onboarding";

    // 3. 비동기 타이밍 문제를 방지하기 위해 딜레이를 줍니다.
    const timeout = setTimeout(() => {
      if (!isLoggedIn && !inAuthGroup) {
        // 로그인 되지 않았는데 인증 그룹(로그인 화면 등)이 아니면 가장 첫 화면인 로그인으로 이동합니다.
        router.replace("/onboarding/login");
      } else if (isLoggedIn && inAuthGroup) {
        // 이미 로그인 되어 있는데 로그인 화면에 남아있다면 앱의 메인화면으로 이동합니다.
        router.replace("/(tabs)");
      }
    }, 0);

    return () => clearTimeout(timeout);
  }, [isLoggedIn, segments, navigationState?.key, loaded, isReady]);

  useEffect(() => {
    if (loaded && isReady) {
      SplashScreen.hideAsync();
    }
  }, [loaded, isReady]);

  // 4. 리소스가 완전히 로드될 때까지 렌더링을 지연시킵니다.
  if (!navigationState?.key || !loaded || !isReady) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="onboarding/login"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="onboarding/signup"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="onboarding/[terms]"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="modal"
          options={{
            presentation: "transparentModal",
            headerShown: false,
            gestureEnabled: true,
            animation: "slide_from_bottom",
          }}
        />
      </Stack>

      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
