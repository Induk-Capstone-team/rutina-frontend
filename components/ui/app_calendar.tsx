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
  enableSwipeMonths?: boolean;
  theme?: CalendarTheme;
  style?: StyleProp<ViewStyle>;
}

const DEFAULT_CALENDAR_THEME = {
  backgroundColor: "#F8F9FB",
  calendarBackground: "#F8F9FB",
  textSectionTitleColor: "#B4B6C0",
  selectedDayTextColor: "#2A3C6B",
  todayTextColor: "#405886",
  dayTextColor: "#2A3C6B",
  textDisabledColor: "#D9E1E8",
  arrowColor: "#A0B0D0",
  monthTextColor: "#2A3C6B",
  textDayFontWeight: "600" as const,
  textMonthFontWeight: "bold" as const,
  textDayHeaderFontWeight: "600" as const,
};

export default function AppCalendar({
  current,
  markedDates,
  onDayPress,
  enableSwipeMonths = false,
  theme,
  style,
}: AppCalendarProps) {
  return (
    <Calendar
      current={current}
      onDayPress={onDayPress}
      monthFormat={"yyyy년 MM월"}
      markedDates={markedDates}
      enableSwipeMonths={enableSwipeMonths}
      theme={theme ?? DEFAULT_CALENDAR_THEME}
      style={style}
    />
  );
}
