//components/time_picker_modal.tsx
import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/lib/constants/ThemeContext";
import React, { useEffect, useState } from "react";
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
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
  const { theme } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 14,
        paddingVertical: 6,
        paddingHorizontal: 6,
        alignItems: "center",
      }}
    >
      <ThemedText
        style={{
          fontSize: 12,
          fontWeight: "700",
          color: theme.textMuted,
          marginBottom: 8,
        }}
      >
        {label}
      </ThemedText>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
        }}
      >
        <TouchableOpacity
          style={{
            width: 30,
            height: 34,
            borderRadius: 8,
            backgroundColor: theme.cardAlt,
            alignItems: "center",
            justifyContent: "center",
          }}
          onPress={onDecrease}
        >
          <ThemedText
            style={{
              fontSize: 18,
              fontWeight: "800",
              color: theme.main,
              textAlign: "center",
              includeFontPadding: false,
              lineHeight: 18,
            }}
          >
            -
          </ThemedText>
        </TouchableOpacity>
        <View
          style={{
            flex: 2,
            height: 40,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            marginVertical: 6,
          }}
        >
          <ThemedText
            style={{
              fontSize: 18,
              fontWeight: "800",
              color: theme.text,
              textAlign: "center",
              includeFontPadding: false,
              lineHeight: 20,
            }}
          >
            {value}
          </ThemedText>
        </View>
        <TouchableOpacity
          style={{
            width: 30,
            height: 34,
            borderRadius: 8,
            backgroundColor: theme.cardAlt,
            alignItems: "center",
            justifyContent: "center",
          }}
          onPress={onIncrease}
        >
          <ThemedText
            style={{
              fontSize: 18,
              fontWeight: "800",
              color: theme.main,
              textAlign: "center",
              includeFontPadding: false,
              lineHeight: 18,
            }}
          >
            +
          </ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}
function HourStepperPicker({
  label,
  value,
  onIncrease,
  onDecrease,
  onChange,
}: {
  label: string;
  value: string;
  onIncrease: () => void;
  onDecrease: () => void;
  onChange: (v: string) => void;
}) {
  const { theme } = useTheme();
  const [inputValue, setInputValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setInputValue(value);
    }
  }, [value, isFocused]);

  const handleChangeText = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "").slice(0, 2);
    setInputValue(cleaned);

    // 숫자가 입력될 때마다 바로 반영
    if (cleaned.length > 0) {
      const num = parseInt(cleaned, 10);
      if (!isNaN(num)) {
        const clamped = Math.min(23, Math.max(0, num));
        onChange(padTwo(clamped));
      }
    }

    if (Platform.OS === "android" && cleaned.length === 2) {
      Keyboard.dismiss();
    }
  };
  const handleBlur = () => {
    setIsFocused(false);
    const num = parseInt(inputValue, 10);
    if (isNaN(num) || inputValue === "") {
      setInputValue(value); // 원래 값 복원
      return;
    }
    const clamped = Math.min(23, Math.max(0, num));
    const padded = padTwo(clamped);
    setInputValue(padded);
    onChange(padded);
  };
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 14,
        paddingVertical: 6,
        paddingHorizontal: 6,
        alignItems: "center",
      }}
    >
      <ThemedText
        style={{
          fontSize: 12,
          fontWeight: "700",
          color: theme.textMuted,
          marginBottom: 8,
        }}
      >
        {label}
      </ThemedText>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
        }}
      >
        <TouchableOpacity
          style={{
            width: 30,
            height: 34,
            borderRadius: 8,
            backgroundColor: theme.cardAlt,
            alignItems: "center",
            justifyContent: "center",
          }}
          onPress={onDecrease}
        >
          <ThemedText
            style={{
              fontSize: 18,
              fontWeight: "800",
              color: theme.main,
              textAlign: "center",
              includeFontPadding: false,
              lineHeight: 18,
            }}
          >
            -
          </ThemedText>
        </TouchableOpacity>
        <TextInput
          style={{
            flex: 2,
            height: 40,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            marginVertical: 6,
            fontSize: 18,
            fontWeight: "800",
            color: theme.text,
            textAlign: "center",
          }}
          value={inputValue}
          onChangeText={handleChangeText}
          onFocus={() => {
            setIsFocused(true);
            setInputValue("");
          }}
          onBlur={handleBlur}
          keyboardType="number-pad"
          maxLength={2}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={{
            width: 30,
            height: 34,
            borderRadius: 8,
            backgroundColor: theme.cardAlt,
            alignItems: "center",
            justifyContent: "center",
          }}
          onPress={onIncrease}
        >
          <ThemedText
            style={{
              fontSize: 18,
              fontWeight: "800",
              color: theme.main,
              textAlign: "center",
              includeFontPadding: false,
              lineHeight: 18,
            }}
          >
            +
          </ThemedText>
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
  const { theme } = useTheme();

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
      backgroundColor: theme.card,
      borderRadius: 22,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 16,
      maxWidth: 340,
      maxHeight: "80%",
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
      color: theme.text,
    },

    closeText: {
      fontSize: 13,
      fontWeight: "800",
      color: theme.main,
    },

    previewBox: {
      backgroundColor: theme.cardAlt,
      borderRadius: 14,
      paddingVertical: 10,
      paddingHorizontal: 12,
      marginBottom: 14,
    },

    previewLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: theme.textMuted,
      marginBottom: 4,
    },

    previewValue: {
      fontSize: 14,
      fontWeight: "800",
      color: theme.text,
    },

    section: {
      marginBottom: 8,
    },

    sectionTitle: {
      fontSize: 13,
      fontWeight: "800",
      color: theme.main,
      marginBottom: 8,
    },

    pickerRow: {
      flexDirection: "row",
      gap: 8,
    },

    applyButton: {
      marginTop: 4,
      backgroundColor: theme.main,
      borderRadius: 14,
      paddingVertical: 13,
      alignItems: "center",
    },

    applyButtonText: {
      color: theme.card,
      fontSize: 14,
      fontWeight: "800",
    },

    scrollContent: {
      flexGrow: 1,
    },
  });

  const [tempStartHour, setTempStartHour] = useState(startHour);
  const [tempStartMinute, setTempStartMinute] = useState(startMinute);
  const [tempEndHour, setTempEndHour] = useState(endHour);
  const [tempEndMinute, setTempEndMinute] = useState(endMinute);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
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
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: keyboardHeight > 0 ? keyboardHeight + 24 : 24 },
            ]}
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
                <HourStepperPicker
                  label="시"
                  value={tempStartHour}
                  onIncrease={() =>
                    setTempStartHour(getNextHour(tempStartHour))
                  }
                  onDecrease={() =>
                    setTempStartHour(getPrevHour(tempStartHour))
                  }
                  onChange={setTempStartHour}
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
                <HourStepperPicker
                  label="시"
                  value={tempEndHour}
                  onIncrease={() => setTempEndHour(getNextHour(tempEndHour))}
                  onDecrease={() => setTempEndHour(getPrevHour(tempEndHour))}
                  onChange={setTempEndHour}
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
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default TimePickerModal;
