import ScheduleContent from "@/components/schedule_content";
import { Header } from "@/components/ui/_header";
import AppCalendar from "@/components/ui/app_calendar";
import { RoutineStorage } from "@/lib/storage";
import type { MarkedDates } from "@/types/calendar";
import type { ScheduleRoutine } from "@/types/routine";
import {
  addDays,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  differenceInCalendarWeeks,
  differenceInCalendarYears,
  format,
  isSameDay,
  startOfWeek,
} from "date-fns";
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

const eventTypes = {
  기상: { bg: "#FAEEEE", dot: "#E79A95", text: "#5D4645" },
  운동: { bg: "#FDF4EC", dot: "#EFB996", text: "#675141" },
  공부: { bg: "#F1F1FB", dot: "#9FA2D6", text: "#3E426F" },
  명상: { bg: "#F1F7EE", dot: "#A8CD9B", text: "#4C5D44" },
  저녁: { bg: "#FEF9EE", dot: "#E6CF8A", text: "#685A3F" },
};

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
  // 사용자 지정 색상을 부드러운 배경색으로 바꾸기
  if (!hexColor.startsWith("#")) return "#F1F1FB";
  if (hexColor.length === 7) return `${hexColor}${alpha}`;
  return hexColor;
}

function parseTimeToMinutes(time?: string | null) {
  // "09:30", "09:30:00" 둘 다 대응
  if (!time) return null;

  const parts = time.split(":");
  const hour = Number(parts[0]);
  const minute = Number(parts[1]);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return null;
  }

  return hour * 60 + minute;
}

function isDateInRange(targetDate: string, startDate: string, endDate: string) {
  // yyyy-MM-dd 형식 문자열 비교로 날짜 범위 확인
  return targetDate >= startDate && targetDate <= endDate;
}

function isRoutineVisibleOnDate(
  routine: ScheduleRoutine,
  targetDateString: string,
) {
  // 시작일~종료일 범위 안인지 먼저 확인
  if (!isDateInRange(targetDateString, routine.startDate, routine.endDate)) {
    return false;
  }

  // 반복 설정이 없으면 범위 안에서만 표시
  if (!routine.repeatOption || routine.repeatOption === "NONE") {
    return true;
  }

  // DAILY는 범위 안 모든 날짜 표시
  if (routine.repeatOption === "DAILY") {
    return true;
  }

  // CUSTOM 반복 계산
  if (routine.repeatOption === "CUSTOM") {
    const every = routine.customRepeatEvery ?? 1;

    const startDate = new Date(routine.startDate);
    const targetDate = new Date(targetDateString);

    if (routine.customRepeatUnit === "DAY") {
      return differenceInCalendarDays(targetDate, startDate) % every === 0;
    }

    if (routine.customRepeatUnit === "WEEK") {
      return differenceInCalendarWeeks(targetDate, startDate) % every === 0;
    }

    if (routine.customRepeatUnit === "MONTH") {
      return differenceInCalendarMonths(targetDate, startDate) % every === 0;
    }

    if (routine.customRepeatUnit === "YEAR") {
      return differenceInCalendarYears(targetDate, startDate) % every === 0;
    }
  }

  return true;
}

function buildTimetableEvents(
  routines: ScheduleRoutine[],
  targetDateString: string,
): TimetableEvent[] {
  const events: TimetableEvent[] = [];

  routines.forEach((routine) => {
    // 현재 선택 날짜에 보여야 하는 일정만 통과
    if (!isRoutineVisibleOnDate(routine, targetDateString)) {
      return;
    }

    // 시간표에는 시작/종료 시간이 있는 일정만 표시
    if (!routine.startTime || !routine.endTime) {
      return;
    }

    const startMinute = parseTimeToMinutes(routine.startTime);
    const endMinute = parseTimeToMinutes(routine.endTime);

    if (startMinute === null || endMinute === null) {
      return;
    }

    // 종료 시간이 시작 시간보다 늦은 정상 일정만 추가
    if (endMinute <= startMinute) {
      return;
    }

    events.push({
      id: String(routine.id),
      title: routine.title,
      startMinute,
      endMinute,
      type: routine.categoryName || routine.title,
      color: routine.color,
    });
  });

  return events.sort((a, b) => a.startMinute - b.startMinute);
}

function getEventStyle(type: string, color?: string) {
  const fixedStyle = eventTypes[type as keyof typeof eventTypes];

  if (fixedStyle) {
    return fixedStyle;
  }

  const fallbackColor = color || "#9FA2D6";

  return {
    bg: addAlphaToHex(fallbackColor),
    dot: fallbackColor,
    text: fallbackColor,
  };
}

