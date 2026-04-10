// hooks/use-routine-form.ts
import { RoutineStorage } from "@/lib/storage";
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

  // 일정 저장 함수
  const handleSave = async (options: SaveRoutineOptions) => {
    if (!title.trim()) return;

    const newRoutine: ScheduleRoutine = {
      id: Date.now(),
      title: title.trim(),
      categoryName: category,
      color: selectedColor,
      completed: false,
      date: selectedDate,
      alarm: isNotify,
      state: true,
      repeatOption: options.repeatOption,
      customRepeatEvery: Number(options.customRepeatEvery || 1),
      customRepeatUnit: options.customRepeatUnit,
      cronExpression: null,

      ...(isTimed && {
        startTime: `${startHour.padStart(2, "0")}:${startMinute.padStart(2, "0")}:00`,
        endTime: `${endHour.padStart(2, "0")}:${endMinute.padStart(2, "0")}:00`,
        startHour: Number(startHour || 0),
        startMinute: Number(startMinute || 0),
        endHour: Number(endHour || 0),
        endMinute: Number(endMinute || 0),
      }),
    };

    await RoutineStorage.save(newRoutine);
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
