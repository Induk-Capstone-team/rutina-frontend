//schedule_content.tsx
import { ScheduleDetailModal } from "@/components/schedule_detail_modal";
import { DEFAULT_CATEGORY_NAME, getCategoryStyle } from "@/lib/category";
import { normalizeRepeatDays } from "@/lib/storage";
import { RoutineService } from "@/services/routine_service";
import { authStore } from "@/store/authStore";
import type {
  CalendarDay,
  RepeatWeekday,
  ScheduleRoutine,
} from "@/types/routine";
import { Ionicons } from "@expo/vector-icons";
import { isSameDay } from "date-fns";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AppCalendar from "./ui/app_calendar";

const weekdayLabelMap: Record<RepeatWeekday, string> = {
  SUN: "일",
  MON: "월",
  TUE: "화",
  WED: "수",
  THU: "목",
  FRI: "금",
  SAT: "토",
};

function getNotifyText(item: ScheduleRoutine) {
  return item.alarm ? "알림 있음" : "알림 없음";
}

function getRepeatText(item: ScheduleRoutine) {
  switch (item.repeatType) {
    case "DAILY":
      return "반복: 매일";
    case "CUSTOM": {
      const interval = item.repeatInterval ?? 1;
      const unit = item.repeatUnit ?? "DAY";
      if (unit === "WEEK") {
        const repeatDays = normalizeRepeatDays(item.repeatDays);
        const dayText = repeatDays
          .map((day) => weekdayLabelMap[day])
          .join(", ");
        const weekText = interval === 2 ? "격주" : "매주";
        return dayText ? `반복: ${weekText} ${dayText}` : `반복: ${weekText}`;
      }
      return `반복: ${interval}일마다`;
    }
    case "NONE":
    default:
      return "반복 없음";
  }
}

function getDateRangeText(item: ScheduleRoutine) {
  if (!item.endDate || item.endDate === "" || item.endDate === item.startDate) {
    // endDate가 없으면 무한 반복
    if (!item.endDate || item.endDate === "") {
      return `${item.startDate} ~ 무한 반복`;
    }
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

// 특정 날짜 완료 여부 확인
function isCompletedOnDate(item: ScheduleRoutine, targetDateString: string) {
  return item.completedDates?.includes(targetDateString) ?? false;
}

interface ScheduleContentProps {
  onToggleComplete?: (reload: () => Promise<void>) => void;
  onRoutineUpdated?: () => Promise<void>;
}

export default function ScheduleContent({
  onToggleComplete,
  onRoutineUpdated,
}: ScheduleContentProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [noTimeRoutines, setNoTimeRoutines] = useState<ScheduleRoutine[]>([]);
  const [timedRoutines, setTimedRoutines] = useState<ScheduleRoutine[]>([]);

  const [selectedRoutine, setSelectedRoutine] =
    useState<ScheduleRoutine | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const selectedDateString = [
    selectedDate.getFullYear(),
    String(selectedDate.getMonth() + 1).padStart(2, "0"),
    String(selectedDate.getDate()).padStart(2, "0"),
  ].join("-");
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
  const goToday = () => {
    setSelectedDate(new Date());
    setShowDatePicker(false);
  };
  const onDayPress = (day: CalendarDay) => {
    setSelectedDate(new Date(day.dateString + "T00:00:00")); // 로컬 시간 기준
    setShowDatePicker(false);
  };

  const loadRoutines = useCallback(async () => {
    if (!authStore.isLoggedIn) return;
    try {
      // date를 넘겨서 해당 날짜 루틴만 받아옴
      const allRoutines = await RoutineService.getAll(selectedDateString);

      const timed = allRoutines.filter(
        (item) => item.startTime !== undefined && item.startTime !== null,
      );
      const noTimed = allRoutines.filter(
        (item) => item.startTime === undefined || item.startTime === null,
      );

      timed.sort((a, b) => {
        const aTime = parseTimeString(a.startTime);
        const bTime = parseTimeString(b.startTime);
        return (aTime?.totalMinutes ?? 0) - (bTime?.totalMinutes ?? 0);
      });

      setTimedRoutines(timed);
      setNoTimeRoutines(noTimed);
    } catch (error) {
      if ((error as any)?.name === "NoTokenError") return;
      if (
        (error as any)?.response?.status === 401 ||
        (error as any)?.response?.status === 403
      )
        return;
      console.error("루틴 불러오기 실패", error);
      setTimedRoutines([]);
      setNoTimeRoutines([]);
    }
  }, [selectedDateString]);
  // 날짜가 바뀔 때마다 루틴 새로 불러오기
  useEffect(() => {
    onToggleComplete?.(loadRoutines);
  }, [loadRoutines, onToggleComplete]);

  // 다른 화면 갔다 돌아올 때 최신 데이터 불러오기
  useFocusEffect(
    useCallback(() => {
      loadRoutines();
    }, [loadRoutines]),
  );
  const toggleComplete = async (id: number) => {
    try {
      await RoutineService.toggleComplete(id, selectedDateString);
      await loadRoutines();
      await onRoutineUpdated?.();
    } catch (error) {
      console.error("완료 상태 변경 실패", error);
    }
  };

  const handlePressRoutine = (item: ScheduleRoutine) => {
    setSelectedRoutine(item);
    setShowDetailModal(true);
  };

  const RenderItem = ({
    item,
    isTimed,
  }: {
    item: ScheduleRoutine;
    isTimed: boolean;
  }) => {
    const typeLabel = item.categoryName ?? DEFAULT_CATEGORY_NAME;
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
              <Text style={styles.itemTime}>
                {parsedEndTime
                  ? `${String(parsedStartTime.hour).padStart(2, "0")}:${String(parsedStartTime.minute).padStart(2, "0")} ~ ${String(parsedEndTime.hour).padStart(2, "0")}:${String(parsedEndTime.minute).padStart(2, "0")}`
                  : `${String(parsedStartTime.hour).padStart(2, "0")}:${String(parsedStartTime.minute).padStart(2, "0")}`}
              </Text>
            )}

            <Text style={styles.itemSubInfo}>{getDateRangeText(item)}</Text>
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
    <>
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

              <View style={styles.headerActionRow}>
                {!isSameDay(selectedDate, new Date()) && (
                  <TouchableOpacity
                    style={styles.todayButton}
                    onPress={goToday}
                  >
                    <Text style={styles.todayButtonText}>오늘</Text>
                  </TouchableOpacity>
                )}

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
              <Text style={styles.emptyText}>시간 없는 루틴이 없어요.</Text>
            ) : (
              noTimeRoutines.map((item) => (
                <RenderItem key={item.id} item={item} isTimed={false} />
              ))
            )}

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>시간 있는 루틴</Text>
            {timedRoutines.length === 0 ? (
              <Text style={styles.emptyText}>시간 있는 루틴이 없어요.</Text>
            ) : (
              timedRoutines.map((item) => (
                <RenderItem key={item.id} item={item} isTimed={true} />
              ))
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
    </>
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
  headerActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  todayButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#F3F4F8",
  },

  todayButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#405886",
  },
});
