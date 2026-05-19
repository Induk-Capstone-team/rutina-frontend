// lib/routine_mapper.ts
import type {
  ApiRoutine,
  ApiRoutineRequest,
  ScheduleRoutine,
} from "@/types/routine";

// API 응답 → 로컬 타입으로 변환
export const toScheduleRoutine = (
  api: ApiRoutine,
  categoryName?: string,
  completedDates: string[] = [],
): ScheduleRoutine => ({
  id: api.id,
  categoryId: api.categoryId,
  categoryName,
  color: api.categoryColorCode,
  title: api.title,
  alarm: api.alarm,
  repeatType: api.repeatType,
  repeatInterval: api.repeatInterval,
  repeatUnit: api.repeatUnit,
  repeatDays: api.repeatDays,
  startTime: api.startTime,
  endTime: api.endTime,
  startDate: api.startAt,
  endDate: api.endAt,
  state: true,
  completedDates,
});
// 로컬 타입 → API 요청으로 변환
export const toApiRoutineRequest = (
  routine: ScheduleRoutine,
): ApiRoutineRequest => {
  if (!routine.startDate || !routine.endDate) {
    throw new Error("startDate / endDate는 필수입니다");
  }

  return {
    categoryId: routine.categoryId ?? null,
    title: routine.title,
    alarm: routine.alarm ?? false,
    repeatType: routine.repeatType ?? "NONE",
    repeatInterval:
      routine.repeatType === "CUSTOM" ? (routine.repeatInterval ?? 1) : null,
    repeatUnit:
      routine.repeatType === "CUSTOM" ? (routine.repeatUnit ?? "DAY") : null,
    repeatDays:
      routine.repeatType === "WEEKLY" ||
      (routine.repeatType === "CUSTOM" && routine.repeatUnit === "WEEK")
        ? (routine.repeatDays ?? [])
        : null,
    startTime: routine.startTime ?? null,
    endTime: routine.endTime ?? null,
    startAt: routine.startDate,
    endAt: routine.endDate,
  };
};
