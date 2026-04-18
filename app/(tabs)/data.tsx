import { ScheduleDetailModal } from "@/components/schedule_detail_modal";
import { Header } from "@/components/ui/_header";
import { RoutineStorage } from "@/lib/storage";
import type { ScheduleRoutine } from "@/types/routine";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type ViewMode = "YEAR" | "MONTH" | "WEEK";

type GroupedRoutine = {
  categoryName: string;
  routines: ScheduleRoutine[];
};

type HeatmapCell = {
  key: string;
  filled: boolean;
};

type CalendarCell = {
  key: string;
  filled: boolean;
  label: string;
  isEmpty?: boolean;
};

type EventTypeStyle = {
  bg: string;
  dot: string;
  text: string;
};

const DEFAULT_CATEGORY_NAME = "기타";
const MAIN_COLOR = "#405886";

const eventTypes: Record<string, EventTypeStyle> = {
  기상: { bg: "#FAEEEE", dot: "#E79A95", text: "#5D4645" },
  운동: { bg: "#FDF4EC", dot: "#EFB996", text: "#675141" },
  공부: { bg: "#F1F1FB", dot: "#9FA2D6", text: "#3E426F" },
  명상: { bg: "#F1F7EE", dot: "#A8CD9B", text: "#4C5D44" },
  저녁: { bg: "#FEF9EE", dot: "#E6CF8A", text: "#685A3F" },
  기타: { bg: "#F3F4F8", dot: "#C4C6D0", text: "#8A8C9A" },
};

const MONTH_LABELS = [
  "1월",
  "2월",
  "3월",
  "4월",
  "5월",
  "6월",
  "7월",
  "8월",
  "9월",
  "10월",
  "11월",
  "12월",
];

