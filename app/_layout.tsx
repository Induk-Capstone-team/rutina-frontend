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

import { useColorScheme } from "@/hooks/use-color-scheme";
import { authStore } from "@/store/authStore";
import { useFonts } from "expo-font";
import { useEffect, useState } from "react";

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

  const [isLoggedIn, setIsLoggedIn] = useState(authStore.isLoggedIn); // 전역 상태와 동기화
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    return authStore.subscribe(() => {
      setIsLoggedIn(authStore.isLoggedIn);
    });
  }, []);

  // 1. 네비게이션 엔진의 준비 상태를 체크합니다.
  const navigationState = useRootNavigationState();

  useEffect(() => {
    // 2. 엔진이 준비되지 않았거나(key 없음), 아직 첫 렌더링 전이면 중단
    if (!navigationState?.key || !loaded) return;

    const inTabsGroup = segments[0] === "(tabs)";
    const inModalScreen = segments[0] === "modal";
    // 3. 비동기 타이밍 문제를 방지하기 위해 아주 잠깐의 지연(0ms)을 줍니다.
    const timeout = setTimeout(() => {
      if (!isLoggedIn && inTabsGroup) {
        router.replace("/login");
      } else if (isLoggedIn && !inTabsGroup && !inModalScreen) {
        router.replace("/(tabs)");
      }
    }, 0);

    return () => clearTimeout(timeout);
  }, [isLoggedIn, segments, navigationState?.key]);

  // 4. 엔진이 준비될 때까지 화면에 아무것도 그리지 않거나 스플래시를 보여줍니다.
  if (!navigationState?.key) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

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
