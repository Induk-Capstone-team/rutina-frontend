// lib/storage.ts
import type { ScheduleRoutine } from "@/types/routine";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "routines";

export const RoutineStorage = {
  // 모든 루틴 가져오기
  getAll: async (): Promise<ScheduleRoutine[]> => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("데이터 로드 실패", e);
      return [];
    }
  },

  // 새 루틴 저장
  save: async (newRoutine: ScheduleRoutine) => {
    try {
      const prev = await RoutineStorage.getAll();
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([...prev, newRoutine]),
      );
    } catch (e) {
      console.error("데이터 저장 실패", e);
    }
  },
  // schedule 화면에서 체크 상태 변경 / 삭제 후 최종 배열 저장할 때 사용
  updateAll: async (routines: ScheduleRoutine[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(routines));
    } catch (e) {
      console.error("전체 데이터 업데이트 실패", e);
    }
  },

  // id로 루틴 삭제
  deleteById: async (id: number) => {
    try {
      const prev = await RoutineStorage.getAll();
      const filtered = prev.filter((item) => item.id !== id);

      await RoutineStorage.updateAll(filtered);
    } catch (e) {
      console.error("데이터 삭제 실패", e);
    }
  },

  // id로 completed 상태 토글
  toggleCompleteById: async (id: number) => {
    try {
      const prev = await RoutineStorage.getAll();

      const updated = prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item,
      );

      await RoutineStorage.updateAll(updated);
    } catch (e) {
      console.error("완료 상태 변경 실패", e);
    }
  },
};
