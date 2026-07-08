// components/routine_form.tsx
import { ThemedText } from "@/components/themed-text";
import TimePickerModal from "@/components/time_picker_modal";
import AppCalendar from "@/components/ui/app_calendar";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useRoutineForm } from "@/hooks/use_routine_form";
import { type CustomCategory } from "@/lib/category";
import { useTheme, type Theme } from "@/lib/constants/ThemeContext";
import { CategoryService } from "@/services/category_service";
import { RoutineService } from "@/services/routine_service";
import type {
  NotifyOption,
  RepeatType,
  RepeatUnit,
  RepeatWeekday,
  SaveRoutineOptions,
  ScheduleRoutine,
} from "@/types/routine";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { DateData } from "react-native-calendars";

// 반복 요일 선택 버튼에 사용할 요일 목록
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

//공통 색상 상수
const FIXED_SWITCH_COLOR = "#9FA2D6";
//미저장 루틴/카테고리 캐시 저장
const DRAFT_STORAGE_KEY = "@rutina/routine_draft";

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    // ── 바텀시트 껍데기 스타일 (modal.tsx에서도 씀) ──
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
      backgroundColor: theme.card,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      paddingHorizontal: 24,
      paddingTop: 0,
      paddingBottom: 100,
      marginBottom: -100,
      maxHeight: "92%",
      overflow: "hidden",
    },
    indicator: {
      width: 40,
      height: 5,
      backgroundColor: theme.handle,
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
      color: theme.text,
    },
    scrollContent: {
      paddingBottom: 20,
    },

    // ── 루틴/Todo 토글 스타일 ──
    typeToggleRow: {
      flexDirection: "row",
      backgroundColor: theme.tabBg,
      borderRadius: 18,
      padding: 4,
      marginBottom: 16,
    },
    typeToggleButton: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 6,
      borderRadius: 14,
    },
    typeToggleText: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.textSecondary,
    },
    typeToggleButtonActive: {
      backgroundColor: theme.card,
      shadowColor: theme.textStrong,
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    typeToggleTextActive: {
      color: theme.textStrong,
    },

    // ── 폼 내용 스타일 ──
    mainInput: {
      fontSize: 24,
      fontWeight: "800",
      color: theme.text,
      paddingVertical: 15,
      borderBottomWidth: 2,
      borderBottomColor: theme.bg,
      marginBottom: 25,
    },

    section: {
      marginBottom: 25,
    },

    label: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.textMuted,
      marginBottom: 12,
    },

    selectorButton: {
      backgroundColor: theme.cardAlt,
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
      color: theme.text,
    },

    calendarCard: {
      marginTop: 12,
      backgroundColor: theme.cardAlt,
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

    categoryGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginTop: 2,
      gap: 3,
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
      backgroundColor: theme.cardAlt,
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
      color: theme.main,
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
      borderTopColor: theme.divider,
    },

    repeatRowOnly: {
      marginTop: 14,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: theme.divider,
    },

    valueButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: theme.card,
    },

    valueButtonText: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.main,
    },

    requiredValueButton: {
      borderWidth: 1,
      borderColor: theme.main,
    },

    requiredValueText: {
      color: theme.main,
    },

    notifySwitchRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },

    notifyStateText: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.main,
    },

    saveButton: {
      paddingVertical: 18,
      borderRadius: 16,
      alignItems: "center",
      marginTop: 10,
      backgroundColor: theme.main,
    },

    saveButtonText: {
      color: theme.card,
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
      backgroundColor: theme.card,
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
      color: theme.text,
    },

    inlineModalDone: {
      fontSize: 14,
      fontWeight: "800",
      color: theme.main,
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
      color: theme.textMuted,
      marginBottom: 10,
      textAlign: "center",
    },

    optionColumnScroll: {
      maxHeight: 260,
    },

    optionChip: {
      backgroundColor: theme.card,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: "center",
      marginBottom: 8,
      borderColor: theme.divider,
    },

    optionChipSelected: {
      backgroundColor: theme.mainLight,
      borderColor: theme.borderMid,
    },

    optionChipText: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.main,
    },

    optionChipTextSelected: {
      color: theme.text,
    },

    optionList: {
      gap: 8,
    },

    optionListItem: {
      backgroundColor: theme.card,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderColor: theme.divider,
    },

    optionListItemText: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.text,
    },

    optionListItemTextSelected: {
      color: theme.main,
    },

    weekdaySection: {
      marginTop: 16,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: theme.divider,
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
      color: theme.text,
    },

    weekdayHelperText: {
      fontSize: 11,
      fontWeight: "600",
      color: theme.textMuted,
    },

    weekdayGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    weekdayRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      width: "100%",
    },

    weekdayChip: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.bg,
      alignItems: "center",
      justifyContent: "center",
    },

    weekdayChipSelected: {
      borderColor: theme.main,
      backgroundColor: theme.main,
    },
    weekdayChipText: {
      fontSize: 12,
      fontWeight: "800",
      color: theme.textSecondary,
    },

    weekdayChipTextSelected: {
      color: theme.card,
    },

    dateRangeColumn: {
      gap: 10,
    },

    dateSelectorActive: {
      borderWidth: 1.5,
      borderColor: theme.borderMid,
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
      color: theme.textMuted,
      marginBottom: 8,
      paddingHorizontal: 4,
    },
    repeatPanel: {
      marginTop: 10,
      gap: 6,
    },

    customRepeatPanel: {
      marginTop: 12,
      gap: 14,
    },

    dialLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: theme.textMuted,
      marginBottom: 8,
    },

    repeatOptionButton: {
      borderWidth: 0.5,
      borderColor: theme.borderStrong,
      borderRadius: 11,
      paddingVertical: 8,
      paddingHorizontal: 10,
      minHeight: 34,
      backgroundColor: theme.inputBg,
    },

    repeatOptionButtonSelected: {
      borderColor: theme.main,
      backgroundColor: theme.mainLight,
    },

    repeatOptionText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.textSecondary,
    },

    repeatOptionTextSelected: {
      color: theme.main,
    },

    repeatTwoColumnRow: {
      flexDirection: "row",
      gap: 6,
    },

    repeatFlexButton: {
      flex: 1,
      alignItems: "center",
    },

    frequencyGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },

    frequencyChip: {
      minWidth: 42,
      paddingVertical: 9,
      paddingHorizontal: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.borderStrong,
      backgroundColor: theme.inputBg,
      alignItems: "center",
    },

    frequencyChipSelected: {
      borderColor: theme.main,
      backgroundColor: theme.mainLight,
    },

    frequencyChipText: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.textSecondary,
    },

    frequencyChipTextSelected: {
      color: theme.main,
    },
    customRepeatFooter: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginTop: -2,
    },

    customRepeatDoneButton: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 999,
      backgroundColor: theme.mainLight,
    },

    customRepeatDoneText: {
      fontSize: 13,
      fontWeight: "800",
      color: theme.main,
    },

    repeatSection: {
      width: "100%",
    },

    repeatHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    repeatSelectButton: {
      minWidth: 96,
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.borderStrong,
      borderRadius: 14,
      paddingVertical: 9,
      paddingHorizontal: 12,
      backgroundColor: theme.card,
    },

    repeatIntervalValueBox: {
      flex: 1,
      height: 42,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.inputBg,
      borderWidth: 1,
      borderColor: theme.borderStrong,
    },

    repeatIntervalValueText: {
      fontSize: 14,
      fontWeight: "800",
      color: theme.main,
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
      backgroundColor: theme.bg,
      borderWidth: 1,
      borderColor: theme.borderStrong,
    },

    repeatStepperButtonText: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.main,
    },

    repeatIntervalInputBox: {
      flex: 1,
      height: 34,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: "#E7EAF3",
      backgroundColor: theme.inputBg,
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
      color: theme.textBody,
      textAlign: "center",
    },

    repeatIntervalSuffix: {
      marginLeft: 4,
      fontSize: 13,
      fontWeight: "700",
      color: theme.textSecondary,
    },
    existingRoutineSection: {
      borderRadius: 14,
      overflow: "hidden",
      backgroundColor: theme.cardAlt,
    },
    existingRoutineHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 12,
      paddingHorizontal: 14,
    },
    existingRoutineTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.textMuted,
    },
    previewTabRow: {
      flexDirection: "row",
      gap: 6,
      padding: 10,
      paddingHorizontal: 14,
      borderTopWidth: 1,
      borderTopColor: theme.divider,
    },
    previewTab: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.borderStrong,
      backgroundColor: theme.inputBg,
    },
    previewTabActive: {
      backgroundColor: theme.mainLight,
      borderColor: theme.main,
    },
    previewTabText: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.textSecondary,
    },
    previewTabTextActive: {
      color: theme.main,
    },
    previewDateLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: theme.textMuted,
    },
    existingEmpty: {
      padding: 16,
      alignItems: "center",
    },
    existingEmptyText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.textMuted,
    },
    existingItem: {
      flexDirection: "row",
      alignItems: "center",
      padding: 10,
      paddingHorizontal: 14,
      gap: 10,
      borderTopWidth: 1,
      borderTopColor: theme.divider,
    },
    existingItemConflict: {
      backgroundColor: "#FFF3F2",
    },
    existingColorBar: {
      width: 3,
      height: 32,
      borderRadius: 2,
    },
    existingInfo: {
      flex: 1,
    },
    existingName: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.text,
    },
    existingNameConflict: {
      color: "#C0392B",
    },
    existingTime: {
      fontSize: 11,
      fontWeight: "600",
      color: theme.textMuted,
      marginTop: 1,
    },
    existingTimeConflict: {
      color: "#E07068",
    },
    conflictBadge: {
      backgroundColor: "#FFE8E7",
      borderRadius: 6,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    conflictBadgeText: {
      fontSize: 10,
      fontWeight: "800",
      color: "#C0392B",
    },
    conflictWarning: {
      fontSize: 11,
      fontWeight: "600",
      color: "#E07068",
      padding: 10,
      paddingHorizontal: 14,
      borderTopWidth: 1,
      borderTopColor: theme.divider,
    },
    categoryChip: {
      borderRadius: 15,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    categoryChipText: {
      fontSize: 10,
      fontWeight: "800",
    },
  });

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

