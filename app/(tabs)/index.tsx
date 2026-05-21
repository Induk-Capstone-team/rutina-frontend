import ScheduleContent from "@/components/schedule_content";
import { Header } from "@/components/ui/_header";
import AppCalendar from "@/components/ui/app_calendar";
import { EVENT_TYPES } from "@/lib/category";
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
// 시간표에 표시할 일정 타입
type TimetableEvent = {
  id: string;
  title: string;
  startMinute: number;
  endMinute: number;
  type: string;
  color?: string;
};
// HEX 색상에 투명도 값 추가
function addAlphaToHex(hexColor: string, alpha = "22") {
  if (!hexColor.startsWith("#")) return "#F1F1FB";
  if (hexColor.length === 7) return `${hexColor}${alpha}`;
  return hexColor;
}
// 시간을 분 단위로 변환
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

function buildTimetableEvents(routines: ScheduleRoutine[]): TimetableEvent[] {
  const events: TimetableEvent[] = [];
  routines.forEach((routine) => {
    if (!routine.startTime || !routine.endTime) return;

    const startMinute = parseTimeToMinutes(routine.startTime);
    const endMinute = parseTimeToMinutes(routine.endTime);
    if (startMinute === null || endMinute === null) return;
    if (endMinute <= startMinute) return;

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
// 카테고리명에 맞는 색상 스타일 반환
function getEventStyle(type: string, color?: string) {
  const fixedStyle = EVENT_TYPES[type as keyof typeof EVENT_TYPES];

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

  const startHour = 0;
  const endHour = 24;
  const hourHeight = 60;

  const hours = Array.from(
    { length: endHour - startHour },
    (_, i) => startHour + i,
  );
  const columns = [0, 1, 2, 3, 4, 5];
  // 시간표 스크롤 위치 제어용 ref
  const timetableScrollRef = useRef<ScrollView>(null);

  const currentDateString = format(currentDate, "yyyy-MM-dd");
  // 현재 선택된 날짜가 포함된 주 계산
  const startOfCurrentWeek = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }).map((_, i) =>
    addDays(startOfCurrentWeek, i),
  );

  //  수직 이동이 수평 이동보다 클 때만 반응
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return (
          Math.abs(gestureState.dy) > 10 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx)
        );
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
  // 다른 화면 갔다가 돌아올 때 최신 루틴 다시 불러오기
  useFocusEffect(
    useCallback(() => {
      loadStoredRoutines();
    }, [loadStoredRoutines]),
  );
  // 현재 시간 기준으로 시간표 위치 이동 + 1분마다 현재 시간 갱신
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

  // 가로 스와이프가 끝났을 때 현재 페이지 상태 변경
  const handleHorizontalScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const pageWidth = SCREEN_WIDTH - 32;
    const offsetX = event.nativeEvent.contentOffset.x;
    const currentPage = Math.round(offsetX / pageWidth);

    setActivePage(currentPage === 0 ? "left" : "right");
  };
  // 현재 선택 날짜에 시간표로 보여줄 일정 목록
  const timetableEvents = useMemo(() => {
    return buildTimetableEvents(storedRoutines);
  }, [storedRoutines]);

  const calendarMarkedDates = useMemo(() => {
    const marked: MarkedDates = {
      [currentDateString]: { selected: true, selectedColor: "#F1F1FB" },
    };

    return marked;
  }, [currentDateString]);

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
    // 일정이 없을 때는 기본 카테고리 범례 표시
    if (uniqueMap.size === 0) {
      Object.keys(EVENT_TYPES).forEach((key) => {
        uniqueMap.set(key, {
          label: key,
          dot: EVENT_TYPES[key as keyof typeof EVENT_TYPES].dot,
        });
      });
    }

    return Array.from(uniqueMap.values());
  }, [timetableEvents]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* 현재 페이지에 따라 헤더의 토글 표시 변경 */}
        <Header activeTab={activePage} />
        {/* 타임테이블과 일정 화면을 가로 스와이프로 전환 */}
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
                {/* 주간 날짜 선택 영역 */}
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
                {/* 캘린더 열기/닫기 핸들 영역 */}
                <View style={styles.handleRow}>
                  <TouchableOpacity
                    style={styles.swipeHandleContainer}
                    activeOpacity={0.7}
                    onPress={() => setIsCalendarVisible(!isCalendarVisible)}
                  >
                    <View style={styles.swipeHandle} />
                  </TouchableOpacity>
                  {/* 오늘이 아닌 날짜를 보고 있을 때만 오늘 버튼 표시 */}
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
                        setIsCalendarVisible(false);
                      }}
                    />
                  </View>
                )}
              </View>
              {/* 시간표 영역 */}
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
                  {/* 시간표 그리드 영역 */}
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
                        {/* 해당 시간 줄에 걸치는 일정 블록 표시 */}
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
                        {/* 오늘 날짜일 때 현재 시간 위치 표시 */}
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
              {/* 카테고리 범례 */}
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
    backgroundColor: "#F3F4F8",
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
    marginBottom: 20,
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
