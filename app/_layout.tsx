import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { authStore } from '@/store/authStore';

export default function RootLayout() {
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
    if (!navigationState?.key) return;

    const inTabsGroup = segments[0] === '(tabs)';

    // 3. 비동기 타이밍 문제를 방지하기 위해 아주 잠깐의 지연(0ms)을 줍니다.
    const timeout = setTimeout(() => {
      if (!isLoggedIn && inTabsGroup) {
        router.replace('/login');
      } else if (isLoggedIn && !inTabsGroup) {
        router.replace('/(tabs)');
      }
    }, 0);

    return () => clearTimeout(timeout);
  }, [isLoggedIn, segments, navigationState?.key]);

  // 4. 엔진이 준비될 때까지 화면에 아무것도 그리지 않거나 스플래시를 보여줍니다.
  if (!navigationState?.key) {
    return null;
  }

  return (
    <Stack>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}