// 빠른 선택의 매주/격주 반복은 시작 날짜의 요일을 기본 반복 요일로 사용
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

function getNotifyLabel(isNotify: boolean) {
  return isNotify ? "켜짐" : "꺼짐";
}

//빠른 선택 매주/격주는 시작 날짜의 요일을 보여줌
function getQuickWeekdayLabel(startDate: string) {
  const weekday = getWeekdayValueFromDate(startDate);

  return WEEKDAY_OPTIONS.find((day) => day.value === weekday)?.label ?? "";
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
      if (repeatUnit === "WEEK") {
        const selectedLabels = WEEKDAY_OPTIONS.filter((day) =>
          repeatDays.includes(day.value),
        ).map((day) => day.label);

        const dayLabel =
          selectedLabels.length > 0 ? ` · ${selectedLabels.join(", ")}` : "";
        const everyLabel = repeatInterval === "1" ? "매주" : "격주";

        return `${everyLabel}${dayLabel}`;
      }

      return repeatInterval === "1" ? "매일" : `${repeatInterval}일마다`;
    }
    default:
      return "없음";
  }
}

const REPEAT_EVERY_OPTIONS = Array.from({ length: 30 }, (_, i) =>
  String(i + 1),
);

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
  const { theme } = useTheme();
  const styles = makeStyles(theme);
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
  const { theme } = useTheme();
  const styles = makeStyles(theme);
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

