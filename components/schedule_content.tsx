//schedule_content.tsx
import { ScheduleDetailModal } from "@/components/schedule_detail_modal";
import { TodoDetailModal } from "@/components/todo_detail_modal";
import { DEFAULT_CATEGORY_NAME, getCategoryStyle } from "@/lib/category";
import { useTheme, type Theme } from "@/lib/constants/ThemeContext";
import { normalizeRepeatDays, SettingsStorage } from "@/lib/storage";
import { RoutineService } from "@/services/routine_service";
import { TodoService } from "@/services/todo_service";
import { authStore } from "@/store/authStore";
import type {
  CalendarDay,
  RepeatWeekday,
  ScheduleRoutine,
} from "@/types/routine";
import type { Todo } from "@/types/todo";
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
  const [hideTodoInSchedule, setHideTodoInSchedule] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [noTimeRoutines, setNoTimeRoutines] = useState<ScheduleRoutine[]>([]);
  const [timedRoutines, setTimedRoutines] = useState<ScheduleRoutine[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [showTodoDetailModal, setShowTodoDetailModal] = useState(false);
  const [selectedRoutine, setSelectedRoutine] =
    useState<ScheduleRoutine | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const { theme, mode } = useTheme();
  const styles = makeStyles(theme);
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

  // 선택된 날짜의 Todo 불러오기
  const loadTodos = useCallback(async () => {
    if (!authStore.isLoggedIn) return;
    try {
      const list = await TodoService.getByDate(selectedDateString);

      // 시간 있는 Todo는 시간순, 시간 없는 Todo는 뒤에 붙도록 정렬
      const sorted = [...list].sort((a, b) => {
        const aTime = parseTimeString(a.todoTime);
        const bTime = parseTimeString(b.todoTime);
        if (aTime && bTime) return aTime.totalMinutes - bTime.totalMinutes;
        if (aTime && !bTime) return -1;
        if (!aTime && bTime) return 1;
        return 0;
      });

      setTodos(sorted);
    } catch (error) {
      if ((error as any)?.name === "NoTokenError") return;
      if (
        (error as any)?.response?.status === 401 ||
        (error as any)?.response?.status === 403
      )
        return;
      console.error("할 일 불러오기 실패", error);
      setTodos([]);
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
      loadTodos();
      SettingsStorage.getHideTodoInSchedule().then(setHideTodoInSchedule);
    }, [loadRoutines, loadTodos]),
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

  // Todo 완료 상태 토글
  const toggleTodoComplete = async (item: Todo) => {
    try {
      await TodoService.updateCompleted(item.id, {
        completed: !item.completed,
      });
      await loadTodos();
    } catch (error) {
      console.error("할 일 완료 상태 변경 실패", error);
    }
  };

  const handlePressRoutine = (item: ScheduleRoutine) => {
    setSelectedRoutine(item);
    setShowDetailModal(true);
  };
  const handlePressTodo = (item: Todo) => {
    setSelectedTodo(item);
    setShowTodoDetailModal(true);
  };
  const RenderItem = ({
    item,
    isTimed,
  }: {
    item: ScheduleRoutine;
    isTimed: boolean;
  }) => {
    const typeLabel = item.categoryName ?? DEFAULT_CATEGORY_NAME;
    const typeStyle = getCategoryStyle(item, mode === "dark");
    const isCompletedToday = isCompletedOnDate(item, selectedDateString);
    const parsedStartTime = parseTimeString(item.startTime);
    const parsedEndTime = parseTimeString(item.endTime);

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => handlePressRoutine(item)}
      >
        <View style={styles.itemRow}>
          <View
            style={{
              width: 80,
              marginRight: 10,
              flexShrink: 0,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <View
              style={[
                styles.tagBadge,
                {
                  backgroundColor: typeStyle.dot + "75",
                  borderColor: typeStyle.dot,
                  alignSelf: "stretch",
                },
              ]}
            >
              <Text
                style={[
                  styles.tagText,
                  { color: mode === "dark" ? typeStyle.dot : "#000000" },
                ]}
                numberOfLines={1}
              >
                {typeLabel}
              </Text>
            </View>
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

  // Todo 아이템 렌더링 (카테고리 뱃지 없이, 시간만 표시)
  const RenderTodoItem = ({ item }: { item: Todo }) => {
    const parsedTime = parseTimeString(item.todoTime);

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => handlePressTodo(item)}
      >
        <View style={styles.itemRow}>
          <View
            style={{
              width: 80,
              marginRight: 10,
              flexShrink: 0,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <View
              style={[
                styles.tagBadge,
                {
                  backgroundColor: theme.textMuted + "25",
                  borderColor: theme.textMuted,
                  alignSelf: "stretch",
                },
              ]}
            >
              <Text
                style={[styles.tagText, { color: theme.textMuted }]}
                numberOfLines={1}
              >
                할 일
              </Text>
            </View>
          </View>

          <View style={styles.itemContent}>
            <Text
              style={[styles.itemTitle, item.completed && styles.textCompleted]}
            >
              {item.content}
            </Text>
            {parsedTime && (
              <Text style={styles.itemTime}>
                {String(parsedTime.hour).padStart(2, "0")}:
                {String(parsedTime.minute).padStart(2, "0")}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.checkbox, item.completed && styles.checkboxActive]}
            onPress={() => toggleTodoComplete(item)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {item.completed && (
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // 진행률 계산에 Todo까지 포함 (숨김 설정 시 제외)
  const allRoutines = [...noTimeRoutines, ...timedRoutines];
  const totalCount =
    allRoutines.length + (hideTodoInSchedule ? 0 : todos.length);
  const completedCount =
    allRoutines.filter((item) => isCompletedOnDate(item, selectedDateString))
      .length +
    (hideTodoInSchedule ? 0 : todos.filter((item) => item.completed).length);
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
                  <Ionicons
                    name="chevron-back"
                    size={22}
                    color={theme.textMuted}
                  />
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
                  <Ionicons
                    name="chevron-forward"
                    size={22}
                    color={theme.textMuted}
                  />
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
                  <Ionicons
                    name="calendar-outline"
                    size={18}
                    color={theme.textMuted}
                  />
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
                      selectedColor:
                        mode === "dark" ? theme.borderStrong : "#F1F1FB",
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
            {!hideTodoInSchedule && (
              <>
                <Text style={styles.sectionTitle}>할 일</Text>
                {todos.length === 0 ? (
                  <Text style={styles.emptyText}>등록된 할 일이 없어요.</Text>
                ) : (
                  todos.map((item) => (
                    <RenderTodoItem key={`todo-${item.id}`} item={item} />
                  ))
                )}

                <View style={styles.divider} />
              </>
            )}

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
          await onRoutineUpdated?.();
        }}
      />
      <TodoDetailModal
        visible={showTodoDetailModal}
        todo={selectedTodo}
        onClose={() => {
          setShowTodoDetailModal(false);
          setSelectedTodo(null);
        }}
        onUpdated={async () => {
          await loadTodos();
        }}
      />
    </>
  );
}
const makeStyles = (theme: Theme) =>
  StyleSheet.create({
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
      backgroundColor: theme.card,
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
      color: theme.text,
    },
    monthYear: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.textMuted,
    },
    subInfo: {
      fontSize: 13,
      color: theme.textFaint,
    },
    calendarBtn: {
      padding: 8,
      backgroundColor: theme.bg,
      borderRadius: 10,
    },
    calendarBtnActive: {
      backgroundColor: theme.main,
    },
    pickerContainer: {
      backgroundColor: theme.cardAlt,
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
      backgroundColor: theme.divider,
      borderRadius: 3,
    },
    progressFill: {
      height: "100%",
      backgroundColor: theme.main,
      borderRadius: 3,
    },
    progressPercent: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.textMuted,
    },
    sectionTitle: {
      fontSize: 13,
      color: theme.textFaint,
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
      borderColor: theme.checkboxBorder,
      justifyContent: "center",
      alignItems: "center",
    },
    checkboxActive: {
      backgroundColor: theme.textMuted,
      borderColor: theme.textMuted,
    },
    itemContent: {
      flex: 1,
      marginLeft: 0,
    },
    itemTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.textBody,
    },
    textCompleted: {
      color: theme.textFaint,
      textDecorationLine: "line-through",
    },
    itemTime: {
      fontSize: 12,
      color: theme.textFaint,
      marginTop: 2,
    },
    itemSubInfo: {
      fontSize: 12,
      color: theme.textMuted,
      marginTop: 2,
    },
    tagBadge: {
      paddingHorizontal: 7,
      paddingVertical: 4,
      borderRadius: 8,
    },
    tagText: {
      fontSize: 12,
      fontWeight: "700",
      textAlign: "center",
    },
    divider: {
      height: 1,
      backgroundColor: theme.bg,
      marginVertical: 10,
    },
    emptyText: {
      fontSize: 14,
      color: theme.textFaint,
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
      backgroundColor: theme.bg,
    },

    todayButtonText: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.main,
    },
  });
