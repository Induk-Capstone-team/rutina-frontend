import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import TimePickerModal from "@/components/time_picker_modal";
import AppCalendar from "@/components/ui/app_calendar";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useRoutineForm } from "@/hooks/use_routine_form";
import type {
  NotifyOption,
  RepeatType,
  RepeatUnit,
  RepeatWeekday,
  SaveRoutineOptions,
} from "@/types/routine";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { DateData } from "react-native-calendars";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ColorPicker, {
  HueSlider,
  Panel1,
  Preview,
} from "reanimated-color-picker";

//사용자 추가 카테고리 타입
type CustomCategory = {
  name: string;
  color: string;
};

const WEEKDAY_OPTIONS: { label: string; value: RepeatWeekday }[] = [
  { label: "일", value: "SUN" },
  { label: "월", value: "MON" },
  { label: "화", value: "TUE" },
  { label: "수", value: "WED" },
  { label: "목", value: "THU" },
  { label: "금", value: "FRI" },
  { label: "토", value: "SAT" },
];

// 주 단위 반복은 격주까지만 허용
const WEEK_REPEAT_EVERY_OPTIONS = ["1", "2"];

const DEFAULT_CATEGORIES = [
  "기상",
  "운동",
  "공부",
  "명상",
  "저녁",
  "기타",
] as const;

const FIXED_EVENT_TYPES = {
  기상: { bg: "#FAEEEE", dot: "#E79A95", text: "#5D4645" },
  운동: { bg: "#FDF4EC", dot: "#EFB996", text: "#675141" },
  공부: { bg: "#F1F1FB", dot: "#9FA2D6", text: "#3E426F" },
  명상: { bg: "#F1F7EE", dot: "#A8CD9B", text: "#4C5D44" },
  저녁: { bg: "#FEF9EE", dot: "#E6CF8A", text: "#685A3F" },
  기타: { bg: "#F3F4F8", dot: "#C4C6D0", text: "#8A8C9A" },
} as const;
const isFixedCategoryName = (categoryName: string) => {
  return Object.prototype.hasOwnProperty.call(FIXED_EVENT_TYPES, categoryName);
};
const getCategoryBadgeStyle = (categoryName: string, categoryColor: string) => {
  if (isFixedCategory(categoryName)) {
    const fixedStyle =
      FIXED_EVENT_TYPES[categoryName as keyof typeof FIXED_EVENT_TYPES];

    return {
      backgroundColor: fixedStyle.bg,
      textColor: fixedStyle.text,
      borderColor: fixedStyle.dot,
    };
  }

  return {
    backgroundColor: `${categoryColor}22`,
    textColor: categoryColor,
    borderColor: categoryColor,
  };
};
const DEFAULT_USER_COLOR_PALETTE = [
  "#405886",
  "#E79A95",
  "#EFB996",
  "#9FA2D6",
  "#A8CD9B",
  "#C4C6D0",
];

//AsyncStorage key
const CUSTOM_COLOR_STORAGE_KEY = "@rutina/custom_colors";
const CUSTOM_CATEGORY_STORAGE_KEY = "@rutina/custom_categories";
//공통 색상 상수
const FIXED_PRIMARY_COLOR = "#405886";
const FIXED_SWITCH_COLOR = "#9FA2D6";
const CALENDAR_SELECTED_COLOR = "#405886";

//캘린더 테마
const CALENDAR_THEME = {
  backgroundColor: "#F8F9FB",
  calendarBackground: "#F8F9FB",
  selectedDayBackgroundColor: CALENDAR_SELECTED_COLOR,
  selectedDayTextColor: "#FFFFFF",
  todayTextColor: CALENDAR_SELECTED_COLOR,
  dayTextColor: "#2A3C6B",
  textDisabledColor: "#C9CED8",
  monthTextColor: "#2A3C6B",
  arrowColor: CALENDAR_SELECTED_COLOR,
  textDayFontWeight: "500" as const,
  textMonthFontWeight: "800" as const,
  textDayHeaderFontWeight: "700" as const,
  textMonthFontSize: 17,
  textDayFontSize: 15,
  textDayHeaderFontSize: 13,
};

//시간 한 칸 표시용
function formatTimeLabel(hour: string, minute: string) {
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
}

//시간 범위 표시용
function formatTimeRangeLabel(
  startHour: string,
  startMinute: string,
  endHour: string,
  endMinute: string,
) {
  return `${formatTimeLabel(startHour, startMinute)} ~ ${formatTimeLabel(endHour, endMinute)}`;
}

function formatDateLabel(dateString: string) {
  const [year, month, day] = dateString.split("-");
  return `${year}년 ${month}월 ${day}일`;
}

function getNotifyLabel(isNotify: boolean) {
  return isNotify ? "켜짐" : "꺼짐";
}

function getRepeatLabel(
  repeatType: RepeatType,
  repeatInterval: string,
  repeatUnit: RepeatUnit,
  repeatDays: RepeatWeekday[],
) {
  switch (repeatType) {
    case "NONE":
      return "없음";
    case "DAILY":
      return "매일";
    case "CUSTOM": {
      const unitLabelMap: Record<RepeatUnit, string> = {
        DAY: "일",
        WEEK: "주",
        MONTH: "월",
        YEAR: "년",
      };

      // 주 단위 반복은 선택한 요일까지 함께 보여줌
      if (repeatUnit === "WEEK") {
        const selectedLabels = WEEKDAY_OPTIONS.filter((day) =>
          repeatDays.includes(day.value),
        ).map((day) => day.label);

        const dayLabel =
          selectedLabels.length > 0 ? ` · ${selectedLabels.join(", ")}` : "";
        const everyLabel = repeatInterval === "1" ? "매주" : "격주";

        return `${everyLabel}${dayLabel}`;
      }

      return `${repeatInterval}${unitLabelMap[repeatUnit]}마다`;
    }
    default:
      return "없음";
  }
}

