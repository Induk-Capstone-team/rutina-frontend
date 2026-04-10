import { Header } from "@/app/(tabs)/_header";
import { ScheduleDetailModal } from "@/components/schedule_detail_modal";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { RoutineStorage } from "@/lib/storage";
import type { CalendarDay, ScheduleRoutine } from "@/types/routine";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Calendar, LocaleConfig } from "react-native-calendars";

LocaleConfig.locales["kr"] = {
  monthNames: [
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
  ],
  monthNamesShort: [
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
  ],
  dayNames: [
    "일요일",
    "월요일",
    "화요일",
    "수요일",
    "목요일",
    "금요일",
    "토요일",
  ],
  dayNamesShort: ["S", "M", "T", "W", "T", "F", "S"],
  today: "오늘",
};
LocaleConfig.defaultLocale = "kr";

// 카테고리 색상 타입
type EventTypeStyle = {
  bg: string;
  dot: string;
  text: string;
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
//"HH:mm" 문자열을 시간 숫자로 바꾸는 함수
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

export default function ScheduleScreen() {
  // 현재 선택 날짜
  const [selectedDate, setSelectedDate] = useState(new Date());
  // 달력 열림 여부
  const [showDatePicker, setShowDatePicker] = useState(false);
  //시간 없는 루틴 / 시간 있는 루틴 분리 저장
  const [noTimeRoutines, setNoTimeRoutines] = useState<ScheduleRoutine[]>([]);
  const [timedRoutines, setTimedRoutines] = useState<ScheduleRoutine[]>([]);

  // 상세 모달에 보여줄 선택된 루틴
  const [selectedRoutine, setSelectedRoutine] =
    useState<ScheduleRoutine | null>(null);
  //상세 모달 표시 여부
  const [showDetailModal, setShowDetailModal] = useState(false);

  // 저장된 데이터와 비교할 날짜 문자열
  const selectedDateString = selectedDate.toISOString().split("T")[0];
  //화면에 표시할 날짜 정보
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

  // 날짜를 하루씩 이동하는 함수
  const changeDate = (offset: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + offset);
    setSelectedDate(newDate);
  };

  // 달력에서 날짜 선택 시 실행
  const onDayPress = (day: CalendarDay) => {
    setSelectedDate(new Date(day.dateString));
    setShowDatePicker(false);
  };

  // 선택한 날짜의 루틴만 불러오는 함수
  const loadRoutines = useCallback(async () => {
    try {
      const allRoutines = await RoutineStorage.getAll();

      const filteredByDate = allRoutines.filter(
        (item: ScheduleRoutine) => item.date === selectedDateString,
      );

      const timed = filteredByDate.filter(
        (item: ScheduleRoutine) =>
          item.startTime !== undefined && item.startTime !== null,
      );

      const noTimed = filteredByDate.filter(
        (item: ScheduleRoutine) =>
          item.startTime === undefined || item.startTime === null,
      );
      // 시간 있는 루틴은 시작 시간순 정렬
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

  useFocusEffect(
    useCallback(() => {
      loadRoutines();
    }, [loadRoutines]),
  );

  //완료 체크 토글
  const toggleComplete = async (id: number) => {
    try {
      await RoutineStorage.toggleCompleteById(id);
      await loadRoutines();

      setSelectedRoutine((prev) => {
        if (!prev || prev.id !== id) return prev;
        return { ...prev, completed: !prev.completed };
      });
    } catch (error) {
      console.error("완료 상태 변경 실패", error);
    }
  };

  //루틴 삭제
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

  //루틴 누르면 상세 모달 열기
  const handlePressRoutine = (item: ScheduleRoutine) => {
    setSelectedRoutine(item);
    setShowDetailModal(true);
  };

  //루틴 한 개 렌더링 컴포넌트
  const RenderItem = ({
    item,
    isTimed,
  }: {
    item: ScheduleRoutine;
    isTimed: boolean;
  }) => {
    const typeLabel = item.categoryName ?? "기타";
    const typeStyle = getCategoryStyle(item);
    const translateX = useRef(new Animated.Value(0)).current;
    const isDeletingRef = useRef(false);
    const isSwipingRef = useRef(false);
    const resetPosition = () => {
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();
    };

    const animateDelete = () => {
      if (isDeletingRef.current) return;
      isDeletingRef.current = true;

      Animated.timing(translateX, {
        toValue: -420,
        duration: 180,
        useNativeDriver: true,
      }).start(() => {
        handleDeleteRoutine(item.id);
      });
    };
    //왼쪽 스와이프 삭제 제스처
    const panResponder = useMemo(
      () =>
        PanResponder.create({
          onStartShouldSetPanResponder: () => true,
          onMoveShouldSetPanResponder: (_, gestureState) => {
            return (
              Math.abs(gestureState.dx) > 1 &&
              Math.abs(gestureState.dx) > Math.abs(gestureState.dy)
            );
          },

          onPanResponderGrant: () => {
            isSwipingRef.current = false;
          },

          onPanResponderMove: (_, gestureState) => {
            if (gestureState.dx < 0) {
              if (Math.abs(gestureState.dx) > 2) {
                isSwipingRef.current = true;
              }

              translateX.setValue(Math.max(gestureState.dx, -100));
            }
          },

          onPanResponderRelease: (_, gestureState) => {
            const isFastSwipeLeft = gestureState.vx < -0.2;
            const isFarSwipeLeft = gestureState.dx < -20;

            if (isFastSwipeLeft || isFarSwipeLeft) {
              animateDelete();
            } else {
              resetPosition();
            }

            setTimeout(() => {
              isSwipingRef.current = false;
            }, 50);
          },

          onPanResponderTerminate: () => {
            resetPosition();
            isSwipingRef.current = false;
          },
        }),
      [translateX],
    );

    const parsedStartTime = parseTimeString(item.startTime);
    const parsedEndTime = parseTimeString(item.endTime);

    return (
      <View style={styles.swipeRowWrapper}>
        <View style={styles.deleteBackground}>
          <Text style={styles.deleteBackgroundText}>삭제</Text>
        </View>

        <Animated.View
          style={[styles.swipeAnimatedCard, { transform: [{ translateX }] }]}
          {...panResponder.panHandlers}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              if (!isSwipingRef.current) {
                handlePressRoutine(item);
              }
            }}
          >
            <View style={styles.itemRow}>
              {/* 카테고리 배지 */}
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
                    item.completed && styles.textCompleted,
                  ]}
                >
                  {item.title}
                </Text>

                {/* 시간 있는 루틴이면 시간 표시 */}
                {isTimed && parsedStartTime && (
                  <>
                    <Text style={styles.itemTime}>
                      {parsedEndTime
                        ? `${String(parsedStartTime.hour).padStart(2, "0")}:${String(parsedStartTime.minute).padStart(2, "0")} ~ ${String(parsedEndTime.hour).padStart(2, "0")}:${String(parsedEndTime.minute).padStart(2, "0")}`
                        : `${String(parsedStartTime.hour).padStart(2, "0")}:${String(parsedStartTime.minute).padStart(2, "0")}`}
                    </Text>

                    <Text style={styles.itemSubInfo}>
                      {getNotifyText(item)}
                    </Text>
                  </>
                )}
                {/*반복 정보 표시 */}
                <Text style={styles.itemSubInfo}>{getRepeatText(item)}</Text>
              </View>

              {/* 완료 체크박스 */}
              <TouchableOpacity
                style={[
                  styles.checkbox,
                  item.completed && styles.checkboxActive,
                ]}
                onPress={() => toggleComplete(item.id)}
              >
                {item.completed && (
                  <IconSymbol size={14} name="checkmark" color="#FFF" />
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  };

  // 상단 프로그레스 바 데이터 합산 및 퍼센트 산출
  const allRoutines = [...noTimeRoutines, ...timedRoutines];
  const totalCount = allRoutines.length;
  const completedCount = allRoutines.filter((item) => item.completed).length;
  const progressPercentage =
    totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Header activeTab="right" />
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            {/* 날짜 조작 섹션 */}
            <View style={styles.dateControlRow}>
              <View style={styles.dateInfoContainer}>
                <TouchableOpacity onPress={() => changeDate(-1)}>
                  <IconSymbol size={24} name="chevron.left" color="#A0B0D0" />
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
                  <IconSymbol size={24} name="chevron.right" color="#A0B0D0" />
                </TouchableOpacity>
              </View>

              {/* 달력 열기 버튼 */}
              <TouchableOpacity
                style={[
                  styles.calendarBtn,
                  showDatePicker && styles.calendarBtnActive,
                ]}
                onPress={() => setShowDatePicker(!showDatePicker)}
              >
                <IconSymbol
                  size={20}
                  name="calendar"
                  color={showDatePicker ? "#FFF" : "#405886"}
                />
              </TouchableOpacity>
            </View>

            {/* 달력 */}
            {showDatePicker && (
              <View style={styles.pickerContainer}>
                <Calendar
                  current={selectedDateString}
                  onDayPress={onDayPress}
                  monthFormat={"yyyy년 MM월"}
                  markedDates={{
                    [selectedDateString]: {
                      selected: true,
                      selectedColor: "#F1F1FB",
                    },
                  }}
                  theme={{
                    backgroundColor: "#F8F9FB",
                    calendarBackground: "#F8F9FB",
                    textSectionTitleColor: "#B4B6C0",
                    selectedDayTextColor: "#2A3C6B",
                    todayTextColor: "#405886",
                    dayTextColor: "#2A3C6B",
                    textDisabledColor: "#D9E1E8",
                    arrowColor: "#A0B0D0",
                    monthTextColor: "#2A3C6B",
                    textDayFontWeight: "600",
                    textMonthFontWeight: "bold",
                    textDayHeaderFontWeight: "600",
                  }}
                />
              </View>
            )}

            {/* 진행도 바 */}
            <View style={styles.progressArea}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progressPercentage}%` },
                  ]}
                />
              </View>
              <Text
                style={styles.progressPercent}
              >{`${completedCount} / ${totalCount}`}</Text>
            </View>

            {/* 리스트 렌더링 섹션 */}
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
        {/* 상세 모달 */}
        <ScheduleDetailModal
          visible={showDetailModal}
          routine={selectedRoutine}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedRoutine(null);
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F3F4F8" },
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

  scrollView: { flex: 1 },
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

  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minWidth: 120,
  },
  dayNum: { fontSize: 44, fontWeight: "800", color: "#2A3C6B" },
  monthYear: { fontSize: 16, fontWeight: "600", color: "#A0B0D0" },
  subInfo: { fontSize: 13, color: "#B4B6C0" },
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
  progressFill: { height: "100%", backgroundColor: "#405886", borderRadius: 3 },
  progressPercent: { fontSize: 14, fontWeight: "600", color: "#A0B0D0" },
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

  itemRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#E2E5EC",
    justifyContent: "center",
    alignItems: "center",
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
  checkboxActive: { backgroundColor: "#A0B0D0", borderColor: "#A0B0D0" },
  itemContent: { flex: 1, marginLeft: 14 },
  itemTitle: { fontSize: 16, fontWeight: "600", color: "#444" },
  textCompleted: { color: "#B4B6C0", textDecorationLine: "line-through" },
  itemTime: { fontSize: 12, color: "#B4B6C0", marginTop: 2 },
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
  tagText: { fontSize: 12, fontWeight: "700" },
  divider: { height: 1, backgroundColor: "#F3F4F8", marginVertical: 10 },
  emptyText: {
    fontSize: 14,
    color: "#B4B6C0",
    paddingVertical: 8,
  },
});
