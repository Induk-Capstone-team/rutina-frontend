// 루틴 카테고리 공통 타입 분리
export type RoutineType = "기상" | "운동" | "공부" | "명상" | "저녁" | "기타";

// 일정 화면 타입
export interface ScheduleRoutine {
  id: string;
  title: string;
  type: RoutineType;
  startHour?: number;
  startMinute?: number;
  durationMinutes?: number;
  completed: boolean;
  date: string;
}

// 캘린더 날짜 타입
export interface CalendarDay {
  dateString: string;
  day: number;
  month: number;
  year: number;
  timestamp: number;
}
