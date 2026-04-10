//components/schedule_detail_modal.tsx

import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import type { ScheduleRoutine } from "@/types/routine";

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

//모달 props 타입
type ScheduleDetailModalProps = {
  visible: boolean;
  routine: ScheduleRoutine | null;
  onClose: () => void;
};

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

function formatTime(time?: string | null) {
  if (!time) return "시간 없음";

  const [hour = "00", minute = "00"] = time.split(":");
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
}

function formatTimeRange(startTime?: string | null, endTime?: string | null) {
  if (!startTime) return "시간 없음";

  const start = formatTime(startTime);

  if (!endTime) return start;

  const end = formatTime(endTime);
  return `${start} ~ ${end}`;
}

function formatDate(dateString: string) {
  const [year, month, day] = dateString.split("-");
  return `${year}년 ${month}월 ${day}일`;
}

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

//카테고리 색상 계산
function getCategoryStyle(routine: ScheduleRoutine): EventTypeStyle {
  const categoryName = routine.categoryName ?? "기타";
  const fixedStyle = eventTypes[categoryName];

  if (fixedStyle) {
    return fixedStyle;
  }

  if (routine.color) {
    return {
      bg: hexToRgba(routine.color, 0.14),
      dot: routine.color,
      text: routine.color,
    };
  }

  return eventTypes["기타"];
}

export function ScheduleDetailModal({
  visible,
  routine,
  onClose,
}: ScheduleDetailModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.detailOverlay} onPress={onClose}>
        <Pressable
          style={styles.detailCard}
          onPress={(e) => e.stopPropagation()}
        >
          {routine && (
            <>
              {(() => {
                const categoryStyle = getCategoryStyle(routine);

                return (
                  <>
                    {/* 상단 헤더 */}
                    <View style={styles.detailHeader}>
                      <Text style={styles.detailTitle}>일정 상세</Text>

                      <TouchableOpacity onPress={onClose}>
                        <IconSymbol
                          name="xmark.circle.fill"
                          size={26}
                          color="#D6DAE3"
                        />
                      </TouchableOpacity>
                    </View>

                    {/* 카테고리 배지 */}
                    <View
                      style={[
                        styles.tagBadge,
                        {
                          backgroundColor: categoryStyle.bg,
                          borderColor: categoryStyle.dot,
                          alignSelf: "flex-start",
                          marginBottom: 12,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.tagText,
                          {
                            color: categoryStyle.text,
                          },
                        ]}
                      >
                        {routine.categoryName ?? "기타"}
                      </Text>
                    </View>

                    <Text style={styles.detailRoutineTitle}>
                      {routine.title}
                    </Text>

                    <View style={styles.detailInfoBox}>
                      <Text style={styles.detailLabel}>날짜</Text>
                      <Text style={styles.detailValue}>
                        {formatDate(routine.date)}
                      </Text>
                    </View>

                    <View style={styles.detailInfoBox}>
                      <Text style={styles.detailLabel}>시간</Text>
                      <Text style={styles.detailValue}>
                        {formatTimeRange(routine.startTime, routine.endTime)}
                      </Text>
                    </View>

                    <View style={styles.detailInfoBox}>
                      <Text style={styles.detailLabel}>반복</Text>
                      <Text style={styles.detailValue}>
                        {getRepeatText(routine)}
                      </Text>
                    </View>

                    <View style={styles.detailFooter}>
                      <TouchableOpacity
                        style={styles.detailCloseButton}
                        onPress={onClose}
                      >
                        <Text style={styles.detailCloseButtonText}>닫기</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                );
              })()}
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  detailOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.22)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  detailCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: "#EEF2F7",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },

  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  detailTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#7E8CA5",
    letterSpacing: -0.1,
  },

  detailRoutineTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#243B6A",
    lineHeight: 30,
    marginBottom: 16,
    letterSpacing: -0.3,
  },

  detailInfoBox: {
    backgroundColor: "#F7F9FC",
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ECF0F6",
  },

  detailLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#8FA0BC",
    marginBottom: 6,
    letterSpacing: -0.1,
  },

  detailValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2A3C6B",
    lineHeight: 21,
  },

  detailFooter: {
    marginTop: 10,
  },

  detailCloseButton: {
    backgroundColor: "#405886",
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    shadowColor: "#405886",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 4,
  },

  detailCloseButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.1,
  },

  tagBadge: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 12,
  },

  tagText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: -0.1,
  },
});