const REPEAT_EVERY_OPTIONS = Array.from({ length: 30 }, (_, i) =>
  String(i + 1),
);

//색상 문자열 정리
function normalizeHexColor(color: string) {
  return color.trim().toUpperCase();
}

//중복 색상 제거
function uniqueColors(colors: string[]) {
  return Array.from(new Set(colors.map(normalizeHexColor)));
}

//중복 카테고리 제거 + 이름/색상 정리
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

//기본 카테고리인지 확인
function isFixedCategory(categoryName: string) {
  return Object.prototype.hasOwnProperty.call(FIXED_EVENT_TYPES, categoryName);
}

//반복 단위 선택 컬럼
function UnitOptionColumn({
  title,
  options,
  selectedValue,
  onSelect,
}: {
  title: string;
  options: { label: string; value: RepeatUnit }[];
  selectedValue: RepeatUnit;
  onSelect: (value: RepeatUnit) => void;
}) {
  return (
    <View style={styles.optionColumn}>
      <ThemedText style={styles.optionColumnTitle}>{title}</ThemedText>

      <ScrollView
        style={styles.optionColumnScroll}
        showsVerticalScrollIndicator={false}
      >
        {options.map((option) => {
          const isSelected = option.value === selectedValue;

          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionChip,
                isSelected && styles.optionChipSelected,
              ]}
              onPress={() => onSelect(option.value)}
            >
              <ThemedText
                style={[
                  styles.optionChipText,
                  isSelected && styles.optionChipTextSelected,
                ]}
              >
                {option.label}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

//반복 숫자 선택 컬럼
function NumberOptionColumn({
  title,
  options,
  selectedValue,
  onSelect,
}: {
  title: string;
  options: string[];
  selectedValue: string;
  onSelect: (value: string) => void;
}) {
  return (
    <View style={styles.optionColumn}>
      <ThemedText style={styles.optionColumnTitle}>{title}</ThemedText>

      <ScrollView
        style={styles.optionColumnScroll}
        showsVerticalScrollIndicator={false}
      >
        {options.map((option) => {
          const isSelected = option === selectedValue;

          return (
            <TouchableOpacity
              key={option}
              style={[
                styles.optionChip,
                isSelected && styles.optionChipSelected,
              ]}
              onPress={() => onSelect(option)}
            >
              <ThemedText
                style={[
                  styles.optionChipText,
                  isSelected && styles.optionChipTextSelected,
                ]}
              >
                {option}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function ModalScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  //화면 UI 상태
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [tempCategory, setTempCategory] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [showRepeatModal, setShowRepeatModal] = useState(false);
  const [showCustomRepeatModal, setShowCustomRepeatModal] = useState(false);
  const [customColors, setCustomColors] = useState<string[]>([]);
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>(
    [],
  );
  const [showColorPickerModal, setShowColorPickerModal] = useState(false);
  const [pickerColor, setPickerColor] = useState("#405886");
  const [activeDateField, setActiveDateField] = useState<"start" | "end">(
    "start",
  );
  //바텀시트 드래그 애니메이션
  const translateY = useRef(new Animated.Value(0)).current;
  const closeThreshold = 120;

  const {
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
  } = useRoutineForm(() => router.dismiss());

  const [startDate, setStartDate] = useState(selectedDate);
  const [endDate, setEndDate] = useState(selectedDate);

  useEffect(() => {
    // form 훅의 기준 날짜를 시작 날짜와 맞춰줌
    setSelectedDate(startDate);
  }, [startDate, setSelectedDate]);

  //저장 시 넘길 알림 값
  const notifyOption: NotifyOption = isNotify ? "ON_TIME" : "NONE";
  const customNotifyDay = "0";
  const customNotifyHour = "0";
  const customNotifyMinute = "0";
  //반복 설정 상태
  const [repeatType, setRepeatType] = useState<RepeatType>("NONE");
  const [repeatInterval, setRepeatInterval] = useState("1");
  const [repeatUnit, setRepeatUnit] = useState<RepeatUnit>("DAY");
  // 추가: 주 단위 사용자 반복에서 선택한 요일 저장
  const [repeatDays, setRepeatDays] = useState<RepeatWeekday[]>([]);

  //커스텀 카테고리 이름 -> 색상 맵
  const customCategoryColorMap = useMemo(() => {
    return customCategories.reduce<Record<string, string>>((acc, item) => {
      acc[item.name] = item.color;
      return acc;
    }, {});
  }, [customCategories]);

  //전체 카테고리 목록
  const categoryList = useMemo(() => {
    return [
      ...DEFAULT_CATEGORIES,
      ...customCategories.map((item) => item.name),
    ];
  }, [customCategories]);

  //선택 날짜 표시
  const markedDates = useMemo(() => {
    if (startDate === endDate) {
      return {
        [startDate]: {
          selected: true,
          selectedColor: CALENDAR_SELECTED_COLOR,
        },
      };
    }

    return {
      [startDate]: {
        selected: true,
        selectedColor: CALENDAR_SELECTED_COLOR,
      },
      [endDate]: {
        selected: true,
        selectedColor: "#9FA2D6",
      },
    };
  }, [startDate, endDate]);

  const notifyLabel = useMemo(() => {
    return getNotifyLabel(isNotify);
  }, [isNotify]);

  const repeatLabel = useMemo(() => {
    return getRepeatLabel(repeatType, repeatInterval, repeatUnit, repeatDays);
  }, [repeatType, repeatInterval, repeatUnit, repeatDays]);

  const isInvalidDateRange = useMemo(() => {
    // 종료일이 시작일보다 빠른지 미리 검사
    return endDate < startDate;
  }, [startDate, endDate]);

  //저장된 사용자 색상 불러오기
  useEffect(() => {
    const loadCustomColors = async () => {
      try {
        const stored = await AsyncStorage.getItem(CUSTOM_COLOR_STORAGE_KEY);

        if (!stored) {
          setCustomColors([]);
          return;
        }

        const parsed = JSON.parse(stored) as string[];
        const normalized = uniqueColors(parsed);
        setCustomColors(normalized);
      } catch (error) {
        console.error("사용자 색상 불러오기 실패", error);
        setCustomColors([]);
      }
    };

    loadCustomColors();
  }, []);

  //날짜 선택
  const handleDayPress = (day: DateData) => {
    if (activeDateField === "start") {
      setStartDate(day.dateString);
    } else {
      setEndDate(day.dateString);
    }

    setShowDatePicker(false);
  };
  //저장된 사용자 카테고리 불러오기
  useEffect(() => {
    const loadCustomCategories = async () => {
      try {
        const stored = await AsyncStorage.getItem(CUSTOM_CATEGORY_STORAGE_KEY);

        if (!stored) {
          setCustomCategories([]);
          return;
        }

        const parsed = JSON.parse(stored) as string[] | CustomCategory[];

        const normalized = Array.isArray(parsed)
          ? uniqueCustomCategories(
              parsed.map((item) => {
                if (typeof item === "string") {
                  return {
                    name: item,
                    color: DEFAULT_USER_COLOR_PALETTE[0],
                  };
                }

                return {
                  name: item.name,
                  color: item.color || DEFAULT_USER_COLOR_PALETTE[0],
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

  //카테고리 저장
  const handleCategorySave = async () => {
    const newCategory = tempCategory.trim();

    if (!newCategory) return;

    if (
      DEFAULT_CATEGORIES.includes(
        newCategory as (typeof DEFAULT_CATEGORIES)[number],
      )
    ) {
      setCategory(newCategory);

      const fixedStyle =
        FIXED_EVENT_TYPES[newCategory as keyof typeof FIXED_EVENT_TYPES];
      setSelectedColor(fixedStyle.dot);

      setTempCategory("");
      setIsAddingCategory(false);
      return;
    }

    try {
      // 새 카테고리 저장 시 현재 선택 색상도 같이 저장
      const nextCategories = uniqueCustomCategories([
        ...customCategories,
        {
          name: newCategory,
          color: selectedColor,
        },
      ]);

      await AsyncStorage.setItem(
        CUSTOM_CATEGORY_STORAGE_KEY,
        JSON.stringify(nextCategories),
      );

      setCustomCategories(nextCategories);
      setCategory(newCategory);
      setSelectedColor(normalizeHexColor(selectedColor));
      setTempCategory("");
      setIsAddingCategory(false);
    } catch (error) {
      console.error("사용자 카테고리 저장 실패", error);
      Alert.alert("카테고리 저장 실패", "카테고리를 저장하지 못했어요.");
    }
  };

  const handleCategoryCancel = () => {
    setTempCategory("");
    setIsAddingCategory(false);
  };
  //커스텀 카테고리 삭제 확인
  const handleConfirmDeleteCustomCategory = (categoryName: string) => {
    Alert.alert(
      "카테고리 삭제",
      `'${categoryName}' 카테고리를 삭제할까요?`,
      [
        {
          text: "취소",
          style: "cancel",
        },
        {
          text: "삭제",
          style: "destructive",
          onPress: () => {
            handleDeleteCustomCategory(categoryName);
          },
        },
      ],
      { cancelable: true },
    );
  };

  //커스텀 카테고리 삭제
  const handleDeleteCustomCategory = async (categoryName: string) => {
    try {
      const filtered = customCategories.filter(
        (item) => item.name !== categoryName,
      );

      await AsyncStorage.setItem(
        CUSTOM_CATEGORY_STORAGE_KEY,
        JSON.stringify(filtered),
      );

      setCustomCategories(filtered);

      if (category === categoryName) {
        setCategory("기타");
        setSelectedColor(FIXED_EVENT_TYPES["기타"].dot);
      }
    } catch (error) {
      console.error("사용자 카테고리 삭제 실패", error);
      Alert.alert("카테고리 삭제 실패", "카테고리를 삭제하지 못했어요.");
    }
  };
  //모달 닫기 애니메이션
  const closeModal = () => {
    Animated.timing(translateY, {
      toValue: 500,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      router.dismiss();
    });
  };

  const resetSheetPosition = () => {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return (
          Math.abs(gestureState.dy) > 8 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx)
        );
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > closeThreshold) {
          closeModal();
        } else {
          resetSheetPosition();
        }
      },
      onPanResponderTerminate: () => {
        resetSheetPosition();
      },
    }),
  ).current;
  //반복 옵션 선택
  const handleSelectRepeatType = (option: RepeatType) => {
    if (option === "CUSTOM") {
      setShowRepeatModal(false);
      setShowCustomRepeatModal(true);
      return;
    }

    setRepeatType(option);
    setShowRepeatModal(false);
  };

  // 반복 단위를 선택할 때 주 단위는 1주/2주까지만 허용
  const handleSelectCustomRepeatUnit = (unit: RepeatUnit) => {
    setRepeatUnit(unit);

    if (unit === "WEEK" && Number(repeatInterval) > 2) {
      setRepeatInterval("2");
    }
  };

  // 주 단위 반복 요일 선택/해제
  const handleToggleWeekday = (weekday: RepeatWeekday) => {
    setRepeatDays((prev) =>
      prev.includes(weekday)
        ? prev.filter((item) => item !== weekday)
        : [...prev, weekday],
    );
  };

  const handleSaveCustomRepeat = () => {
    // 추가: 주 단위 반복은 요일을 최소 1개 선택해야 저장 가능
    if (repeatUnit === "WEEK" && repeatDays.length === 0) {
      Alert.alert(
        "요일 선택 필요",
        "주 단위 반복은 요일을 1개 이상 선택해 주세요.",
      );
      return;
    }

    setRepeatType("CUSTOM");
    setShowCustomRepeatModal(false);
  };

  //시작/종료 시간 검증
  const validateTimeRange = () => {
    if (!isTimed) return true;

    const startTotalMinutes = Number(startHour) * 60 + Number(startMinute);
    const endTotalMinutes = Number(endHour) * 60 + Number(endMinute);

    if (endTotalMinutes <= startTotalMinutes) {
      Alert.alert("시간 설정 확인", "끝나는 시간은 시작 시간보다 늦어야 해요.");
      return false;
    }

    return true;
  };

  const validateDateRange = () => {
    if (endDate < startDate) {
      Alert.alert(
        "날짜 설정 확인",
        "종료 날짜는 시작 날짜보다 빠를 수 없어요.",
      );
      return false;
    }

    return true;
  };
  //저장 전 최종 검증
  const validateBeforeSubmit = () => {
    if (!repeatType || repeatType === "NONE") {
      Alert.alert(
        "반복 설정 필요",
        "반복 설정을 선택해야 일정을 추가할 수 있어요.",
      );
      return false;
    }
    // 주 단위 사용자 반복은 요일 선택이 필수
    if (
      repeatType === "CUSTOM" &&
      repeatUnit === "WEEK" &&
      repeatDays.length === 0
    ) {
      Alert.alert(
        "요일 선택 필요",
        "주 단위 반복은 요일을 1개 이상 선택해 주세요.",
      );
      return false;
    }

    if (!validateDateRange()) {
      return false;
    }
    if (!validateTimeRange()) {
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateBeforeSubmit()) return;

    const saveOptions = {
      notifyOption,
      customNotifyDay,
      customNotifyHour,
      customNotifyMinute,
      repeatType,
      repeatInterval: repeatType === "CUSTOM" ? Number(repeatInterval) : 1,
      repeatUnit: repeatType === "CUSTOM" ? repeatUnit : null,
      repeatDays:
        repeatType === "CUSTOM" && repeatUnit === "WEEK" ? repeatDays : null,
      startDate,
      endDate,
    } as SaveRoutineOptions;

    try {
      await handleSave(saveOptions);
    } catch (error) {
      if (error instanceof Error && error.message === "TIME_CONFLICT") {
        Alert.alert("시간 중복", "같은 시간대에 이미 등록된 일정이 있어요.");
        return;
      }

      Alert.alert("저장 실패", "일정을 저장하지 못했어요.");
    }
  };
  //시간 모달에서 값 적용
  const handleApplyTime = (time: {
    startHour: string;
    startMinute: string;
    endHour: string;
    endMinute: string;
  }) => {
    setStartHour(time.startHour);
    setStartMinute(time.startMinute);
    setEndHour(time.endHour);
    setEndMinute(time.endMinute);
    setShowTimeModal(false);
  };

  //색상 저장
  const handleSavePickedColor = async () => {
    try {
      const nextColors = uniqueColors([pickerColor, ...customColors]).slice(
        0,
        16,
      );

      await AsyncStorage.setItem(
        CUSTOM_COLOR_STORAGE_KEY,
        JSON.stringify(nextColors),
      );

      setCustomColors(nextColors);
      setSelectedColor(normalizeHexColor(pickerColor));
      setShowColorPickerModal(false);
    } catch (error) {
      console.error("사용자 색상 저장 실패", error);
      Alert.alert("색상 저장 실패", "색상을 저장하지 못했어요.");
    }
  };

  const handleConfirmDeleteCustomColor = (color: string) => {
    Alert.alert(
      "색상 삭제",
      "이 색상을 삭제할까요?",
      [
        {
          text: "취소",
          style: "cancel",
        },
        {
          text: "삭제",
          style: "destructive",
          onPress: () => {
            handleDeleteCustomColor(color);
          },
        },
      ],
      { cancelable: true },
    );
  };
  //커스텀 색상 삭제
  const handleDeleteCustomColor = async (color: string) => {
    try {
      const filtered = customColors.filter((item) => item !== color);

      await AsyncStorage.setItem(
        CUSTOM_COLOR_STORAGE_KEY,
        JSON.stringify(filtered),
      );

      setCustomColors(filtered);

      if (selectedColor === color) {
        setSelectedColor(DEFAULT_USER_COLOR_PALETTE[0]);
      }
    } catch (error) {
      console.error("사용자 색상 삭제 실패", error);
    }
  };
  return (
    <ThemedView style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={closeModal} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <Animated.View
          style={[
            styles.bottomSheet,
            {
              transform: [{ translateY }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <View style={styles.indicator} />

          <View style={styles.header}>
            <ThemedText type="subtitle" style={styles.headerTitle}>
              일정 추가
            </ThemedText>

            <TouchableOpacity onPress={closeModal}>
              <IconSymbol name="xmark.circle.fill" size={28} color="#EDEEF1" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingBottom: (insets.bottom > 0 ? insets.bottom : 20) + 12,
              },
            ]}
          >
            <TextInput
              style={styles.mainInput}
              placeholder="무엇을 할까요?"
              value={title}
              onChangeText={setTitle}
              placeholderTextColor="#B4B6C0"
              autoFocus
            />
            {/* 시작/종료 날짜 선택 */}
            <View style={styles.section}>
              <ThemedText style={styles.label}>기간</ThemedText>

              <View style={styles.dateRangeColumn}>
                <TouchableOpacity
                  style={[
                    styles.selectorButton,
                    activeDateField === "start" && styles.dateSelectorActive,
                  ]}
                  onPress={() => {
                    setActiveDateField("start");
                    setShowDatePicker((prev) =>
                      activeDateField === "start" ? !prev : true,
                    );
                  }}
                >
                  <View style={styles.selectorLeft}>
                    <IconSymbol name="calendar" size={18} color="#405886" />
                    <ThemedText style={styles.selectorText}>
                      시작 날짜 · {formatDateLabel(startDate)}
                    </ThemedText>
                  </View>

                  <IconSymbol
                    name={
                      showDatePicker && activeDateField === "start"
                        ? "chevron.up"
                        : "chevron.down"
                    }
                    size={16}
                    color="#A0B0D0"
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.selectorButton,
                    activeDateField === "end" && styles.dateSelectorActive,
                  ]}
                  onPress={() => {
                    setActiveDateField("end");
                    setShowDatePicker((prev) =>
                      activeDateField === "end" ? !prev : true,
                    );
                  }}
                >
                  <View style={styles.selectorLeft}>
                    <IconSymbol name="calendar" size={18} color="#9FA2D6" />
                    <ThemedText style={styles.selectorText}>
                      종료 날짜 · {formatDateLabel(endDate)}
                    </ThemedText>
                  </View>

                  <IconSymbol
                    name={
                      showDatePicker && activeDateField === "end"
                        ? "chevron.up"
                        : "chevron.down"
                    }
                    size={16}
                    color="#A0B0D0"
                  />
                </TouchableOpacity>
              </View>

              {isInvalidDateRange && (
                <ThemedText style={styles.errorText}>
                  종료 날짜는 시작 날짜보다 빠를 수 없어요.
                </ThemedText>
              )}

              {showDatePicker && (
                <View style={styles.calendarCard}>
                  <ThemedText style={styles.calendarHelperText}>
                    {activeDateField === "start"
                      ? "시작 날짜를 선택해 주세요"
                      : "종료 날짜를 선택해 주세요"}{" "}
                  </ThemedText>

                  <AppCalendar
                    current={activeDateField === "start" ? startDate : endDate}
                    markedDates={markedDates}
                    onDayPress={handleDayPress}
                    enableSwipeMonths={true}
                    theme={CALENDAR_THEME}
                    style={styles.calendar}
                  />
                </View>
              )}
            </View>

            {/* 사용자 색상 선택 */}
            <View style={styles.section}>
              <View style={styles.rowBetween}>
                <ThemedText style={styles.label}>사용자 색상</ThemedText>
              </View>

              <View style={styles.colorRowWrap}>
                {DEFAULT_USER_COLOR_PALETTE.map((color) => (
                  <TouchableOpacity
                    key={`default-${color}`}
                    style={[
                      styles.colorDot,
                      { backgroundColor: color },
                      selectedColor === color && styles.colorDotActive,
                    ]}
                    onPress={() => setSelectedColor(color)}
                  />
                ))}
                {customColors.map((color) => (
                  <View key={`custom-${color}`} style={styles.colorItem}>
                    <TouchableOpacity
                      style={[
                        styles.colorDot,
                        { backgroundColor: color },
                        selectedColor === color && styles.colorDotActive,
                      ]}
                      onPress={() => setSelectedColor(color)}
                      onLongPress={() => handleConfirmDeleteCustomColor(color)}
                    />

                    <View style={styles.colorDeleteMiniButton}>
                      <IconSymbol name="minus" size={10} color="#FFFFFF" />
                    </View>
                  </View>
                ))}

                <TouchableOpacity
                  style={styles.plusColorCircle}
                  onPress={() => {
                    setPickerColor(selectedColor || "#405886");
                    setShowColorPickerModal(true);
                  }}
                >
                  <IconSymbol name="plus" size={18} color="#405886" />
                </TouchableOpacity>
              </View>
            </View>
            {/* 카테고리 선택 */}
            <View style={styles.section}>
              <View style={styles.rowBetween}>
                <ThemedText style={styles.label}>카테고리</ThemedText>

                {!isAddingCategory ? (
                  <TouchableOpacity onPress={() => setIsAddingCategory(true)}>
                    <ThemedText style={styles.addText}>+ 추가</ThemedText>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.categoryActionRow}>
                    <TouchableOpacity
                      onPress={handleCategoryCancel}
                      style={styles.categoryActionButton}
                    >
                      <ThemedText style={styles.cancelText}>취소</ThemedText>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleCategorySave}
                      style={styles.categoryActionButton}
                    >
                      <ThemedText style={styles.saveText}>저장</ThemedText>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              {isAddingCategory && (
                <TextInput
                  style={styles.subInput}
                  placeholder="새 카테고리 이름"
                  value={tempCategory}
                  onChangeText={setTempCategory}
                  placeholderTextColor="#B4B6C0"
                />
              )}

              <View style={styles.categoryGrid}>
                {categoryList.map((cat) => {
                  const resolvedCategoryColor = isFixedCategory(cat)
                    ? FIXED_EVENT_TYPES[cat as keyof typeof FIXED_EVENT_TYPES]
                        .dot
                    : customCategoryColorMap[cat] ||
                      DEFAULT_USER_COLOR_PALETTE[0];

                  const badgeStyle = getCategoryBadgeStyle(
                    cat,
                    resolvedCategoryColor,
                  );
                  const isSelected = category === cat;

                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryBadge,
                        {
                          backgroundColor: badgeStyle.backgroundColor,
                          borderColor: isSelected
                            ? badgeStyle.borderColor
                            : "transparent",
                          borderWidth: isSelected ? 1.5 : 1,
                        },
                      ]}
                      onPress={() => {
                        setCategory(cat);
                        setSelectedColor(resolvedCategoryColor);
                      }}
                    >
                      <View
                        style={[
                          styles.categoryBadgeDot,
                          { backgroundColor: resolvedCategoryColor },
                        ]}
                      />
                      <ThemedText
                        style={[
                          styles.categoryBadgeText,
                          { color: badgeStyle.textColor },
                        ]}
                      >
                        {cat}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            {/* 시간 / 알림 / 반복 설정 카드 */}
            <View style={styles.optionCard}>
              <View style={styles.rowBetween}>
                <View style={styles.iconLabel}>
                  <IconSymbol name="clock.fill" size={18} color="#405886" />
                  <ThemedText style={styles.optionLabel}>시간 설정</ThemedText>
                </View>

                <Switch
                  value={isTimed}
                  onValueChange={setIsTimed}
                  trackColor={{ true: FIXED_SWITCH_COLOR }}
                />
              </View>

              {isTimed && (
                <View style={styles.timeSettingArea}>
                  <TouchableOpacity
                    style={styles.selectorButton}
                    onPress={() => setShowTimeModal(true)}
                  >
                    <View style={styles.selectorLeft}>
                      <IconSymbol name="clock" size={18} color="#405886" />
                      <ThemedText style={styles.selectorText}>
                        {formatTimeRangeLabel(
                          startHour,
                          startMinute,
                          endHour,
                          endMinute,
                        )}
                      </ThemedText>
                    </View>

                    <IconSymbol
                      name="chevron.right"
                      size={16}
                      color="#A0B0D0"
                    />
                  </TouchableOpacity>

                  <View style={[styles.rowBetween, styles.innerOptionRow]}>
                    <View style={styles.iconLabel}>
                      <IconSymbol name="bell.fill" size={18} color="#405886" />
                      <ThemedText style={styles.optionLabel}>알림</ThemedText>
                    </View>

                    <View style={styles.notifySwitchRow}>
                      <ThemedText style={styles.notifyStateText}>
                        {notifyLabel}
                      </ThemedText>
                      <Switch
                        value={isNotify}
                        onValueChange={setIsNotify}
                        trackColor={{ true: FIXED_SWITCH_COLOR }}
                      />
                    </View>
                  </View>
                </View>
              )}

              <View
                style={[
                  styles.rowBetween,
                  isTimed ? styles.innerOptionRow : styles.repeatRowOnly,
                ]}
              >
                <View style={styles.iconLabel}>
                  <IconSymbol name="repeat" size={18} color="#9FA2D6" />
                  <ThemedText style={styles.optionLabel}>반복</ThemedText>
                </View>

                <TouchableOpacity
                  style={[
                    styles.valueButton,
                    repeatType === "NONE" && styles.requiredValueButton,
                  ]}
                  onPress={() => setShowRepeatModal(true)}
                >
                  <ThemedText
                    style={[
                      styles.valueButtonText,
                      repeatType === "NONE" && styles.requiredValueText,
                    ]}
                  >
                    {repeatLabel}
                  </ThemedText>
                  <IconSymbol name="chevron.right" size={14} color="#A0B0D0" />
                </TouchableOpacity>
              </View>
            </View>
            {/* 저장 버튼 */}
            <TouchableOpacity style={styles.saveButton} onPress={handleSubmit}>
              <ThemedText style={styles.saveButtonText}>
                일정 등록하기
              </ThemedText>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>

      {/* 시간 선택 모달 */}
      <TimePickerModal
        visible={showTimeModal}
        startHour={startHour}
        startMinute={startMinute}
        endHour={endHour}
        endMinute={endMinute}
        onClose={() => setShowTimeModal(false)}
        onApply={handleApplyTime}
      />

      {/* 반복 옵션 선택 모달 */}
      {showRepeatModal && (
        <Pressable
          style={styles.inlineModalOverlay}
          onPress={() => setShowRepeatModal(false)}
        >
          <Pressable
            style={styles.inlineModalCard}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.inlineModalHeader}>
              <ThemedText style={styles.inlineModalTitle}>반복 설정</ThemedText>

              <TouchableOpacity onPress={() => setShowRepeatModal(false)}>
                <ThemedText style={styles.inlineModalDone}>닫기</ThemedText>
              </TouchableOpacity>
            </View>

            <View style={styles.optionList}>
              {[
                { label: "매일", value: "DAILY" as RepeatType },
                { label: "사용자 설정", value: "CUSTOM" as RepeatType },
              ].map((item) => {
                const isSelected = repeatType === item.value;

                return (
                  <TouchableOpacity
                    key={item.value}
                    style={styles.optionListItem}
                    onPress={() => handleSelectRepeatType(item.value)}
                  >
                    <ThemedText
                      style={[
                        styles.optionListItemText,
                        isSelected && styles.optionListItemTextSelected,
                      ]}
                    >
                      {item.label}
                    </ThemedText>

                    {isSelected && item.value !== "CUSTOM" && (
                      <IconSymbol name="checkmark" size={16} color="#405886" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      )}

      {/* 사용자 설정 반복 모달 */}
      {showCustomRepeatModal && (
        <Pressable
          style={styles.inlineModalOverlay}
          onPress={() => setShowCustomRepeatModal(false)}
        >
          <Pressable
            style={styles.inlineModalCard}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.inlineModalHeader}>
              <ThemedText style={styles.inlineModalTitle}>
                사용자 설정 반복
              </ThemedText>

              <TouchableOpacity onPress={handleSaveCustomRepeat}>
                <ThemedText style={styles.inlineModalDone}>완료</ThemedText>
              </TouchableOpacity>
            </View>

            <View style={styles.inlinePickerRow}>
              <NumberOptionColumn
                title="빈도"
                options={
                  repeatUnit === "WEEK"
                    ? WEEK_REPEAT_EVERY_OPTIONS
                    : REPEAT_EVERY_OPTIONS
                }
                selectedValue={repeatInterval}
                onSelect={setRepeatInterval}
              />

              <UnitOptionColumn
                title="단위"
                options={[
                  { label: "일", value: "DAY" },
                  { label: "주", value: "WEEK" },
                  { label: "월", value: "MONTH" },
                  { label: "년", value: "YEAR" },
                ]}
                selectedValue={repeatUnit}
                onSelect={handleSelectCustomRepeatUnit}
              />
            </View>

            {/* 주 단위일 때만 요일 선택 영역 표시 */}
            {repeatUnit === "WEEK" && (
              <View style={styles.weekdaySection}>
                <View style={styles.weekdayTitleRow}>
                  <ThemedText style={styles.weekdayTitle}>요일</ThemedText>
                  <ThemedText style={styles.weekdayHelperText}>
                    주 반복은 격주까지만 가능해요
                  </ThemedText>
                </View>

                <View style={styles.weekdayGrid}>
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
                        <ThemedText
                          style={[
                            styles.weekdayChipText,
                            isSelected && styles.weekdayChipTextSelected,
                          ]}
                        >
                          {day.label}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </Pressable>
        </Pressable>
      )}

      {/* 사용자 색상 선택 모달 */}
      {showColorPickerModal && (
        <Pressable
          style={styles.inlineModalOverlay}
          onPress={() => setShowColorPickerModal(false)}
        >
          <Pressable
            style={styles.colorPickerCard}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.inlineModalHeader}>
              <ThemedText style={styles.inlineModalTitle}>색상 추가</ThemedText>

              <TouchableOpacity onPress={handleSavePickedColor}>
                <ThemedText style={styles.inlineModalDone}>저장</ThemedText>
              </TouchableOpacity>
            </View>

            <ColorPicker
              value={pickerColor}
              onCompleteJS={(color) => {
                setPickerColor(color.hex);
              }}
              style={styles.colorPicker}
            >
              <Preview hideInitialColor style={styles.colorPreview} />
              <Panel1 style={styles.colorPanel} />
              <HueSlider style={styles.hueSlider} />
            </ColorPicker>

            <View style={styles.selectedColorInfoRow}>
              <View
                style={[
                  styles.selectedColorPreviewDot,
                  { backgroundColor: pickerColor },
                ]}
              />
              <ThemedText style={styles.selectedColorHexText}>
                {pickerColor.toUpperCase()}
              </ThemedText>
            </View>
          </Pressable>
        </Pressable>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "transparent",
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.18)",
  },

  keyboardView: {
    width: "100%",
    justifyContent: "flex-end",
    flex: 1,
  },

  bottomSheet: {
    width: "100%",
    alignSelf: "stretch",
    backgroundColor: "#FFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 0,
    paddingBottom: 0,
    maxHeight: "92%",
    overflow: "hidden",
  },

  indicator: {
    width: 40,
    height: 5,
    backgroundColor: "#EDEEF1",
    borderRadius: 3,
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 12,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
    paddingTop: 0,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#2A3C6B",
  },

  scrollContent: {
    paddingBottom: 20,
  },

  mainInput: {
    fontSize: 24,
    fontWeight: "800",
    color: "#2A3C6B",
    paddingVertical: 15,
    borderBottomWidth: 2,
    borderBottomColor: "#F3F4F8",
    marginBottom: 25,
  },

  section: {
    marginBottom: 25,
  },

  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#A0B0D0",
    marginBottom: 12,
  },

  helperText: {
    marginTop: 10,
    fontSize: 12,
    color: "#A0B0D0",
    lineHeight: 18,
  },

  subInput: {
    backgroundColor: "#F8F9FB",
    padding: 12,
    borderRadius: 12,
    fontSize: 15,
    color: "#2A3C6B",
    marginBottom: 10,
  },

  selectorButton: {
    backgroundColor: "#F8F9FB",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  selectorLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  selectorText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2A3C6B",
  },

  calendarCard: {
    marginTop: 12,
    backgroundColor: "#F8F9FB",
    borderRadius: 20,
    overflow: "hidden",
    padding: 8,
  },

  calendar: {
    borderRadius: 12,
  },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  colorRowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    alignItems: "center",
  },

  colorItem: {
    position: "relative",
  },

  colorDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },

  colorDotActive: {
    borderWidth: 3,
    borderColor: "#2A3C6B",
  },

  colorDeleteMiniButton: {
    position: "absolute",
    right: -4,
    top: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#D06C68",
    alignItems: "center",
    justifyContent: "center",
  },

  plusColorCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: "#D7DEEA",
    backgroundColor: "#F8F9FB",
    justifyContent: "center",
    alignItems: "center",
  },

  addText: {
    color: "#405886",
    fontSize: 13,
    fontWeight: "700",
  },

  categoryActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  categoryActionButton: {
    paddingVertical: 2,
  },

  cancelText: {
    color: "#8A8C9A",
    fontSize: 13,
    fontWeight: "700",
  },

  saveText: {
    color: "#405886",
    fontSize: 13,
    fontWeight: "800",
  },

  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 2,
    gap: 3,
  },

  categoryItemWrapper: {
    position: "relative",
  },

  categoryDeleteMiniButton: {
    position: "absolute",
    right: -4,
    top: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#D06C68",
    alignItems: "center",
    justifyContent: "center",
  },

  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  categoryBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginRight: 7,
  },

  categoryBadgeText: {
    fontSize: 13,
    fontWeight: "700",
  },

  optionCard: {
    backgroundColor: "#F8F9FB",
    borderRadius: 20,
    padding: 16,
    marginBottom: 25,
  },

  iconLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  optionLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#405886",
  },

  timeSettingArea: {
    marginTop: 15,
    gap: 12,
  },

  innerOptionRow: {
    minHeight: 60,
    paddingTop: 12,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: "#EEF1F5",
  },

  repeatRowOnly: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#EEF1F5",
  },

  valueButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },

  valueButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#405886",
  },

  requiredValueButton: {
    borderWidth: 1,
    borderColor: "#405886",
  },

  requiredValueText: {
    color: "#405886",
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

  saveButton: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 10,
    backgroundColor: FIXED_PRIMARY_COLOR,
  },

  saveButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "800",
  },

  inlineModalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.18)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  inlineModalCard: {
    width: "100%",
    maxWidth: 360,
    maxHeight: "70%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
  },

  colorPickerCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
  },

  inlineModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  inlineModalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#2A3C6B",
  },

  inlineModalDone: {
    fontSize: 14,
    fontWeight: "800",
    color: "#405886",
  },

  inlinePickerRow: {
    flexDirection: "row",
    gap: 12,
  },

  optionColumn: {
    flex: 1,
  },

  optionColumnTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#A0B0D0",
    marginBottom: 10,
    textAlign: "center",
  },

  optionColumnScroll: {
    maxHeight: 260,
  },

  optionChip: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 8,
    borderColor: "#EEF1F5",
  },

  optionChipSelected: {
    backgroundColor: "#EAF1FF",
    borderColor: "#D7E4FF",
  },

  optionChipText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#405886",
  },

  optionChipTextSelected: {
    color: "#2A3C6B",
  },

  optionList: {
    gap: 8,
  },

  optionListItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderColor: "#EEF1F5",
  },

  optionListItemText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2A3C6B",
  },

  optionListItemTextSelected: {
    color: "#405886",
  },

  weekdaySection: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#EEF1F5",
  },

  weekdayTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  weekdayTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#2A3C6B",
  },

  weekdayHelperText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#A0B0D0",
  },

  weekdayGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  weekdayChip: {
    width: "22%",
    minHeight: 38,
    borderRadius: 999,
    backgroundColor: "#F3F4F8",
    alignItems: "center",
    justifyContent: "center",
  },

  weekdayChipSelected: {
    backgroundColor: "#6BBFCC",
  },

  weekdayChipText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#8A8C9A",
  },

  weekdayChipTextSelected: {
    color: "#FFFFFF",
  },

  colorPicker: {
    width: "100%",
  },

  colorPreview: {
    marginBottom: 16,
  },

  colorPanel: {
    width: "100%",
    height: 180,
    borderRadius: 16,
    marginBottom: 16,
  },

  hueSlider: {
    width: "100%",
    height: 36,
    borderRadius: 12,
    marginBottom: 16,
  },

  selectedColorInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },

  selectedColorPreviewDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },

  selectedColorHexText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#405886",
  },
  dateRangeColumn: {
    gap: 10,
  },

  dateSelectorActive: {
    borderWidth: 1.5,
    borderColor: "#D7E4FF",
  },

  errorText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "600",
    color: "#D06C68",
  },

  calendarHelperText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#7A87A6",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
});