const WEEK_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function hexToRgba(hex: string, alpha: number) {
  const cleaned = hex.replace("#", "");

  if (cleaned.length !== 6) {
    return hex;
  }

  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function normalizeCategoryName(categoryName?: string | null) {
  const trimmed = categoryName?.trim();
  return trimmed ? trimmed : DEFAULT_CATEGORY_NAME;
}

function getCategoryStyle(item: ScheduleRoutine): EventTypeStyle {
  const typeLabel = item.categoryName ?? DEFAULT_CATEGORY_NAME;
  const fixedStyle = eventTypes[typeLabel];

  if (fixedStyle) {
    return fixedStyle;
  }
  // 커스텀 카테고리 색상 적용
  if (item.color) {
    return {
      bg: hexToRgba(item.color, 0.14),
      dot: item.color,
      text: item.color,
    };
  }

  return eventTypes[DEFAULT_CATEGORY_NAME];
}

function getWeekStart(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

function getWeekEnd(date: Date) {
  const end = new Date(getWeekStart(date));
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function parseDateValue(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  const date = new Date(year, month - 1, day);

  date.setHours(0, 0, 0, 0);

  return date;
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function getRoutineStartDate(routine: ScheduleRoutine) {
  return parseDateValue(routine.startDate) || null;
}

function getRoutineEndDate(routine: ScheduleRoutine) {
  return parseDateValue(routine.endDate) || getRoutineStartDate(routine);
}
function isDateInRoutineRange(routine: ScheduleRoutine, targetDate: Date) {
  const startDate = getRoutineStartDate(routine);
  const endDate = getRoutineEndDate(routine);

  if (!startDate || !endDate) {
    return false;
  }

  const normalizedTarget = new Date(targetDate);
  normalizedTarget.setHours(0, 0, 0, 0);
  // 시작일~종료일 범위 안에 있는 날짜인지 확인
  return normalizedTarget >= startDate && normalizedTarget <= endDate;
}
function isRoutineCompletedOnDate(routine: ScheduleRoutine, targetDate: Date) {
  const targetDateKey = formatDateKey(targetDate);
  const completedDates = routine.completedDates ?? [];
  // 해당 날짜가 완료 기록에 포함되어 있는지 확인
  return completedDates.includes(targetDateKey);
}
function doesRoutineOverlapPeriod(
  routine: ScheduleRoutine,
  periodStart: Date,
  periodEnd: Date,
) {
  const startDate = getRoutineStartDate(routine);
  const endDate = getRoutineEndDate(routine);

  if (!startDate || !endDate) {
    return false;
  }

  const normalizedStart = new Date(periodStart);
  normalizedStart.setHours(0, 0, 0, 0);

  const normalizedEnd = new Date(periodEnd);
  normalizedEnd.setHours(23, 59, 59, 999);
  // 루틴 기간과 현재 보는 기간이 겹치는지 확인
  return startDate <= normalizedEnd && endDate >= normalizedStart;
}

function isRoutineInSameYear(routine: ScheduleRoutine, year: number) {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);
  return doesRoutineOverlapPeriod(routine, yearStart, yearEnd);
}

function isRoutineInSameMonth(
  routine: ScheduleRoutine,
  year: number,
  month: number,
) {
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  return doesRoutineOverlapPeriod(routine, monthStart, monthEnd);
}

function isRoutineInSameWeek(routine: ScheduleRoutine, selectedDate: Date) {
  const weekStart = getWeekStart(selectedDate);
  const weekEnd = getWeekEnd(selectedDate);
  return doesRoutineOverlapPeriod(routine, weekStart, weekEnd);
}

function buildYearCells(routine: ScheduleRoutine, year: number): HeatmapCell[] {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);
  const cells: HeatmapCell[] = [];

  const current = new Date(startDate);

  while (current <= endDate) {
    const currentYear = current.getFullYear();
    const currentMonth = current.getMonth();
    const currentDay = current.getDate();

    cells.push({
      key: `${routine.id}-year-${currentYear}-${currentMonth + 1}-${currentDay}`,
      filled:
        isDateInRoutineRange(routine, current) &&
        isRoutineCompletedOnDate(routine, current),
    });
    current.setDate(current.getDate() + 1);
  }

  return cells;
}

function buildWeekCells(
  routine: ScheduleRoutine,
  selectedWeekDate: Date,
): HeatmapCell[] {
  const weekStart = getWeekStart(selectedWeekDate);

  return Array.from({ length: 7 }, (_, index) => {
    const currentDate = new Date(weekStart);
    currentDate.setDate(weekStart.getDate() + index);

    return {
      key: `${routine.id}-week-${index}`,
      filled:
        isDateInRoutineRange(routine, currentDate) &&
        isRoutineCompletedOnDate(routine, currentDate),
    };
  });
}

function buildMonthCalendarCells(
  routine: ScheduleRoutine,
  year: number,
  month: number,
): CalendarCell[] {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstDay.getDay();

  const cells: CalendarCell[] = [];

  for (let i = 0; i < startWeekday; i++) {
    cells.push({
      key: `${routine.id}-month-empty-start-${i}`,
      filled: false,
      label: "",
      isEmpty: true,
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = new Date(year, month, day);

    cells.push({
      key: `${routine.id}-month-${day}`,
      filled:
        isDateInRoutineRange(routine, currentDate) &&
        isRoutineCompletedOnDate(routine, currentDate),
      label: String(day),
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({
      key: `${routine.id}-month-empty-end-${cells.length}`,
      filled: false,
      label: "",
      isEmpty: true,
    });
  }

  return cells;
}

function groupByCategory(routines: ScheduleRoutine[]): GroupedRoutine[] {
  const groupedMap = new Map<string, ScheduleRoutine[]>();

  routines.forEach((routine) => {
    const categoryName = normalizeCategoryName(routine.categoryName);

    const prev = groupedMap.get(categoryName) || [];
    groupedMap.set(categoryName, [...prev, routine]);
  });

  return Array.from(groupedMap.entries())
    .map(([categoryName, grouped]) => ({
      categoryName,
      routines: grouped.sort((a, b) => a.title.localeCompare(b.title)),
    }))
    .sort((a, b) => a.categoryName.localeCompare(b.categoryName));
}

function formatYear(year: number) {
  return `${year}년`;
}

function formatMonth(year: number, month: number) {
  return `${year}년 ${month + 1}월`;
}

function formatWeek(selectedDate: Date) {
  const start = getWeekStart(selectedDate);
  const end = getWeekEnd(selectedDate);

  const startMonth = start.getMonth() + 1;
  const startDay = start.getDate();
  const endMonth = end.getMonth() + 1;
  const endDay = end.getDate();

  return `${startMonth}/${startDay} - ${endMonth}/${endDay}`;
}

function HeatmapRow({
  routine,
  viewMode,
  selectedYear,
  selectedMonth,
  selectedWeekDate,
  onPress,
}: {
  routine: ScheduleRoutine;
  viewMode: ViewMode;
  selectedYear: number;
  selectedMonth: number;
  selectedWeekDate: Date;
  onPress: (routine: ScheduleRoutine) => void;
}) {
  const categoryStyle = getCategoryStyle(routine);

  const yearCells = useMemo(() => {
    if (viewMode !== "YEAR") return [];
    return buildYearCells(routine, selectedYear);
  }, [routine, viewMode, selectedYear]);

  const monthCells = useMemo(() => {
    if (viewMode !== "MONTH") return [];
    return buildMonthCalendarCells(routine, selectedYear, selectedMonth);
  }, [routine, viewMode, selectedYear, selectedMonth]);

  const weekCells = useMemo(() => {
    if (viewMode !== "WEEK") return [];
    return buildWeekCells(routine, selectedWeekDate);
  }, [routine, viewMode, selectedWeekDate]);

  return (
    <Pressable style={styles.routineCard} onPress={() => onPress(routine)}>
      <View style={styles.routineHeader}>
        <View
          style={[
            styles.routineColorDot,
            { backgroundColor: categoryStyle.dot },
          ]}
        />
        <Text style={styles.routineTitle} numberOfLines={1}>
          {routine.title}
        </Text>
      </View>

      {viewMode === "YEAR" && (
        <>
          <View style={styles.yearHeatmapWrap}>
            {yearCells.map((cell) => (
              <View
                key={cell.key}
                style={[
                  styles.yearHeatmapCell,
                  cell.filled && {
                    backgroundColor: categoryStyle.dot,
                    borderColor: categoryStyle.dot,
                  },
                ]}
              />
            ))}
          </View>

          <View style={styles.yearLegendRow}>
            {MONTH_LABELS.map((label) => (
              <Text key={label} style={styles.yearLegendText}>
                {label}
              </Text>
            ))}
          </View>
        </>
      )}

      {viewMode === "MONTH" && (
        <>
          <View style={styles.monthWeekLabelRow}>
            {WEEK_LABELS.map((label) => (
              <Text key={label} style={styles.monthWeekLabel}>
                {label}
              </Text>
            ))}
          </View>
          <View style={styles.monthCalendarWrap}>
            {monthCells.map((cell) => (
              <View
                key={cell.key}
                style={[
                  styles.monthCalendarCell,
                  cell.isEmpty && styles.monthCalendarCellEmpty,
                  cell.filled && {
                    backgroundColor: categoryStyle.bg,
                    borderColor: categoryStyle.dot,
                  },
                ]}
              >
                {!cell.isEmpty && (
                  <View style={styles.monthCalendarTextWrap}>
                    <Text
                      style={[
                        styles.monthCalendarCellText,
                        cell.filled && styles.monthCalendarCellTextFilled,
                      ]}
                    >
                      {cell.label}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </>
      )}

      {viewMode === "WEEK" && (
        <>
          <View style={styles.weekContainer}>
            <View style={styles.weekHeatmapWrap}>
              {weekCells.map((cell) => (
                <View
                  key={cell.key}
                  style={[
                    styles.weekHeatmapCell,
                    cell.filled && {
                      backgroundColor: categoryStyle.dot,
                      borderColor: categoryStyle.dot,
                    },
                  ]}
                />
              ))}
            </View>
          </View>
          <View style={styles.weekLabelRow}>
            {WEEK_LABELS.map((label) => (
              <Text key={label} style={styles.weekLabel}>
                {label}
              </Text>
            ))}
          </View>
        </>
      )}
    </Pressable>
  );
}

export default function DataScreen() {
  const today = new Date();

  const [routines, setRoutines] = useState<ScheduleRoutine[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("YEAR");
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedWeekDate, setSelectedWeekDate] = useState(today);
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({});
  const [selectedRoutine, setSelectedRoutine] =
    useState<ScheduleRoutine | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const loadRoutines = useCallback(async () => {
    try {
      const stored = await RoutineStorage.getAll();
      setRoutines(stored);
    } catch (error) {
      console.error("통계 데이터 불러오기 실패", error);
      setRoutines([]);
    }
  }, []);
  // 화면으로 다시 돌아올 때마다 최신 루틴 불러오기
  useFocusEffect(
    useCallback(() => {
      loadRoutines();
    }, [loadRoutines]),
  );

  const filteredRoutines = useMemo(() => {
    if (viewMode === "YEAR") {
      return routines.filter((routine) =>
        isRoutineInSameYear(routine, selectedYear),
      );
    }

    if (viewMode === "MONTH") {
      return routines.filter((routine) =>
        isRoutineInSameMonth(routine, selectedYear, selectedMonth),
      );
    }

    return routines.filter((routine) =>
      isRoutineInSameWeek(routine, selectedWeekDate),
    );
  }, [routines, viewMode, selectedYear, selectedMonth, selectedWeekDate]);

  const groupedRoutines = useMemo(() => {
    return groupByCategory(filteredRoutines);
  }, [filteredRoutines]);

  React.useEffect(() => {
    setExpandedCategories((prev) => {
      const nextState = { ...prev };

      groupedRoutines.forEach((group) => {
        if (nextState[group.categoryName] === undefined) {
          nextState[group.categoryName] = true;
        }
      });

      return nextState;
    });
  }, [groupedRoutines]);

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryName]: !prev[categoryName],
    }));
  };

  const moveYear = (diff: number) => {
    setSelectedYear((prev) => prev + diff);
  };

  const moveMonth = (diff: number) => {
    const nextDate = new Date(selectedYear, selectedMonth + diff, 1);
    setSelectedYear(nextDate.getFullYear());
    setSelectedMonth(nextDate.getMonth());
  };

  const moveWeek = (diff: number) => {
    setSelectedWeekDate((prev) => {
      const nextDate = new Date(prev);
      nextDate.setDate(nextDate.getDate() + diff * 7);
      return nextDate;
    });
  };
  const handlePressRoutine = (routine: ScheduleRoutine) => {
    setSelectedRoutine(routine);
    setShowDetailModal(true);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Header activeTab="right" />

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <View style={styles.headerArea}>
              <Text style={styles.screenTitle}>통계</Text>
              <Text style={styles.screenSubTitle}>
                루틴별 완료 기록을 확인해보세요
              </Text>
            </View>

            <View style={styles.viewTabRow}>
              <Pressable
                style={[
                  styles.viewTabButton,
                  viewMode === "WEEK" && styles.viewTabButtonActive,
                ]}
                onPress={() => setViewMode("WEEK")}
              >
                <Text
                  style={[
                    styles.viewTabText,
                    viewMode === "WEEK" && styles.viewTabTextActive,
                  ]}
                >
                  Week
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.viewTabButton,
                  viewMode === "MONTH" && styles.viewTabButtonActive,
                ]}
                onPress={() => setViewMode("MONTH")}
              >
                <Text
                  style={[
                    styles.viewTabText,
                    viewMode === "MONTH" && styles.viewTabTextActive,
                  ]}
                >
                  Month
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.viewTabButton,
                  viewMode === "YEAR" && styles.viewTabButtonActive,
                ]}
                onPress={() => setViewMode("YEAR")}
              >
                <Text
                  style={[
                    styles.viewTabText,
                    viewMode === "YEAR" && styles.viewTabTextActive,
                  ]}
                >
                  Year
                </Text>
              </Pressable>
            </View>

            <View style={styles.periodRow}>
              <Pressable
                style={styles.periodMoveButton}
                onPress={() => {
                  if (viewMode === "YEAR") {
                    moveYear(-1);
                    return;
                  }

                  if (viewMode === "MONTH") {
                    moveMonth(-1);
                    return;
                  }

                  moveWeek(-1);
                }}
              >
                <Text style={styles.periodMoveText}>‹</Text>
              </Pressable>

              <Text style={styles.periodText}>
                {viewMode === "YEAR"
                  ? formatYear(selectedYear)
                  : viewMode === "MONTH"
                    ? formatMonth(selectedYear, selectedMonth)
                    : formatWeek(selectedWeekDate)}
              </Text>

              <Pressable
                style={styles.periodMoveButton}
                onPress={() => {
                  if (viewMode === "YEAR") {
                    moveYear(1);
                    return;
                  }

                  if (viewMode === "MONTH") {
                    moveMonth(1);
                    return;
                  }

                  moveWeek(1);
                }}
              >
                <Text style={styles.periodMoveText}>›</Text>
              </Pressable>
            </View>

            {groupedRoutines.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>표시할 루틴이 없어요.</Text>
              </View>
            ) : (
              groupedRoutines.map((group) => {
                const isExpanded = expandedCategories[group.categoryName];

                return (
                  <View key={group.categoryName} style={styles.categorySection}>
                    <Pressable
                      style={styles.categoryHeader}
                      onPress={() => toggleCategory(group.categoryName)}
                    >
                      <View style={styles.categoryHeaderLeft}>
                        <Text style={styles.categoryTitle}>
                          {group.categoryName}
                        </Text>
                        <Text style={styles.categoryCount}>
                          {group.routines.length}개
                        </Text>
                      </View>

                      <Text style={styles.categoryToggle}>
                        {isExpanded ? "접기" : "펼치기"}
                      </Text>
                    </Pressable>

                    {isExpanded && (
                      <View style={styles.categoryBody}>
                        {group.routines.map((routine) => (
                          <HeatmapRow
                            key={routine.id}
                            routine={routine}
                            viewMode={viewMode}
                            selectedYear={selectedYear}
                            selectedMonth={selectedMonth}
                            selectedWeekDate={selectedWeekDate}
                            onPress={handlePressRoutine}
                          />
                        ))}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      </View>
      <ScheduleDetailModal
        visible={showDetailModal}
        routine={selectedRoutine}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedRoutine(null);
        }}
        onUpdated={async () => {
          await loadRoutines();
        }}
      />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F3F4F8" },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
  scrollView: { flex: 1 },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 32,
    padding: 24,
    marginBottom: 20,
  },
  headerArea: { marginBottom: 18 },
  screenTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#2A3C6B",
    marginBottom: 6,
  },
  screenSubTitle: { fontSize: 13, color: "#A0B0D0", fontWeight: "500" },
  viewTabRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  viewTabButton: {
    flex: 1,
    backgroundColor: "#F3F4F8",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  viewTabButtonActive: { backgroundColor: MAIN_COLOR },
  viewTabText: { fontSize: 14, fontWeight: "700", color: "#6D7690" },
  viewTabTextActive: { color: "#FFF" },
  periodRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  periodMoveButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F8",
    justifyContent: "center",
    alignItems: "center",
  },
  periodMoveText: { fontSize: 20, fontWeight: "700", color: MAIN_COLOR },
  periodText: { fontSize: 16, fontWeight: "700", color: "#2A3C6B" },
  emptyBox: {
    backgroundColor: "#F8F9FB",
    borderRadius: 20,
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: { fontSize: 14, color: "#B4B6C0", fontWeight: "600" },
  categorySection: { marginBottom: 14 },
  categoryHeader: {
    backgroundColor: "#F8F9FB",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  categoryTitle: { fontSize: 15, fontWeight: "800", color: "#2A3C6B" },
  categoryCount: { fontSize: 12, color: "#A0B0D0", fontWeight: "700" },
  categoryToggle: { fontSize: 13, color: MAIN_COLOR, fontWeight: "700" },
  categoryBody: { marginTop: 8, gap: 6 },
  routineCard: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 14,
    paddingBottom: 10,
    borderWidth: 1,
    borderColor: "#F1F3F7",
  },
  routineHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  routineColorDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  routineTitle: { flex: 1, fontSize: 14, fontWeight: "700", color: "#2A3C6B" },

  yearHeatmapWrap: { flexDirection: "row", flexWrap: "wrap", gap: 2 },
  yearHeatmapCell: {
    width: 7,
    height: 7,
    borderRadius: 1.5,
    borderWidth: 0.5,
    borderColor: "#DADFE8",
    backgroundColor: "#F8F9FB",
  },
  yearLegendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  yearLegendText: { fontSize: 8, color: "#A0B0D0" },

  monthWeekLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    marginBottom: 4,
  },
  monthWeekLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 10,
    color: "#A0B0D0",
    fontWeight: "700",
  },
  monthCalendarWrap: { flexDirection: "row", flexWrap: "wrap", rowGap: 2 },
  monthCalendarCell: {
    width: "14.28%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  monthCalendarCellEmpty: { backgroundColor: "transparent" },
  monthCalendarTextWrap: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },

  monthCalendarCellText: {
    fontSize: 11,
    fontWeight: "600",
    color: MAIN_COLOR,
    textAlign: "center",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  monthCalendarCellTextFilled: {
    color: MAIN_COLOR,
    fontWeight: "800",
  },

  weekHeatmapWrap: { flexDirection: "row", justifyContent: "space-between" },
  weekHeatmapCell: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#DADFE8",
  },
  weekLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  weekLabel: { width: 20, textAlign: "center", fontSize: 10, color: "#A0B0D0" },
  weekContainer: {
    paddingBottom: 8,
    paddingTop: 4,
  },
});
