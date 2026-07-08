// app/todos.tsx
import { TodoDetailModal } from "@/components/todo_detail_modal";
import AppCalendar from "@/components/ui/app_calendar";
import { useTheme, type Theme } from "@/lib/constants/ThemeContext";
import { TodoService } from "@/services/todo_service";
import type { Todo } from "@/types/todo";
import { Ionicons } from "@expo/vector-icons";
import { isSameDay } from "date-fns";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { type DateData } from "react-native-calendars";

// "HH:mm" 문자열을 시간 숫자로 바꾸는 함수 (schedule_content.tsx와 동일)
function parseTimeString(time?: string | null) {
  if (!time) return null;

  const [hourString = "0", minuteString = "0"] = time.split(":");
  const hour = Number(hourString);
  const minute = Number(minuteString);

  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;

  return { hour, minute, totalMinutes: hour * 60 + minute };
}

function toDateString(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function toYear(date: Date) {
  return date.getFullYear();
}

function toMonth(date: Date) {
  return date.getMonth() + 1; // JS의 getMonth()는 0부터 시작하므로 +1
}

const weekDaysKo = [
  "일요일",
  "월요일",
  "화요일",
  "수요일",
  "목요일",
  "금요일",
  "토요일",
];

export default function TodosScreen() {
  const { theme, mode } = useTheme();
  const styles = makeStyles(theme);
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [monthlyTodos, setMonthlyTodos] = useState<Todo[]>([]);
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const selectedDateString = toDateString(selectedDate);
  const currentYear = toYear(selectedDate);
  const currentMonth = toMonth(selectedDate);
  const day = selectedDate.getDate();
  const dayOfWeek = weekDaysKo[selectedDate.getDay()];

  // 월별 Todo 불러오기
  const loadMonthlyTodos = useCallback(async () => {
    try {
      const list = await TodoService.getByMonth(currentYear, currentMonth);
      setMonthlyTodos(list);
    } catch (error: any) {
      if (error?.name === "NoTokenError") return;
      if (error?.response?.status === 401 || error?.response?.status === 403)
        return;
      console.error("월별 Todo 불러오기 실패", error);
      setMonthlyTodos([]);
    }
  }, [currentYear, currentMonth]);

  useFocusEffect(
    useCallback(() => {
      loadMonthlyTodos();
    }, [loadMonthlyTodos]),
  );

  // 캘린더에 Todo 있는 날짜 점 표시
  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};

    monthlyTodos.forEach((todo) => {
      marks[todo.todoDate] = {
        ...marks[todo.todoDate],
        marked: true,
        dotColor: theme.main,
      };
    });

    marks[selectedDateString] = {
      ...marks[selectedDateString],
      selected: true,
      selectedColor: mode === "dark" ? theme.borderStrong : "#F1F1FB",
    };

    return marks;
  }, [monthlyTodos, selectedDateString, theme, mode]);

  // 선택된 날짜의 Todo만 필터 + 시간순 정렬
  const todosForSelectedDate = useMemo(() => {
    const filtered = monthlyTodos.filter(
      (item) => item.todoDate === selectedDateString,
    );

    return filtered.sort((a, b) => {
      const aTime = parseTimeString(a.todoTime);
      const bTime = parseTimeString(b.todoTime);
      if (aTime && bTime) return aTime.totalMinutes - bTime.totalMinutes;
      if (aTime && !bTime) return -1;
      if (!aTime && bTime) return 1;
      return 0;
    });
  }, [monthlyTodos, selectedDateString]);

  const totalCount = todosForSelectedDate.length;
  const completedCount = todosForSelectedDate.filter(
    (item) => item.completed,
  ).length;
  const progressPercentage =
    totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const toggleTodoComplete = async (item: Todo) => {
    try {
      await TodoService.updateCompleted(item.id, {
        completed: !item.completed,
      });
      await loadMonthlyTodos();
    } catch (error) {
      console.error("Todo 완료 상태 변경 실패", error);
    }
  };

  const goToday = () => {
    setSelectedDate(new Date());
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* settings.tsx와 동일한 헤더 스타일 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Todo</Text>

        <View style={{ flex: 1 }} />

        <TouchableOpacity
          style={styles.addButton}
          activeOpacity={0.7}
          onPress={() =>
            router.push({
              pathname: "/modal",
              params: { type: "todo", date: selectedDateString },
            })
          }
        >
          <Ionicons name="add" size={24} color={theme.main} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 월간 캘린더 카드 */}

        <View style={styles.card}>
          <AppCalendar
            current={selectedDateString}
            markedDates={markedDates}
            onDayPress={(dayObj) =>
              setSelectedDate(new Date(dayObj.dateString + "T00:00:00"))
            }
            onMonthChange={(monthObj: DateData) => {
              setSelectedDate(new Date(monthObj.year, monthObj.month - 1, 1));
            }}
            style={styles.calendar}
          />

          <View style={styles.divider} />

          <View style={styles.dateControlRow}>
            <View style={styles.dayInfoRow}>
              <Text style={styles.dayNum}>{day}일</Text>
              <Text style={styles.subInfo}>{dayOfWeek}</Text>
            </View>

            {!isSameDay(selectedDate, new Date()) && (
              <TouchableOpacity style={styles.todayButton} onPress={goToday}>
                <Text style={styles.todayButtonText}>오늘</Text>
              </TouchableOpacity>
            )}
          </View>

          {totalCount > 0 && (
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
          )}

          {todosForSelectedDate.length === 0 ? (
            <Text style={styles.emptyText}>이 날 등록된 Todo가 없어요.</Text>
          ) : (
            todosForSelectedDate.map((item) => {
              const parsedTime = parseTimeString(item.todoTime);

              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.8}
                  onPress={() => {
                    setSelectedTodo(item);
                    setShowDetailModal(true);
                  }}
                >
                  <View style={styles.itemRow}>
                    <View style={styles.itemContent}>
                      <Text
                        style={[
                          styles.itemTitle,
                          item.completed && styles.textCompleted,
                        ]}
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
                      style={[
                        styles.checkbox,
                        item.completed && styles.checkboxActive,
                      ]}
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
            })
          )}
        </View>
      </ScrollView>

      <TodoDetailModal
        visible={showDetailModal}
        todo={selectedTodo}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedTodo(null);
        }}
        onUpdated={async () => {
          await loadMonthlyTodos();
        }}
      />
    </SafeAreaView>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.bg,
    },

    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 8,
    },
    backButton: {
      width: 32,
      height: 32,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 3,
    },
    backIcon: {
      fontSize: 34,
      color: theme.text,
      fontWeight: "500",
      marginTop: -5,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: "800",
      color: theme.text,
    },

    container: {
      flex: 1,
      paddingHorizontal: 16,
    },
    scrollContent: {
      paddingBottom: 20,
    },

    card: {
      backgroundColor: theme.card,
      borderRadius: 32,
      paddingHorizontal: 20,
      paddingBottom: 20,
      paddingTop: 20,
      marginBottom: 20,
    },
    dayInfoRow: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 8,
    },
    calendar: {
      borderRadius: 12,
    },

    divider: {
      height: 1,
      backgroundColor: theme.bg,
      marginVertical: 16,
    },
    dateControlRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    dayNum: {
      fontSize: 28,
      fontWeight: "800",
      color: theme.text,
    },
    subInfo: {
      fontSize: 13,
      color: theme.textFaint,
      marginTop: 2,
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
    progressArea: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 16,
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
    itemRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: theme.bg,
    },
    itemContent: {
      flex: 1,
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
    emptyText: {
      fontSize: 14,
      color: theme.textFaint,
      paddingVertical: 8,
    },
    addButton: {
      width: 32,
      height: 32,
      justifyContent: "center",
      alignItems: "center",
    },
  });
