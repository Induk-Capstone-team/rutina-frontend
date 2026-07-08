import { useTheme } from "@/lib/constants/ThemeContext";
import type { CalendarTheme, MarkedDates } from "@/types/calendar";
import React from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { Calendar, LocaleConfig, type DateData } from "react-native-calendars";
LocaleConfig.locales["ko"] = {
  monthNames: [
    "1월",
    "2월",
    "3월",
    "4월",
    "5월",
    "6월",
    "7월",
    "8월",
    "9월",
    "10월",
    "11월",
    "12월",
  ],
  monthNamesShort: [
    "1월",
    "2월",
    "3월",
    "4월",
    "5월",
    "6월",
    "7월",
    "8월",
    "9월",
    "10월",
    "11월",
    "12월",
  ],
  dayNames: [
    "일요일",
    "월요일",
    "화요일",
    "수요일",
    "목요일",
    "금요일",
    "토요일",
  ],
  dayNamesShort: ["일", "월", "화", "수", "목", "금", "토"],
  today: "오늘",
};
LocaleConfig.defaultLocale = "ko";

interface AppCalendarProps {
  current: string;
  markedDates: MarkedDates;
  onDayPress: (day: DateData) => void;
  onMonthChange?: (month: DateData) => void;
  enableSwipeMonths?: boolean;
  theme?: CalendarTheme;
  style?: StyleProp<ViewStyle>;
}
export default function AppCalendar({
  current,
  markedDates,
  onDayPress,
  onMonthChange,
  enableSwipeMonths = false,
  theme,
  style,
}: AppCalendarProps) {
  const { theme: appTheme } = useTheme();
  const DEFAULT_CALENDAR_THEME = {
    backgroundColor: "transparent",
    calendarBackground: "transparent",
    textSectionTitleColor: appTheme.textFaint,
    selectedDayTextColor: appTheme.text,
    todayTextColor: appTheme.main,
    dayTextColor: appTheme.text,
    textDisabledColor: appTheme.divider,
    arrowColor: appTheme.textMuted,
    monthTextColor: appTheme.text,
    textDayFontWeight: "600" as const,
    textMonthFontWeight: "bold" as const,
    textDayHeaderFontWeight: "600" as const,
  };
  return (
    <Calendar
      current={current}
      onDayPress={onDayPress}
      onMonthChange={onMonthChange}
      monthFormat={"yyyy년 MM월"}
      markedDates={markedDates}
      enableSwipeMonths={enableSwipeMonths}
      theme={theme ?? DEFAULT_CALENDAR_THEME}
      style={style}
    />
  );
}
