import { ScheduleDetailModal } from "@/components/schedule_detail_modal";
import { RoutineStorage } from "@/lib/storage";
import type { CalendarDay, ScheduleRoutine } from "@/types/routine";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AppCalendar from "./ui/app_calendar";

// 카테고리 색상 타입
type EventTypeStyle = {
  bg: string;
  dot: string;
  text: string;
};

type RoutineWithCompletedDates = ScheduleRoutine & {
  completedDates?: string[];
};

const eventTypes: Record<string, EventTypeStyle> = {
  기상: { bg: "#FAEEEE", dot: "#E79A95", text: "#5D4645" },
  운동: { bg: "#FDF4EC", dot: "#EFB996", text: "#675141" },
  공부: { bg: "#F1F1FB", dot: "#9FA2D6", text: "#3E426F" },
  명상: { bg: "#F1F7EE", dot: "#A8CD9B", text: "#4C5D44" },
  저녁: { bg: "#FEF9EE", dot: "#E6CF8A", text: "#685A3F" },
  기타: { bg: "#F3F4F8", dot: "#C4C6D0", text: "#8A8C9A" },
};

function getNotifyText(item: ScheduleRoutine) {
  return item.alarm ? "알림 있음" : "알림 없음";
}

function getRepeatText(item: ScheduleRoutine) {
  switch (item.repeatOption) {
    case "DAILY":
      return "반복: 매일";
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

      return `반복: ${item.customRepeatEvery ?? 1}${unit}마다`;
    }
    case "NONE":
    default:
      return "반복 없음";
  }
}

function getDateRangeText(item: ScheduleRoutine) {
  if (item.startDate === item.endDate) {
    return item.startDate;
  }

  return `${item.startDate} ~ ${item.endDate}`;
}

// "HH:mm" 문자열을 시간 숫자로 바꾸는 함수
function parseTimeString(time?: string | null) {
  if (!time) {
    return null;
  }

  const [hourString = "0", minuteString = "0"] = time.split(":");
  const hour = Number(hourString);
  const minute = Number(minuteString);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return null;
  }

  return {
    hour,
    minute,
    totalMinutes: hour * 60 + minute,
  };
}

// hex 색상을 rgba로 변환하는 함수
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

// 카테고리에 맞는 스타일 반환
function getCategoryStyle(item: ScheduleRoutine): EventTypeStyle {
  const typeLabel = item.categoryName ?? "기타";
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

  return eventTypes["기타"];
}
// 일 단위 차이 계산
function getDiffDays(startDate: string, targetDate: string) {
  const start = new Date(startDate);
  const target = new Date(targetDate);

  const startTime = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
  ).getTime();

  const targetTime = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
  ).getTime();

  return Math.floor((targetTime - startTime) / (1000 * 60 * 60 * 24));
}

// 주 단위 차이 계산
function getDiffWeeks(startDate: string, targetDate: string) {
  return Math.floor(getDiffDays(startDate, targetDate) / 7);
}

// 월 단위 차이 계산
function getDiffMonths(startDate: string, targetDate: string) {
  const start = new Date(startDate);
  const target = new Date(targetDate);

  return (
    (target.getFullYear() - start.getFullYear()) * 12 +
    (target.getMonth() - start.getMonth())
  );
}

// 년 단위 차이 계산
function getDiffYears(startDate: string, targetDate: string) {
  const start = new Date(startDate);
  const target = new Date(targetDate);

  return target.getFullYear() - start.getFullYear();
}

// 선택 날짜에 이 일정이 보여야 하는지 판단
function shouldShowRoutineOnDate(
  item: ScheduleRoutine,
  targetDateString: string,
) {
  if (targetDateString < item.startDate || targetDateString > item.endDate) {
    return false;
  }

  if (!item.repeatOption || item.repeatOption === "NONE") {
    return true;
  }

  if (item.repeatOption === "DAILY") {
    return true;
  }

  if (item.repeatOption === "CUSTOM") {
    const every = item.customRepeatEvery ?? 1;
    const unit = item.customRepeatUnit ?? "DAY";

    if (unit === "DAY") {
      return getDiffDays(item.startDate, targetDateString) % every === 0;
    }

    if (unit === "WEEK") {
      return getDiffWeeks(item.startDate, targetDateString) % every === 0;
    }

    if (unit === "MONTH") {
      return getDiffMonths(item.startDate, targetDateString) % every === 0;
    }

    if (unit === "YEAR") {
      return getDiffYears(item.startDate, targetDateString) % every === 0;
    }
  }

  return false;
}

