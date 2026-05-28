//schedule_detail_modal.tsx
import { IconSymbol } from "@/components/ui/icon-symbol";
import { getCategoryChipStyle, getCategoryStyle } from "@/lib/category";
import { CategoryService } from "@/services/category_service";
import { NotificationService } from "@/services/notification_service";
import { RoutineService } from "@/services/routine_service";
import type {
  RepeatType,
  RepeatUnit,
  RepeatWeekday,
  ScheduleRoutine,
} from "@/types/routine";
import { Ionicons } from "@expo/vector-icons";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Keyboard,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppCalendar from "./ui/app_calendar";
const { height: SCREEN_HEIGHT } = Dimensions.get("window");
type CustomCategory = {
  name: string;
  color: string;
};
type ScheduleDetailModalProps = {
  visible: boolean;
  routine: ScheduleRoutine | null;
  onClose: () => void;
  onUpdated: () => Promise<void> | void;
  readOnly?: boolean;
};

const MINUTE_OPTIONS = ["00", "10", "20", "30", "40", "50"];
const WEEKDAY_OPTIONS: { label: string; value: RepeatWeekday }[] = [
  { label: "일", value: "SUN" },
  { label: "월", value: "MON" },
  { label: "화", value: "TUE" },
  { label: "수", value: "WED" },
  { label: "목", value: "THU" },
  { label: "금", value: "FRI" },
  { label: "토", value: "SAT" },
];

const WEEK_REPEAT_EVERY_OPTIONS = ["1", "2"];

