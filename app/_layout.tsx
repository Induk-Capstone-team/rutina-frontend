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
import { authApi } from "@/lib/data/auth_api";
import { NotificationService } from "@/services/notification_service";
import { RoutineService } from "@/services/routine_service";
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
  const [hasRestoredNotifications, setHasRestoredNotifications] =
    useState(false);
  const navigationState = useRootNavigationState();
  const inAuthGroup = segments[0] === "onboarding";
  useEffect(() => {
    return authStore.subscribe(() => {
      setIsLoggedIn(authStore.isLoggedIn);

      if (!authStore.isLoggedIn) {
        setHasRestoredNotifications(false);
      }
    });
  }, []);

  // 앱 시작 시 토큰 확인하여 로그인 상태 복구
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        // 1. 기기에서 토큰 가져오기
        const token = await AsyncStorage.getItem("userToken");

        if (token) {
          try {
            // 2. 백엔드에 신규 유저 여부 확인 요청 (토큰 유효성 검사 겸용)
            const response = await authApi.checkIsNewUser();
            const isNewUser = response?.data?.isNewUser ?? response?.isNewUser ?? false;

            if (isNewUser === true || isNewUser === "true") {
              authStore.setLoggedIn(false);

              // 타이밍 이슈 방지를 위해 딜레이 후 이동
              setTimeout(() => {
                router.replace({
                  pathname: "/onboarding/signup2",
                  params: { isSocial: "true", email: response?.data?.email || "" }
                });
              }, 100);

            } else {
              // [케이스 B] 기존 유저: 정상 로그인 처리 -> 메인 (tabs) 진입
              authStore.setLoggedIn(true);
            }

          } catch (apiError) {
            // [케이스 C] 토큰이 만료되었거나 에러가 난 경우 -> 토큰 삭제 후 로그인창으로
            console.warn("유효하지 않은 토큰입니다. 로그아웃 처리합니다.");
            await AsyncStorage.removeItem("userToken");
            await AsyncStorage.removeItem("refreshToken");
            authStore.setLoggedIn(false);
          }
        } else {
          // 토큰 자체가 없는 유저
          authStore.setLoggedIn(false);
        }
      } catch (e) {
        console.error("Token load error", e);
      } finally {
        setIsReady(true); // 스플래시 화면 숨김 허용
      }
    };

    checkLoginStatus();
  }, []);
  // 로그인 상태가 복구된 후 서버 루틴 기준으로 로컬 알림 재예약
  useEffect(() => {
    const restoreRoutineNotifications = async () => {
      if (!isLoggedIn || hasRestoredNotifications) return;

      try {
        const routines = await RoutineService.getAll();

        for (const routine of routines) {
          if (routine.alarm && routine.startTime) {
            await NotificationService.syncRoutineNotification(routine);
          }
        }

        setHasRestoredNotifications(true);
      } catch (error) {
        console.warn("루틴 알림 복구 실패", error);
      }
    };

    restoreRoutineNotifications();
  }, [isLoggedIn, hasRestoredNotifications]);
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
