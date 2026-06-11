import ScheduleContent from "@/components/schedule_content";
import { Header } from "@/components/ui/_header";
import AppCalendar from "@/components/ui/app_calendar";
import { useTheme, type Theme } from "@/lib/constants/ThemeContext";
import { RoutineService } from "@/services/routine_service";
import { authStore } from "@/store/authStore";
import type { MarkedDates } from "@/types/calendar";
import type { ScheduleRoutine } from "@/types/routine";
import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { ko } from "date-fns/locale";
import { useFocusEffect } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  PanResponder,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import "react-native-gesture-handler";

const SCREEN_WIDTH = Dimensions.get("window").width;

type TimetableEvent = {
  id: string;
  title: string;
  startMinute: number;
  endMinute: number;
  type: string;
  color?: string;
};

function addAlphaToHex(hexColor: string, alpha = "22") {
  if (!hexColor.startsWith("#")) return "#F1F1FB";
  if (hexColor.length === 7) return `${hexColor}${alpha}`;
  return hexColor;
}

function parseTimeToMinutes(time?: string | null) {
  if (!time) return null;
  const parts = time.split(":");
  const hour = Number(parts[0]);
  const minute = Number(parts[1]);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return hour * 60 + minute;
}

function buildTimetableEvents(routines: ScheduleRoutine[]): TimetableEvent[] {
  const events: TimetableEvent[] = [];

  const timetableStartMinute = 4 * 60; // 04:00
  const timetableEndMinute = 28 * 60; // 다음날 04:00

  routines.forEach((routine) => {
    if (!routine.startTime || !routine.endTime) return;

    const parsedStartMinute = parseTimeToMinutes(routine.startTime);
    let parsedEndMinute = parseTimeToMinutes(routine.endTime);

    if (parsedStartMinute === null || parsedEndMinute === null) return;

    let startMinute = parsedStartMinute;
    let endMinute = parsedEndMinute;

    // 23:00 ~ 04:00처럼 자정을 넘기는 루틴 처리
    if (endMinute <= startMinute) {
      endMinute += 1440;
    }

    // 타임테이블 범위 밖이면 표시하지 않음
    if (
      endMinute <= timetableStartMinute ||
      startMinute >= timetableEndMinute
    ) {
      return;
    }

    // 04:00 이전에 시작한 루틴은 04:00부터 보이도록 자름
    const visibleStartMinute = Math.max(startMinute, timetableStartMinute);
    const visibleEndMinute = Math.min(endMinute, timetableEndMinute);

    if (visibleEndMinute <= visibleStartMinute) return;

    events.push({
      id: String(routine.id),
      title: routine.title,
      startMinute: visibleStartMinute,
      endMinute: visibleEndMinute,
      type: routine.categoryName || routine.title,
      color: routine.color,
    });
  });

  return events.sort((a, b) => a.startMinute - b.startMinute);
}

