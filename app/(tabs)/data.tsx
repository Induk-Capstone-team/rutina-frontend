import { Header } from "@/components/ui/_header";
import { RoutineStorage } from "@/lib/storage";
import type { ScheduleRoutine } from "@/types/routine";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

// [수정] WEEK 추가
type ViewMode = "YEAR" | "MONTH" | "WEEK";

type GroupedRoutine = {
  categoryName: string;
  routines: ScheduleRoutine[];
};

type HeatmapCell = {
  key: string;
  filled: boolean;
};

type EventTypeStyle = {
  bg: string;
  dot: string;
  text: string;
};

const DEFAULT_CATEGORY_NAME = "기타";

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

  if (item.color) {
    return {
      bg: hexToRgba(item.color, 0.14),
      dot: item.color,
      text: item.color,
    };
  }

  return eventTypes[DEFAULT_CATEGORY_NAME];
}

function isSameYear(dateString: string, year: number) {
  const date = new Date(dateString);
  return date.getFullYear() === year;
}

function isSameMonth(dateString: string, year: number, month: number) {
  const date = new Date(dateString);
  return date.getFullYear() === year && date.getMonth() === month;
}

function isSameDay(
  dateString: string,
  year: number,
  month: number,
  day: number,
) {
  const date = new Date(dateString);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month &&
    date.getDate() === day
  );
}

function isSameDate(dateA: Date, dateB: Date) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
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
  return end;
}

function isSameWeek(dateString: string, selectedDate: Date) {
  const targetDate = new Date(dateString);
  const weekStart = getWeekStart(selectedDate);
  const weekEnd = getWeekEnd(selectedDate);

  return targetDate >= weekStart && targetDate <= weekEnd;
}

function buildYearCells(routine: ScheduleRoutine, year: number): HeatmapCell[] {
  return Array.from({ length: 12 }, (_, index) => {
    const filled =
      Boolean(routine.completed) && isSameMonth(routine.date, year, index);

    return {
      key: `${routine.id}-year-${index}`,
      filled,
    };
  });
}

function buildMonthCells(
  routine: ScheduleRoutine,
  year: number,
  month: number,
): HeatmapCell[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;

    return {
      key: `${routine.id}-month-${day}`,
      filled:
        Boolean(routine.completed) && isSameDay(routine.date, year, month, day),
    };
  });
}

function buildWeekCells(
  routine: ScheduleRoutine,
  selectedWeekDate: Date,
): HeatmapCell[] {
  const weekStart = getWeekStart(selectedWeekDate);

  return Array.from({ length: 7 }, (_, index) => {
    const currentDate = new Date(weekStart);
    currentDate.setDate(weekStart.getDate() + index);

    const routineDate = new Date(routine.date);

    return {
      key: `${routine.id}-week-${index}`,
      filled:
        Boolean(routine.completed) && isSameDate(routineDate, currentDate),
    };
  });
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

  const cells = useMemo(() => {
    if (viewMode === "YEAR") {
      return buildYearCells(routine, selectedYear);
    }

    if (viewMode === "MONTH") {
      return buildMonthCells(routine, selectedYear, selectedMonth);
    }

    return buildWeekCells(routine, selectedWeekDate);
  }, [routine, viewMode, selectedYear, selectedMonth, selectedWeekDate]);

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

      <View style={styles.heatmapWrap}>
        {cells.map((cell) => (
          <View
            key={cell.key}
            style={[
              styles.heatmapCell,
              cell.filled && {
                backgroundColor: categoryStyle.dot,
                borderColor: categoryStyle.dot,
              },
            ]}
          />
        ))}
      </View>

      {viewMode === "YEAR" && (
        <View style={styles.monthLabelRow}>
          {MONTH_LABELS.map((label) => (
            <Text key={label} style={styles.monthLabel}>
              {label}
            </Text>
          ))}
        </View>
      )}

      {viewMode === "WEEK" && (
        <View style={styles.weekLabelRow}>
          {WEEK_LABELS.map((label) => (
            <Text key={label} style={styles.weekLabel}>
              {label}
            </Text>
          ))}
        </View>
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
  const [selectedWeekDate, setSelectedWeekDate] = useState(today); // [추가]
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({});

  const loadRoutines = useCallback(async () => {
    try {
      const stored = await RoutineStorage.getAll();
      setRoutines(stored);
    } catch (error) {
      console.error("통계 데이터 불러오기 실패", error);
      setRoutines([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRoutines();
    }, [loadRoutines]),
  );

  const filteredRoutines = useMemo(() => {
    if (viewMode === "YEAR") {
      return routines.filter((routine) =>
        isSameYear(routine.date, selectedYear),
      );
    }

    if (viewMode === "MONTH") {
      return routines.filter((routine) =>
        isSameMonth(routine.date, selectedYear, selectedMonth),
      );
    }

    return routines.filter((routine) =>
      isSameWeek(routine.date, selectedWeekDate),
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
    router.push("/(tabs)/schedule");
    console.log("선택한 루틴:", routine.id);
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F3F4F8",
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  scrollView: {
    flex: 1,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 32,
    padding: 24,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  headerArea: {
    marginBottom: 18,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#2A3C6B",
    marginBottom: 6,
  },
  screenSubTitle: {
    fontSize: 13,
    color: "#A0B0D0",
    fontWeight: "500",
  },
  viewTabRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  viewTabButton: {
    flex: 1,
    backgroundColor: "#F3F4F8",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  viewTabButtonActive: {
    backgroundColor: "#405886",
  },
  viewTabText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6D7690",
  },
  viewTabTextActive: {
    color: "#FFF",
  },
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
  periodMoveText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#405886",
  },
  periodText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2A3C6B",
  },
  emptyBox: {
    backgroundColor: "#F8F9FB",
    borderRadius: 20,
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#B4B6C0",
    fontWeight: "600",
  },
  categorySection: {
    marginBottom: 14,
  },
  categoryHeader: {
    backgroundColor: "#F8F9FB",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#2A3C6B",
  },
  categoryCount: {
    fontSize: 12,
    color: "#A0B0D0",
    fontWeight: "700",
  },
  categoryToggle: {
    fontSize: 13,
    color: "#405886",
    fontWeight: "700",
  },
  categoryBody: {
    marginTop: 10,
    gap: 10,
  },
  routineCard: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F1F3F7",
  },
  routineHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  routineColorDot: {
    width: 10,
    height: 10,
    borderRadius: 99,
    marginRight: 8,
  },
  routineTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#2A3C6B",
  },
  heatmapWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  heatmapCell: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#DADFE8",
    backgroundColor: "#FFF",
  },
  monthLabelRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  monthLabel: {
    width: 18,
    textAlign: "center",
    fontSize: 8,
    color: "#A0B0D0",
    fontWeight: "600",
  },

  weekLabelRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
  },
  weekLabel: {
    width: 18,
    textAlign: "center",
    fontSize: 10,
    color: "#A0B0D0",
    fontWeight: "600",
  },
});
