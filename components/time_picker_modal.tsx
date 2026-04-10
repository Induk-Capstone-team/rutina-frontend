//components/time_picker_modal.tsx
import { ThemedText } from "@/components/themed-text";
import React, { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

type TimePickerModalProps = {
  visible: boolean;
  startHour: string;
  startMinute: string;
  endHour: string;
  endMinute: string;
  onClose: () => void;
  onApply: (time: {
    startHour: string;
    startMinute: string;
    endHour: string;
    endMinute: string;
  }) => void;
};

const MINUTE_OPTIONS = ["00", "10", "20", "30", "40", "50"];

function padTwo(value: number) {
  return String(value).padStart(2, "0");
}

function formatRangeLabel(
  startHour: string,
  startMinute: string,
  endHour: string,
  endMinute: string,
) {
  return `${startHour}:${startMinute} ~ ${endHour}:${endMinute}`;
}

function getNextHour(hour: string) {
  return padTwo((Number(hour) + 1) % 24);
}

function getPrevHour(hour: string) {
  return padTwo((Number(hour) - 1 + 24) % 24);
}

function getNextMinute(minute: string) {
  const currentIndex = MINUTE_OPTIONS.indexOf(minute);
  const nextIndex = (currentIndex + 1) % MINUTE_OPTIONS.length;
  return MINUTE_OPTIONS[nextIndex];
}

function getPrevMinute(minute: string) {
  const currentIndex = MINUTE_OPTIONS.indexOf(minute);
  const prevIndex =
    (currentIndex - 1 + MINUTE_OPTIONS.length) % MINUTE_OPTIONS.length;
  return MINUTE_OPTIONS[prevIndex];
}

function StepperPicker({
  label,
  value,
  onIncrease,
  onDecrease,
}: {
  label: string;
  value: string;
  onIncrease: () => void;
  onDecrease: () => void;
}) {
  return (
    <View style={styles.stepperBox}>
      <ThemedText style={styles.stepperLabel}>{label}</ThemedText>
      <View style={styles.stepperRow}>
        <TouchableOpacity style={styles.stepperButton} onPress={onDecrease}>
          <ThemedText style={styles.stepperButtonText}>-</ThemedText>
        </TouchableOpacity>

        <View style={styles.stepperValueBox}>
          <ThemedText style={styles.stepperValueText}>{value}</ThemedText>
        </View>

        <TouchableOpacity style={styles.stepperButton} onPress={onIncrease}>
          <ThemedText style={styles.stepperButtonText}>+</ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const TimePickerModal = ({
  visible,
  startHour,
  startMinute,
  endHour,
  endMinute,
  onClose,
  onApply,
}: TimePickerModalProps) => {
  const [tempStartHour, setTempStartHour] = useState(startHour);
  const [tempStartMinute, setTempStartMinute] = useState(startMinute);
  const [tempEndHour, setTempEndHour] = useState(endHour);
  const [tempEndMinute, setTempEndMinute] = useState(endMinute);

  useEffect(() => {
    if (visible) {
      setTempStartHour(startHour);
      setTempStartMinute(startMinute);
      setTempEndHour(endHour);
      setTempEndMinute(endMinute);
    }
  }, [visible, startHour, startMinute, endHour, endMinute]);

  const handleApply = () => {
    onApply({
      startHour: tempStartHour,
      startMinute: tempStartMinute,
      endHour: tempEndHour,
      endMinute: tempEndMinute,
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={styles.modalCard}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <ThemedText style={styles.title}>시간 설정</ThemedText>

            <TouchableOpacity onPress={onClose}>
              <ThemedText style={styles.closeText}>닫기</ThemedText>
            </TouchableOpacity>
          </View>

          <View style={styles.previewBox}>
            <ThemedText style={styles.previewLabel}>선택된 시간</ThemedText>
            <ThemedText style={styles.previewValue}>
              {formatRangeLabel(
                tempStartHour,
                tempStartMinute,
                tempEndHour,
                tempEndMinute,
              )}
            </ThemedText>
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>시작 시간</ThemedText>
            <View style={styles.pickerRow}>
              <StepperPicker
                label="시"
                value={tempStartHour}
                onIncrease={() => setTempStartHour(getNextHour(tempStartHour))}
                onDecrease={() => setTempStartHour(getPrevHour(tempStartHour))}
              />
              <StepperPicker
                label="분"
                value={tempStartMinute}
                onIncrease={() =>
                  setTempStartMinute(getNextMinute(tempStartMinute))
                }
                onDecrease={() =>
                  setTempStartMinute(getPrevMinute(tempStartMinute))
                }
              />
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>종료 시간</ThemedText>
            <View style={styles.pickerRow}>
              <StepperPicker
                label="시"
                value={tempEndHour}
                onIncrease={() => setTempEndHour(getNextHour(tempEndHour))}
                onDecrease={() => setTempEndHour(getPrevHour(tempEndHour))}
              />
              <StepperPicker
                label="분"
                value={tempEndMinute}
                onIncrease={() =>
                  setTempEndMinute(getNextMinute(tempEndMinute))
                }
                onDecrease={() =>
                  setTempEndMinute(getPrevMinute(tempEndMinute))
                }
              />
            </View>
          </View>

          <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
            <ThemedText style={styles.applyButtonText}>적용</ThemedText>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default TimePickerModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.18)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  modalCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2A3C6B",
  },

  closeText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#405886",
  },

  previewBox: {
    backgroundColor: "#F8F9FB",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
  },

  previewLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#A0B0D0",
    marginBottom: 4,
  },

  previewValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#2A3C6B",
  },

  section: {
    marginBottom: 8,
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#405886",
    marginBottom: 8,
  },

  pickerRow: {
    flexDirection: "row",
    gap: 8,
  },

  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },

  stepperBox: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 6,
    alignItems: "center",
  },

  stepperLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#A0B0D0",
    marginBottom: 8,
  },

  stepperButton: {
    width: 30,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#F8F9FB",
    alignItems: "center",
    justifyContent: "center",
  },

  stepperButtonText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#405886",
    textAlign: "center",
    includeFontPadding: false,
    lineHeight: 18,
  },

  stepperValueBox: {
    flex: 2,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 6,
  },

  stepperValueText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#2A3C6B",
    textAlign: "center",
    includeFontPadding: false,
    lineHeight: 20,
  },

  applyButton: {
    marginTop: 4,
    backgroundColor: "#405886",
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
  },

  applyButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
