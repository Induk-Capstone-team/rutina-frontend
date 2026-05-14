// app/services/routine_service.ts
import { api } from "@/lib/data/api";
import { toApiRoutineRequest, toScheduleRoutine } from "@/lib/routine_mapper";
import { CategoryService } from "@/services/category_service";
import type { ScheduleRoutine } from "@/types/routine";

export const RoutineService = {
  getAll: async (date?: string): Promise<ScheduleRoutine[]> => {
    const query = date ? `?date=${date}` : "";
    const [routines, categories] = await Promise.all([
      api(`/routines${query}`),
      CategoryService.getAll(),
    ]);

    const categoryNameMap: Record<number, string> = {};
    categories.forEach((c: { id: number; name: string }) => {
      categoryNameMap[c.id] = c.name;
    });

    return routines.map((item: any) => {
      const completedDates = date && item.isCompleted ? [date] : [];
      return toScheduleRoutine(
        item,
        categoryNameMap[item.categoryId],
        completedDates,
      );
    });
  },
  // 루틴 단건 조회
  getById: async (id: number): Promise<ScheduleRoutine> => {
    const [routine, categories] = await Promise.all([
      api(`/routines/${id}`),
      CategoryService.getAll(),
    ]);

    const categoryNameMap: Record<number, string> = {};
    categories.forEach((c: { id: number; name: string }) => {
      categoryNameMap[c.id] = c.name;
    });

    return toScheduleRoutine(routine, categoryNameMap[routine.categoryId]);
  },

  // 루틴 생성
  save: async (routine: ScheduleRoutine): Promise<void> => {
    const body = toApiRoutineRequest(routine);
    await api("/routines", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  // 루틴 수정
  updateById: async (
    id: number,
    routine: Partial<ScheduleRoutine>,
  ): Promise<void> => {
    const body = toApiRoutineRequest(routine as ScheduleRoutine);
    await api(`/routines/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  // 루틴 삭제
  deleteById: async (id: number): Promise<void> => {
    await api(`/routines/${id}`, { method: "DELETE" });
  },

  // 완료 토글
  toggleComplete: async (id: number, date: string): Promise<void> => {
    await api(`/routines/${id}/daily-targets/toggle?date=${date}`, {
      method: "POST",
    });
  },
};
