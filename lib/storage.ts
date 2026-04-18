// lib/storage.ts
import type { ScheduleRoutine } from "@/types/routine";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "routines";

// 예전 저장 구조까지 허용하는 임시 타입
type StoredRoutine = Partial<ScheduleRoutine> & {
  date?: string;
  completed?: boolean;
  completedDates?: string[];
};

const normalizeRoutine = (routine: StoredRoutine): ScheduleRoutine => {
  const fallbackDate =
    routine.startDate ??
    routine.endDate ??
    routine.date ??
    new Date().toISOString().split("T")[0];

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
    cronExpression: routine.cronExpression ?? null,
    repeatOption: routine.repeatOption,
    customRepeatEvery: routine.customRepeatEvery,
    customRepeatUnit: routine.customRepeatUnit,
  };
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

      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([...prev, normalizeRoutine(newRoutine)]),
      );
    } catch (e) {
      console.error("데이터 저장 실패", e);
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

  //  id 기준으로 특정 루틴만 수정
  updateById: async (id: number, updatedRoutine: Partial<ScheduleRoutine>) => {
    try {
      const prev = await RoutineStorage.getAll();

      const updated = prev.map((item) =>
        item.id === id
          ? normalizeRoutine({
              ...item,
              ...updatedRoutine,
              id: item.id,
            })
          : item,
      );

      await RoutineStorage.updateAll(updated);
    } catch (e) {
      console.error("데이터 개별 업데이트 실패", e);
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
