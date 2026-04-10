import { Header } from "@/components/ui/_header";
import React, { useEffect, useRef, useState } from "react";
import {
  PanResponder,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { addDays, format, isSameDay, parse, startOfWeek } from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar, LocaleConfig } from "react-native-calendars";

LocaleConfig.locales["ko"] = {
  monthNames: ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"],
  monthNamesShort: ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"],
  dayNames: ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"],
  dayNamesShort: ["일", "월", "화", "수", "목", "금", "토"],
  today: "오늘",
};
LocaleConfig.defaultLocale = "ko";

const eventTypes = {
  기상: { bg: "#FAEEEE", dot: "#E79A95", text: "#5D4645" },
  운동: { bg: "#FDF4EC", dot: "#EFB996", text: "#675141" },
  공부: { bg: "#F1F1FB", dot: "#9FA2D6", text: "#3E426F" },
  명상: { bg: "#F1F7EE", dot: "#A8CD9B", text: "#4C5D44" },
  저녁: { bg: "#FEF9EE", dot: "#E6CF8A", text: "#685A3F" },
};

// Mock schedule data is now generated dynamically inside the component to match today's date
export default function HomeScreen() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const mockSchedule = [
    { id: "1", title: "기상", startTime: `${todayStr} 06:00`, endTime: `${todayStr} 07:00`, type: "기상" },
    { id: "2", title: "운동", startTime: `${todayStr} 07:00`, endTime: `${todayStr} 07:30`, type: "운동" },
    { id: "3", title: "공부", startTime: `${todayStr} 08:20`, endTime: `${todayStr} 10:00`, type: "공부" },
    { id: "4", title: "명상", startTime: `${todayStr} 12:10`, endTime: `${todayStr} 12:50`, type: "명상" },
    { id: "5", title: "저녁", startTime: `${todayStr} 19:00`, endTime: `${todayStr} 20:00`, type: "저녁" },
  ];

  const startHour = 0;
  const endHour = 24;
  const hourHeight = 60; // Row height

  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const columns = [0, 1, 2, 3, 4, 5]; // 6 columns for 60 mins -> 10 mins each

  const scrollViewRef = useRef<ScrollView>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Generate the week days (Sunday started)
  const startOfCurrentWeek = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startOfCurrentWeek, i));

  // Pan Responder for Swiping down to reveal calendar
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
    })
  ).current;

  useEffect(() => {
    // Auto scroll on mount
    const currentHour = currentTime.getHours();
    const yOffset = Math.max(0, (currentHour - startHour - 1) * hourHeight);

    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: yOffset, animated: true });
    }, 100);

    // Update time every minute to keep line accurate
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Header />

        {/* Main Card */}
        <View style={styles.mainCard}>

          {/* Top Panel (Day Selector + Calendar) capturing swipes */}
          <View style={styles.topPanel} {...panResponder.panHandlers}>
            {/* Day Selector */}
            <View style={styles.daySelector}>
              {weekDays.map((date) => {
                const isSelected = isSameDay(date, currentDate);
                const isSunday = date.getDay() === 0;
                const isSaturday = date.getDay() === 6;

                const dayStr = format(date, "E", { locale: ko });
                const dayNum = format(date, "d");

                // Determine emphasized color for weekends
                let emphasizedColor: { color?: string } = {};
                if (isSunday) {
                  emphasizedColor = { color: isSelected ? "#E74C3C" : "#F1948A" };
                } else if (isSaturday) {
                  emphasizedColor = { color: isSelected ? "#2E86C1" : "#85C1E9" };
                }

                return (
                  <TouchableOpacity
                    key={date.toISOString()}
                    onPress={() => setCurrentDate(date)}
                    style={styles.dayButtonContainer}
                  >
                    <Text style={[styles.dayText, isSelected && styles.dayTextSelected, emphasizedColor]}>
                      {dayStr}
                    </Text>
                    <View style={styles.dateCircle}>
                      <Text style={[styles.dateText, isSelected && styles.dateTextSelected, emphasizedColor]}>
                        {dayNum}
                      </Text>
                    </View>
                    {isSelected && <View style={[styles.activeDayIndicator, isSunday || isSaturday ? { backgroundColor: emphasizedColor.color } : {}]} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Handle & Today Button */}
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

            {/* Collapsible Calendar */}
            {isCalendarVisible && (
              <View style={styles.calendarWrapper}>
                <Calendar
                  current={format(currentDate, "yyyy-MM-dd")}
                  onDayPress={(day: any) => {
                    setCurrentDate(new Date(day.timestamp));
                    setIsCalendarVisible(false);
                  }}
                  monthFormat={"yyyy년 M월"}
                  theme={{
                    backgroundColor: "#ffffff",
                    calendarBackground: "#ffffff",
                    textSectionTitleColor: "#8A8C9A",
                    selectedDayBackgroundColor: "#2A3C6B",
                    selectedDayTextColor: "#ffffff",
                    todayTextColor: "#E79A95",
                    dayTextColor: "#2d4150",
                    textDisabledColor: "#d9e1e8",
                    dotColor: "#00adf5",
                    selectedDotColor: "#ffffff",
                    arrowColor: "#2A3C6B",
                    monthTextColor: "#2A3C6B",
                    indicatorColor: "#2A3C6B",
                  }}
                />
              </View>
            )}
          </View>

          {/* Timetable Grid */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.timetableContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.timetableInner}>
              {/* Left Time Axis */}
              <View style={styles.timeAxis}>
                {hours.map((hour) => (
                  <View
                    key={hour}
                    style={[styles.timeLabelContainer, { height: hourHeight }]}
                  >
                    <Text style={styles.timeLabel}>{hour}</Text>
                  </View>
                ))}
              </View>

              {/* Grid Area with rows being hours and columns being 10 mins */}
              <View style={styles.gridArea}>
                {hours.map((hour) => (
                  <View key={hour} style={[styles.hourRow, { height: hourHeight }]}>
                    {/* 6 vertical grid columns per hour row */}
                    {columns.map((col) => (
                      <View
                        key={col}
                        style={[
                          styles.gridColumn,
                          col === 0 && { borderLeftWidth: 0 },
                        ]}
                      />
                    ))}

                    {/* Events inside this hour row */}
                    {mockSchedule.map((event) => {
                      const startDateObj = parse(event.startTime, "yyyy-MM-dd HH:mm", new Date());
                      const endDateObj = parse(event.endTime, "yyyy-MM-dd HH:mm", new Date());

                      // Only show events that belong to the currently selected calendar date
                      if (!isSameDay(startDateObj, currentDate)) return null;

                      const eventStart = startDateObj.getHours() * 60 + startDateObj.getMinutes();
                      const eventEnd = endDateObj.getHours() * 60 + endDateObj.getMinutes();

                      const hourStart = hour * 60;
                      const hourEnd = hourStart + 60;

                      if (eventStart >= hourEnd || eventEnd <= hourStart) return null;

                      const overlapStart = Math.max(eventStart, hourStart);
                      const overlapEnd = Math.min(eventEnd, hourEnd);

                      const startOffsetMin = overlapStart - hourStart;
                      const durationInHour = overlapEnd - overlapStart;

                      const leftPercent = (startOffsetMin / 60) * 100;
                      const widthPercent = (durationInHour / 60) * 100;

                      const typeStyles =
                        eventTypes[event.type as keyof typeof eventTypes] ||
                        eventTypes["공부"];
                      const isStartOfEvent = overlapStart === eventStart;

                      return (
                        <View
                          key={event.id}
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
                            <Text style={[styles.eventTitle, { color: typeStyles.text }]}>
                              {event.title}
                            </Text>
                          )}
                        </View>
                      );
                    })}

                    {/* Current Time Indicator */}
                    {isSameDay(currentDate, new Date()) && hour === currentTime.getHours() && (
                      <View
                        style={[
                          styles.currentTimeIndicator,
                          { left: `${(currentTime.getMinutes() / 60) * 100}%` },
                        ]}
                      />
                    )}
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Bottom Legend */}
          <View style={styles.legendContainer}>
            {Object.keys(eventTypes).map((key) => {
              const typeData = eventTypes[key as keyof typeof eventTypes];
              return (
                <View key={key} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: typeData.dot }]} />
                  <Text style={styles.legendText}>{key}</Text>
                </View>
              );
            })}
          </View>
        </View>
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
  },
  mainCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    paddingBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  topPanel: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  todayButton: {
    position: 'absolute',
    top: 10,
    right: 20,
    backgroundColor: '#F3F4F8',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    zIndex: 20,
  },
  todayButtonText: {
    fontSize: 12,
    color: '#2A3C6B',
    fontWeight: '700',
  },
  daySelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 10,
  },
  dayButtonContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 38,
  },
  dayText: {
    fontSize: 14,
    color: "#B4B6C0",
    fontWeight: "600",
    marginBottom: 4,
  },
  dayTextSelected: {
    color: "#2A3C6B",
  },
  dateCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  dateText: {
    fontSize: 16,
    color: "#333333",
    fontWeight: "700",
  },
  dateTextSelected: {
    color: "#2A3C6B",
  },
  activeDayIndicator: {
    width: 24,
    height: 3,
    backgroundColor: "#2A3C6B",
    borderRadius: 2,
    position: "absolute",
    bottom: 0,
  },
  handleRow: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    paddingBottom: 18,
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
    paddingHorizontal: 10,
    paddingBottom: 20,
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
    borderRadius: 12, // Rounded corners
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
    backgroundColor: "#FF3B30",
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