export default function HomeScreen() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);
  const [activePage, setActivePage] = useState<"left" | "right">("left");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [storedRoutines, setStoredRoutines] = useState<ScheduleRoutine[]>([]);

  const startHour = 0;
  const endHour = 24;
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
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 10;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 40) {
          setIsCalendarVisible(true);
        } else if (gestureState.dy < -40) {
          setIsCalendarVisible(false);
        }
      },
    }),
  ).current;

  const loadStoredRoutines = useCallback(async () => {
    try {
      // storage.ts에 저장된 전체 일정 불러오기
      const routines = await RoutineStorage.getAll();
      setStoredRoutines(routines);
    } catch (error) {
      console.error("저장된 일정 불러오기 실패", error);
      setStoredRoutines([]);
    }
  }, []);

  useEffect(() => {
    loadStoredRoutines();
  }, [loadStoredRoutines]);

  useFocusEffect(
    useCallback(() => {
      // 일정 추가/수정 후 돌아오면 다시 불러오기
      loadStoredRoutines();
    }, [loadStoredRoutines]),
  );

  useEffect(() => {
    const currentHour = currentTime.getHours();
    const yOffset = Math.max(0, (currentHour - startHour - 1) * hourHeight);

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
  }, [currentTime, startHour, hourHeight]);

  const handleHorizontalScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const pageWidth = SCREEN_WIDTH - 32;
    const offsetX = event.nativeEvent.contentOffset.x;
    const currentPage = Math.round(offsetX / pageWidth);

    setActivePage(currentPage === 0 ? "left" : "right");
  };

  const timetableEvents = useMemo(() => {
    // 현재 선택 날짜 기준으로 시간표에 보여줄 일정만 생성
    return buildTimetableEvents(storedRoutines, currentDateString);
  }, [storedRoutines, currentDateString]);

  const calendarMarkedDates = useMemo(() => {
    const marked: MarkedDates = {
      [currentDateString]: {
        selected: true,
        selectedColor: "#F1F1FB",
      },
    };

    weekDays.forEach((date) => {
      const dateString = format(date, "yyyy-MM-dd");
      const hasRoutine = storedRoutines.some((routine) =>
        isRoutineVisibleOnDate(routine, dateString),
      );

      if (hasRoutine) {
        marked[dateString] = {
          ...(marked[dateString] || {}),
          selected:
            marked[dateString]?.selected ?? dateString === currentDateString,
          selectedColor:
            marked[dateString]?.selectedColor ??
            (dateString === currentDateString ? "#F1F1FB" : undefined),
        };
      }
    });

    return marked;
  }, [currentDateString, storedRoutines, weekDays]);

  const legendItems = useMemo(() => {
    const uniqueMap = new Map<string, { label: string; dot: string }>();

    timetableEvents.forEach((event) => {
      const style = getEventStyle(event.type, event.color);
      if (!uniqueMap.has(event.type)) {
        uniqueMap.set(event.type, {
          label: event.type,
          dot: style.dot,
        });
      }
    });

    if (uniqueMap.size === 0) {
      Object.keys(eventTypes).forEach((key) => {
        uniqueMap.set(key, {
          label: key,
          dot: eventTypes[key as keyof typeof eventTypes].dot,
        });
      });
    }

    return Array.from(uniqueMap.values());
  }, [timetableEvents]);

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
              <View style={styles.topPanel} {...panResponder.panHandlers}>
                <View style={styles.daySelector}>
                  {weekDays.map((date) => {
                    const isSelected = isSameDay(date, currentDate);
                    const isSunday = date.getDay() === 0;
                    const isSaturday = date.getDay() === 6;

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

                {isCalendarVisible && (
                  <View style={styles.calendarWrapper}>
                    <AppCalendar
                      current={currentDateString}
                      markedDates={calendarMarkedDates}
                      onDayPress={(day) => {
                        setCurrentDate(new Date(day.timestamp));
                        setIsCalendarVisible(false);
                      }}
                    />
                  </View>
                )}
              </View>

              <ScrollView
                ref={timetableScrollRef}
                style={styles.timetableContainer}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.timetableInner}>
                  {/* 왼쪽 시간 축 */}
                  <View style={styles.timeAxis}>
                    {hours.map((hour) => (
                      <View
                        key={hour}
                        style={[
                          styles.timeLabelContainer,
                          { height: hourHeight },
                        ]}
                      >
                        <Text style={styles.timeLabel}>{hour}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.gridArea}>
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

                        {timetableEvents.map((event) => {
                          const hourStart = hour * 60;
                          const hourEnd = hourStart + 60;

                          // 현재 hour 줄에 걸치는 일정만 표시
                          if (
                            event.startMinute >= hourEnd ||
                            event.endMinute <= hourStart
                          ) {
                            return null;
                          }

                          const overlapStart = Math.max(
                            event.startMinute,
                            hourStart,
                          );
                          const overlapEnd = Math.min(event.endMinute, hourEnd);

                          const startOffsetMin = overlapStart - hourStart;
                          const durationInHour = overlapEnd - overlapStart;

                          const leftPercent = (startOffsetMin / 60) * 100;
                          const widthPercent = (durationInHour / 60) * 100;

                          const typeStyles = getEventStyle(
                            event.type,
                            event.color,
                          );
                          const isStartOfEvent =
                            overlapStart === event.startMinute;

                          return (
                            <View
                              key={`${event.id}-${hour}`}
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
                                    { color: typeStyles.text },
                                  ]}
                                  numberOfLines={1}
                                >
                                  {event.title}
                                </Text>
                              )}
                            </View>
                          );
                        })}

                        {isSameDay(currentDate, new Date()) &&
                          hour === currentTime.getHours() && (
                            <View
                              style={[
                                styles.currentTimeIndicator,
                                {
                                  left: `${(currentTime.getMinutes() / 60) * 100}%`,
                                },
                              ]}
                            />
                          )}
                      </View>
                    ))}
                  </View>
                </View>
              </ScrollView>

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

          {/* 일정 */}
          <View style={styles.page}>
            <ScheduleContent />
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
    backgroundColor: "#F3F5FA",
  },
  horizontalContent: {
    flexGrow: 1,
  },
  page: {
    width: SCREEN_WIDTH - 32,
    flex: 1,
  },
  mainCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    paddingBottom: 24,
  },
  topPanel: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    zIndex: 5,
  },
  todayButton: {
    position: "absolute",
    top: 10,
    right: 20,
    backgroundColor: "#F3F4F8",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    zIndex: 20,
  },
  todayButtonText: {
    fontSize: 12,
    color: "#2A3C6B",
    fontWeight: "700",
  },
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
  dateCircleSelected: {
    backgroundColor: "#A0B0D0",
  },
  dayButtonContainerSelected: {
    backgroundColor: "#EEF2FF",
  },
  dayText: {
    fontSize: 13,
    color: "#A0A7B4",
    fontWeight: "600",
    marginBottom: 4,
  },
  dateText: {
    fontSize: 16,
    color: "#405886",
    fontWeight: "700",
  },
  dayTextSelected: {
    color: "#405886",
  },
  dateTextSelected: {
    color: "#FFFFFF",
  },
  dateCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },

  activeDayIndicator: {
    width: 16,
    height: 2,
    backgroundColor: "#405886",
    borderRadius: 999,
  },
  handleRow: {
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 6,
    paddingBottom: 14,
  },
  swipeHandleContainer: {
    padding: 10,
  },
  swipeHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#E2E5EC",
    borderRadius: 2,
  },
  calendarWrapper: {
    backgroundColor: "#F8F9FB",
    borderRadius: 20,
    marginBottom: 20,
    overflow: "hidden",
    paddingBottom: 10,
    marginHorizontal: 16,
  },
  timetableContainer: {
    paddingTop: 15,
    flex: 1,
  },
  timetableInner: {
    flexDirection: "row",
    paddingHorizontal: 10,
  },
  timeAxis: {
    width: 40,
    paddingRight: 10,
  },
  timeLabelContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  timeLabel: {
    fontSize: 14,
    color: "#A0B0D0",
  },
  gridArea: {
    flex: 1,
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderColor: "#EDEEF1",
  },
  hourRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#EDEEF1",
    position: "relative",
  },
  gridColumn: {
    flex: 1,
    borderLeftWidth: 1,
    borderColor: "rgba(237, 238, 241, 0.5)",
  },
  eventBlock: {
    position: "absolute",
    top: 6,
    bottom: 6,
    borderRadius: 12,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  eventTitle: {
    fontSize: 13,
    fontWeight: "600",
  },
  currentTimeIndicator: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: "#c5e4af",
    zIndex: 10,
  },
  legendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 16,
    marginTop: 20,
    paddingHorizontal: 20,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 13,
    color: "#8A8C9A",
    fontWeight: "500",
  },
});
