// hook/use_routine_form.ts
import { CategoryService } from "@/services/category_service";
import { RoutineService } from "@/services/routine_service";
import type { SaveRoutineOptions, ScheduleRoutine } from "@/types/routine";
import { useState } from "react";

export const useRoutineForm = (onSuccess: () => void) => {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("기타");
  const [selectedColor, setSelectedColor] = useState("#405886");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [isTimed, setIsTimed] = useState(false);
  const [startHour, setStartHour] = useState("09");
  const [startMinute, setStartMinute] = useState("00");
  const [endHour, setEndHour] = useState("10");
  const [endMinute, setEndMinute] = useState("00");
  const [isNotify, setIsNotify] = useState(false);

  const handleSave = async (options: SaveRoutineOptions) => {
    if (!title.trim()) return;

    const resolvedStartDate = options.startDate || selectedDate;
    const resolvedEndDate = options.endDate || selectedDate;

    // 서버에서 최신 카테고리 목록 조회 후 이름으로 찾기
    const serverCategories = await CategoryService.getAll();
    const matched = serverCategories.find(
      (c) => c.name.trim().toLowerCase() === category.trim().toLowerCase(),
    );

    let categoryId: number | null = matched?.id ?? null;

    if (categoryId === null) {
      try {
        const created = await CategoryService.create(category, selectedColor);
        categoryId = created.id;
      } catch (createError: any) {
        if (createError?.response?.status === 409) {
          // 생성 시도했는데 이미 있으면 다시 조회
          const retryCategories = await CategoryService.getAll();
          const retryMatched = retryCategories.find(
            (c) =>
              c.name.trim().toLowerCase() === category.trim().toLowerCase(),
          );
          categoryId = retryMatched?.id ?? null;
        } else {
          throw createError;
        }
      }
    }

    const newRoutine: ScheduleRoutine = {
      id: 0,
      title: title.trim(),
      categoryId,
      categoryName: category,
      color: selectedColor,
      completedDates: [],
      startDate: resolvedStartDate,
      endDate: resolvedEndDate,
      alarm: options.notifyOption !== "NONE",
      state: true,
      repeatType: options.repeatType,
      repeatInterval:
        options.repeatType === "CUSTOM" ? options.repeatInterval : undefined,
      repeatUnit:
        options.repeatType === "CUSTOM" ? options.repeatUnit : undefined,
      repeatDays:
        options.repeatType === "CUSTOM" && options.repeatUnit === "WEEK"
          ? options.repeatDays
          : null,
      ...(isTimed && {
        startTime: `${startHour.padStart(2, "0")}:${startMinute.padStart(2, "0")}`,
        endTime: `${endHour.padStart(2, "0")}:${endMinute.padStart(2, "0")}`,
      }),
    };

    await RoutineService.save(newRoutine);
    onSuccess();
  };

  return {
    title,
    setTitle,
    category,
    setCategory,
    selectedColor,
    setSelectedColor,
    selectedDate,
    setSelectedDate,
    isTimed,
    setIsTimed,
    startHour,
    setStartHour,
    startMinute,
    setStartMinute,
    endHour,
    setEndHour,
    endMinute,
    setEndMinute,
    isNotify,
    setIsNotify,
    handleSave,
  };
};