// 특정 날짜 완료 여부 확인
function isCompletedOnDate(
  item: RoutineWithCompletedDates,
  targetDateString: string,
) {
  return item.completedDates?.includes(targetDateString) ?? false;
}

export default function ScheduleContent() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [noTimeRoutines, setNoTimeRoutines] = useState<
    RoutineWithCompletedDates[]
  >([]);
  const [timedRoutines, setTimedRoutines] = useState<
    RoutineWithCompletedDates[]
  >([]);

  const [selectedRoutine, setSelectedRoutine] =
    useState<RoutineWithCompletedDates | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const selectedDateString = selectedDate.toISOString().split("T")[0];

  const day = selectedDate.getDate();
  const year = selectedDate.getFullYear();
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const month = monthNames[selectedDate.getMonth()];
  const weekDays = [
    "일요일",
    "월요일",
    "화요일",
    "수요일",
    "목요일",
    "금요일",
    "토요일",
  ];
  const dayOfWeek = weekDays[selectedDate.getDay()];

  const changeDate = (offset: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + offset);
    setSelectedDate(newDate);
  };

  const onDayPress = (day: CalendarDay) => {
    setSelectedDate(new Date(day.dateString));
    setShowDatePicker(false);
  };

  const loadRoutines = useCallback(async () => {
    try {
      const allRoutines = await RoutineStorage.getAll();

      // 선택 날짜 기준으로 보여줄 루틴만 필터링
      const filteredByDate = allRoutines.filter(
        (item: RoutineWithCompletedDates) =>
          shouldShowRoutineOnDate(item, selectedDateString),
      );
      // 시간 유무에 따라 분리
      const timed = filteredByDate.filter(
        (item: RoutineWithCompletedDates) =>
          item.startTime !== undefined && item.startTime !== null,
      );

      const noTimed = filteredByDate.filter(
        (item: RoutineWithCompletedDates) =>
          item.startTime === undefined || item.startTime === null,
      );
      // 시간 있는 루틴은 시작 시간 순으로 정렬
      timed.sort((a, b) => {
        const aTime = parseTimeString(a.startTime);
        const bTime = parseTimeString(b.startTime);

        const aMinutes = aTime?.totalMinutes ?? 0;
        const bMinutes = bTime?.totalMinutes ?? 0;

        return aMinutes - bMinutes;
      });

      setTimedRoutines(timed);
      setNoTimeRoutines(noTimed);
    } catch (error) {
      console.error("일정 불러오기 실패", error);
      setTimedRoutines([]);
      setNoTimeRoutines([]);
    }
  }, [selectedDateString]);
  // 화면이 다시 포커스될 때마다 일정 새로 불러오기
  useFocusEffect(
    useCallback(() => {
      loadRoutines();
    }, [loadRoutines]),
  );

  const toggleComplete = async (id: number) => {
    try {
      const storageApi = RoutineStorage as unknown as {
        getAll: () => Promise<RoutineWithCompletedDates[]>;
        saveAll?: (routines: RoutineWithCompletedDates[]) => Promise<void>;
        updateById?: (
          id: number,
          updatedRoutine: RoutineWithCompletedDates,
        ) => Promise<void>;
      };

      const allRoutines = await storageApi.getAll();
      const targetRoutine = allRoutines.find((item) => item.id === id);

      if (!targetRoutine) {
        return;
      }

      const prevCompletedDates = targetRoutine.completedDates ?? [];
      const isCompletedToday = prevCompletedDates.includes(selectedDateString);
      // 오늘 날짜를 completedDates에 추가/제거해서 완료 상태 토글
      const nextCompletedDates = isCompletedToday
        ? prevCompletedDates.filter((date) => date !== selectedDateString)
        : [...prevCompletedDates, selectedDateString];

      const updatedRoutine: RoutineWithCompletedDates = {
        ...targetRoutine,
        completedDates: nextCompletedDates,
      };

      if (storageApi.updateById) {
        await storageApi.updateById(id, updatedRoutine);
      } else if (storageApi.saveAll) {
        const updatedRoutines = allRoutines.map((item) =>
          item.id === id ? updatedRoutine : item,
        );
        await storageApi.saveAll(updatedRoutines);
      } else {
        console.error(
          "완료 상태 변경 실패: RoutineStorage에 updateById 또는 saveAll 메서드가 필요합니다.",
        );
        return;
      }

      await loadRoutines();

      // 상세 모달이 열려 있을 때도 상태가 바로 반영되도록 동기화
      setSelectedRoutine((prev) => {
        if (!prev || prev.id !== id) return prev;

        const prevSelectedCompletedDates = prev.completedDates ?? [];
        const prevSelectedCompletedToday =
          prevSelectedCompletedDates.includes(selectedDateString);

        return {
          ...prev,
          completedDates: prevSelectedCompletedToday
            ? prevSelectedCompletedDates.filter(
                (date) => date !== selectedDateString,
              )
            : [...prevSelectedCompletedDates, selectedDateString],
        };
      });
    } catch (error) {
      console.error("완료 상태 변경 실패", error);
    }
  };

  const handleDeleteRoutine = async (id: number) => {
    try {
      await RoutineStorage.deleteById(id);
      await loadRoutines();

      if (selectedRoutine?.id === id) {
        setSelectedRoutine(null);
        setShowDetailModal(false);
      }
    } catch (error) {
      console.error("일정 삭제 실패", error);
    }
  };

  const handlePressRoutine = (item: RoutineWithCompletedDates) => {
    setSelectedRoutine(item);
    setShowDetailModal(true);
  };

  const RenderItem = ({
    item,
    isTimed,
  }: {
    item: RoutineWithCompletedDates;
    isTimed: boolean;
  }) => {
    const typeLabel = item.categoryName ?? "기타";
    const typeStyle = getCategoryStyle(item);
    const isCompletedToday = isCompletedOnDate(item, selectedDateString);
    const parsedStartTime = parseTimeString(item.startTime);
    const parsedEndTime = parseTimeString(item.endTime);

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          handlePressRoutine(item);
        }}
      >
        <View style={styles.itemRow}>
          <View
            style={[
              styles.tagBadge,
              {
                backgroundColor: typeStyle.bg,
                borderColor: typeStyle.dot,
                marginRight: 14,
              },
            ]}
          >
            <Text style={[styles.tagText, { color: typeStyle.text }]}>
              {typeLabel}
            </Text>
          </View>

          <View style={styles.itemContent}>
            <Text
              style={[
                styles.itemTitle,
                isCompletedToday && styles.textCompleted,
              ]}
            >
              {item.title}
            </Text>

            {isTimed && parsedStartTime && (
              <>
                <Text style={styles.itemTime}>
                  {parsedEndTime
                    ? `${String(parsedStartTime.hour).padStart(2, "0")}:${String(parsedStartTime.minute).padStart(2, "0")} ~ ${String(parsedEndTime.hour).padStart(2, "0")}:${String(parsedEndTime.minute).padStart(2, "0")}`
                    : `${String(parsedStartTime.hour).padStart(2, "0")}:${String(parsedStartTime.minute).padStart(2, "0")}`}
                </Text>

                <Text style={styles.itemSubInfo}>{getDateRangeText(item)}</Text>
              </>
            )}

            <Text style={styles.itemSubInfo}>{getRepeatText(item)}</Text>
          </View>

          <TouchableOpacity
            style={[styles.checkbox, isCompletedToday && styles.checkboxActive]}
            onPress={() => toggleComplete(item.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {isCompletedToday && (
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const allRoutines = [...noTimeRoutines, ...timedRoutines];
  const totalCount = allRoutines.length;
  const completedCount = allRoutines.filter((item) =>
    isCompletedOnDate(item, selectedDateString),
  ).length;

  // 진행률 바 계산용
  const progressPercentage =
    totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.card}>
          <View style={styles.dateControlRow}>
            <View style={styles.dateInfoContainer}>
              <TouchableOpacity onPress={() => changeDate(-1)}>
                <Ionicons name="chevron-back" size={22} color="#A0B0D0" />
              </TouchableOpacity>

              <View style={styles.dateRow}>
                <Text style={styles.dayNum}>{day}</Text>
                <View>
                  <Text style={styles.monthYear}>
                    {month} {year}
                  </Text>
                  <Text style={styles.subInfo}>{dayOfWeek}</Text>
                </View>
              </View>

              <TouchableOpacity onPress={() => changeDate(1)}>
                <Ionicons name="chevron-forward" size={22} color="#A0B0D0" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.calendarBtn,
                showDatePicker && styles.calendarBtnActive,
              ]}
              onPress={() => setShowDatePicker(!showDatePicker)}
            >
              <Ionicons name="calendar-outline" size={18} color="#A0B0D0" />
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <View style={styles.pickerContainer}>
              <AppCalendar
                current={selectedDateString}
                markedDates={{
                  [selectedDateString]: {
                    selected: true,
                    selectedColor: "#F1F1FB",
                  },
                }}
                onDayPress={onDayPress}
              />
            </View>
          )}

          <View style={styles.progressArea}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progressPercentage}%` },
                ]}
              />
            </View>
            <Text style={styles.progressPercent}>
              {completedCount} / {totalCount}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>시간 없는 루틴</Text>
          {noTimeRoutines.length === 0 ? (
            <Text style={styles.emptyText}>시간 없는 일정이 없어요.</Text>
          ) : (
            noTimeRoutines.map((item) => (
              <RenderItem key={item.id} item={item} isTimed={false} />
            ))
          )}

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>시간 있는 루틴</Text>
          {timedRoutines.length === 0 ? (
            <Text style={styles.emptyText}>시간 있는 일정이 없어요.</Text>
          ) : (
            timedRoutines.map((item) => (
              <RenderItem key={item.id} item={item} isTimed={true} />
            ))
          )}
        </View>
      </ScrollView>

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
        onDelete={handleDeleteRoutine}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 32,
    padding: 24,
    marginBottom: 20,
  },
  dateControlRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  dateInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minWidth: 120,
  },
  dayNum: {
    fontSize: 44,
    fontWeight: "800",
    color: "#2A3C6B",
  },
  monthYear: {
    fontSize: 16,
    fontWeight: "600",
    color: "#A0B0D0",
  },
  subInfo: {
    fontSize: 13,
    color: "#B4B6C0",
  },
  calendarBtn: {
    padding: 8,
    backgroundColor: "#F3F4F8",
    borderRadius: 10,
  },
  calendarBtnActive: {
    backgroundColor: "#405886",
  },
  pickerContainer: {
    backgroundColor: "#F8F9FB",
    borderRadius: 20,
    marginBottom: 20,
    overflow: "hidden",
    paddingBottom: 10,
    marginHorizontal: -4,
  },
  progressArea: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 15,
    marginBottom: 10,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: "#EDEEF1",
    borderRadius: 3,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#405886",
    borderRadius: 3,
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: "600",
    color: "#A0B0D0",
  },
  sectionTitle: {
    fontSize: 13,
    color: "#B4B6C0",
    fontWeight: "600",
    marginTop: 15,
    marginBottom: 10,
  },
  swipeRowWrapper: {
    position: "relative",
    marginBottom: 0,
  },
  deleteBackground: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: 90,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E8837D",
    borderRadius: 14,
  },
  deleteBackgroundText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
  },
  swipeAnimatedCard: {
    backgroundColor: "#FFF",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#E2E5EC",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxActive: {
    backgroundColor: "#A0B0D0",
    borderColor: "#A0B0D0",
  },
  itemContent: {
    flex: 1,
    marginLeft: 14,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#444",
  },
  textCompleted: {
    color: "#B4B6C0",
    textDecorationLine: "line-through",
  },
  itemTime: {
    fontSize: 12,
    color: "#B4B6C0",
    marginTop: 2,
  },
  itemSubInfo: {
    fontSize: 12,
    color: "#A0B0D0",
    marginTop: 2,
  },
  tagBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F8",
    marginVertical: 10,
  },
  emptyText: {
    fontSize: 14,
    color: "#B4B6C0",
    paddingVertical: 8,
  },
});
