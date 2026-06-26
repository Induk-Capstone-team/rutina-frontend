import { useColorScheme } from "@/hooks/use-color-scheme";
import { ThemeProvider as RutinaThemeProvider } from "@/lib/constants/ThemeContext";
import { authApi } from "@/lib/data/auth_api";
import { NotificationService } from "@/services/notification_service";
import { RoutineService } from "@/services/routine_service";
import { authStore } from "@/store/authStore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import {
  Stack,
  useRootNavigationState,
  useRouter,
  useSegments,
} from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { DeviceEventEmitter } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
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
  const [tutorialCompleted, setTutorialCompleted] = useState(false);
  const [isTutorialReady, setIsTutorialReady] = useState(false);
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
        const token = await AsyncStorage.getItem("userToken");
        console.log("📱 앱 시작 - 토큰 확인 결과:", token);

        if (token) {
          try {
            // 2. 백엔드에 토큰 유효성 및 신규 유저 여부 검증 요청
            const response = await authApi.checkNewUser();

            // 백엔드 데이터 구조 가공 (true/false)
            const isNewUser =
              response?.isNewUser ?? response?.data?.isNewUser ?? false;
            console.log("📱 백엔드 검증 결과 - 신규 유저 여부:", isNewUser);

            if (isNewUser == true) {
              // [케이스 A] 신규 회원 -> 추가 정보 입력창으로 이동
              authStore.setLoggedIn(false); // 아직 완벽한 로그인이 아니므로 false 유지

              // 타이밍 이슈 방지를 위해 스플래시가 걷힌 후 살짝 딜레이를 주고 이동
              setTimeout(async () => {
                await AsyncStorage.removeItem("userToken");
                await AsyncStorage.removeItem("refreshToken");
                authStore.setLoggedIn(false);
              }, 1000);
            } else {
              authStore.setLoggedIn(true);
            }
          } catch (apiError) {
            console.warn("만료되었거나 서버 인증에 실패한 토큰입니다.");
            await AsyncStorage.removeItem("userToken");
            await AsyncStorage.removeItem("refreshToken");
            authStore.setLoggedIn(false);
          }
        } else {
          authStore.setLoggedIn(false);
        }
      } catch (e) {
        console.error("Token load error", e);
      } finally {
        setIsReady(true);
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
    // 1. 모든 데이터가 로드되었는지 확인
    if (!navigationState?.key || !loaded || !isReady || !isTutorialReady) return;

    const timeout = setTimeout(() => {
      // 2. 로그인 안 된 경우
      if (!isLoggedIn && !inAuthGroup) {
        router.replace("/onboarding/login");
        return;
      }

      // 3. 로그인 된 경우
      if (isLoggedIn) {
        if (!tutorialCompleted) {
          // 튜토리얼 미완료 시 튜토리얼로
          if (segments[1] !== "tutorial") {
            router.replace("/onboarding/tutorial");
          }
        } else {
          // 튜토리얼 완료 시 탭으로
          if (inAuthGroup) {
            router.replace("/(tabs)");
          }
        }
      }

      // 💡 핵심: 어떤 경우든 라우팅 체크가 끝났음을 알려야 화면이 그려집니다!
      setIsNavigationReady(true);
    }, 0);

    return () => clearTimeout(timeout);
  }, [isLoggedIn, inAuthGroup, navigationState?.key, loaded, isReady, isTutorialReady, tutorialCompleted, segments]);
  useEffect(() => {
    if (loaded && isReady) {
      SplashScreen.hideAsync();
    }
  }, [loaded, isReady]);

  //Tutorial 읽음 상태 확인
  useEffect(() => {
    const checkTutorialStatus = async () => {
      try {
        const completed = await AsyncStorage.getItem("tutorialCompleted");
        setTutorialCompleted(completed === "true");
      } catch (e) {
        console.error("Failed to load tutorial status", e);
      } finally {
        setIsTutorialReady(true); // 💡 로딩 완료 표시
      }
    };

    checkTutorialStatus();

    // 💡 튜토리얼 완료 신호를 들으면 상태를 true로 즉시 업데이트!
    const subscription = DeviceEventEmitter.addListener('TutorialCompletedEvent', () => {
      setTutorialCompleted(true);
    });

    // 컴포넌트가 언마운트될 때 리스너 정리
    return () => {
      subscription.remove();
    };
  }, []); // 💡 의존성 배열을 빈 배열로 변경

  // 4. 리소스가 완전히 로드될 때까지 렌더링을 지연시킵니다.
  if (!navigationState?.key || !loaded || !isReady || !isNavigationReady || !isTutorialReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <RutinaThemeProvider>
        <ThemeProvider
          value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
        >
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="settings/settings" options={{ headerShown: false }} />
            <Stack.Screen name="settings/profile" options={{ headerShown: false }} />
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
            name="onboarding/password_reset"
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
            <Stack.Screen
            name="onboarding/tutorial"
            options={{ headerShown: false }}
          />
        </Stack>

          <StatusBar style="auto" />
        </ThemeProvider>
      </RutinaThemeProvider>
    </GestureHandlerRootView>
  );
}
