import { Header } from "@/app/(tabs)/_header";
import { IconSymbol } from "@/components/ui/icon-symbol";
import React, { useState } from "react";
import {
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
  기타: { bg: "#F3F4F8", dot: "#C4C6D0", text: "#8A8C9A" },
};

// 1. Routine 데이터 타입
interface RoutineItem {
  id: string;
  title: string;
  type: "기상" | "운동" | "공부" | "명상" | "저녁" | "기타";
  startHour?: number;
  startMinute?: number;
  durationMinutes?: number;
  completed: boolean;
  date: string;
}

export default function ScheduleScreen() {
  // 오늘 날짜 계산
  const now = new Date();
  const day = now.getDate();
  const year = now.getFullYear();
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
  const month = monthNames[now.getMonth()];
  const weekDays = [
    "일요일",
    "월요일",
    "화요일",
    "수요일",
    "목요일",
    "금요일",
    "토요일",
  ];
  const dayOfWeek = weekDays[now.getDay()];

  const [noTimeRoutines, setNoTimeRoutines] = useState<RoutineItem[]>([
    {
      id: "1",
      title: "물 2L 마시기",
      type: "명상",
      completed: true,
      date: "2026-03-27",
    },
    {
      id: "2",
      title: "비타민 챙기기",
      type: "명상",
      completed: true,
      date: "2026-03-27",
    },
  ]);

  const [timedRoutines, setTimedRoutines] = useState<RoutineItem[]>([
    {
      id: "5",
      title: "기상 & 스트레칭",
      type: "기상",
      startHour: 6,
      startMinute: 0,
      durationMinutes: 15,
      completed: true,
      date: "2026-03-27",
    },
    {
      id: "6",
      title: "러닝 30분",
      type: "운동",
      startHour: 7,
      startMinute: 0,
      durationMinutes: 30,
      completed: true,
      date: "2026-03-27",
    },
  ]);

  //체크박스 클릭 시 완료 상태를 반전시키는 로직
  const toggleComplete = (id: string, isTimed: boolean) => {
    const updater = (prev: RoutineItem[]) =>
      prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item,
      );
    isTimed ? setTimedRoutines(updater) : setNoTimeRoutines(updater);
  };

  //루틴 항목 하나를 렌더링하는 함수
  const RenderItem = ({
    item,
    isTimed,
  }: {
    item: RoutineItem;
    isTimed: boolean;
  }) => {
    const typeStyle = eventTypes[item.type] || eventTypes["기타"];

    return (
      <View style={styles.itemRow}>
        {/* 타입 표시 배지 */}
        <View
          style={[
            styles.tagBadge,
            { backgroundColor: typeStyle.bg, marginRight: 14 },
          ]}
        >
          <Text style={[styles.tagText, { color: typeStyle.text }]}>
            {item.type}
          </Text>
        </View>

        {/* 루틴 제목 및 시간 정보 */}
        <View style={styles.itemContent}>
          <Text
            style={[styles.itemTitle, item.completed && styles.textCompleted]}
          >
            {item.title}
          </Text>
          {isTimed && item.startHour !== undefined && (
            <Text style={styles.itemTime}>
              {`${String(item.startHour).padStart(2, "0")}:${String(item.startMinute).padStart(2, "0")} - ${item.durationMinutes}분`}
            </Text>
          )}
        </View>

        {/* 완료 체크박스 */}
        <TouchableOpacity
          style={[styles.checkbox, item.completed && styles.checkboxActive]}
          onPress={() => toggleComplete(item.id, isTimed)}
        >
          {item.completed && (
            <IconSymbol size={14} name="checkmark" color="#FFF" />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  //상단 프로그레스 바 데이터 합산 및 퍼센트 산출
  const allRoutines = [...noTimeRoutines, ...timedRoutines];
  const totalCount = allRoutines.length;
  const completedCount = allRoutines.filter((item) => item.completed).length;
  const progressPercentage =
    totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        ''
        {/* 헤더의 activeTab="right"로 오른쪽 점 활성화 */}
        <Header activeTab="right" />
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {/* 날짜 및 진행률 요약 카드 */}
          <View style={styles.card}>
            <View style={styles.dateInfo}>
              <View style={styles.dateRow}>
                <Text style={styles.dayNum}>{day}</Text>
                <View>
                  <Text style={styles.monthYear}>
                    {month} {year}
                  </Text>
                  <Text style={styles.subInfo}>{dayOfWeek}</Text>
                </View>
              </View>
              {/* 진행도 바 및 완료 개수 표시 */}
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
            </View>
            {/* 리스트 렌더링 섹션 */}
            <Text style={styles.sectionTitle}>시간 없는 루틴</Text>
            {noTimeRoutines.map((item) => (
              <RenderItem key={item.id} item={item} isTimed={false} />
            ))}
            <TouchableOpacity style={styles.addBtn}>
              <IconSymbol size={16} name="plus.circle" color="#C4C6D0" />
              <Text style={styles.addBtnText}>루틴 추가</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>시간 있는 루틴</Text>
            {timedRoutines.map((item) => (
              <RenderItem key={item.id} item={item} isTimed={true} />
            ))}
            <TouchableOpacity style={styles.addBtn}>
              <IconSymbol size={16} name="plus.circle" color="#C4C6D0" />
              <Text style={styles.addBtnText}>루틴 추가</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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

  profileText: { color: "#FFFFFF", fontSize: 18, fontWeight: "600" },

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
  dateInfo: { marginBottom: 20 },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  dayNum: { fontSize: 44, fontWeight: "800", color: "#2A3C6B" },
  monthYear: { fontSize: 16, fontWeight: "600", color: "#A0B0D0" },
  subInfo: { fontSize: 13, color: "#B4B6C0" },
  progressArea: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 15,
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
  checkboxActive: { backgroundColor: "#A0B0D0", borderColor: "#A0B0D0" },
  itemContent: { flex: 1, marginLeft: 14 },
  itemTitle: { fontSize: 16, fontWeight: "600", color: "#444" },
  textCompleted: { color: "#B4B6C0", textDecorationLine: "line-through" },
  itemTime: { fontSize: 12, color: "#B4B6C0", marginTop: 2 },
  tagBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  tagText: { fontSize: 12, fontWeight: "700" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    gap: 6,
  },
  addBtnText: { fontSize: 14, color: "#B4B6C0", fontWeight: "600" },
  divider: { height: 1, backgroundColor: "#F3F4F8", marginVertical: 10 },
});
