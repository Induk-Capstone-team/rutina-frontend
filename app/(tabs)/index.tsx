import { Header } from "@/app/(tabs)/_header";
import React, { useEffect, useRef, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
const days = ["월", "화", "수", "목", "금", "토", "일"];

const eventTypes = {
  기상: { bg: "#FAEEEE", dot: "#E79A95", text: "#5D4645" },
  운동: { bg: "#FDF4EC", dot: "#EFB996", text: "#675141" },
  공부: { bg: "#F1F1FB", dot: "#9FA2D6", text: "#3E426F" },
  명상: { bg: "#F1F7EE", dot: "#A8CD9B", text: "#4C5D44" },
  저녁: { bg: "#FEF9EE", dot: "#E6CF8A", text: "#685A3F" },
};

// Mock schedule demonstrating horizontal 10-minute precision blocks.
const mockSchedule = [
  {
    id: "1",
    title: "기상",
    startHour: 6,
    startMinute: 0,
    durationMinutes: 60,
    type: "기상",
  },
  {
    id: "2",
    title: "운동",
    startHour: 7,
    startMinute: 0,
    durationMinutes: 30,
    type: "운동",
  }, // 7:00 ~ 7:30 (3 units)
  {
    id: "3",
    title: "공부",
    startHour: 8,
    startMinute: 20,
    durationMinutes: 100,
    type: "공부",
  }, // 8:20 ~ 10:00 (spans 2 hours)
  {
    id: "4",
    title: "명상",
    startHour: 12,
    startMinute: 10,
    durationMinutes: 40,
    type: "명상",
  }, // 12:10 ~ 12:50
  {
    id: "5",
    title: "저녁",
    startHour: 19,
    startMinute: 0,
    durationMinutes: 60,
    type: "저녁",
  },
];

export default function HomeScreen() {
  const now = new Date();
  const dayIndex = now.getDay(); // 0: 일, 1: 월, ..., 6: 토
  const currentDay = days[dayIndex];
  const [selectedDay, setSelectedDay] = useState(currentDay);

  const startHour = 0;
  const endHour = 24;
  const hourHeight = 60; // Row height

  const hours = Array.from(
    { length: endHour - startHour },
    (_, i) => startHour + i,
  );
  const columns = [0, 1, 2, 3, 4, 5]; // 6 columns for 60 mins -> 10 mins each

  const scrollViewRef = useRef<ScrollView>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

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
  }, []); // Run only on mount

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Header />

        {/* Main Card */}
        <View style={styles.mainCard}>
          {/* Day Selector */}
          <View style={styles.daySelector}>
            {days.map((day) => {
              const isSelected = day === selectedDay;
              return (
                <TouchableOpacity
                  key={day}
                  onPress={() => setSelectedDay(day)}
                  style={styles.dayButtonContainer}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isSelected && styles.dayTextSelected,
                    ]}
                  >
                    {day}
                  </Text>
                  {isSelected && <View style={styles.activeDayIndicator} />}
                </TouchableOpacity>
              );
            })}
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
                  <View
                    key={hour}
                    style={[styles.hourRow, { height: hourHeight }]}
                  >
                    {/* 6 vertical grid columns per hour row */}
                    {columns.map((col) => (
                      <View
                        key={col}
                        style={[
                          styles.gridColumn,
                          col === 0 && { borderLeftWidth: 0 }, // First column doesn't need extra left border
                        ]}
                      />
                    ))}

                    {/* Events inside this hour row */}
                    {mockSchedule.map((event) => {
                      const eventStart =
                        event.startHour * 60 + event.startMinute;
                      const eventEnd = eventStart + event.durationMinutes;
                      const hourStart = hour * 60;
                      const hourEnd = hourStart + 60;

                      // Check if event overlaps with this hour
                      if (eventStart >= hourEnd || eventEnd <= hourStart) {
                        return null;
                      }

                      // Calculate visual bounds in this hour row
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
                          {/* Only render text if this is the beginning of the event */}
                          {isStartOfEvent && (
                            <Text
                              style={[
                                styles.eventTitle,
                                { color: typeStyles.text },
                              ]}
                            >
                              {event.title}
                            </Text>
                          )}
                        </View>
                      );
                    })}

                    {/* Current Time Indicator */}
                    {hour === currentTime.getHours() && (
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
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: typeData.dot },
                    ]}
                  />
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
  daySelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
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
  dayButtonContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 36,
  },
  dayText: {
    fontSize: 16,
    color: "#B4B6C0",
    fontWeight: "500",
    marginBottom: 8,
  },
  dayTextSelected: {
    color: "#2A3C6B",
    fontWeight: "700",
  },
  activeDayIndicator: {
    width: 24,
    height: 3,
    backgroundColor: "#2A3C6B",
    borderRadius: 2,
    position: "absolute",
    bottom: 0,
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
    borderColor: "rgba(237, 238, 241, 0.5)", // Subtle internal grid lines for 10-min slots
  },
  eventBlock: {
    position: "absolute",
    top: 0,
    bottom: 0,
    justifyContent: "center",
    paddingHorizontal: 8,
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
