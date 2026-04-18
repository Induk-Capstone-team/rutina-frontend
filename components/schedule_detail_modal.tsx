// components/schedule_detail_modal.tsx

import { IconSymbol } from "@/components/ui/icon-symbol";
import { RoutineStorage } from "@/lib/storage";
import type {
  RepeatOption,
  RepeatUnit,
  ScheduleRoutine,
} from "@/types/routine";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AppCalendar from "./ui/app_calendar";

type EventTypeStyle = {
  bg: string;
  dot: string;
  text: string;
};

type CustomCategory = {
  name: string;
  color: string;
};

const CUSTOM_CATEGORY_STORAGE_KEY = "@rutina/custom_categories";

const eventTypes: Record<string, EventTypeStyle> = {
  기상: { bg: "#FAEEEE", dot: "#E79A95", text: "#5D4645" },
  운동: { bg: "#FDF4EC", dot: "#EFB996", text: "#675141" },
  공부: { bg: "#F1F1FB", dot: "#9FA2D6", text: "#3E426F" },
  명상: { bg: "#F1F7EE", dot: "#A8CD9B", text: "#4C5D44" },
  저녁: { bg: "#FEF9EE", dot: "#E6CF8A", text: "#685A3F" },
  기타: { bg: "#F3F4F8", dot: "#C4C6D0", text: "#8A8C9A" },
};

type ScheduleDetailModalProps = {
  visible: boolean;
  routine: ScheduleRoutine | null;
  onClose: () => void;
  onUpdated: () => Promise<void> | void;
  onDelete?: (id: number) => Promise<void> | void;
};

const MINUTE_OPTIONS = ["00", "10", "20", "30", "40", "50"];

function getRepeatText(item: ScheduleRoutine) {
  switch (item.repeatOption) {
    case "DAILY":
      return "매일 반복";
    case "CUSTOM": {
      const unitMap = {
        DAY: "일",
        WEEK: "주",
        MONTH: "개월",
        YEAR: "년",
      } as const;

      const unit = item.customRepeatUnit
        ? unitMap[item.customRepeatUnit]
        : "일";

      return `${item.customRepeatEvery ?? 1}${unit}마다 반복`;
    }
    case "NONE":
    default:
      return "반복 없음";
  }
}

function getNotifyText(item: ScheduleRoutine) {
  return item.alarm ? "알림 있음" : "알림 없음";
}

function formatTime(time?: string | null) {
  if (!time) return "시간 없음";

  const [hour = "00", minute = "00"] = time.split(":");
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
}

function formatTimeRange(startTime?: string | null, endTime?: string | null) {
  if (!startTime) return "시간 정보 없음";

  const start = formatTime(startTime);

  if (!endTime) return start;

  const end = formatTime(endTime);
  return `${start} — ${end}`;
}
function formatDate(dateString: string) {
  const [year, month, day] = dateString.split("-");
  return `${year}년 ${month}월 ${day}일`;
}

function formatDateRange(startDate: string, endDate: string) {
  if (startDate === endDate) {
    return formatDate(startDate);
  }

  return `${formatDate(startDate)} ~ ${formatDate(endDate)}`;
}

