import SingleTimePickerModal from "@/components/single_time_picker_modal";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTheme } from "@/lib/constants/ThemeContext";
import { TodoService } from "@/services/todo_service";
import type { Todo } from "@/types/todo";
import { Ionicons } from "@expo/vector-icons";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    Alert,
    Animated,
    Dimensions,
    Keyboard,
    Modal,
    PanResponder,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import AppCalendar from "./ui/app_calendar";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

type TodoDetailModalProps = {
  visible: boolean;
  todo: Todo | null;
  onClose: () => void;
  onUpdated: () => Promise<void> | void;
  readOnly?: boolean;
};

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, "0"),
);
const MINUTE_OPTIONS = ["00", "10", "20", "30", "40", "50"];

function formatDate(dateString: string) {
  const [year, month, day] = dateString.split("-");
  return `${year}. ${month}. ${day}`;
}

function formatTime(time?: string | null) {
  if (!time) return "시간 없음";
  const [hour = "00", minute = "00"] = time.split(":");
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
}

function parseDateParts(dateString: string) {
  const [year = "2026", month = "01", day = "01"] = dateString.split("-");
  return { year, month, day };
}

function makeDate(year: string, month: string, day: string) {
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function makeTime(hour: string, minute: string) {
  return `${hour}:${minute}`;
}

function splitTime(time?: string | null) {
  if (!time) return { hour: "09", minute: "00" };
  const [hour = "09", minute = "00"] = time.split(":");
  return { hour: hour.padStart(2, "0"), minute: minute.padStart(2, "0") };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function padNumber(value: number) {
  return String(value).padStart(2, "0");
}

function normalizeMinuteOption(minute: string) {
  return MINUTE_OPTIONS.includes(minute) ? minute : "00";
}

export function TodoDetailModal({
  visible,
  todo,
  onClose,
  onUpdated,
  readOnly = false,
}: TodoDetailModalProps) {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    modalRoot: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "transparent",
    },
    detailOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0, 0, 0, 0.4)",
    },
    detailCard: {
      width: "100%",
      maxHeight: SCREEN_HEIGHT * 0.82,
      backgroundColor: theme.card,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 20,
      paddingTop: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 8,
      overflow: "hidden",
    },
    detailHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    headerActions: { flexDirection: "row", alignItems: "center", gap: 12 },
    editButton: { paddingHorizontal: 8, paddingVertical: 4 },
    cancelText: { fontSize: 14, fontWeight: "700", color: theme.textMuted },
    saveButton: {
      backgroundColor: theme.main,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 10,
    },
    saveText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
    detailTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.textFaint,
      letterSpacing: 0.5,
    },
    detailRoutineTitle: {
      fontSize: 21,
      fontWeight: "800",
      color: theme.text,
      lineHeight: 28,
      marginBottom: 20,
    },
    infoList: { gap: 16, marginBottom: 28 },
    detailInfoRow: { flexDirection: "row", alignItems: "flex-start", gap: 16 },
    infoTextGroup: { flex: 1 },
    detailLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: theme.textMuted,
      marginBottom: 6,
      textTransform: "uppercase",
    },
    detailValue: { fontSize: 15, fontWeight: "600", color: theme.main },
    editScroll: { flexGrow: 0 },
    editScrollContent: { paddingBottom: Platform.OS === "ios" ? 200 : 120 },
    inputBlock: { marginBottom: 16 },
    editSectionLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.textMuted,
      marginBottom: 10,
    },
    titleInput: {
      borderWidth: 1,
      borderColor: theme.borderStrong,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      fontWeight: "600",
      color: theme.main,
      backgroundColor: theme.inputBg,
    },
    dateSelectButton: {
      borderWidth: 1,
      borderColor: theme.borderStrong,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 13,
      backgroundColor: theme.inputBg,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    dateSelectLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
    dateSelectText: { fontSize: 14, fontWeight: "600", color: theme.main },
    calendarContainer: {
      backgroundColor: theme.inputBg,
      borderRadius: 20,
      marginTop: 10,
      overflow: "hidden",
      paddingBottom: 10,
    },

    deleteIconButton: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.bg,
      borderWidth: 1,
      borderColor: theme.borderMid,
    },
    editIconButton: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.bg,
      borderWidth: 1,
      borderColor: theme.borderMid,
    },
    dragHandleArea: {
      width: "100%",
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      marginTop: -10,
      marginBottom: 2,
    },
    dragHandle: {
      width: 42,
      height: 4,
      borderRadius: 999,
      backgroundColor: theme.handle,
    },
    dialLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: theme.textMuted,
      marginBottom: 8,
    },
  });

  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const dragY = useRef(new Animated.Value(0)).current;

  const closeWithAnimation = useCallback(() => {
    Keyboard.dismiss();
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      dragY.setValue(0);
      onClose();
    });
  }, [dragY, onClose, slideAnim]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        gestureState.dy > 2 &&
        Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) dragY.setValue(gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120 || gestureState.vy > 1.2) {
          closeWithAnimation();
        } else {
          Animated.spring(dragY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    }),
  ).current;

  useEffect(() => {
    if (visible) {
      dragY.setValue(0);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const editScrollRef = useRef<ScrollView>(null);

  const [content, setContent] = useState("");
  const [dateYear, setDateYear] = useState("2026");
  const [dateMonth, setDateMonth] = useState("01");
  const [dateDay, setDateDay] = useState("01");
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [isTimed, setIsTimed] = useState(false);
  const [hour, setHour] = useState("09");
  const [minute, setMinute] = useState("00");

  const resetFormFromTodo = useCallback((targetTodo: Todo) => {
    const dateParts = parseDateParts(targetTodo.todoDate);
    const time = splitTime(targetTodo.todoTime);

    setIsEditMode(false);
    setShowCalendar(false);
    setContent(targetTodo.content);
    setDateYear(dateParts.year);
    setDateMonth(dateParts.month);
    setDateDay(dateParts.day);
    setIsTimed(Boolean(targetTodo.todoTime));
    setHour(time.hour);
    setMinute(time.minute);
  }, []);

  useEffect(() => {
    if (!todo || !visible) return;
    if (isEditMode) return;
    resetFormFromTodo(todo);
  }, [todo?.id, visible, resetFormFromTodo, isEditMode]);
  const previewTodo = useMemo(() => {
    if (!todo) return null;
    const nextDate = makeDate(dateYear, dateMonth, dateDay);
    return {
      ...todo,
      content,
      todoDate: nextDate,
      todoTime: isTimed ? makeTime(hour, minute) : null,
    };
  }, [todo, content, dateYear, dateMonth, dateDay, isTimed, hour, minute]);

  if (!todo || !previewTodo) return null;

  const selectedDateString = makeDate(dateYear, dateMonth, dateDay);

  const handleEdit = () => setIsEditMode(true);
  const handleCancelEdit = () => resetFormFromTodo(todo);

  const handleDelete = async () => {
    if (!todo) return;
    Alert.alert("할 일 삭제", "이 할 일을 삭제할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await TodoService.delete(todo.id);
            await onUpdated();
            closeWithAnimation();
          } catch (error) {
            console.error("할 일 삭제 실패", error);
            Alert.alert("오류", "할 일 삭제 중 문제가 발생했어요.");
          }
        },
      },
    ]);
  };
  const handleApplyTime = (time: { hour: string; minute: string }) => {
    setHour(time.hour);
    setMinute(time.minute);
    setShowTimeModal(false);
  };
  const handleSave = async () => {
    if (isSaving || !todo) return;

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      Alert.alert("안내", "할 일 내용을 입력해 주세요.");
      return;
    }

    const safeMonth = clamp(Number(dateMonth), 1, 12);
    const safeYear = clamp(Number(dateYear), 2000, 2099);
    const maxDay = getDaysInMonth(safeYear, safeMonth);
    const safeDay = clamp(Number(dateDay), 1, maxDay);
    const safeHour = clamp(Number(hour), 0, 23);
    const safeMinute = clamp(Number(minute), 0, 59);

    const nextDate = makeDate(
      String(safeYear),
      padNumber(safeMonth),
      padNumber(safeDay),
    );
    const nextTime = isTimed
      ? makeTime(padNumber(safeHour), padNumber(safeMinute))
      : null;

    setIsSaving(true);
    try {
      await TodoService.update(todo.id, {
        todoDate: nextDate,
        todoTime: nextTime,
        content: trimmedContent,
      });

      setIsEditMode(false);
      closeWithAnimation();
      await onUpdated();
    } catch (error) {
      console.error("할 일 수정 실패", error);
      Alert.alert("오류", "할 일 수정 중 문제가 발생했어요.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="none">
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.detailOverlay}
            onPress={closeWithAnimation}
          />

          <Animated.View
            style={{
              transform: [{ translateY: Animated.add(slideAnim, dragY) }],
            }}
          >
            <View
              style={[
                styles.detailCard,
                { paddingBottom: 100, marginBottom: -100 },
              ]}
            >
              <View style={styles.dragHandleArea} {...panResponder.panHandlers}>
                <View style={styles.dragHandle} />
              </View>

              <View style={styles.detailHeader}>
                <Text style={styles.detailTitle}>
                  {isEditMode ? "할 일 수정" : "상세 정보"}
                </Text>
                <View style={styles.headerActions}>
                  {!isEditMode ? (
                    <>
                      {!readOnly && (
                        <>
                          <TouchableOpacity
                            onPress={handleEdit}
                            style={styles.editIconButton}
                          >
                            <Ionicons
                              name="pencil-outline"
                              size={18}
                              color={theme.main}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={handleDelete}
                            style={styles.deleteIconButton}
                          >
                            <Ionicons
                              name="trash-outline"
                              size={18}
                              color="#D45A68"
                            />
                          </TouchableOpacity>
                        </>
                      )}
                      <TouchableOpacity onPress={closeWithAnimation}>
                        <IconSymbol
                          name="xmark"
                          size={20}
                          color={theme.textFaint}
                        />
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity
                        onPress={handleCancelEdit}
                        style={styles.editButton}
                      >
                        <Text style={styles.cancelText}>취소</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          if (!isSaving) handleSave();
                        }}
                        style={[
                          styles.saveButton,
                          isSaving && { opacity: 0.5 },
                        ]}
                        disabled={isSaving}
                      >
                        <Text style={styles.saveText}>
                          {isSaving ? "저장 중" : "저장"}
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>

              {!isEditMode ? (
                <>
                  <Text style={styles.detailRoutineTitle} numberOfLines={2}>
                    {previewTodo.content}
                  </Text>

                  <View style={styles.infoList}>
                    <View style={styles.detailInfoRow}>
                      <IconSymbol
                        name="calendar"
                        size={18}
                        color={theme.textMuted}
                      />
                      <View style={styles.infoTextGroup}>
                        <Text style={styles.detailLabel}>날짜</Text>
                        <Text style={styles.detailValue}>
                          {formatDate(previewTodo.todoDate)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.detailInfoRow}>
                      <IconSymbol
                        name="clock"
                        size={18}
                        color={theme.textMuted}
                      />
                      <View style={styles.infoTextGroup}>
                        <Text style={styles.detailLabel}>시간</Text>
                        <Text style={styles.detailValue}>
                          {formatTime(previewTodo.todoTime)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </>
              ) : (
                <ScrollView
                  ref={editScrollRef}
                  style={styles.editScroll}
                  contentContainerStyle={styles.editScrollContent}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="always"
                  keyboardDismissMode="on-drag"
                >
                  <View style={styles.inputBlock}>
                    <Text style={styles.editSectionLabel}>내용</Text>
                    <TextInput
                      value={content}
                      onChangeText={setContent}
                      placeholder="할 일을 입력해 주세요"
                      placeholderTextColor={theme.textFaint}
                      style={styles.titleInput}
                    />
                  </View>

                  <View style={styles.inputBlock}>
                    <Text style={styles.editSectionLabel}>날짜</Text>
                    <TouchableOpacity
                      style={styles.dateSelectButton}
                      onPress={() => setShowCalendar((prev) => !prev)}
                    >
                      <View style={styles.dateSelectLeft}>
                        <IconSymbol
                          name="calendar"
                          size={18}
                          color={theme.main}
                        />
                        <Text style={styles.dateSelectText}>
                          {formatDate(selectedDateString)}
                        </Text>
                      </View>
                      <IconSymbol
                        name={showCalendar ? "chevron.up" : "chevron.down"}
                        size={16}
                        color={theme.textMuted}
                      />
                    </TouchableOpacity>

                    {showCalendar && (
                      <View style={styles.calendarContainer}>
                        <AppCalendar
                          current={selectedDateString}
                          markedDates={{
                            [selectedDateString]: {
                              selected: true,
                              selectedColor: theme.borderStrong,
                            },
                          }}
                          onDayPress={(day) => {
                            const parts = parseDateParts(day.dateString);
                            setDateYear(parts.year);
                            setDateMonth(parts.month);
                            setDateDay(parts.day);
                            setShowCalendar(false);
                          }}
                        />
                      </View>
                    )}
                  </View>

                  <View style={styles.inputBlock}>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 10,
                      }}
                    >
                      <Text style={styles.editSectionLabel}>시간 설정</Text>
                      <Switch
                        value={isTimed}
                        onValueChange={setIsTimed}
                        trackColor={{ true: "#9FA2D6" }}
                      />
                    </View>

                    {isTimed && (
                      <TouchableOpacity
                        style={styles.dateSelectButton}
                        onPress={() => setShowTimeModal(true)}
                      >
                        <View style={styles.dateSelectLeft}>
                          <IconSymbol
                            name="clock"
                            size={18}
                            color={theme.main}
                          />
                          <Text style={styles.dateSelectText}>
                            {`${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`}
                          </Text>
                        </View>
                        <IconSymbol
                          name="chevron.right"
                          size={16}
                          color={theme.textMuted}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                </ScrollView>
              )}
            </View>
          </Animated.View>
        </View>
        <SingleTimePickerModal
          visible={showTimeModal}
          hour={hour}
          minute={minute}
          onClose={() => setShowTimeModal(false)}
          onApply={handleApplyTime}
        />
      </Modal>
    </>
  );
}