export type RoutineFormHandle = {
  saveDraft: () => Promise<void>;
};

type RoutineFormParams = {
  title?: string;
  startTime?: string;
  endTime?: string;
  category?: string;
  description?: string;
};

interface RoutineFormProps {
  params: RoutineFormParams;
}

function RoutineFormBase(
  { params }: RoutineFormProps,
  ref: React.Ref<RoutineFormHandle>,
) {
  const { theme, mode } = useTheme();
  const styles = makeStyles(theme);
  //캘린더 테마
  const CALENDAR_THEME = {
    backgroundColor: theme.cardAlt,
    calendarBackground: theme.cardAlt,
    selectedDayBackgroundColor: theme.main,
    selectedDayTextColor: theme.card,
    todayTextColor: theme.main,
    dayTextColor: theme.text,
    textDisabledColor: "#C9CED8",
    monthTextColor: theme.text,
    arrowColor: theme.main,
    textDayFontWeight: "500" as const,
    textMonthFontWeight: "800" as const,
    textDayHeaderFontWeight: "700" as const,
    textMonthFontSize: 17,
    textDayFontSize: 15,
    textDayHeaderFontSize: 13,
  };
  const router = useRouter();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [showRepeatPanel, setShowRepeatPanel] = useState(false);
  const [showCustomRepeatPanel, setShowCustomRepeatPanel] = useState(false);
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>(
    [],
  );
  const [activeDateField, setActiveDateField] = useState<"start" | "end">(
    "start",
  );
  const [existingRoutines, setExistingRoutines] = useState<ScheduleRoutine[]>(
    [],
  );
  const [previewDateField, setPreviewDateField] = useState<"start" | "end">(
    "start",
  );
  const [showExistingRoutines, setShowExistingRoutines] = useState(false);

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
  const previewDate = previewDateField === "start" ? startDate : endDate;

  // AI 추천 데이터 연동
  useEffect(() => {
    if (params.title) setTitle(params.title);
    if (params.category) {
      setCategory(params.category);
    }
    if (params.startTime) {
      const [h, m] = params.startTime.split(":");
      setStartHour(h || "09");
      setStartMinute(m || "00");
    }
    if (params.endTime) {
      const [h, m] = params.endTime.split(":");
      setEndHour(h || "10");
      setEndMinute(m || "00");
    }
    if (params.startTime || params.endTime) {
      setIsTimed(true);
    }
  }, [params]);
  useEffect(() => {
    // AI 추천 파라미터가 있으면 draft 복원 스킵
    if (params.title || params.category || params.startTime || params.endTime)
      return;

    const loadDraft = async () => {
      try {
        const stored = await AsyncStorage.getItem(DRAFT_STORAGE_KEY);
        if (!stored) return;
        const draft = JSON.parse(stored);

        if (draft.title) setTitle(draft.title);
        if (draft.category) setCategory(draft.category);
        if (draft.startDate) setStartDate(draft.startDate);
        if (draft.endDate) setEndDate(draft.endDate);
        if (draft.repeatType) setRepeatType(draft.repeatType);
        if (draft.repeatInterval) setRepeatInterval(draft.repeatInterval);
        if (draft.repeatUnit) setRepeatUnit(draft.repeatUnit);
        if (draft.repeatDays) setRepeatDays(draft.repeatDays);
        if (typeof draft.isTimed === "boolean") setIsTimed(draft.isTimed);
        if (draft.startHour) setStartHour(draft.startHour);
        if (draft.startMinute) setStartMinute(draft.startMinute);
        if (draft.endHour) setEndHour(draft.endHour);
        if (draft.endMinute) setEndMinute(draft.endMinute);
        if (typeof draft.hasEndDate === "boolean")
          setHasEndDate(draft.hasEndDate);
      } catch (error) {
        console.error("draft 복원 실패", error);
      }
    };

    loadDraft();
  }, []);

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
  const [repeatType, setRepeatType] = useState<RepeatType>("DAILY");
  const [repeatInterval, setRepeatInterval] = useState("1");
  const [repeatUnit, setRepeatUnit] = useState<RepeatUnit>("DAY");
  // 주 단위 사용자 반복에서 선택한 요일 저장
  const [repeatDays, setRepeatDays] = useState<RepeatWeekday[]>([]);
  const [hasEndDate, setHasEndDate] = useState(true);
  //커스텀 카테고리 이름 -> 색상 맵
  const customCategoryColorMap = useMemo(() => {
    return customCategories.reduce<Record<string, string>>((acc, item) => {
      acc[item.name] = item.color;
      return acc;
    }, {});
  }, [customCategories]);

  //전체 카테고리 목록
  const categoryList = useMemo(() => {
    return customCategories.map((item) => item.name);
  }, [customCategories]);
  //선택 날짜 표시
  const markedDates = useMemo(() => {
    if (startDate === endDate) {
      return {
        [startDate]: {
          selected: true,
          selectedColor: theme.main,
        },
      };
    }

    return {
      [startDate]: {
        selected: true,
        selectedColor: theme.main,
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
    return hasEndDate && endDate < startDate;
  }, [startDate, endDate, hasEndDate]);
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
        setCustomCategories([]);
      });
  }, []);
  // 날짜 바뀔 때마다 해당 날짜 루틴 불러오기
  useEffect(() => {
    RoutineService.getAll(previewDate)
      .then(setExistingRoutines)
      .catch(() => setExistingRoutines([]));
  }, [previewDate]);

  // 겹치는 루틴 있으면 자동으로 펼치기
  useEffect(() => {
    const hasConflict = existingRoutines.some((r) => isTimeConflict(r));
    if (hasConflict) setShowExistingRoutines(true);
  }, [existingRoutines, startHour, startMinute, endHour, endMinute, isTimed]);
  const saveDraftRef = useRef<() => Promise<void>>(async () => {});

  saveDraftRef.current = async () => {
    const draft = {
      title,
      category,
      startDate,
      endDate,
      repeatType,
      repeatInterval,
      repeatUnit,
      repeatDays,
      isTimed,
      startHour,
      startMinute,
      endHour,
      endMinute,
      hasEndDate,
    };
    await AsyncStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  };

  // modal.tsx에서 닫을 때 draft 저장을 호출할 수 있도록 노출
  useImperativeHandle(ref, () => ({
    saveDraft: () => saveDraftRef.current(),
  }));

  //반복 옵션 선택
  const handleSelectRepeatType = (option: RepeatType) => {
    if (option === "CUSTOM") {
      setShowRepeatPanel(false);
      setShowCustomRepeatPanel(true);
      return;
    }
    setRepeatType(option);
    setRepeatInterval("1");
    setRepeatUnit("DAY");
    setRepeatDays([]);
    setShowRepeatPanel(false);
  };

  const handleSelectQuickWeeklyRepeat = (interval: "1" | "2") => {
    setRepeatType("CUSTOM");
    setRepeatInterval(interval);
    setRepeatUnit("WEEK");
    setRepeatDays([getWeekdayValueFromDate(startDate)]);
    setShowRepeatPanel(false);
  };

  // 사용자 설정 반복 단위는 일/주만 사용하고, 주 단위는 1주/2주까지만 허용
  const handleSelectCustomRepeatUnit = (unit: RepeatUnit) => {
    setRepeatUnit(unit);

    if (unit === "DAY") {
      setRepeatDays([]);
    }

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
    // 주 단위 반복은 요일을 최소 1개 선택해야 저장 가능
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
    if (!hasEndDate) return true;
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
        "반복 설정을 선택해야 루틴을 추가할 수 있어요.",
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
      endDate: hasEndDate ? endDate : null,
    } as SaveRoutineOptions;

    try {
      await handleSave(saveOptions);
      await AsyncStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 409) {
        Alert.alert("시간 중복", "같은 시간대에 이미 등록된 루틴이 있어요.");
      } else {
        console.error("루틴 저장 실패", error);
        Alert.alert("저장 실패", "루틴을 저장하지 못했어요.");
      }
    }
  };
  // 겹침 감지 함수
  const isTimeConflict = (routine: ScheduleRoutine): boolean => {
    if (!isTimed || !routine.startTime || !routine.endTime) return false;

    const toMin = (h: string, m: string) => Number(h) * 60 + Number(m);
    const [rSH, rSM] = routine.startTime.split(":");
    const [rEH, rEM] = routine.endTime.split(":");

    const newStart = toMin(startHour, startMinute);
    const newEnd = toMin(endHour, endMinute);
    const rStart = toMin(rSH, rSM);
    const rEnd = toMin(rEH, rEM);

    return newStart < rEnd && newEnd > rStart;
  };
  //시간 모달에서 값 적용
  const handleApplyTime = (time: {
    startHour: string;
    startMinute: string;
    endHour: string;
    endMinute: string;
  }) => {
    // 시작/종료 시간이 반대로 저장되지 않도록 적용 단계에서 먼저 차단
    const startTotalMinutes =
      Number(time.startHour) * 60 + Number(time.startMinute);
    const endTotalMinutes = Number(time.endHour) * 60 + Number(time.endMinute);

    if (endTotalMinutes <= startTotalMinutes) {
      Alert.alert("시간 설정 확인", "끝나는 시간은 시작 시간보다 늦어야 해요.");
      return;
    }

    setStartHour(time.startHour);
    setStartMinute(time.startMinute);
    setEndHour(time.endHour);
    setEndMinute(time.endMinute);
    setShowTimeModal(false);
  };

  return (
    <>
      <TextInput
        style={styles.mainInput}
        placeholder="무엇을 할까요?"
        value={title}
        onChangeText={setTitle}
        placeholderTextColor="#B4B6C0"
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
              <IconSymbol name="calendar" size={18} color={theme.main} />
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
              color={theme.textMuted}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.selectorButton,
              activeDateField === "end" &&
                hasEndDate &&
                styles.dateSelectorActive,
              !hasEndDate && { opacity: 0.5 },
            ]}
            onPress={() => {
              if (!hasEndDate) return;
              setActiveDateField("end");
              setShowDatePicker((prev) =>
                activeDateField === "end" ? !prev : true,
              );
            }}
          >
            <View style={styles.selectorLeft}>
              <IconSymbol name="calendar" size={18} color="#9FA2D6" />
              <ThemedText style={styles.selectorText}>
                종료 날짜 ·{" "}
                {hasEndDate ? formatDateLabel(endDate) : "없음 (무한반복)"}
              </ThemedText>
            </View>
            <TouchableOpacity
              onPress={() => {
                setHasEndDate((prev) => !prev);
                setShowDatePicker(false);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ThemedText
                style={{
                  fontSize: 12,
                  color: "#9FA2D6",
                  fontWeight: "700",
                }}
              >
                {hasEndDate ? "종료일 해제" : "종료일 설정"}
              </ThemedText>
            </TouchableOpacity>
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
      {/* 이 날의 루틴 확인 */}
      <View style={[styles.existingRoutineSection, { marginBottom: 25 }]}>
        <TouchableOpacity
          style={styles.existingRoutineHeader}
          onPress={() => setShowExistingRoutines((prev) => !prev)}
          activeOpacity={0.7}
        >
          <View style={styles.iconLabel}>
            <IconSymbol name="calendar" size={15} color={theme.textMuted} />
            <ThemedText style={styles.existingRoutineTitle}>
              이 날의 루틴 확인
            </ThemedText>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {/* 접혀있을 때 겹침 뱃지 표시 */}
            {!showExistingRoutines && existingRoutines.some(isTimeConflict) && (
              <View style={styles.conflictBadge}>
                <ThemedText style={styles.conflictBadgeText}>겹침</ThemedText>
              </View>
            )}
            <ThemedText style={styles.previewDateLabel}>
              {formatDateLabel(previewDate)}
            </ThemedText>
            <IconSymbol
              name={showExistingRoutines ? "chevron.up" : "chevron.down"}
              size={14}
              color={theme.textMuted}
            />
          </View>
        </TouchableOpacity>

        {showExistingRoutines && (
          <>
            {/* 시작일 / 종료일 탭 */}
            <View style={styles.previewTabRow}>
              {(
                ["start", ...(hasEndDate ? ["end"] : [])] as ("start" | "end")[]
              ).map((field) => (
                <TouchableOpacity
                  key={field}
                  style={[
                    styles.previewTab,
                    previewDateField === field && styles.previewTabActive,
                  ]}
                  onPress={() => setPreviewDateField(field)}
                >
                  <ThemedText
                    style={[
                      styles.previewTabText,
                      previewDateField === field && styles.previewTabTextActive,
                    ]}
                  >
                    {field === "start" ? "시작일" : "종료일"}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            {existingRoutines.length === 0 ? (
              <View style={styles.existingEmpty}>
                <ThemedText style={styles.existingEmptyText}>
                  이 날 등록된 루틴이 없어요
                </ThemedText>
              </View>
            ) : (
              <>
                {existingRoutines.map((routine) => {
                  const conflict = isTimeConflict(routine);
                  return (
                    <View
                      key={routine.id}
                      style={[
                        styles.existingItem,
                        conflict && styles.existingItemConflict,
                      ]}
                    >
                      <View
                        style={[
                          styles.existingColorBar,
                          {
                            backgroundColor: routine.color ?? theme.main,
                          },
                        ]}
                      />
                      <View style={styles.existingInfo}>
                        <ThemedText
                          style={[
                            styles.existingName,
                            // 겹침이 아닐 때만 카테고리 색 적용
                            !conflict && {
                              color:
                                mode === "dark"
                                  ? (routine.color ?? theme.main)
                                  : "#000000",
                            },
                            conflict && styles.existingNameConflict,
                          ]}
                        >
                          {routine.title}
                        </ThemedText>
                        {routine.startTime && routine.endTime && (
                          <ThemedText
                            style={[
                              styles.existingTime,
                              conflict && styles.existingTimeConflict,
                            ]}
                          >
                            {routine.startTime.slice(0, 5)} ~{" "}
                            {routine.endTime.slice(0, 5)}
                          </ThemedText>
                        )}
                      </View>
                      {/* 카테고리 색상 뱃지 */}
                      {!conflict && routine.categoryName && (
                        <View
                          style={[
                            styles.categoryChip,
                            {
                              backgroundColor:
                                (routine.color ?? theme.main) + "22",
                            },
                          ]}
                        >
                          <ThemedText
                            style={[
                              styles.categoryChipText,
                              {
                                color:
                                  mode === "dark"
                                    ? (routine.color ?? theme.main)
                                    : "#000000",
                              },
                            ]}
                          >
                            {routine.categoryName}
                          </ThemedText>
                        </View>
                      )}
                      {conflict && (
                        <View style={styles.conflictBadge}>
                          <ThemedText style={styles.conflictBadgeText}>
                            시간 겹침
                          </ThemedText>
                        </View>
                      )}
                    </View>
                  );
                })}
                {existingRoutines.some(isTimeConflict) && (
                  <ThemedText style={styles.conflictWarning}>
                    ⚠ 시간이 겹치는 루틴이 있어요. 시간을 조정해 보세요.
                  </ThemedText>
                )}
              </>
            )}
          </>
        )}
      </View>

      {/* 카테고리 선택 */}
      {categoryList.length > 0 && (
        <View style={styles.section}>
          <ThemedText style={styles.label}>카테고리</ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6, paddingVertical: 2 }}
          >
            {categoryList.map((cat) => {
              const resolvedColor = customCategoryColorMap[cat] ?? theme.main;
              const isSelected = category === cat;

              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryBadge,
                    {
                      backgroundColor: resolvedColor + "22",
                      borderColor: isSelected ? resolvedColor : "transparent",
                      borderWidth: isSelected ? 1.5 : 1,
                    },
                  ]}
                  onPress={() => {
                    setCategory(cat);
                    setSelectedColor(resolvedColor);
                  }}
                >
                  <View
                    style={[
                      styles.categoryBadgeDot,
                      { backgroundColor: resolvedColor },
                    ]}
                  />
                  <ThemedText
                    style={[
                      styles.categoryBadgeText,
                      {
                        color: mode === "dark" ? resolvedColor : "#000000",
                      },
                    ]}
                  >
                    {cat}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
      {/* 시간 / 알림 / 반복 설정 카드 */}
      <View style={styles.optionCard}>
        <View style={styles.rowBetween}>
          <View style={styles.iconLabel}>
            <IconSymbol name="clock.fill" size={18} color={theme.main} />
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
                <IconSymbol name="clock" size={18} color={theme.main} />
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
                color={theme.textMuted}
              />
            </TouchableOpacity>

            <View style={[styles.rowBetween, styles.innerOptionRow]}>
              <View style={styles.iconLabel}>
                <IconSymbol name="bell.fill" size={18} color={theme.main} />
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
            styles.repeatSection,
            isTimed ? styles.innerOptionRow : styles.repeatRowOnly,
          ]}
        >
          <View style={styles.repeatHeaderRow}>
            <View style={styles.iconLabel}>
              <IconSymbol name="repeat" size={18} color="#9FA2D6" />
              <ThemedText style={styles.optionLabel}>반복</ThemedText>
            </View>
            <TouchableOpacity
              style={styles.repeatOptionButton}
              onPress={() => {
                setShowRepeatPanel((prev) => !prev);
                setShowCustomRepeatPanel(false);
              }}
            >
              <ThemedText style={styles.repeatOptionText}>
                {repeatLabel}
              </ThemedText>
            </TouchableOpacity>
          </View>
          {showRepeatPanel && (
            <View style={styles.repeatPanel}>
              {[
                { label: "매일", value: "DAILY" as RepeatType },
                {
                  label: `매주(${getQuickWeekdayLabel(startDate)})`,
                  value: "QUICK_WEEKLY",
                },
                {
                  label: `격주(${getQuickWeekdayLabel(startDate)})`,
                  value: "QUICK_BIWEEKLY",
                },
                { label: "사용자 설정", value: "CUSTOM" as RepeatType },
              ].map((item) => {
                const isQuickWeekly = item.value === "QUICK_WEEKLY";
                const isQuickBiweekly = item.value === "QUICK_BIWEEKLY";

                const isSelected =
                  (repeatType === "DAILY" && item.value === "DAILY") ||
                  (repeatType === "CUSTOM" &&
                    repeatUnit === "WEEK" &&
                    repeatInterval === "1" &&
                    isQuickWeekly) ||
                  (repeatType === "CUSTOM" &&
                    repeatUnit === "WEEK" &&
                    repeatInterval === "2" &&
                    isQuickBiweekly) ||
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
                      if (isQuickWeekly) {
                        handleSelectQuickWeeklyRepeat("1");
                        return;
                      }

                      if (isQuickBiweekly) {
                        handleSelectQuickWeeklyRepeat("2");
                        return;
                      }

                      handleSelectRepeatType(item.value as RepeatType);
                    }}
                  >
                    <ThemedText
                      style={[
                        styles.repeatOptionText,
                        isSelected && styles.repeatOptionTextSelected,
                      ]}
                    >
                      {item.label}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          {showCustomRepeatPanel && (
            <View style={styles.customRepeatPanel}>
              <View>
                <ThemedText style={styles.dialLabel}>단위</ThemedText>

                <View style={styles.repeatTwoColumnRow}>
                  {(["DAY", "WEEK"] as RepeatUnit[]).map((unit) => (
                    <TouchableOpacity
                      key={unit}
                      style={[
                        styles.repeatOptionButton,
                        repeatUnit === unit &&
                          styles.repeatOptionButtonSelected,
                        styles.repeatFlexButton,
                      ]}
                      onPress={() => handleSelectCustomRepeatUnit(unit)}
                    >
                      <ThemedText
                        style={[
                          styles.repeatOptionText,
                          repeatUnit === unit &&
                            styles.repeatOptionTextSelected,
                        ]}
                      >
                        {unit === "DAY" ? "일" : "주"}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View>
                <ThemedText style={styles.dialLabel}>빈도</ThemedText>

                {repeatUnit === "WEEK" ? (
                  <View style={styles.repeatTwoColumnRow}>
                    {WEEK_REPEAT_EVERY_OPTIONS.map((opt) => (
                      <TouchableOpacity
                        key={opt}
                        style={[
                          styles.repeatOptionButton,
                          repeatInterval === opt &&
                            styles.repeatOptionButtonSelected,
                          styles.repeatFlexButton,
                        ]}
                        onPress={() => setRepeatInterval(opt)}
                      >
                        <ThemedText
                          style={[
                            styles.repeatOptionText,
                            repeatInterval === opt &&
                              styles.repeatOptionTextSelected,
                          ]}
                        >
                          {opt === "1" ? "매주" : "격주"}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <View style={styles.repeatIntervalStepper}>
                    <TouchableOpacity
                      style={styles.repeatStepperButton}
                      onPress={() => {
                        const current = Number(repeatInterval || "1");
                        const next = Math.max(1, current - 1);
                        setRepeatInterval(String(next));
                      }}
                    >
                      <Text style={styles.repeatStepperButtonText}>-</Text>
                    </TouchableOpacity>

                    <View style={styles.repeatIntervalInputBox}>
                      <TextInput
                        style={styles.repeatIntervalInput}
                        value={repeatInterval}
                        onChangeText={(text) => {
                          const onlyNumber = text.replace(/[^0-9]/g, "");

                          if (onlyNumber === "") {
                            setRepeatInterval("");
                            return;
                          }

                          const safeValue = String(
                            Math.min(999, Math.max(1, Number(onlyNumber))),
                          );
                          setRepeatInterval(safeValue);
                        }}
                        onBlur={() => {
                          if (!repeatInterval || Number(repeatInterval) < 1) {
                            setRepeatInterval("1");
                          }
                        }}
                        keyboardType="number-pad"
                        returnKeyType="done"
                        maxLength={3}
                      />

                      <Text style={styles.repeatIntervalSuffix}>일마다</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.repeatStepperButton}
                      onPress={() => {
                        const current = Number(repeatInterval || "1");
                        const next = Math.min(999, current + 1);
                        setRepeatInterval(String(next));
                      }}
                    >
                      <Text style={styles.repeatStepperButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {repeatUnit === "WEEK" && (
                <View>
                  <ThemedText style={styles.dialLabel}>요일</ThemedText>

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

              <View style={styles.customRepeatFooter}>
                <TouchableOpacity
                  style={styles.customRepeatDoneButton}
                  onPress={handleSaveCustomRepeat}
                >
                  <ThemedText style={styles.customRepeatDoneText}>
                    적용
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
      {/* 저장 버튼 */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSubmit}>
        <ThemedText style={styles.saveButtonText}>루틴 등록하기</ThemedText>
      </TouchableOpacity>

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
    </>
  );
}
const RoutineForm = forwardRef(RoutineFormBase);
export default RoutineForm;