function hexToRgba(hex: string, alpha: number) {
  const cleaned = hex.replace("#", "");

  if (cleaned.length !== 6) return hex;

  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function normalizeHexColor(color: string) {
  return color.trim().toUpperCase();
}

function uniqueCustomCategories(categories: CustomCategory[]) {
  const map = new Map<string, CustomCategory>();

  categories.forEach((item) => {
    const name = item.name.trim();
    if (!name) return;

    map.set(name, {
      name,
      color: normalizeHexColor(item.color),
    });
  });

  return Array.from(map.values());
}

function getCategoryStyle(routine: ScheduleRoutine): EventTypeStyle {
  const categoryName = routine.categoryName ?? "기타";
  const fixedStyle = eventTypes[categoryName];

  if (fixedStyle) return fixedStyle;

  if (routine.color) {
    return {
      bg: hexToRgba(routine.color, 0.14),
      dot: routine.color,
      text: routine.color,
    };
  }

  return eventTypes["기타"];
}

function getCategoryChipStyle(
  categoryName: string,
  customCategoryColorMap: Record<string, string>,
): EventTypeStyle {
  const fixedStyle = eventTypes[categoryName];
  if (fixedStyle) return fixedStyle;

  const customColor = customCategoryColorMap[categoryName];
  if (customColor) {
    return {
      bg: hexToRgba(customColor, 0.14),
      dot: customColor,
      text: customColor,
    };
  }

  return eventTypes["기타"];
}

function padNumber(value: number) {
  return String(value).padStart(2, "0");
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function splitTime(time?: string | null) {
  if (!time) {
    return { hour: "09", minute: "00" };
  }

  const [hour = "09", minute = "00"] = time.split(":");

  return {
    hour: hour.padStart(2, "0"),
    minute: minute.padStart(2, "0"),
  };
}

function makeTime(hour: string, minute: string) {
  return `${hour}:${minute}`;
}

function parseDateParts(dateString: string) {
  const [year = "2026", month = "01", day = "01"] = dateString.split("-");

  return {
    year,
    month,
    day,
  };
}

function makeDate(year: string, month: string, day: string) {
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getNextHour(hour: string) {
  return padNumber((Number(hour) + 1) % 24);
}

function getPrevHour(hour: string) {
  return padNumber((Number(hour) - 1 + 24) % 24);
}

function getNextMinute(minute: string) {
  const currentIndex = MINUTE_OPTIONS.indexOf(minute);
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;
  const nextIndex = (safeIndex + 1) % MINUTE_OPTIONS.length;
  return MINUTE_OPTIONS[nextIndex];
}

function getPrevMinute(minute: string) {
  const currentIndex = MINUTE_OPTIONS.indexOf(minute);
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;
  const prevIndex =
    (safeIndex - 1 + MINUTE_OPTIONS.length) % MINUTE_OPTIONS.length;
  return MINUTE_OPTIONS[prevIndex];
}

type DialControlProps = {
  label: string;
  value: string;
  onDecrease: () => void;
  onIncrease: () => void;
};

function DialControl({
  label,
  value,
  onDecrease,
  onIncrease,
}: DialControlProps) {
  return (
    <View style={styles.dialItem}>
      <Text style={styles.dialLabel}>{label}</Text>

      <View style={styles.dialBox}>
        <TouchableOpacity style={styles.dialButton} onPress={onDecrease}>
          <Text style={styles.dialButtonText}>－</Text>
        </TouchableOpacity>

        <Text style={styles.dialValue}>{value}</Text>

        <TouchableOpacity style={styles.dialButton} onPress={onIncrease}>
          <Text style={styles.dialButtonText}>＋</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function TimeStepperControl({
  label,
  value,
  onIncrease,
  onDecrease,
}: {
  label: string;
  value: string;
  onIncrease: () => void;
  onDecrease: () => void;
}) {
  return (
    <View style={styles.timeStepperBox}>
      <Text style={styles.timeStepperLabel}>{label}</Text>

      <View style={styles.timeStepperRow}>
        <TouchableOpacity style={styles.timeStepperButton} onPress={onDecrease}>
          <Text style={styles.timeStepperButtonText}>-</Text>
        </TouchableOpacity>

        <View style={styles.timeStepperValueBox}>
          <Text style={styles.timeStepperValueText}>{value}</Text>
        </View>

        <TouchableOpacity style={styles.timeStepperButton} onPress={onIncrease}>
          <Text style={styles.timeStepperButtonText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function ScheduleDetailModal({
  visible,
  routine,
  onClose,
  onUpdated,
  onDelete,
}: ScheduleDetailModalProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTogglingComplete, setIsTogglingComplete] = useState(false);

  const [title, setTitle] = useState("");
  const [categoryName, setCategoryName] = useState("기타");
  const [selectedColor, setSelectedColor] = useState("#C4C6D0");

  const [startDateYear, setStartDateYear] = useState("2026");
  const [startDateMonth, setStartDateMonth] = useState("01");
  const [startDateDay, setStartDateDay] = useState("01");
  const [endDateYear, setEndDateYear] = useState("2026");
  const [endDateMonth, setEndDateMonth] = useState("01");
  const [endDateDay, setEndDateDay] = useState("01");
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarTarget, setCalendarTarget] = useState<"start" | "end">(
    "start",
  );
  const [startHour, setStartHour] = useState("09");
  const [startMinute, setStartMinute] = useState("00");
  const [endHour, setEndHour] = useState("10");
  const [endMinute, setEndMinute] = useState("00");

  const [repeatOption, setRepeatOption] = useState<RepeatOption>("DAILY");
  const [customRepeatEvery, setCustomRepeatEvery] = useState("1");
  const [customRepeatUnit, setCustomRepeatUnit] = useState<RepeatUnit>("DAY");
  const [isNotify, setIsNotify] = useState(false);

  const [customCategories, setCustomCategories] = useState<CustomCategory[]>(
    [],
  );

  useEffect(() => {
    const loadCustomCategories = async () => {
      try {
        const stored = await AsyncStorage.getItem(CUSTOM_CATEGORY_STORAGE_KEY);

        if (!stored) {
          setCustomCategories([]);
          return;
        }

        const parsed = JSON.parse(stored) as string[] | CustomCategory[];

        // 커스텀 카테고리 데이터를 문자열/객체 형태 모두 허용해서 정규화
        const normalized = Array.isArray(parsed)
          ? uniqueCustomCategories(
              parsed.map((item) => {
                if (typeof item === "string") {
                  return {
                    name: item,
                    color: "#405886",
                  };
                }

                return {
                  name: item.name,
                  color: item.color || "#405886",
                };
              }),
            )
          : [];

        setCustomCategories(normalized);
      } catch (error) {
        console.error("사용자 카테고리 불러오기 실패", error);
        setCustomCategories([]);
      }
    };

    loadCustomCategories();
  }, []);

  useEffect(() => {
    if (!routine || !visible) return;

    const startDateParts = parseDateParts(routine.startDate);
    const endDateParts = parseDateParts(routine.endDate ?? routine.startDate);
    const start = splitTime(routine.startTime);
    const end = splitTime(routine.endTime);

    // 모달이 열릴 때 전달받은 routine 값으로 수정 폼 상태 초기화
    setIsEditMode(false);
    setShowCalendar(false);
    setTitle(routine.title);
    setCategoryName(routine.categoryName ?? "기타");
    setSelectedColor(routine.color ?? eventTypes["기타"].dot);

    setStartDateYear(startDateParts.year);
    setStartDateMonth(startDateParts.month);
    setStartDateDay(startDateParts.day);
    setEndDateYear(endDateParts.year);
    setEndDateMonth(endDateParts.month);
    setEndDateDay(endDateParts.day);
    setCalendarTarget("start");

    setStartHour(start.hour);
    setStartMinute(MINUTE_OPTIONS.includes(start.minute) ? start.minute : "00");
    setEndHour(end.hour);
    setEndMinute(MINUTE_OPTIONS.includes(end.minute) ? end.minute : "00");

    setRepeatOption((routine.repeatOption as RepeatOption) ?? "NONE");
    setCustomRepeatEvery(String(routine.customRepeatEvery ?? 1));
    setCustomRepeatUnit((routine.customRepeatUnit as RepeatUnit) ?? "DAY");
    setIsNotify(Boolean(routine.alarm));
  }, [routine, visible]);

  const customCategoryColorMap = useMemo(() => {
    return customCategories.reduce<Record<string, string>>((acc, item) => {
      acc[item.name] = item.color;
      return acc;
    }, {});
  }, [customCategories]);

  const categoryList = useMemo(() => {
    return [
      ...Object.keys(eventTypes),
      ...customCategories.map((item) => item.name),
    ];
  }, [customCategories]);

  const previewRoutine = useMemo(() => {
    if (!routine) return null;

    const nextStartDate = makeDate(startDateYear, startDateMonth, startDateDay);
    const nextEndDate = makeDate(endDateYear, endDateMonth, endDateDay);
    // 화면에 보여줄 임시 미리보기 데이터
    return {
      ...routine,
      title,
      categoryName,
      color: selectedColor,
      startDate: nextStartDate,
      endDate: nextEndDate,
      startTime: makeTime(startHour, startMinute),
      endTime: makeTime(endHour, endMinute),
      alarm: isNotify,
      repeatOption,
      customRepeatEvery:
        repeatOption === "CUSTOM"
          ? Number(customRepeatEvery || "1")
          : undefined,
      customRepeatUnit:
        repeatOption === "CUSTOM" ? customRepeatUnit : undefined,
    };
  }, [
    routine,
    title,
    categoryName,
    selectedColor,
    startDateYear,
    startDateMonth,
    startDateDay,
    endDateYear,
    endDateMonth,
    endDateDay,
    startHour,
    startMinute,
    endHour,
    endMinute,
    isNotify,
    repeatOption,
    customRepeatEvery,
    customRepeatUnit,
  ]);

  if (!routine || !previewRoutine) return null;
  const categoryStyle = getCategoryStyle(previewRoutine);

  const selectedStartDateString = makeDate(
    startDateYear,
    startDateMonth,
    startDateDay,
  );
  const selectedEndDateString = makeDate(endDateYear, endDateMonth, endDateDay);
  const selectedCalendarDateString =
    calendarTarget === "start"
      ? selectedStartDateString
      : selectedEndDateString;

  const handleEdit = () => {
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    const startDateParts = parseDateParts(routine.startDate);
    const endDateParts = parseDateParts(routine.endDate ?? routine.startDate);
    const start = splitTime(routine.startTime);
    const end = splitTime(routine.endTime);

    // 수정 취소 시 원본 routine 값으로 다시 되돌림
    setTitle(routine.title);
    setCategoryName(routine.categoryName ?? "기타");
    setSelectedColor(routine.color ?? eventTypes["기타"].dot);

    setStartDateYear(startDateParts.year);
    setStartDateMonth(startDateParts.month);
    setStartDateDay(startDateParts.day);
    setEndDateYear(endDateParts.year);
    setEndDateMonth(endDateParts.month);
    setEndDateDay(endDateParts.day);
    setCalendarTarget("start");
    setShowCalendar(false);

    setStartHour(start.hour);
    setStartMinute(MINUTE_OPTIONS.includes(start.minute) ? start.minute : "00");
    setEndHour(end.hour);
    setEndMinute(MINUTE_OPTIONS.includes(end.minute) ? end.minute : "00");

    setRepeatOption((routine.repeatOption as RepeatOption) ?? "NONE");
    setCustomRepeatEvery(String(routine.customRepeatEvery ?? 1));
    setCustomRepeatUnit((routine.customRepeatUnit as RepeatUnit) ?? "DAY");
    setIsNotify(Boolean(routine.alarm));

    setIsEditMode(false);
  };
  const handleDelete = async () => {
    if (!routine || !onDelete) return;

    Alert.alert("일정 삭제", "이 일정을 삭제할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await onDelete(routine.id);
            onClose();
          } catch (error) {
            console.error("일정 삭제 실패", error);
            Alert.alert("오류", "일정 삭제 중 문제가 발생했어요.");
          }
        },
      },
    ]);
  };
  const handleSave = async () => {
    if (!routine) return;

    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      Alert.alert("안내", "일정 제목을 입력해 주세요.");
      return;
    }

    const safeStartMonth = clamp(Number(startDateMonth), 1, 12);
    const safeStartYear = clamp(Number(startDateYear), 2000, 2099);
    const maxStartDay = getDaysInMonth(safeStartYear, safeStartMonth);
    const safeStartDay = clamp(Number(startDateDay), 1, maxStartDay);

    const safeEndMonth = clamp(Number(endDateMonth), 1, 12);
    const safeEndYear = clamp(Number(endDateYear), 2000, 2099);
    const maxEndDay = getDaysInMonth(safeEndYear, safeEndMonth);
    const safeEndDay = clamp(Number(endDateDay), 1, maxEndDay);

    const safeStartHour = clamp(Number(startHour), 0, 23);
    const safeStartMinute = clamp(Number(startMinute), 0, 59);
    const safeEndHour = clamp(Number(endHour), 0, 23);
    const safeEndMinute = clamp(Number(endMinute), 0, 59);

    const startTotal = safeStartHour * 60 + safeStartMinute;
    const endTotal = safeEndHour * 60 + safeEndMinute;

    if (endTotal < startTotal) {
      Alert.alert("안내", "종료 시간은 시작 시간보다 빠를 수 없어요.");
      return;
    }

    try {
      setIsSaving(true);

      const prev = await RoutineStorage.getAll();

      const nextStartDate = makeDate(
        String(safeStartYear),
        padNumber(safeStartMonth),
        padNumber(safeStartDay),
      );
      const nextEndDate = makeDate(
        String(safeEndYear),
        padNumber(safeEndMonth),
        padNumber(safeEndDay),
      );
      if (nextEndDate < nextStartDate) {
        Alert.alert("안내", "종료 날짜는 시작 날짜보다 빠를 수 없어요.");
        return;
      }
      // 현재 선택한 루틴만 찾아서 수정
      const updated = prev.map((item) => {
        if (item.id !== routine.id) return item;

        return {
          ...item,
          title: trimmedTitle,
          categoryName,
          color: selectedColor,
          startDate: nextStartDate,
          endDate: nextEndDate,
          startTime: makeTime(
            padNumber(safeStartHour),
            padNumber(safeStartMinute),
          ),
          endTime: makeTime(padNumber(safeEndHour), padNumber(safeEndMinute)),
          alarm: isNotify,
          repeatOption,
          customRepeatEvery:
            repeatOption === "CUSTOM"
              ? clamp(Number(customRepeatEvery || "1"), 1, 999)
              : undefined,
          customRepeatUnit:
            repeatOption === "CUSTOM" ? customRepeatUnit : undefined,
        };
      });

      await RoutineStorage.updateAll(updated);
      await onUpdated();
      setIsEditMode(false);
      onClose();
    } catch (error) {
      console.error("일정 수정 실패", error);
      Alert.alert("오류", "일정 수정 중 문제가 발생했어요.");
    } finally {
      setIsSaving(false);
    }
  };

  const changeRepeatEvery = (diff: number) => {
    const nextValue = clamp(Number(customRepeatEvery || "1") + diff, 1, 999);
    setCustomRepeatEvery(String(nextValue));
  };

  const changeRepeatUnit = (diff: number) => {
    const units: RepeatUnit[] = ["DAY", "WEEK", "MONTH", "YEAR"];
    const currentIndex = units.indexOf(customRepeatUnit);
    const nextIndex = clamp(currentIndex + diff, 0, units.length - 1);

    setCustomRepeatUnit(units[nextIndex]);
  };

  const repeatUnitTextMap: Record<RepeatUnit, string> = {
    DAY: "일",
    WEEK: "주",
    MONTH: "개월",
    YEAR: "년",
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.detailOverlay} onPress={onClose}>
        <Pressable
          style={styles.detailCard}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.detailHeader}>
            <Text style={styles.detailTitle}>
              {isEditMode ? "일정 수정" : "상세 정보"}
            </Text>

            <View style={styles.headerActions}>
              {!isEditMode ? (
                <>
                  <TouchableOpacity
                    onPress={handleEdit}
                    style={styles.editButton}
                  >
                    <Text style={styles.editText}>수정</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleDelete}
                    style={styles.deleteIconButton}
                  >
                    <Ionicons name="trash-outline" size={18} color="#D45A68" />
                  </TouchableOpacity>

                  <TouchableOpacity onPress={onClose}>
                    <IconSymbol name="xmark" size={20} color="#B4B6C0" />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    onPress={handleCancelEdit}
                    style={styles.editButton}
                  >
                    <Text style={styles.cancelText}>취소</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleSave}
                    style={styles.saveButton}
                    disabled={isSaving}
                  >
                    <Text style={styles.saveText}>
                      {isSaving ? "저장 중" : "저장"}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
          {!isEditMode ? (
            <>
              <View style={styles.titleRow}>
                <Text style={styles.detailRoutineTitle} numberOfLines={2}>
                  {previewRoutine.title}
                </Text>

                <View
                  style={[
                    styles.tagBadge,
                    { backgroundColor: categoryStyle.bg },
                  ]}
                >
                  <Text style={[styles.tagText, { color: categoryStyle.text }]}>
                    {previewRoutine.categoryName ?? "기타"}
                  </Text>
                </View>
              </View>

              <View style={styles.infoList}>
                <View style={styles.detailInfoRow}>
                  <IconSymbol name="calendar" size={18} color="#A0B0D0" />
                  <View style={styles.infoTextGroup}>
                    <Text style={styles.detailLabel}>날짜</Text>
                    <Text style={styles.detailValue}>
                      {formatDateRange(
                        previewRoutine.startDate,
                        previewRoutine.endDate,
                      )}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailInfoRow}>
                  <IconSymbol name="clock" size={18} color="#A0B0D0" />
                  <View style={styles.infoTextGroup}>
                    <Text style={styles.detailLabel}>시간</Text>
                    <Text style={styles.detailValue}>
                      {formatTimeRange(
                        previewRoutine.startTime,
                        previewRoutine.endTime,
                      )}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailInfoRow}>
                  <IconSymbol name="bell" size={18} color="#A0B0D0" />
                  <View style={styles.infoTextGroup}>
                    <Text style={styles.detailLabel}>알림</Text>
                    <Text style={styles.detailValue}>
                      {getNotifyText(previewRoutine)}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailInfoRow}>
                  <IconSymbol name="repeat" size={18} color="#A0B0D0" />
                  <View style={styles.infoTextGroup}>
                    <Text style={styles.detailLabel}>반복 설정</Text>
                    <Text style={styles.detailValue}>
                      {getRepeatText(previewRoutine)}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.detailFooter}>
                <TouchableOpacity
                  style={styles.detailCloseButton}
                  onPress={onClose}
                >
                  <Text style={styles.detailCloseButtonText}>확인</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <ScrollView
              style={styles.editScroll}
              contentContainerStyle={styles.editScrollContent}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
              keyboardShouldPersistTaps="always"
            >
              <View style={styles.inputBlock}>
                <Text style={styles.editSectionLabel}>제목</Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="일정 제목을 입력해 주세요"
                  placeholderTextColor="#B4B6C0"
                  style={styles.titleInput}
                />
              </View>

              <View style={styles.inputBlock}>
                <Text style={styles.editSectionLabel}>카테고리</Text>
                <View style={styles.categoryChipWrap}>
                  {categoryList.map((name) => {
                    const selected = categoryName === name;
                    const chipStyle = getCategoryChipStyle(
                      name,
                      customCategoryColorMap,
                    );

                    return (
                      <TouchableOpacity
                        key={name}
                        style={[
                          styles.categoryChip,
                          { backgroundColor: chipStyle.bg },
                          selected && styles.categoryChipSelected,
                        ]}
                        onPress={() => {
                          setCategoryName(name);
                          setSelectedColor(chipStyle.dot);
                        }}
                      >
                        <Text
                          style={[
                            styles.categoryChipText,
                            { color: chipStyle.text },
                          ]}
                        >
                          {name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.inputBlock}>
                <Text style={styles.editSectionLabel}>날짜</Text>
                <View style={styles.dateRangeBlock}>
                  <TouchableOpacity
                    style={styles.dateSelectButton}
                    onPress={() => {
                      setCalendarTarget("start");
                      setShowCalendar((prev) =>
                        calendarTarget === "start" ? !prev : true,
                      );
                    }}
                  >
                    <View style={styles.dateSelectLeft}>
                      <IconSymbol name="calendar" size={18} color="#405886" />
                      <Text style={styles.dateSelectText}>
                        시작일 · {formatDate(selectedStartDateString)}
                      </Text>
                    </View>

                    <IconSymbol
                      name={
                        showCalendar && calendarTarget === "start"
                          ? "chevron.up"
                          : "chevron.down"
                      }
                      size={16}
                      color="#A0B0D0"
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.dateSelectButton}
                    onPress={() => {
                      setCalendarTarget("end");
                      setShowCalendar((prev) =>
                        calendarTarget === "end" ? !prev : true,
                      );
                    }}
                  >
                    <View style={styles.dateSelectLeft}>
                      <IconSymbol name="calendar" size={18} color="#405886" />
                      <Text style={styles.dateSelectText}>
                        종료일 · {formatDate(selectedEndDateString)}
                      </Text>
                    </View>

                    <IconSymbol
                      name={
                        showCalendar && calendarTarget === "end"
                          ? "chevron.up"
                          : "chevron.down"
                      }
                      size={16}
                      color="#A0B0D0"
                    />
                  </TouchableOpacity>
                </View>

                {showCalendar && (
                  <View style={styles.calendarContainer}>
                    <AppCalendar
                      current={selectedCalendarDateString}
                      markedDates={{
                        [selectedCalendarDateString]: {
                          selected: true,
                          selectedColor: "#F1F1FB",
                        },
                      }}
                      onDayPress={(day) => {
                        const parts = parseDateParts(day.dateString);

                        if (calendarTarget === "start") {
                          setStartDateYear(parts.year);
                          setStartDateMonth(parts.month);
                          setStartDateDay(parts.day);
                        } else {
                          setEndDateYear(parts.year);
                          setEndDateMonth(parts.month);
                          setEndDateDay(parts.day);
                        }

                        setShowCalendar(false);
                      }}
                    />
                  </View>
                )}
              </View>

              <View style={styles.inputBlock}>
                <Text style={styles.editSectionLabel}>시작 시간</Text>
                <View style={styles.timePickerRow}>
                  <TimeStepperControl
                    label="시"
                    value={startHour}
                    onIncrease={() => setStartHour(getNextHour(startHour))}
                    onDecrease={() => setStartHour(getPrevHour(startHour))}
                  />
                  <TimeStepperControl
                    label="분"
                    value={startMinute}
                    onIncrease={() =>
                      setStartMinute(getNextMinute(startMinute))
                    }
                    onDecrease={() =>
                      setStartMinute(getPrevMinute(startMinute))
                    }
                  />
                </View>
              </View>

              <View style={styles.inputBlock}>
                <Text style={styles.editSectionLabel}>종료 시간</Text>
                <View style={styles.timePickerRow}>
                  <TimeStepperControl
                    label="시"
                    value={endHour}
                    onIncrease={() => setEndHour(getNextHour(endHour))}
                    onDecrease={() => setEndHour(getPrevHour(endHour))}
                  />
                  <TimeStepperControl
                    label="분"
                    value={endMinute}
                    onIncrease={() => setEndMinute(getNextMinute(endMinute))}
                    onDecrease={() => setEndMinute(getPrevMinute(endMinute))}
                  />
                </View>
              </View>

              <View style={styles.inputBlock}>
                <View style={styles.notifyRow}>
                  <View style={styles.notifyLabelWrap}>
                    <IconSymbol name="bell" size={18} color="#405886" />
                    <Text style={styles.editSectionLabelInline}>알림</Text>
                  </View>

                  <View style={styles.notifySwitchRow}>
                    <Text style={styles.notifyStateText}>
                      {isNotify ? "켜짐" : "꺼짐"}
                    </Text>
                    <Switch
                      value={isNotify}
                      onValueChange={setIsNotify}
                      trackColor={{ false: "#D8DEE8", true: "#9FA2D6" }}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.inputBlock}>
                <Text style={styles.editSectionLabel}>반복 설정</Text>

                <View style={styles.repeatOptionWrap}>
                  <TouchableOpacity
                    style={[
                      styles.repeatOptionButton,
                      repeatOption === "DAILY" &&
                        styles.repeatOptionButtonSelected,
                    ]}
                    onPress={() => setRepeatOption("DAILY")}
                  >
                    <Text
                      style={[
                        styles.repeatOptionText,
                        repeatOption === "DAILY" &&
                          styles.repeatOptionTextSelected,
                      ]}
                    >
                      매일 반복
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.repeatOptionButton,
                      repeatOption === "CUSTOM" &&
                        styles.repeatOptionButtonSelected,
                    ]}
                    onPress={() => setRepeatOption("CUSTOM")}
                  >
                    <Text
                      style={[
                        styles.repeatOptionText,
                        repeatOption === "CUSTOM" &&
                          styles.repeatOptionTextSelected,
                      ]}
                    >
                      사용자 설정
                    </Text>
                  </TouchableOpacity>
                </View>
                {repeatOption === "CUSTOM" && (
                  <View style={styles.customRepeatBox}>
                    <View style={styles.dialRow}>
                      <DialControl
                        label="반복 수"
                        value={customRepeatEvery}
                        onDecrease={() => changeRepeatEvery(-1)}
                        onIncrease={() => changeRepeatEvery(1)}
                      />
                      <DialControl
                        label="단위"
                        value={repeatUnitTextMap[customRepeatUnit]}
                        onDecrease={() => changeRepeatUnit(-1)}
                        onIncrease={() => changeRepeatUnit(1)}
                      />
                    </View>
                  </View>
                )}
              </View>
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  detailOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  detailCard: {
    width: "100%",
    maxWidth: 320,
    maxHeight: "84%",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
    elevation: 8,
  },
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  editButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  editText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#405886",
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#A0A6B5",
  },
  saveButton: {
    backgroundColor: "#405886",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  saveText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "700",
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#B4B6C0",
    letterSpacing: 0.5,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  detailRoutineTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#2A3C6B",
    lineHeight: 28,
    flexShrink: 1,
  },

  tagBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "center",
  },

  tagText: {
    fontSize: 11,
    fontWeight: "800",
  },

  infoList: {
    gap: 16,
    marginBottom: 28,
  },
  detailInfoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },
  infoTextGroup: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#A0B0D0",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#405886",
  },
  detailFooter: {
    marginTop: 4,
  },

  detailCloseButton: {
    backgroundColor: "#405886",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  detailCloseButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
  editScroll: {
    flexGrow: 1,
  },
  editScrollContent: {
    paddingBottom: 20,
  },
  inputBlock: {
    marginBottom: 16,
  },
  editSectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#A0B0D0",
    marginBottom: 10,
  },
  editSectionLabelInline: {
    fontSize: 12,
    fontWeight: "700",
    color: "#A0B0D0",
  },
  titleInput: {
    borderWidth: 1,
    borderColor: "#E4E7EE",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: "600",
    color: "#405886",
    backgroundColor: "#FAFBFD",
  },
  categoryChipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "transparent",
  },
  categoryChipSelected: {
    borderColor: "#405886",
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: "700",
  },
  dateRangeBlock: {
    gap: 8,
  },
  dateSelectButton: {
    borderWidth: 1,
    borderColor: "#E4E7EE",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: "#FAFBFD",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateSelectLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateSelectText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#405886",
  },
  calendarContainer: {
    backgroundColor: "#F8F9FB",
    borderRadius: 20,
    marginTop: 10,
    overflow: "hidden",
    paddingBottom: 10,
  },

  timePickerRow: {
    flexDirection: "row",
    gap: 8,
  },
  timeStepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  timeStepperBox: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 6,
    alignItems: "center",
  },
  timeStepperLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#A0B0D0",
    marginBottom: 8,
  },
  timeStepperButton: {
    width: 30,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#F1F4F9",
    alignItems: "center",
    justifyContent: "center",
  },
  timeStepperButtonText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#405886",
    textAlign: "center",
    includeFontPadding: false,
    lineHeight: 18,
  },
  timeStepperValueBox: {
    flex: 2,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 6,
  },
  timeStepperValueText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#2A3C6B",
    textAlign: "center",
    includeFontPadding: false,
    lineHeight: 20,
  },

  notifyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E4E7EE",
    borderRadius: 14,
    backgroundColor: "#FAFBFD",
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  notifyLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  notifySwitchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  notifyStateText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#405886",
  },

  dialRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "stretch",
  },
  dialItem: {
    flex: 1,
    justifyContent: "flex-start",
  },
  dialLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#A0B0D0",
    marginBottom: 8,
  },
  dialBox: {
    borderWidth: 1,
    borderColor: "#E4E7EE",
    borderRadius: 14,
    backgroundColor: "#FAFBFD",
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    minHeight: 120,
  },
  dialButton: {
    width: "100%",
    paddingVertical: 4,
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: "#F1F4F9",
  },
  dialButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#405886",
  },
  dialValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#2A3C6B",
  },

  repeatOptionWrap: {
    gap: 8,
  },
  repeatOptionButton: {
    borderWidth: 1,
    borderColor: "#E4E7EE",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#FAFBFD",
  },
  repeatOptionButtonSelected: {
    borderColor: "#405886",
    backgroundColor: "#F3F6FB",
  },
  repeatOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6D7690",
  },
  repeatOptionTextSelected: {
    color: "#405886",
  },
  customRepeatBox: {
    marginTop: 12,
  },
  deleteIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FCEBEC",
  },
});
