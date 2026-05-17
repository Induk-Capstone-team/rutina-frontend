export type NotifyOption = "NONE" | "ON_TIME";

export type RepeatType = "NONE" | "DAILY" | "WEEKLY" | "WEEKDAYS" | "CUSTOM";

export type RepeatOption = RepeatType;

export type RepeatUnit = "DAY" | "WEEK";
export type RepeatWeekday =
  | "SUN"
  | "MON"
  | "TUE"
  | "WED"
  | "THU"
  | "FRI"
  | "SAT";

// 일정 화면과 저장소에서 공통으로 사용하는 루틴 타입
export interface ScheduleRoutine {
  id: number;
  title: string;
  categoryId?: number | null;
  categoryName?: string;
  color?: string;
  startDate: string;
  endDate: string;
  startTime?: string | null;
  endTime?: string | null;
  alarm: boolean;
  state: boolean;
  completedDates?: string[];
  repeatType?: RepeatType;
  repeatInterval?: number | null;
  repeatUnit?: RepeatUnit | null;
  repeatDays?: RepeatWeekday[] | null;
}

//날짜 선택 시 사용하는 타입
export interface CalendarDay {
  dateString: string;
  day: number;
  month: number;
  year: number;
  timestamp: number;
}

// 저장 시 모달 화면에서 넘겨주는 옵션 타입
export interface SaveRoutineOptions {
  notifyOption: NotifyOption;
  customNotifyDay: string;
  customNotifyHour: string;
  customNotifyMinute: string;
  repeatType: RepeatType;
  repeatInterval: number;
  repeatUnit: RepeatUnit | null;
  repeatDays: RepeatWeekday[] | null;

  startDate: string;
  endDate: string;
}

// 시간 선택 모달에서 사용하는 시간 범위 타입
export interface RoutineTimeRange {
  startHour: string;
  startMinute: string;
  endHour: string;
  endMinute: string;
}

// 루틴 API 응답 타입
export interface ApiRoutine {
  id: number;
  categoryId: number;
  categoryColorCode: string; // 로컬의 color
  title: string;
  alarm: boolean;
  repeatType: RepeatType;
  repeatInterval: number;
  repeatUnit: RepeatUnit;
  repeatDays: RepeatWeekday[];
  startTime: string | null;
  endTime: string | null;
  startAt: string; // 로컬의 startDate
  endAt: string; // 로컬의 endDate
  isCompleted: boolean;
}

// 루틴 생성/수정 요청 타입
export interface ApiRoutineRequest {
  categoryId: number | null;
  title: string;
  alarm: boolean;
  repeatType: RepeatType;
  repeatInterval: number | null;
  repeatUnit: RepeatUnit | null;
  repeatDays: RepeatWeekday[] | null;
  startTime: string | null;
  endTime: string | null;
  startAt: string; // 로컬의 startDate
  endAt: string; // 로컬의 endDate
}
export interface RoutineCategory {
  id: number;
  name: string;
  colorCode: string;
  rtSum: string;
  sortOrder: number;
}

export interface CategoryRequest {
  name: string;
  colorCode: string;
}
export interface HeatmapRoutine {
  routineId: number;
  title: string;
  category: {
    id: number;
    name: string;
    colorCode: string;
  };
  completed: Record<string, boolean>;
}
