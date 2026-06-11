//constants/ThemeContext.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

// ─── 색상 토큰 ───────────────────────────────────────────────

export const lightTheme = {
  // 배경
  bg: "#F3F4F8", // 앱 전체 배경
  card: "#FFFFFF", // 카드 배경
  cardAlt: "#F8F9FB", // 보조 카드 (카테고리 헤더, emptyBox 등)
  inputBg: "#F8F9FB", // 인풋, 셀렉터 배경
  tabBg: "#EEF1F7", // 탭 컨테이너 배경

  // 텍스트
  text: "#2A3C6B", // 주요 텍스트 (제목, 날짜 등)
  textStrong: "#233255", // 강조 텍스트 (카드 제목 등)
  textBody: "#374151", // 본문 텍스트
  textMuted: "#A0B0D0", // 보조 텍스트 (서브타이틀, 라벨)
  textFaint: "#B4B6C0", // 흐린 텍스트 (empty, 힌트)
  textSecondary: "#8A8C9A", // 2단계 보조 텍스트
  textPlaceholder: "#9CA3AF",

  // 테두리
  border: "#F1F3F7", // 카드 테두리
  borderMid: "#EEF1F6", // 중간 테두리
  borderStrong: "#D7DEEA", // 인풋 테두리
  divider: "#EDEEF1", // 구분선

  // 메인 컬러
  main: "#405886", // 브랜드 컬러 (버튼, 액센트)
  mainLight: "#EEF2FF", // 메인 연한 배경 (뱃지, 버튼 bg)
  mainText: "#4D5F8E", // 메인 계열 텍스트

  // 기능 색상
  success: "#EDF7EE",
  successText: "#4C7A53",
  danger: "#FDECEC",
  dangerText: "#C35F5F",
  warning: "#E79A95",

  // 히트맵
  heatmapEmpty: "#ECEEF3",

  // 기타 UI
  checkboxBorder: "#E2E5EC",
  checkboxActive: "#A0B0D0",
  handle: "#E2E5EC",
  currentTime: "#6C7FD8",
  routineDot: "#CBD5E1",
};

export const darkTheme: typeof lightTheme = {
  // 배경
  bg: "#0F1117",
  card: "#1C1F2E",
  cardAlt: "#252836",
  inputBg: "#252836",
  tabBg: "#1A1D2E",

  // 텍스트
  text: "#C8D6F0",
  textStrong: "#E2E8F0",
  textBody: "#B0B8CC",
  textMuted: "#6B7A99",
  textFaint: "#4A5568",
  textSecondary: "#6B7A99",
  textPlaceholder: "#4A5568",

  // 테두리
  border: "#2A2D3E",
  borderMid: "#2A2D3E",
  borderStrong: "#3A3F55",
  divider: "#2A2D3E",

  // 메인 컬러
  main: "#6B8FCC",
  mainLight: "#1E2640",
  mainText: "#7A9FDD",

  // 기능 색상
  success: "#1E1E30",
  successText: "#9FA2D6",
  danger: "#2E1A1A",
  dangerText: "#E07A7A",
  warning: "#C07070",

  // 히트맵
  heatmapEmpty: "#3A3F55",

  // 기타 UI
  checkboxBorder: "#3A3F55",
  checkboxActive: "#6B7A99",
  handle: "#2A2D3E",
  currentTime: "#7A8FE8",
  routineDot: "#3A4060",
};

export type Theme = typeof lightTheme;
export type ThemeMode = "light" | "dark";

// ─── Context ────────────────────────────────────────────────

const THEME_STORAGE_KEY = "@rutina/theme_mode";

interface ThemeContextValue {
  theme: Theme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("light");

  // 앱 시작 시 저장된 테마 복원
  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((saved) => {
      if (saved === "light" || saved === "dark") {
        setModeState(saved);
      }
    });
  }, []);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(THEME_STORAGE_KEY, next);
  };

  const toggleMode = () => {
    setMode(mode === "light" ? "dark" : "light");
  };

  return (
    <ThemeContext.Provider
      value={{
        theme: mode === "dark" ? darkTheme : lightTheme,
        mode,
        setMode,
        toggleMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
