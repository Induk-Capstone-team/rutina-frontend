import { RoutineStorage } from "@/lib/storage";
import type { ScheduleRoutine } from "@/types/routine";

export const RoutineService = {
  getAll: () => RoutineStorage.getAll(),

  save: (routine: ScheduleRoutine) => RoutineStorage.save(routine),

  updateAll: (routines: ScheduleRoutine[]) =>
    RoutineStorage.updateAll(routines),

  updateById: (id: number, routine: Partial<ScheduleRoutine>) =>
    RoutineStorage.updateById(id, routine),

  deleteById: (id: number) => RoutineStorage.deleteById(id),

  toggleComplete: (id: number, date: string) =>
    RoutineStorage.toggleCompleteById(id, date),
};
