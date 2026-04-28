// lib/storage.ts
import type {
  RepeatUnit,
  RepeatWeekday,
  ScheduleRoutine,
} from "@/types/routine";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "routines";

// 예전 저장 구조까지 허용하는 임시 타입
type StoredRoutine = Partial<ScheduleRoutine> & {
  date?: string;
  completed?: boolean;
  completedDates?: string[];

  // 예전 반복 저장값도 읽을 수 있게 유지
  cronExpression?: string | null;
  repeatOption?: "NONE" | "DAILY" | "CUSTOM";
  customRepeatEvery?: number;
  customRepeatUnit?: RepeatUnit;

  // API에서 repeatDays가 문자열로 올 수도 있어서 허용
  repeatDays?: RepeatWeekday[] | string | null;
};

// repeatDays를 항상 배열 형태로 정리
const normalizeRepeatDays = (
  repeatDays?: RepeatWeekday[] | string | null,
): RepeatWeekday[] => {
  if (!repeatDays) return [];

  if (Array.isArray(repeatDays)) {
    return [...new Set(repeatDays)];
  }

  return repeatDays
    .split(",")
    .map((day) => day.trim())
    .filter(Boolean) as RepeatWeekday[];
};

const normalizeRoutine = (routine: StoredRoutine): ScheduleRoutine => {
  const fallbackDate =
    routine.startDate ??
    routine.endDate ??
    routine.date ??
    new Date().toISOString().split("T")[0];

  //  새 반복값이 없으면 예전 반복값을 새 구조로 변환
  const repeatType = routine.repeatType ?? routine.repeatOption ?? "NONE";

  // 커스텀 반복일 때만 interval/unit/days 저장
  const repeatInterval =
    repeatType === "CUSTOM"
      ? (routine.repeatInterval ?? routine.customRepeatEvery ?? 1)
      : undefined;

  const repeatUnit =
    repeatType === "CUSTOM"
      ? (routine.repeatUnit ?? routine.customRepeatUnit ?? "DAY")
      : undefined;

  const repeatDays =
    repeatType === "CUSTOM" && repeatUnit === "WEEK"
      ? normalizeRepeatDays(routine.repeatDays)
      : [];

  return {
    id: routine.id ?? Date.now(),
    title: routine.title ?? "",
    categoryId: routine.categoryId ?? null,
    categoryName: routine.categoryName,
    color: routine.color,

    startDate: routine.startDate ?? routine.date ?? fallbackDate,
    endDate: routine.endDate ?? routine.date ?? fallbackDate,

    startTime: routine.startTime ?? null,
    endTime: routine.endTime ?? null,

    alarm: routine.alarm ?? false,
    state: routine.state ?? true,
    completedDates: Array.isArray(routine.completedDates)
      ? [...new Set(routine.completedDates)]
      : routine.completed
        ? [routine.startDate ?? routine.date ?? fallbackDate]
        : [],

    repeatType,
    repeatInterval,
    repeatUnit,
    repeatDays,
  };
};

// "HH:mm" -> 분 단위 숫자로 변환
const parseTimeToMinutes = (time: string) => {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
};

// 날짜 범위 겹침 여부 확인
const isDateRangeOverlapping = (
  startA: string,
  endA: string,
  startB: string,
  endB: string,
) => {
  return !(endA < startB || startA > endB);
};

// 시간 범위 겹침 여부 확인
const isTimeRangeOverlapping = (
  startA: number,
  endA: number,
  startB: number,
  endB: number,
) => {
  return startA < endB && startB < endA;
};

// 기존 일정과 시간 겹침 검사
const hasTimeConflict = (
  routines: ScheduleRoutine[],
  targetRoutine: ScheduleRoutine,
  excludeId?: number,
) => {
  // 시간 없는 일정은 겹침 검사 제외
  if (!targetRoutine.startTime || !targetRoutine.endTime) {
    return false;
  }

  const targetStartMinutes = parseTimeToMinutes(targetRoutine.startTime);
  const targetEndMinutes = parseTimeToMinutes(targetRoutine.endTime);

  return routines.some((routine) => {
    // 수정 시 자기 자신은 제외
    if (excludeId !== undefined && routine.id === excludeId) {
      return false;
    }

    // 기존 일정도 시간 없는 경우 비교 제외
    if (!routine.startTime || !routine.endTime) {
      return false;
    }

    // 날짜 범위가 안 겹치면 제외
    const isDateOverlapping = isDateRangeOverlapping(
      targetRoutine.startDate,
      targetRoutine.endDate,
      routine.startDate,
      routine.endDate,
    );

    if (!isDateOverlapping) {
      return false;
    }

    const routineStartMinutes = parseTimeToMinutes(routine.startTime);
    const routineEndMinutes = parseTimeToMinutes(routine.endTime);

    return isTimeRangeOverlapping(
      targetStartMinutes,
      targetEndMinutes,
      routineStartMinutes,
      routineEndMinutes,
    );
  });
};