export default function HomeScreen() {
  const { theme, mode } = useTheme();
  const styles = makeStyles(theme);
  const getEventStyle = useCallback(
    (type: string, color?: string) => {
      const fallbackColor = color || "#9FA2D6";
      const alpha = mode === "dark" ? "40" : "55";
      return {
        bg: addAlphaToHex(fallbackColor, alpha),
        dot: fallbackColor,
        text: fallbackColor,
      };
    },
    [mode],
  );
  // 현재 선택된 날짜
  const [currentDate, setCurrentDate] = useState(new Date());
  // 월간 캘린더 표시 여부
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);
  // 가로 스와이프 페이지 상태: left는 타임테이블, right는 일정 화면
  const [activePage, setActivePage] = useState<"left" | "right">("left");
  // 현재 시간 표시용 상태
  const [currentTime, setCurrentTime] = useState(new Date());
  // 저장소에서 불러온 전체 루틴
  const [storedRoutines, setStoredRoutines] = useState<ScheduleRoutine[]>([]);
  const scheduleReloadRef = useRef<(() => Promise<void>) | null>(null);

  const startHour = 4;
  const endHour = 28;
  const hourHeight = 60;
  const hours = Array.from(
    { length: endHour - startHour },
    (_, i) => startHour + i,
  );
  const columns = [0, 1, 2, 3, 4, 5];
  const timetableScrollRef = useRef<ScrollView>(null);

  const currentDateString = format(currentDate, "yyyy-MM-dd");
  const startOfCurrentWeek = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }).map((_, i) =>
    addDays(startOfCurrentWeek, i),
  );

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dy) > 10 &&
        Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 40) setIsCalendarVisible(true);
        else if (gestureState.dy < -40) setIsCalendarVisible(false);
      },
    }),
  ).current;

  const loadStoredRoutines = useCallback(async () => {
    if (!authStore.isLoggedIn) return;
    try {
      const routines = await RoutineService.getAll(currentDateString);
      setStoredRoutines(routines);
    } catch (error: any) {
      if (error?.name === "NoTokenError") return;
      if (error?.response?.status === 401 || error?.response?.status === 403)
        return;
      console.error("루틴 불러오기 실패", error);
      setStoredRoutines([]);
    }
  }, [currentDateString]);

  useFocusEffect(
    useCallback(() => {
      loadStoredRoutines();
    }, [loadStoredRoutines]),
  );

  useEffect(() => {
    const currentHour = new Date().getHours();
    const adjustedHour =
      currentHour < startHour ? currentHour + 24 : currentHour;
    const yOffset = Math.max(0, (adjustedHour - startHour - 1) * hourHeight);
    const timeout = setTimeout(() => {
      timetableScrollRef.current?.scrollTo({ y: yOffset, animated: true });
    }, 100);

    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []); //  마운트 시 1번만 실행
  const handleHorizontalScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const pageWidth = SCREEN_WIDTH - 32;
    const offsetX = event.nativeEvent.contentOffset.x;
    const currentPage = Math.round(offsetX / pageWidth);
    setActivePage(currentPage === 0 ? "left" : "right");
  };

  const timetableEvents = useMemo(
    () => buildTimetableEvents(storedRoutines),
    [storedRoutines],
  );

  const calendarMarkedDates = useMemo(() => {
    const marked: MarkedDates = {
      [currentDateString]: {
        selected: true,
        selectedColor: mode === "dark" ? theme.borderStrong : "#F1F1FB",
      },
    };
    return marked;
  }, [currentDateString]);

  const legendItems = useMemo(() => {
    const uniqueMap = new Map<string, { label: string; dot: string }>();
    timetableEvents.forEach((event) => {
      const style = getEventStyle(event.type, event.color);
      if (!uniqueMap.has(event.type)) {
        uniqueMap.set(event.type, { label: event.type, dot: style.dot });
      }
    });
    return Array.from(uniqueMap.values());
  }, [timetableEvents]);

  const handleEventPress = useCallback(
    async (event: TimetableEvent) => {
      const routine = storedRoutines.find((r) => String(r.id) === event.id);
      const isCompleted =
        routine?.completedDates?.includes(currentDateString) ?? false;

      Alert.alert(
        isCompleted ? "완료 취소" : "루틴 완료",
        isCompleted
          ? `'${event.title}' 루틴의 완료를 취소할까요?`
          : `'${event.title}' 루틴을 완료 처리할까요?`,
        [
          { text: "취소", style: "cancel" },
          {
            text: isCompleted ? "취소하기" : "완료",
            style: isCompleted ? "destructive" : "default",
            onPress: async () => {
              try {
                await RoutineService.toggleComplete(
                  Number(event.id),
                  currentDateString,
                );
                await loadStoredRoutines();
                await scheduleReloadRef.current?.();
              } catch (error) {
                console.error("루틴 완료 처리 실패", error);
                Alert.alert("오류", "처리에 실패했습니다.");
              }
            },
          },
        ],
      );
    },
    [currentDateString, loadStoredRoutines, storedRoutines],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Header activeTab={activePage} />
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleHorizontalScrollEnd}
          scrollEventThrottle={16}
          contentContainerStyle={styles.horizontalContent}
        >
          {/* 타임테이블 */}
          <View style={styles.page}>
            <View style={styles.mainCard}>
              {/* 상단 패널: 주간 날짜 + 핸들 + 월간 캘린더 */}
              <View style={styles.topPanel} {...panResponder.panHandlers}>
                {/* 주간 날짜 선택 */}
                <View style={styles.daySelector}>
                  {weekDays.map((date) => {
                    const isSelected = isSameDay(date, currentDate);
                    const dayStr = format(date, "E", { locale: ko });
                    const dayNum = format(date, "d");
                    return (
                      <TouchableOpacity
                        key={date.toISOString()}
                        onPress={() => setCurrentDate(date)}
                        style={styles.dayButtonContainer}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            isSelected && styles.dayTextSelected,
                          ]}
                        >
                          {dayStr}
                        </Text>
                        <View
                          style={[
                            styles.dateCircle,
                            isSelected && styles.dateCircleSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.dateText,
                              isSelected && styles.dateTextSelected,
                            ]}
                          >
                            {dayNum}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* 스와이프 핸들 + 오늘 버튼 */}
                <View style={styles.handleRow}>
                  <TouchableOpacity
                    style={styles.swipeHandleContainer}
                    activeOpacity={0.7}
                    onPress={() => setIsCalendarVisible(!isCalendarVisible)}
                  >
                    <View style={styles.swipeHandle} />
                  </TouchableOpacity>
                  {!isSameDay(currentDate, new Date()) && (
                    <TouchableOpacity
                      style={styles.todayButton}
                      onPress={() => {
                        setCurrentDate(new Date());
                        setIsCalendarVisible(false);
                      }}
                    >
                      <Text style={styles.todayButtonText}>오늘</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* 월간 캘린더 */}
                {isCalendarVisible && (
                  <View style={styles.calendarWrapper}>
                    <AppCalendar
                      current={currentDateString}
                      markedDates={calendarMarkedDates}
                      onDayPress={(day) => {
                        setCurrentDate(new Date(day.timestamp));
                        // setIsCalendarVisible(false);
                      }}
                    />
                  </View>
                )}
              </View>
              {/* ── topPanel 끝 ── */}

              {/* 시간표 스크롤 영역 */}
              <ScrollView
                ref={timetableScrollRef}
                style={styles.timetableContainer}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.timetableInner}>
                  {/* 시간 축 */}
                  <View style={styles.timeAxis}>
                    {hours.map((hour) => {
                      const displayHour = hour % 24;
                      const adjustedCurrentHour =
                        currentTime.getHours() < startHour
                          ? currentTime.getHours() + 24
                          : currentTime.getHours();
                      const isCurrentHour =
                        isSameDay(currentDate, new Date()) &&
                        hour === adjustedCurrentHour;
                      const label = isCurrentHour
                        ? `${String(currentTime.getHours()).padStart(2, "0")}:${String(currentTime.getMinutes()).padStart(2, "0")}`
                        : String(displayHour);
                      return (
                        <View
                          key={hour}
                          style={[
                            styles.timeLabelContainer,
                            { height: hourHeight },
                          ]}
                        >
                          <Text
                            style={[
                              styles.timeLabel,
                              isCurrentHour && styles.timeLabelCurrent,
                            ]}
                          >
                            {label}
                          </Text>
                        </View>
                      );
                    })}
                  </View>

                  {/* 그리드 영역 */}
                  <View style={styles.gridArea}>
                    {/* hour 행 */}
                    {hours.map((hour) => (
                      <View
                        key={hour}
                        style={[styles.hourRow, { height: hourHeight }]}
                      >
                        {columns.map((col) => (
                          <View
                            key={col}
                            style={[
                              styles.gridColumn,
                              col === 0 ? { borderLeftWidth: 0 } : null,
                            ]}
                          />
                        ))}

                        {/* 이벤트 블록 */}
                        {timetableEvents.map((event) => {
                          const hourStart = hour * 60;
                          const hourEnd = hourStart + 60;
                          if (
                            event.startMinute >= hourEnd ||
                            event.endMinute <= hourStart
                          )
                            return null;

                          const overlapStart = Math.max(
                            event.startMinute,
                            hourStart,
                          );
                          const overlapEnd = Math.min(event.endMinute, hourEnd);
                          const leftPercent =
                            ((overlapStart - hourStart) / 60) * 100;
                          const widthPercent =
                            ((overlapEnd - overlapStart) / 60) * 100;
                          const typeStyles = getEventStyle(
                            event.type,
                            event.color,
                          );
                          const isStartOfEvent =
                            overlapStart === event.startMinute;

                          return (
                            <TouchableOpacity
                              key={`${event.id}-${hour}`}
                              activeOpacity={0.75}
                              onPress={() => handleEventPress(event)}
                              style={[
                                styles.eventBlock,
                                {
                                  left: `${leftPercent}%`,
                                  width: `${widthPercent}%`,
                                  backgroundColor: typeStyles.bg,
                                },
                              ]}
                            >
                              {isStartOfEvent && (
                                <Text
                                  style={[
                                    styles.eventTitle,
                                    { color: theme.textStrong },
                                  ]}
                                  numberOfLines={1}
                                >
                                  {event.title}
                                </Text>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ))}

                    {/* 현재 시간 인디케이터 — gridArea 기준 절대 위치 */}
                    {/* 현재 시간 인디케이터 */}
                    {isSameDay(currentDate, new Date()) &&
                      (() => {
                        const currentHour = currentTime.getHours();
                        const adjustedHour =
                          currentHour < startHour
                            ? currentHour + 24
                            : currentHour;
                        const currentMinute = currentTime.getMinutes();
                        const leftPercent = (currentMinute / 60) * 100;

                        return (
                          <View
                            pointerEvents="none"
                            style={[
                              styles.currentTimeIndicator,
                              {
                                left: `${leftPercent}%`,
                                top: (adjustedHour - startHour) * hourHeight,
                                height: hourHeight,
                              },
                            ]}
                          />
                        );
                      })()}
                  </View>
                  {/* ── gridArea 끝 ── */}
                </View>
              </ScrollView>
              {/* ── 시간표 ScrollView 끝 ── */}

              {/* 범례 */}
              <View style={styles.legendContainer}>
                {legendItems.map((item) => (
                  <View key={item.label} style={styles.legendItem}>
                    <View
                      style={[styles.legendDot, { backgroundColor: item.dot }]}
                    />
                    <Text style={styles.legendText}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
          {/* ── 타임테이블 페이지 끝 ── */}

          {/* ── 일정 페이지 ── */}
          <View style={styles.page}>
            <ScheduleContent
              onToggleComplete={(reload) => {
                scheduleReloadRef.current = reload;
              }}
              onRoutineUpdated={loadStoredRoutines}
            />
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.bg },
    container: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 10,
      backgroundColor: theme.bg,
    },
    horizontalContent: { flexGrow: 1 },
    page: { width: SCREEN_WIDTH - 32, flex: 1 },
    mainCard: {
      flex: 1,
      backgroundColor: theme.card,
      borderRadius: 30,
      paddingBottom: 24,
      marginBottom: 20,
    },
    topPanel: {
      backgroundColor: theme.card,
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      zIndex: 5,
    },
    todayButton: {
      position: "absolute",
      top: 10,
      right: 20,
      backgroundColor: theme.bg,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 14,
      zIndex: 20,
    },
    todayButtonText: { fontSize: 12, color: theme.main, fontWeight: "700" },
    daySelector: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: 12,
      paddingTop: 20,
      paddingBottom: 1,
    },
    dayButtonContainer: {
      alignItems: "center",
      justifyContent: "center",
      width: 42,
      paddingVertical: 8,
      borderRadius: 16,
    },
    dateCircleSelected: { backgroundColor: theme.textMuted },
    dayText: {
      fontSize: 13,
      color: theme.textMuted,
      fontWeight: "600",
      marginBottom: 4,
    },
    dateText: { fontSize: 16, color: theme.main, fontWeight: "700" },
    dayTextSelected: { color: theme.main },
    dateTextSelected: { color: theme.card },
    dateCircle: {
      width: 30,
      height: 30,
      borderRadius: 15,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 6,
    },
    handleRow: {
      position: "relative",
      justifyContent: "center",
      alignItems: "center",
      paddingTop: 6,
      paddingBottom: 14,
    },
    swipeHandleContainer: { padding: 10 },
    swipeHandle: {
      width: 40,
      height: 4,
      backgroundColor: theme.handle,
      borderRadius: 2,
    },
    calendarWrapper: {
      backgroundColor: theme.cardAlt,
      borderRadius: 20,
      marginBottom: 20,
      overflow: "hidden",
      paddingBottom: 10,
      marginHorizontal: 16,
    },
    timetableContainer: { paddingTop: 15, flex: 1 },
    timetableInner: { flexDirection: "row", paddingHorizontal: 10 },
    timeAxis: { width: 52, paddingRight: 4 },
    timeLabelContainer: {
      justifyContent: "flex-start",
      alignItems: "center",
    },
    timeLabel: {
      fontSize: 14,
      color: theme.textMuted,
      transform: [{ translateY: -7 }],
    },
    timeLabelCurrent: {
      color: theme.currentTime,
      fontWeight: "700",
      fontSize: 11,
    },
    gridArea: {
      flex: 1,
      borderLeftWidth: 1,
      borderTopWidth: 1,
      borderRightWidth: 1,
      borderColor: theme.divider,
      position: "relative",
      overflow: "visible",
    },
    hourRow: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderColor: theme.divider,
      position: "relative",
    },
    gridColumn: {
      flex: 1,
      borderLeftWidth: 1,
      borderColor: theme.divider + "80",
    },
    eventBlock: {
      position: "absolute",
      top: 6,
      bottom: 6,
      borderRadius: 12,
      justifyContent: "center",
      paddingHorizontal: 10,
    },
    eventTitle: { fontSize: 13, fontWeight: "600" },
    currentTimeIndicator: {
      position: "absolute",
      width: 2,
      backgroundColor: theme.currentTime,
      zIndex: 10,
      borderRadius: 1,
    },

    legendContainer: {
      flexDirection: "row",
      justifyContent: "center",
      flexWrap: "wrap",
      gap: 16,
      marginTop: 20,
      paddingHorizontal: 20,
    },
    legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { fontSize: 13, color: theme.textSecondary, fontWeight: "500" },
  });
