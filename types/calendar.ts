import type { ScheduleRoutine } from "./routine";

// 캘린더에 표시할 날짜 타입 (루틴 기반)
export type CalendarMarkedDate = {
  selected?: boolean;
  marked?: boolean;
  selectedColor?: string;
  dotColor?: string;
  disabled?: boolean;
  disableTouchEvent?: boolean;
  routines?: ScheduleRoutine[];
};

// 캘린더 markedDates 타입
export type MarkedDates = Record<string, CalendarMarkedDate>;

export type CalendarTheme = {
  backgroundColor?: string;
  calendarBackground?: string;
  textSectionTitleColor?: string;

  selectedDayBackgroundColor?: string;
  selectedDayTextColor?: string;
  todayTextColor?: string;
  dayTextColor?: string;
  textDisabledColor?: string;

  dotColor?: string;
  selectedDotColor?: string;
  arrowColor?: string;
  disabledArrowColor?: string;
  monthTextColor?: string;
  indicatorColor?: string;

  textDayFontWeight?:
    | "normal"
    | "bold"
    | "100"
    | "200"
    | "300"
    | "400"
    | "500"
    | "600"
    | "700"
    | "800"
    | "900";

  textMonthFontWeight?:
    | "normal"
    | "bold"
    | "100"
    | "200"
    | "300"
    | "400"
    | "500"
    | "600"
    | "700"
    | "800"
    | "900";

  textDayHeaderFontWeight?:
    | "normal"
    | "bold"
    | "100"
    | "200"
    | "300"
    | "400"
    | "500"
    | "600"
    | "700"
    | "800"
    | "900";

  textDayFontSize?: number;
  textMonthFontSize?: number;
  textDayHeaderFontSize?: number;
};