export const RoutineStorage = {
  getAll: async (): Promise<ScheduleRoutine[]> => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);

      if (!data) return [];

      const parsed: unknown = JSON.parse(data);

      if (!Array.isArray(parsed)) return [];

      return parsed.map((item) => normalizeRoutine(item as StoredRoutine));
    } catch (e) {
      console.error("데이터 로드 실패", e);
      return [];
    }
  },

  save: async (newRoutine: ScheduleRoutine) => {
    try {
      const prev = await RoutineStorage.getAll();
      const normalizedNewRoutine = normalizeRoutine(newRoutine);

      // 저장 전에 기존 일정과 시간 겹침 검사
      if (hasTimeConflict(prev, normalizedNewRoutine)) {
        throw new Error("TIME_CONFLICT");
      }

      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([...prev, normalizedNewRoutine]),
      );
    } catch (e) {
      if (e instanceof Error && e.message === "TIME_CONFLICT") {
        throw e;
      }

      console.error("데이터 저장 실패", e);
      throw e;
    }
  },

  // 전체 배열 저장 전용 메서드
  saveAll: async (routines: ScheduleRoutine[]) => {
    try {
      const normalizedRoutines = routines.map(normalizeRoutine);

      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(normalizedRoutines),
      );
    } catch (e) {
      console.error("전체 데이터 저장 실패", e);
    }
  },

  updateAll: async (routines: ScheduleRoutine[]) => {
    try {
      const normalizedRoutines = routines.map(normalizeRoutine);

      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(normalizedRoutines),
      );
    } catch (e) {
      console.error("전체 데이터 업데이트 실패", e);
    }
  },

  // id 기준으로 특정 루틴만 수정
  updateById: async (id: number, updatedRoutine: Partial<ScheduleRoutine>) => {
    try {
      const prev = await RoutineStorage.getAll();

      const currentRoutine = prev.find((item) => item.id === id);
      if (!currentRoutine) return;

      const normalizedUpdatedRoutine = normalizeRoutine({
        ...currentRoutine,
        ...updatedRoutine,
        id: currentRoutine.id,
      });

      // 수정 시에는 자기 자신(id)은 제외하고 시간 겹침 검사
      if (hasTimeConflict(prev, normalizedUpdatedRoutine, id)) {
        throw new Error("TIME_CONFLICT");
      }

      const updated = prev.map((item) =>
        item.id === id ? normalizedUpdatedRoutine : item,
      );

      await RoutineStorage.updateAll(updated);
    } catch (e) {
      if (e instanceof Error && e.message === "TIME_CONFLICT") {
        throw e;
      }

      console.error("데이터 개별 업데이트 실패", e);
      throw e;
    }
  },

  deleteById: async (id: number) => {
    try {
      const prev = await RoutineStorage.getAll();
      const filtered = prev.filter((item) => item.id !== id);

      await RoutineStorage.updateAll(filtered);
    } catch (e) {
      console.error("데이터 삭제 실패", e);
    }
  },

  // completedDates에서 특정 날짜 토글
  toggleCompleteById: async (id: number, targetDate: string) => {
    try {
      const prev = await RoutineStorage.getAll();

      const updated = prev.map((item) => {
        if (item.id !== id) return item;

        const completedDates = item.completedDates ?? [];
        const isCompleted = completedDates.includes(targetDate);

        return {
          ...item,
          completedDates: isCompleted
            ? completedDates.filter((date) => date !== targetDate)
            : [...completedDates, targetDate],
        };
      });

      await RoutineStorage.updateAll(updated);
    } catch (e) {
      console.error("완료 날짜 상태 변경 실패", e);
    }
  },
};
