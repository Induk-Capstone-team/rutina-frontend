export type NotifyOption = "NONE" | "ON_TIME";
export type RepeatOption = "NONE" | "DAILY" | "CUSTOM";
export type RepeatUnit = "DAY" | "WEEK" | "MONTH" | "YEAR";

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
  cronExpression?: string | null;
  repeatOption?: RepeatOption;
  customRepeatEvery?: number;
  customRepeatUnit?: RepeatUnit;
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
  repeatOption: RepeatOption;
  customRepeatEvery: string;
  customRepeatUnit: RepeatUnit;
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

export interface DailyTargetRecord {
  id: number;
  routineId: number;
  targetDate: string;
  isCompleted: boolean;
}
