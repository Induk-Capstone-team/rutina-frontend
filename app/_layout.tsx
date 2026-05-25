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
import { GestureHandlerRootView } from "react-native-gesture-handler";
// 스플래시 화면이 자동으로 숨겨지는 것을 방지
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const [loaded] = useFonts({
    Pretendard: require("../assets/fonts/Pretendard-Regular.ttf"),
    PretendardBold: require("../assets/fonts/Pretendard-Bold.ttf"),
    PretendardSemiBold: require("../assets/fonts/Pretendard-SemiBold.ttf"),
    PretendardMedium: require("../assets/fonts/Pretendard-Medium.ttf"),
  });
  const [isReady, setIsReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(authStore.isLoggedIn);
  const [isNavigationReady, setIsNavigationReady] = useState(false);
  const navigationState = useRootNavigationState();
  const inAuthGroup = segments[0] === "onboarding";
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

  useEffect(() => {
    // 2. 엔진이 준비되지 않았거나 아직 데이터가 로드되지 않았다면 중단
    if (!navigationState?.key || !loaded || !isReady) return;
    // 3. 비동기 타이밍 문제를 방지하기 위해 딜레이를 줍니다.
    const timeout = setTimeout(() => {
      if (!isLoggedIn && !inAuthGroup) {
        router.replace("/onboarding/login");
        return;
      }

      if (isLoggedIn && inAuthGroup) {
        router.replace("/(tabs)");
        return;
      }

      setIsNavigationReady(true);
    }, 0);

    return () => clearTimeout(timeout);
  }, [isLoggedIn, inAuthGroup, navigationState?.key, loaded, isReady]);

  useEffect(() => {
    if (loaded && isReady) {
      SplashScreen.hideAsync();
    }
  }, [loaded, isReady]);

  // 4. 리소스가 완전히 로드될 때까지 렌더링을 지연시킵니다.
  if (!navigationState?.key || !loaded || !isReady || !isNavigationReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="settings" options={{ headerShown: false }} />
          <Stack.Screen name="profile" options={{ headerShown: false }} />
          <Stack.Screen
            name="onboarding/login"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="onboarding/signup"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="onboarding/signup2"
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
    </GestureHandlerRootView>
  );
}
