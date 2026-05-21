//data.tsx
import { ScheduleDetailModal } from "@/components/schedule_detail_modal";
import { Header } from "@/components/ui/_header";
import { getCategoryStyle } from "@/lib/category";
import { RoutineService } from "@/services/routine_service";
import { authStore } from "@/store/authStore";
import type { HeatmapRoutine, ScheduleRoutine } from "@/types/routine";
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

// 통계 화면 보기 모드 타입
type ViewMode = "YEAR" | "MONTH" | "WEEK";

// 년/주 단위 히트맵 셀 타입
type HeatmapCell = {
  key: string;
  filled: boolean;
};

// 월 달력 셀 타입
type CalendarCell = {
  key: string;
  filled: boolean;
  label: string;
  isEmpty?: boolean;
};

const MAIN_COLOR = "#405886";

const WEEK_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

// 선택한 날짜가 포함된 주의 시작일 계산
function getWeekStart(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

// 선택한 날짜가 포함된 주의 종료일 계산
function getWeekEnd(date: Date) {
  const end = new Date(getWeekStart(date));
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

// Date 객체를 YYYY-MM-DD 형식으로 변환
function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// 연간 통계 히트맵 셀 생성
type YearHeatmapColumn = {
  weekIndex: number;
  cells: (HeatmapCell | null)[];
};
function isFilled(completed: Record<string, boolean>, date: Date): boolean {
  return completed[formatDateKey(date)] === true;
}
function buildYearColumnsFromMap(
  routine: HeatmapRoutine,
  year: number,
  completed: Record<string, boolean>,
): YearHeatmapColumn[] {
  const jan1 = new Date(year, 0, 1);
  const dec31 = new Date(year, 11, 31);
  const startWeekday = jan1.getDay();
  const allDates: (Date | null)[] = [];

  for (let i = 0; i < startWeekday; i++) allDates.push(null);

  const current = new Date(jan1);
  while (current <= dec31) {
    allDates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  while (allDates.length % 7 !== 0) allDates.push(null);

  const totalWeeks = allDates.length / 7;
  const columns: YearHeatmapColumn[] = [];

  for (let week = 0; week < totalWeeks; week++) {
    const cells: (HeatmapCell | null)[] = [];

    for (let day = 0; day < 7; day++) {
      const date = allDates[week * 7 + day];
      if (!date) {
        cells.push(null);
      } else {
        cells.push({
          key: `${routine.routineId}-year-${formatDateKey(date)}`,
          filled: isFilled(completed, date),
        });
      }
    }

    columns.push({ weekIndex: week, cells });
  }

  return columns;
}
// 주간 통계 히트맵 셀 생성
function buildWeekCells(
  routine: HeatmapRoutine,
  selectedWeekDate: Date,
): HeatmapCell[] {
  const weekStart = getWeekStart(selectedWeekDate);

  return Array.from({ length: 7 }, (_, index) => {
    const currentDate = new Date(weekStart);
    currentDate.setDate(weekStart.getDate() + index);

    return {
      key: `${routine.routineId}-week-${index}`,
      filled: isFilled(routine.completed, currentDate),
    };
  });
}
// 월간 달력 셀 생성
function buildMonthCalendarCells(
  routine: HeatmapRoutine,
  year: number,
  month: number,
): CalendarCell[] {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstDay.getDay();

  const cells: CalendarCell[] = [];

  for (let i = 0; i < startWeekday; i++) {
    cells.push({
      key: `${routine.routineId}-month-empty-start-${i}`,
      filled: false,
      label: "",
      isEmpty: true,
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = new Date(year, month, day);
    cells.push({
      key: `${routine.routineId}-month-${day}`,
      filled: isFilled(routine.completed, currentDate),
      label: String(day),
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({
      key: `${routine.routineId}-month-empty-end-${cells.length}`,
      filled: false,
      label: "",
      isEmpty: true,
    });
  }

  return cells;
}

function formatYear(year: number) {
  return `${year}년`;
}

function formatMonth(year: number, month: number) {
  return `${year}년 ${month + 1}월`;
}
// 주간 표시 텍스트 생성
function formatWeek(selectedDate: Date) {
  const start = getWeekStart(selectedDate);
  const end = getWeekEnd(selectedDate);

  const startMonth = start.getMonth() + 1;
  const startDay = start.getDate();
  const endMonth = end.getMonth() + 1;
  const endDay = end.getDate();

  return `${startMonth}/${startDay} - ${endMonth}/${endDay}`;
}
// 루틴 하나의 통계 카드
function HeatmapRow({
  routine,
  viewMode,
  selectedYear,
  selectedMonth,
  selectedWeekDate,
  onPress,
}: {
  routine: HeatmapRoutine;
  viewMode: ViewMode;
  selectedYear: number;
  selectedMonth: number;
  selectedWeekDate: Date;
  onPress: (routineId: number) => void;
}) {
  const categoryStyle = getCategoryStyle({
    categoryName: routine.category.name,
    color: routine.category.colorCode,
  } as any);
  const yearColumns = useMemo(() => {
    if (viewMode !== "YEAR") return [];
    return buildYearColumnsFromMap(routine, selectedYear, routine.completed);
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
    <Pressable
      style={styles.routineCard}
      onPress={() => onPress(routine.routineId)}
    >
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

      {/* 연간 통계 화면 */}
      {viewMode === "YEAR" && (
        <View style={{ flexDirection: "row", height: 40 }}>
          {yearColumns.map((col) => (
            <View
              key={String(col.weekIndex)}
              style={{
                flex: 1,
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              {col.cells.map((cell, dayIndex) =>
                cell === null ? (
                  <View
                    key={`empty-${col.weekIndex}-${dayIndex}`}
                    style={{ flex: 1 }}
                  />
                ) : (
                  <View
                    key={cell.key}
                    style={[
                      {
                        flex: 1,
                        margin: 0.5,
                        borderRadius: 1.5,
                        backgroundColor: "#ECEEF3",
                      },
                      cell.filled && { backgroundColor: categoryStyle.dot },
                    ]}
                  />
                ),
              )}
            </View>
          ))}
        </View>
      )}
      {/* 월간 통계 화면 */}
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

      {/* 주간 통계 화면 */}
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
  // 저장된 루틴 목록
  const [heatmapData, setHeatmapData] = useState<HeatmapRoutine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  // 현재 통계 보기 모드
  const [viewMode, setViewMode] = useState<ViewMode>("YEAR");
  // 선택된 연도/월/주
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedWeekDate, setSelectedWeekDate] = useState(today);
  // 카테고리 접기/펼치기 상태
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({});
  // 상세 모달에 보여줄 루틴
  const [selectedRoutine, setSelectedRoutine] =
    useState<ScheduleRoutine | null>(null);
  // 상세 모달 표시 여부
  const [showDetailModal, setShowDetailModal] = useState(false);
  // 저장소에서 루틴 데이터 불러오기
  const loadHeatmap = useCallback(async () => {
    if (!authStore.isLoggedIn) return;
    try {
      setIsLoading(true);

      if (viewMode === "YEAR") {
        const data = await RoutineService.heatmapYear(selectedYear);
        setHeatmapData(data);
      } else if (viewMode === "MONTH") {
        // month는 0-based이므로 +1
        const data = await RoutineService.heatmapMonth(
          selectedYear,
          selectedMonth + 1,
        );
        // day 숫자 key → "YYYY-MM-DD" 형식으로 정규화
        const normalized = data.map((routine) => {
          const completedNormalized: Record<string, boolean> = {};
          Object.entries(routine.completed).forEach(([key, val]) => {
            if (/^\d{1,2}$/.test(key)) {
              const fullKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(key).padStart(2, "0")}`;
              completedNormalized[fullKey] = val;
            } else {
              completedNormalized[key] = val;
            }
          });
          return { ...routine, completed: completedNormalized };
        });

        setHeatmapData(normalized);
      } else {
        const dateStr = formatDateKey(selectedWeekDate);
        const data = await RoutineService.heatmapWeek(dateStr);
        setHeatmapData(data);
      }
    } catch (error) {
      if ((error as any)?.name === "NoTokenError") return;
      if (
        (error as any)?.response?.status === 401 ||
        (error as any)?.response?.status === 403
      )
        return;
      console.error("히트맵 데이터 불러오기 실패", error);
      setHeatmapData([]);
    } finally {
      setIsLoading(false);
    }
  }, [viewMode, selectedYear, selectedMonth, selectedWeekDate]);

  useFocusEffect(
    useCallback(() => {
      loadHeatmap();
    }, [loadHeatmap]),
  );
  const groupedRoutines = useMemo(() => {
    const groupedMap = new Map<string, HeatmapRoutine[]>();
    heatmapData.forEach((routine) => {
      const categoryName = routine.category.name;
      const prev = groupedMap.get(categoryName) ?? [];
      groupedMap.set(categoryName, [...prev, routine]);
    });
    return Array.from(groupedMap.entries())
      .map(([categoryName, routines]) => ({ categoryName, routines }))
      .sort((a, b) => a.categoryName.localeCompare(b.categoryName, "ko"));
  }, [heatmapData]);

  // 새로 생긴 카테고리는 기본적으로 펼쳐진 상태로 설정
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
  // 카테고리 접기/펼치기
  const toggleCategory = (categoryName: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryName]: !prev[categoryName],
    }));
  };
  // 연도 이동
  const moveYear = (diff: number) => {
    setSelectedYear((prev) => prev + diff);
  };
  // 월 이동
  const moveMonth = (diff: number) => {
    const nextDate = new Date(selectedYear, selectedMonth + diff, 1);
    setSelectedYear(nextDate.getFullYear());
    setSelectedMonth(nextDate.getMonth());
  };
  // 주 이동
  const moveWeek = (diff: number) => {
    setSelectedWeekDate((prev) => {
      const nextDate = new Date(prev);
      nextDate.setDate(nextDate.getDate() + diff * 7);
      return nextDate;
    });
  };
  // 루틴 클릭 시 상세 모달 열기
  const handlePressRoutine = async (routineId: number) => {
    try {
      const detail = await RoutineService.getById(routineId);
      setSelectedRoutine(detail);
      setShowDetailModal(true);
    } catch (error) {
      console.error("루틴 상세 조회 실패", error);
    }
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
            {/* 통계 보기 모드 선택 */}
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
            {/* 현재 선택된 기간 이동 영역 */}
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
            {/* 표시할 루틴이 없을 때 */}
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
                    {/* 카테고리가 펼쳐져 있을 때 루틴 목록 표시 */}
                    {isExpanded && (
                      <View style={styles.categoryBody}>
                        {group.routines.map((routine) => (
                          <HeatmapRow
                            key={routine.routineId}
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
      {/* 루틴 상세 모달 */}
      <ScheduleDetailModal
        visible={showDetailModal}
        routine={selectedRoutine}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedRoutine(null);
        }}
        onUpdated={async () => {
          await loadHeatmap();
        }}
        readOnly
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
    padding: 8,
    paddingBottom: 6,
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