function getWeekdayValueFromDate(dateString: string): RepeatWeekday {
  const weekdayValues: RepeatWeekday[] = [
    "SUN",
    "MON",
    "TUE",
    "WED",
    "THU",
    "FRI",
    "SAT",
  ];
  return weekdayValues[new Date(`${dateString}T00:00:00`).getDay()];
}
function getRepeatLabel(
  repeatType: RepeatType,
  repeatInterval: string,
  repeatUnit: RepeatUnit,
  repeatDays: RepeatWeekday[],
): string {
  switch (repeatType) {
    case "NONE":
      return "없음";
    case "DAILY":
      return "매일";
    case "WEEKLY": {
      const dayLabel =
        WEEKDAY_OPTIONS.find((d) => repeatDays.includes(d.value))?.label ?? "";
      return `매주 ${dayLabel}`;
    }
    case "WEEKDAYS":
      return "매주 평일";
    case "CUSTOM":
      if (repeatUnit === "WEEK") {
        const dayLabels = WEEKDAY_OPTIONS.filter((d) =>
          repeatDays.includes(d.value),
        ).map((d) => d.label);
        const everyLabel = repeatInterval === "1" ? "매주" : "격주";
        const dayLabel =
          dayLabels.length > 0 ? ` · ${dayLabels.join(", ")}` : "";
        return `${everyLabel}${dayLabel}`;
      }
      return repeatInterval === "1" ? "매일" : `${repeatInterval}일마다`;
    default:
      return "없음";
  }
}
function getRepeatText(item: ScheduleRoutine) {
  switch (item.repeatType) {
    case "DAILY":
      return "매일 반복";

    case "WEEKLY": {
      const dayLabel =
        WEEKDAY_OPTIONS.find((d) => (item.repeatDays ?? []).includes(d.value))
          ?.label ?? "";
      return `매주 ${dayLabel} 반복`;
    }

    case "WEEKDAYS":
      return "매주 평일 반복";

    case "CUSTOM": {
      if (item.repeatUnit === "WEEK") {
        const dayLabels = WEEKDAY_OPTIONS.filter((d) =>
          (item.repeatDays ?? []).includes(d.value),
        ).map((d) => d.label);
        const everyLabel = (item.repeatInterval ?? 1) === 1 ? "매주" : "격주";
        const dayLabel =
          dayLabels.length > 0 ? ` · ${dayLabels.join(", ")}` : "";
        return `${everyLabel}${dayLabel} 반복`;
      }
      const interval = item.repeatInterval ?? 1;
      return interval === 1 ? "매일 반복" : `${interval}일마다 반복`;
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
  return `${year}. ${month}. ${day}`;
}

function formatDateRange(startDate: string, endDate: string | null) {
  if (!endDate) {
    return `${formatDate(startDate)} ~ 무한반복`;
  }
  if (startDate === endDate) {
    return formatDate(startDate);
  }
  return `${formatDate(startDate)} ~ ${formatDate(endDate)}`;
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

function normalizeMinuteOption(minute: string) {
  return MINUTE_OPTIONS.includes(minute) ? minute : "00";
}

function TimeStepperControl({
  label,
  value,
  onIncrease,
  onDecrease,
  onChange,
  onInputFocus,
}: {
  label: string;
  value: string;
  onIncrease: () => void;
  onDecrease: () => void;
  onChange?: (value: string) => void;
  onInputFocus?: () => void;
}) {
  const [inputValue, setInputValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setInputValue(value);
    }
  }, [value, isFocused]);

  const handleChangeText = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "").slice(0, 2);
    setInputValue(cleaned);

    if (Platform.OS === "android" && cleaned.length === 2) {
      const num = Number(cleaned);
      const safeHour = padNumber(clamp(num, 0, 23));
      setInputValue(safeHour);
      onChange?.(safeHour);
      Keyboard.dismiss();
    }
  };

  const handleBlur = () => {
    setIsFocused(false);

    if (!onChange || inputValue === "") {
      setInputValue(value);
      return;
    }

    const num = Number(inputValue);
    if (Number.isNaN(num)) {
      setInputValue(value);
      return;
    }

    const safeHour = padNumber(clamp(num, 0, 23));
    setInputValue(safeHour);
    onChange(safeHour);
  };

  return (
    <View style={styles.timeStepperBox}>
      <Text style={styles.timeStepperLabel}>{label}</Text>

      <View style={styles.timeStepperRow}>
        <TouchableOpacity style={styles.timeStepperButton} onPress={onDecrease}>
          <Text style={styles.timeStepperButtonText}>-</Text>
        </TouchableOpacity>

        {onChange ? (
          <TextInput
            style={styles.timeStepperValueInput}
            value={inputValue}
            onChangeText={handleChangeText}
            onFocus={() => {
              setIsFocused(true);
              setInputValue("");
              onInputFocus?.();
            }}
            onBlur={handleBlur}
            keyboardType="number-pad"
            maxLength={2}
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={() => {
              Keyboard.dismiss();
            }}
          />
        ) : (
          <View style={styles.timeStepperValueBox}>
            <Text style={styles.timeStepperValueText}>{value}</Text>
          </View>
        )}

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
  readOnly = false,
}: ScheduleDetailModalProps) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const dragY = useRef(new Animated.Value(0)).current;

  const closeWithAnimation = useCallback(() => {
    Keyboard.dismiss();

    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      dragY.setValue(0);
      onClose();
    });
  }, [dragY, onClose, slideAnim]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,

      onMoveShouldSetPanResponder: (_, gestureState) => {
        const isDraggingDown =
          gestureState.dy > 2 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx);

        if (isDraggingDown && isKeyboardVisible) {
          Keyboard.dismiss();
        }

        return isDraggingDown;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          dragY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120 || gestureState.vy > 1.2) {
          closeWithAnimation();
        } else {
          Animated.spring(dragY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;
  useEffect(() => {
    if (visible) {
      dragY.setValue(0);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);
  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (event) => {
      setIsKeyboardVisible(true);
      setKeyboardHeight(event.endCoordinates.height);
    });

    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setIsKeyboardVisible(false);
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const editScrollRef = useRef<ScrollView>(null);
  const [title, setTitle] = useState("");
  const [categoryName, setCategoryName] = useState("");
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

  const [repeatType, setRepeatType] = useState<RepeatType>("DAILY");
  const [repeatInterval, setRepeatInterval] = useState("1");
  const [repeatUnit, setRepeatUnit] = useState<RepeatUnit>("DAY");
  const [repeatDays, setRepeatDays] = useState<RepeatWeekday[]>([]);
  const [showRepeatPanel, setShowRepeatPanel] = useState(false);
  const [showCustomRepeatPanel, setShowCustomRepeatPanel] = useState(false);
  const [isTimed, setIsTimed] = useState(false);
  const [isNotify, setIsNotify] = useState(false);
  const [hasEndDate, setHasEndDate] = useState(true);
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>(
    [],
  );
  const resetFormFromRoutine = useCallback((targetRoutine: ScheduleRoutine) => {
    const startDateParts = parseDateParts(targetRoutine.startDate);
    const endDateParts = parseDateParts(
      targetRoutine.endDate ?? targetRoutine.startDate,
    );
    setHasEndDate(
      targetRoutine.endDate !== null && targetRoutine.endDate !== undefined,
    );
    const start = splitTime(targetRoutine.startTime);
    const end = splitTime(targetRoutine.endTime);

    setIsEditMode(false);
    setShowCalendar(false);
    setTitle(targetRoutine.title);
    setCategoryName(targetRoutine.categoryName ?? "");
    setSelectedColor(targetRoutine.color ?? "#C4C6D0");
    setStartDateYear(startDateParts.year);
    setStartDateMonth(startDateParts.month);
    setStartDateDay(startDateParts.day);
    setEndDateYear(endDateParts.year);
    setEndDateMonth(endDateParts.month);
    setEndDateDay(endDateParts.day);
    setCalendarTarget("start");

    setStartHour(start.hour);
    setStartMinute(normalizeMinuteOption(start.minute));
    setEndHour(end.hour);
    setEndMinute(normalizeMinuteOption(end.minute));
    setRepeatType((targetRoutine.repeatType as RepeatType) ?? "NONE");
    setRepeatInterval(String(targetRoutine.repeatInterval ?? 1));
    setRepeatUnit((targetRoutine.repeatUnit as RepeatUnit) ?? "DAY");
    setRepeatDays((targetRoutine.repeatDays as RepeatWeekday[]) ?? []); // ← 추가
    setIsTimed(Boolean(targetRoutine.startTime));
    setIsNotify(Boolean(targetRoutine.alarm));
  }, []);
  useEffect(() => {
    if (!visible) return;

    CategoryService.getAll()
      .then((serverCategories) => {
        const categories = serverCategories.map((c) => ({
          name: c.name,
          color: c.colorCode,
        }));
        setCustomCategories(categories);
      })
      .catch((error) => {
        const status = error?.response?.status;
        if (status === 401 || status === 403) return;
        console.error("카테고리 불러오기 실패", error);
      });
  }, [visible]);

  useEffect(() => {
    if (!routine || !visible) return;
    resetFormFromRoutine(routine);
  }, [routine, visible, resetFormFromRoutine]);

  const customCategoryColorMap = useMemo(() => {
    return customCategories.reduce<Record<string, string>>((acc, item) => {
      acc[item.name] = item.color;
      return acc;
    }, {});
  }, [customCategories]);

  const categoryList = useMemo(() => {
    return customCategories.map((item) => item.name);
  }, [customCategories]);

  const previewRoutine = useMemo(() => {
    if (!routine) return null;

    const nextStartDate = makeDate(startDateYear, startDateMonth, startDateDay);
    const nextEndDate = makeDate(endDateYear, endDateMonth, endDateDay);

    return {
      ...routine,
      title,
      categoryName,
      color: selectedColor,
      startDate: nextStartDate,
      endDate: hasEndDate ? nextEndDate : null,
      startTime: isTimed ? makeTime(startHour, startMinute) : null,
      endTime: isTimed ? makeTime(endHour, endMinute) : null,
      alarm: isNotify,
      repeatType,
      repeatInterval:
        repeatType === "CUSTOM" ? Number(repeatInterval || "1") : undefined,
      repeatUnit: repeatType === "CUSTOM" ? repeatUnit : undefined,
      repeatDays:
        repeatType === "WEEKLY" ||
        (repeatType === "CUSTOM" && repeatUnit === "WEEK")
          ? repeatDays
          : [],
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
    isTimed,
    repeatType,
    repeatInterval,
    repeatUnit,
    repeatDays,
    hasEndDate,
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
    resetFormFromRoutine(routine);
  };

  const handleDelete = async () => {
    if (!routine) return;

    Alert.alert("루틴 삭제", "이 루틴을 삭제할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            const today = new Date();
            const todayString = [
              today.getFullYear(),
              String(today.getMonth() + 1).padStart(2, "0"),
              String(today.getDate()).padStart(2, "0"),
            ].join("-");

            const isCompletedToday =
              routine.completedDates?.includes(todayString) ?? false;

            if (isCompletedToday) {
              try {
                await RoutineService.toggleComplete(routine.id, todayString);
              } catch {}
            }

            await RoutineService.deleteById(routine.id);

            try {
              await NotificationService.cancelRoutineNotification(routine.id);
            } catch (notificationError) {
              console.warn("알림 취소 실패", notificationError);
            }

            await onUpdated();
            closeWithAnimation();
          } catch (error) {
            console.error("루틴 삭제 실패", error);
            Alert.alert("오류", "루틴 삭제 중 문제가 발생했어요.");
          }
        },
      },
    ]);
  };
  const handleSelectQuickWeeklyRepeat = (interval: "1" | "2") => {
    const startDateString = makeDate(
      startDateYear,
      startDateMonth,
      startDateDay,
    );
    setRepeatType("CUSTOM");
    setRepeatInterval(interval);
    setRepeatUnit("WEEK");
    setRepeatDays([getWeekdayValueFromDate(startDateString)]);
    setShowRepeatPanel(false);
  };

  const handleSelectRepeatType = (option: RepeatType) => {
    if (option === "CUSTOM") {
      setShowRepeatPanel(false);
      setShowCustomRepeatPanel(true);
      scrollToRepeatInput();
      return;
    }
    setRepeatType(option);
    setRepeatInterval("1");
    setRepeatUnit("DAY");
    setRepeatDays([]);
    setShowRepeatPanel(false);
  };

  const handleSelectCustomRepeatUnit = (unit: RepeatUnit) => {
    setRepeatUnit(unit);
    if (unit === "DAY") setRepeatDays([]);
    if (unit === "WEEK" && Number(repeatInterval) > 2) setRepeatInterval("2");
  };

  const handleToggleWeekday = (weekday: RepeatWeekday) => {
    setRepeatDays((prev) =>
      prev.includes(weekday)
        ? prev.filter((item) => item !== weekday)
        : [...prev, weekday],
    );
  };
  const scrollToRepeatInput = () => {
    const delay = Platform.OS === "ios" ? 500 : 300;

    setTimeout(() => {
      editScrollRef.current?.scrollTo({
        y: Platform.OS === "ios" ? 740 : 760,
        animated: true,
      });
    }, delay);
  };
  const handleSaveCustomRepeat = () => {
    if (repeatUnit === "WEEK" && repeatDays.length === 0) {
      Alert.alert(
        "요일 선택 필요",
        "주 단위 반복은 요일을 1개 이상 선택해 주세요.",
      );
      return;
    }
    setRepeatType("CUSTOM");
    setShowCustomRepeatPanel(false);
  };
  const handleSave = async () => {
    if (isSaving) return;
    if (!routine) return;

    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      Alert.alert("안내", "루틴 제목을 입력해 주세요.");
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

    const nextStartDate = makeDate(
      String(safeStartYear),
      padNumber(safeStartMonth),
      padNumber(safeStartDay),
    );
    const nextEndDate = hasEndDate
      ? makeDate(
          String(safeEndYear),
          padNumber(safeEndMonth),
          padNumber(safeEndDay),
        )
      : null;

    if (isTimed && endTotal <= startTotal) {
      Alert.alert("안내", "종료 시간은 시작 시간보다 늦어야 해요.");
      return;
    }
    if (hasEndDate && nextEndDate && nextEndDate < nextStartDate) {
      Alert.alert("안내", "종료 날짜는 시작 날짜보다 빠를 수 없어요.");
      return;
    }
    setIsSaving(true);
    try {
      const serverCategories = await CategoryService.getAll();
      const matched = serverCategories.find(
        (c) =>
          c.name.trim().toLowerCase() === categoryName.trim().toLowerCase(),
      );
      let resolvedCategoryId: number | null = matched?.id ?? null;
      if (resolvedCategoryId === null) {
        Alert.alert("안내", "카테고리를 선택해주세요.");
        return;
      }

      const newStartTime = makeTime(
        padNumber(safeStartHour),
        padNumber(safeStartMinute),
      );
      const newEndTime = makeTime(
        padNumber(safeEndHour),
        padNumber(safeEndMinute),
      );
      const updatedRoutine: ScheduleRoutine = {
        ...routine,
        categoryId: resolvedCategoryId,
        title: trimmedTitle,
        categoryName,
        color: selectedColor,
        startDate: nextStartDate,
        endDate: nextEndDate,
        startTime: isTimed ? newStartTime : null,
        endTime: isTimed ? newEndTime : null,
        alarm: isTimed && isNotify,
        repeatType,
        repeatInterval:
          repeatType === "CUSTOM"
            ? clamp(Number(repeatInterval || "1"), 1, 999)
            : undefined,
        repeatUnit: repeatType === "CUSTOM" ? repeatUnit : undefined,
        repeatDays:
          repeatType === "WEEKLY" ||
          (repeatType === "CUSTOM" && repeatUnit === "WEEK")
            ? repeatDays
            : [],
      };

      await RoutineService.updateById(routine.id, updatedRoutine);

      await NotificationService.syncRoutineNotification(updatedRoutine);

      setIsEditMode(false);
      closeWithAnimation();
      await onUpdated();
    } catch (error: any) {
      const status = error?.response?.status;

      if (status === 409) {
        Alert.alert("시간 중복", "같은 시간대에 이미 등록된 루틴이 있어요.");
      } else {
        console.error("루틴 수정 실패", error);
        Alert.alert("오류", "루틴 수정 중 문제가 발생했어요.");
      }
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={styles.modalRoot}>
        <Pressable style={styles.detailOverlay} onPress={closeWithAnimation} />

        <Animated.View
          style={{
            transform: [
              {
                translateY: Animated.add(slideAnim, dragY),
              },
            ],
          }}
        >
          <View
            style={[
              styles.detailCard,
              {
                paddingBottom: 100,
                marginBottom: -100,
              },
            ]}
          >
            <View style={styles.dragHandleArea} {...panResponder.panHandlers}>
              <View style={styles.dragHandle} />
            </View>

            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle}>
                {isEditMode ? "루틴 수정" : "상세 정보"}
              </Text>
              <View style={styles.headerActions}>
                {!isEditMode ? (
                  <>
                    {/* readOnly가 아닐 때만 수정/삭제 버튼 표시 */}
                    {!readOnly && (
                      <>
                        <TouchableOpacity
                          onPress={handleEdit}
                          style={styles.editIconButton}
                        >
                          <Ionicons
                            name="pencil-outline"
                            size={18}
                            color="#405886"
                          />
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={handleDelete}
                          style={styles.deleteIconButton}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={18}
                            color="#D45A68"
                          />
                        </TouchableOpacity>
                      </>
                    )}

                    <TouchableOpacity onPress={closeWithAnimation}>
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
                      onPress={() => {
                        if (!isSaving) handleSave();
                      }}
                      style={[styles.saveButton, isSaving && { opacity: 0.5 }]}
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
                    <Text
                      style={[styles.tagText, { color: categoryStyle.text }]}
                    >
                      {previewRoutine.categoryName ?? "카테고리 없음"}{" "}
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
              </>
            ) : (
              <ScrollView
                ref={editScrollRef}
                style={styles.editScroll}
                contentContainerStyle={styles.editScrollContent}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
                keyboardShouldPersistTaps="always"
                keyboardDismissMode="on-drag"
              >
                <View style={styles.inputBlock}>
                  <Text style={styles.editSectionLabel}>제목</Text>
                  <TextInput
                    value={title}
                    onChangeText={setTitle}
                    placeholder="루틴 제목을 입력해 주세요"
                    placeholderTextColor="#B4B6C0"
                    style={styles.titleInput}
                  />
                </View>

                <View style={styles.inputBlock}>
                  <Text style={styles.editSectionLabel}>카테고리</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{
                      gap: 6,
                      paddingVertical: 2,
                      marginTop: 12,
                    }}
                  >
                    {categoryList.map((cat) => {
                      const chipStyle = getCategoryChipStyle(
                        cat,
                        customCategoryColorMap,
                      );
                      const isSelected = categoryName === cat;

                      return (
                        <TouchableOpacity
                          key={cat}
                          style={[
                            styles.categoryChip,
                            {
                              backgroundColor: chipStyle.bg,
                              borderColor: isSelected
                                ? chipStyle.dot
                                : "transparent",
                              borderWidth: isSelected ? 1.5 : 1,
                            },
                          ]}
                          onPress={() => {
                            setCategoryName(cat);
                            setSelectedColor(chipStyle.dot);
                          }}
                        >
                          <Text
                            style={[
                              styles.categoryChipText,
                              { color: chipStyle.text },
                            ]}
                          >
                            {cat}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
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
                      style={[
                        styles.dateSelectButton,
                        !hasEndDate && { opacity: 0.5 },
                      ]}
                      onPress={() => {
                        if (!hasEndDate) return;
                        setCalendarTarget("end");
                        setShowCalendar((prev) =>
                          calendarTarget === "end" ? !prev : true,
                        );
                      }}
                    >
                      <View style={styles.dateSelectLeft}>
                        <IconSymbol name="calendar" size={18} color="#405886" />
                        <Text style={styles.dateSelectText}>
                          종료일 ·{" "}
                          {hasEndDate
                            ? formatDate(selectedEndDateString)
                            : "없음 (무한반복)"}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => {
                          setHasEndDate((prev) => !prev);
                          setShowCalendar(false);
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            color: "#9FA2D6",
                            fontWeight: "700",
                          }}
                        >
                          {hasEndDate ? "종료일 해제" : "종료일 설정"}
                        </Text>
                      </TouchableOpacity>
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
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 10,
                    }}
                  >
                    <Text style={styles.editSectionLabel}>시간 설정</Text>
                    <Switch
                      value={isTimed}
                      onValueChange={(value) => {
                        setIsTimed(value);
                        if (!value) setIsNotify(false);
                      }}
                      trackColor={{ true: "#9FA2D6" }}
                    />
                  </View>

                  {isTimed && (
                    <>
                      <Text style={[styles.editSectionLabel, { marginTop: 8 }]}>
                        시작 시간
                      </Text>
                      <View style={styles.timePickerRow}>
                        <TimeStepperControl
                          label="시"
                          value={startHour}
                          onIncrease={() =>
                            setStartHour(getNextHour(startHour))
                          }
                          onDecrease={() =>
                            setStartHour(getPrevHour(startHour))
                          }
                          onChange={setStartHour}
                          onInputFocus={() => {
                            setTimeout(() => {
                              editScrollRef.current?.scrollTo({
                                y: 360,
                                animated: true,
                              });
                            }, 250);
                          }}
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

                      <Text
                        style={[styles.editSectionLabel, { marginTop: 12 }]}
                      >
                        종료 시간
                      </Text>
                      <View style={styles.timePickerRow}>
                        <TimeStepperControl
                          label="시"
                          value={endHour}
                          onIncrease={() => setEndHour(getNextHour(endHour))}
                          onDecrease={() => setEndHour(getPrevHour(endHour))}
                          onChange={setEndHour}
                          onInputFocus={() => {
                            setTimeout(() => {
                              editScrollRef.current?.scrollTo({
                                y: 460,
                                animated: true,
                              });
                            }, 250);
                          }}
                        />
                        <TimeStepperControl
                          label="분"
                          value={endMinute}
                          onIncrease={() =>
                            setEndMinute(getNextMinute(endMinute))
                          }
                          onDecrease={() =>
                            setEndMinute(getPrevMinute(endMinute))
                          }
                        />
                      </View>
                    </>
                  )}
                </View>
                {isTimed && (
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
                          onValueChange={(value) => {
                            setIsNotify(value);
                          }}
                          trackColor={{ false: "#D8DEE8", true: "#9FA2D6" }}
                        />
                      </View>
                    </View>
                  </View>
                )}
                <View style={styles.inputBlock}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <Text
                      style={[styles.editSectionLabel, { marginBottom: 0 }]}
                    >
                      반복 설정
                    </Text>

                    <TouchableOpacity
                      style={styles.repeatCurrentChip}
                      onPress={() => {
                        setShowRepeatPanel((prev) => !prev);
                        setShowCustomRepeatPanel(false);
                      }}
                    >
                      <View style={styles.repeatCurrentChipContent}>
                        <Text style={styles.repeatCurrentChipText}>
                          {getRepeatLabel(
                            repeatType,
                            repeatInterval,
                            repeatUnit,
                            repeatDays,
                          )}
                        </Text>
                        <Text style={styles.repeatCurrentChevron}>▾</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                  {/* 빠른 선택 패널 */}
                  {showRepeatPanel && (
                    <View style={{ marginTop: 8, gap: 6 }}>
                      {[
                        { label: "매일", value: "DAILY" as RepeatType },
                        {
                          label: `매주 (${
                            WEEKDAY_OPTIONS.find(
                              (d) =>
                                d.value ===
                                getWeekdayValueFromDate(
                                  makeDate(
                                    startDateYear,
                                    startDateMonth,
                                    startDateDay,
                                  ),
                                ),
                            )?.label ?? ""
                          })`,
                          value: "QUICK_WEEKLY",
                        },
                        {
                          label: `격주 (${
                            WEEKDAY_OPTIONS.find(
                              (d) =>
                                d.value ===
                                getWeekdayValueFromDate(
                                  makeDate(
                                    startDateYear,
                                    startDateMonth,
                                    startDateDay,
                                  ),
                                ),
                            )?.label ?? ""
                          })`,
                          value: "QUICK_BIWEEKLY",
                        },
                        {
                          label: "사용자 설정",
                          value: "CUSTOM" as RepeatType,
                        },
                      ].map((item) => {
                        const isSelected =
                          (repeatType === "DAILY" && item.value === "DAILY") ||
                          (repeatType === "WEEKDAYS" &&
                            item.value === "WEEKDAYS") ||
                          (repeatType === "CUSTOM" &&
                            repeatUnit === "WEEK" &&
                            repeatInterval === "1" &&
                            item.value === "QUICK_WEEKLY") ||
                          (repeatType === "CUSTOM" &&
                            repeatUnit === "WEEK" &&
                            repeatInterval === "2" &&
                            item.value === "QUICK_BIWEEKLY") ||
                          (repeatType === "CUSTOM" &&
                            !(
                              repeatUnit === "WEEK" &&
                              (repeatInterval === "1" || repeatInterval === "2")
                            ) &&
                            item.value === "CUSTOM");

                        return (
                          <TouchableOpacity
                            key={item.value}
                            style={[
                              styles.repeatOptionButton,
                              isSelected && styles.repeatOptionButtonSelected,
                            ]}
                            onPress={() => {
                              if (item.value === "QUICK_WEEKLY") {
                                handleSelectQuickWeeklyRepeat("1");
                              } else if (item.value === "QUICK_BIWEEKLY") {
                                handleSelectQuickWeeklyRepeat("2");
                              } else {
                                handleSelectRepeatType(
                                  item.value as RepeatType,
                                );
                              }
                            }}
                          >
                            <Text
                              style={[
                                styles.repeatOptionText,
                                isSelected && styles.repeatOptionTextSelected,
                              ]}
                            >
                              {item.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                  {/* 사용자 설정 패널 */}
                  {showCustomRepeatPanel && (
                    <View style={{ marginTop: 12, gap: 14 }}>
                      {/* 단위 - 일/주 */}
                      <View>
                        <Text style={styles.dialLabel}>단위</Text>
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          {(["DAY", "WEEK"] as RepeatUnit[]).map((unit) => (
                            <TouchableOpacity
                              key={unit}
                              style={[
                                styles.repeatOptionButton,
                                repeatUnit === unit &&
                                  styles.repeatOptionButtonSelected,
                                { flex: 1, alignItems: "center" },
                              ]}
                              onPress={() => handleSelectCustomRepeatUnit(unit)}
                            >
                              <Text
                                style={[
                                  styles.repeatOptionText,
                                  repeatUnit === unit &&
                                    styles.repeatOptionTextSelected,
                                ]}
                              >
                                {unit === "DAY" ? "일" : "주"}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      {/* 빈도 */}
                      <View>
                        <Text style={styles.dialLabel}>빈도</Text>
                        {repeatUnit === "WEEK" ? (
                          <View style={{ flexDirection: "row", gap: 8 }}>
                            {WEEK_REPEAT_EVERY_OPTIONS.map((opt) => (
                              <TouchableOpacity
                                key={opt}
                                style={[
                                  styles.repeatOptionButton,
                                  repeatInterval === opt &&
                                    styles.repeatOptionButtonSelected,
                                  { flex: 1, alignItems: "center" },
                                ]}
                                onPress={() => setRepeatInterval(opt)}
                              >
                                <Text
                                  style={[
                                    styles.repeatOptionText,
                                    repeatInterval === opt &&
                                      styles.repeatOptionTextSelected,
                                  ]}
                                >
                                  {opt === "1" ? "매주" : "격주"}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        ) : (
                          <View style={styles.repeatIntervalStepper}>
                            <TouchableOpacity
                              style={styles.repeatStepperButton}
                              onPress={() => {
                                const next = Math.max(
                                  1,
                                  Number(repeatInterval || "1") - 1,
                                );
                                setRepeatInterval(String(next));
                              }}
                            >
                              <Text style={styles.repeatStepperButtonText}>
                                -
                              </Text>
                            </TouchableOpacity>

                            <View style={styles.repeatIntervalInputBox}>
                              <TextInput
                                style={styles.repeatIntervalInput}
                                value={repeatInterval}
                                onFocus={scrollToRepeatInput}
                                onChangeText={(text) => {
                                  const onlyNumber = text.replace(
                                    /[^0-9]/g,
                                    "",
                                  );
                                  if (onlyNumber === "") {
                                    setRepeatInterval("");
                                    return;
                                  }
                                  setRepeatInterval(
                                    String(
                                      Math.min(
                                        999,
                                        Math.max(1, Number(onlyNumber)),
                                      ),
                                    ),
                                  );
                                }}
                                onBlur={() => {
                                  if (
                                    !repeatInterval ||
                                    Number(repeatInterval) < 1
                                  )
                                    setRepeatInterval("1");
                                }}
                                keyboardType="number-pad"
                                returnKeyType="done"
                                maxLength={3}
                              />
                              <Text style={styles.repeatIntervalSuffix}>
                                일마다
                              </Text>
                            </View>

                            <TouchableOpacity
                              style={styles.repeatStepperButton}
                              onPress={() => {
                                const next = Math.min(
                                  999,
                                  Number(repeatInterval || "1") + 1,
                                );
                                setRepeatInterval(String(next));
                              }}
                            >
                              <Text style={styles.repeatStepperButtonText}>
                                +
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>

                      {/* 요일 (주 단위일 때만) */}
                      {repeatUnit === "WEEK" && (
                        <View>
                          <Text style={styles.dialLabel}>요일</Text>
                          <View style={styles.weekdayRow}>
                            {WEEKDAY_OPTIONS.map((day) => {
                              const isSelected = repeatDays.includes(day.value);
                              return (
                                <TouchableOpacity
                                  key={day.value}
                                  style={[
                                    styles.weekdayChip,
                                    isSelected && styles.weekdayChipSelected,
                                  ]}
                                  onPress={() => handleToggleWeekday(day.value)}
                                >
                                  <Text
                                    style={[
                                      styles.weekdayChipText,
                                      isSelected &&
                                        styles.weekdayChipTextSelected,
                                    ]}
                                  >
                                    {day.label}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      )}

                      <TouchableOpacity
                        style={[
                          styles.repeatOptionButton,
                          styles.repeatOptionButtonSelected,
                        ]}
                        onPress={handleSaveCustomRepeat}
                      >
                        <Text
                          style={[
                            styles.repeatOptionText,
                            styles.repeatOptionTextSelected,
                            { textAlign: "center" },
                          ]}
                        >
                          완료
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "transparent",
  },

  detailOverlay: {
    ...StyleSheet.absoluteFillObject, // ← 다시 absolute로
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },

  detailCard: {
    width: "100%",
    maxHeight: SCREEN_HEIGHT * 0.82,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
    overflow: "hidden",
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

  editScroll: {
    flexGrow: 0,
  },
  editScrollContent: {
    paddingBottom: Platform.OS === "ios" ? 340 : 180,
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

  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "transparent",
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

  dialLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#A0B0D0",
    marginBottom: 8,
  },

  repeatOptionButton: {
    borderWidth: 0.5,
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
  deleteIconButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F8",
    borderWidth: 1,
    borderColor: "#E7EAF0",
  },

  weekdayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  weekdayChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E4E7EE",
    backgroundColor: "#FAFBFD",
  },
  weekdayChipSelected: {
    borderColor: "#405886",
    backgroundColor: "#EEF2FF",
  },
  weekdayChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6D7690",
  },
  weekdayChipTextSelected: {
    color: "#405886",
  },

  editIconButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F8",
    borderWidth: 1,
    borderColor: "#E7EAF0",
  },
  timeStepperValueInput: {
    flex: 2,
    height: 40,
    borderRadius: 12,
    marginVertical: 6,
    fontSize: 18,
    fontWeight: "800",
    color: "#2A3C6B",
    textAlign: "center",
    includeFontPadding: false,
    lineHeight: 20,
  },

  repeatCurrentChip: {
    minHeight: 28,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#F3F5FA",
    borderWidth: 1,
    borderColor: "#E4E7EE",
    alignItems: "center",
    justifyContent: "center",
  },

  repeatCurrentChipContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  repeatCurrentChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#405886",
  },

  repeatCurrentChevron: {
    fontSize: 10,
    fontWeight: "900",
    color: "#9AA3B2",
    marginTop: -1,
  },
  repeatIntervalStepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  repeatStepperButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F8",
    borderWidth: 1,
    borderColor: "#E4E7EE",
  },
  repeatStepperButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#405886",
  },
  repeatIntervalInputBox: {
    flex: 1,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#E7EAF3",
    backgroundColor: "#FAFBFD",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  repeatIntervalInput: {
    minWidth: 28,
    maxWidth: 52,
    paddingVertical: 0,
    paddingHorizontal: 0,
    fontSize: 14,
    fontWeight: "700",
    color: "#2F3550",
    textAlign: "center",
  },
  repeatIntervalSuffix: {
    marginLeft: 4,
    fontSize: 13,
    fontWeight: "700",
    color: "#6D7690",
  },

  dragHandleArea: {
    width: "100%",
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -10,
    marginBottom: 2,
  },

  dragHandle: {
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#D8DCE6",
  },
});
