import { Header } from "@/components/ui/_header";
import {
  HOBBY_OPTIONS,
  PURPOSE_OPTIONS,
  START_OPTIONS,
  TIME_OPTIONS, // 💡 훅에서 선언된 시작 옵션 배열 가져오기
  useAiRecommend,
  type ChatMessage,
} from "@/hooks/useAiRecommend";
import { useTheme, type Theme } from "@/lib/constants/ThemeContext";
import type { RecommendedRoutine } from "@/lib/data/ai_api";
import type { RoutineCategory } from "@/types/routine";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ── Styles ──
const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    container: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 10,
      backgroundColor: theme.bg,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 4,
      paddingBottom: 10,
    },
    centerCard: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 24,
      backgroundColor: theme.card,
      borderRadius: 30,
      marginBottom: 20,
    },
    centerIcon: { fontSize: 56, marginBottom: 16 },
    centerTitle: {
      fontSize: 22,
      fontWeight: "800",
      color: theme.text,
      marginBottom: 8,
    },
    centerDesc: {
      fontSize: 15,
      color: theme.textSecondary,
      textAlign: "center",
      lineHeight: 22,
      marginBottom: 32,
    },
    startBtn: {
      flexDirection: "row",
      backgroundColor: theme.main,
      borderRadius: 22,
      paddingVertical: 16,
      paddingHorizontal: 40,
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      shadowColor: theme.main,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    startBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
    chatArea: {
      flex: 1,
      backgroundColor: theme.card,
      borderRadius: 30,
      marginBottom: 10,
      overflow: "hidden",
    },
    chatContent: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 16 },
    aiBubbleRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 12,
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.mainLight,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 8,
      marginTop: 2,
    },
    aiBubble: {
      backgroundColor: theme.card,
      borderRadius: 20,
      borderTopLeftRadius: 4,
      padding: 14,
      maxWidth: "78%",
      borderWidth: 1,
      borderColor: theme.border,
    },
    aiBubbleText: {
      fontSize: 14,
      color: theme.text,
      lineHeight: 21,
      fontWeight: "500",
    },
    userBubbleRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginBottom: 12,
    },
    userBubble: {
      backgroundColor: theme.textMuted,
      borderRadius: 20,
      borderTopRightRadius: 4,
      padding: 14,
      maxWidth: "70%",
    },
    userBubbleText: {
      fontSize: 14,
      color: "#fff",
      lineHeight: 21,
      fontWeight: "600",
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.card,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderWidth: 1.5,
      borderColor: theme.border,
    },
    chipSelected: { backgroundColor: theme.main, borderColor: theme.main },
    chipText: { fontSize: 14, color: theme.text, fontWeight: "600" },
    chipTextSelected: { color: "#fff" },
    bottomBar: {
      backgroundColor: theme.card,
      borderTopWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: Platform.OS === "ios" ? 28 : 16,
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
    },
    optionGuidance: {
      fontSize: 13,
      color: theme.textSecondary,
      fontWeight: "600",
      marginBottom: 10,
      textAlign: "center",
    },
    chipWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 12,
      justifyContent: "center",
    },
    nextBtn: {
      backgroundColor: theme.main,
      borderRadius: 16,
      paddingVertical: 14,
      alignItems: "center",
    },
    nextBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
    resultCard: {
      backgroundColor: theme.card,
      borderRadius: 20,
      padding: 16,
      marginTop: 4,
      marginBottom: 8,
    },
    routineItemWrapper: {
      flexDirection: "row",
      alignItems: "center",
      borderBottomWidth: 1,
      borderColor: theme.divider,
    },
    routineItem: {
      flex: 1,
      flexDirection: "row",
      alignItems: "flex-start",
      paddingVertical: 12,
    },
    routineTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.text,
      lineHeight: 20,
    },
    routineDesc: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
    restartBtn: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 6,
      paddingVertical: 8,
    },
    restartBtnText: { color: theme.main, fontSize: 15, fontWeight: "700" },
    errorBox: {
      backgroundColor: "#FFF0F0",
      borderRadius: 12,
      padding: 12,
      marginTop: 8,
    },
    errorText: { color: "#E74C3C", fontSize: 13 },
  });

function AiAvatar() {
  const { theme } = useTheme();
  const s = makeStyles(theme);

  return (
    <View style={s.avatar}>
      <Ionicons name="sparkles" size={20} color={theme.main} />
    </View>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const s = makeStyles(theme);
  return (
    <TouchableOpacity
      style={[s.chip, selected && s.chipSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {selected && (
        <Ionicons
          name="checkmark"
          size={14}
          color="#fff"
          style={{ marginRight: 4 }}
        />
      )}
      <Text style={[s.chipText, selected && s.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

function RoutineCheckItem({
  routine,
  onEdit,
}: {
  routine: RecommendedRoutine;
  onEdit: () => void;
}) {
  const { theme } = useTheme();
  const s = makeStyles(theme);
  const hasTimeRange =
    routine.startTime.includes(":") && routine.endTime.includes(":");
  const timeLabel = hasTimeRange
    ? `${routine.startTime} – ${routine.endTime}`
    : `추천: ${routine.startTime}`;

  return (
    <View style={s.routineItemWrapper}>
      <TouchableOpacity
        style={s.routineItem}
        onPress={onEdit}
        activeOpacity={0.7}
      >
        <View style={{ flex: 1 }}>
          <Text style={s.routineTitle}>
            {timeLabel} | {routine.title}
          </Text>
          {routine.description ? (
            <Text style={s.routineDesc}>({routine.description})</Text>
          ) : null}
        </View>
        <Ionicons
          name="add-circle-outline"
          size={24}
          color={theme.main}
          style={{ alignSelf: "center", marginRight: 4 }}
        />
      </TouchableOpacity>
    </View>
  );
}

function AiBubble({ msg }: { msg: ChatMessage }) {
  const { theme } = useTheme();
  const s = makeStyles(theme);
  return (
    <View style={s.aiBubbleRow}>
      <AiAvatar />
      <View style={s.aiBubble}>
        <Text style={s.aiBubbleText}>{msg.text}</Text>
      </View>
    </View>
  );
}

function UserBubble({ msg }: { msg: ChatMessage }) {
  const { theme } = useTheme();
  const s = makeStyles(theme);
  return (
    <View style={s.userBubbleRow}>
      <View style={s.userBubble}>
        <Text style={s.userBubbleText}>{msg.text}</Text>
      </View>
    </View>
  );
}

// ══════════════════════════════════════
export default function AiAnalysisScreen() {
  const { theme } = useTheme();
  const s = makeStyles(theme);
  const {
    step,
    messages,
    isLoading,
    error,
    categories,
    recommendedRoutines,
    startConversation,
    selectRecommendFlow,
    submitCategory,
    submitPurpose,
    submitTime,
    submitHobbies,
    viewTodayRecords,
  } = useAiRecommend();

  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [localCategory, setLocalCategory] = useState<RoutineCategory | null>(
    null,
  );
  const [localPurpose, setLocalPurpose] = useState("");
  const [localTime, setLocalTime] = useState("");
  const [localHobbies, setLocalHobbies] = useState<string[]>([]);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
  }, [messages, step, isLoading]);

  const toggleHobby = (h: string) =>
    setLocalHobbies((p) =>
      p.includes(h) ? p.filter((x) => x !== h) : [...p, h],
    );

  const handleEditAndAdd = useCallback(
    (routine: RecommendedRoutine) => {
      router.push({
        pathname: "/modal",
        params: {
          title: routine.title,
          category: routine.category,
          description: routine.description,
        },
      });
    },
    [router],
  );

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        <Header />

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            ref={scrollRef}
            style={s.chatArea}
            contentContainerStyle={s.chatContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() =>
              scrollRef.current?.scrollToEnd({ animated: true })
            }
            onLayout={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.map((msg) =>
              msg.role === "ai" ? (
                <AiBubble key={msg.id} msg={msg} />
              ) : (
                <UserBubble key={msg.id} msg={msg} />
              ),
            )}

            {isLoading && (
              <View style={s.aiBubbleRow}>
                <AiAvatar />
                <View style={[s.aiBubble, { flexDirection: "row" }]}>
                  <ActivityIndicator size="small" color={theme.main} />
                  <Text style={[s.aiBubbleText, { marginLeft: 8 }]}>
                    기록을 가져오는 중입니다...
                  </Text>
                </View>
              </View>
            )}

            {step === "result" && recommendedRoutines.length > 0 && (
              <View style={s.resultCard}>
                {recommendedRoutines.map((r) => (
                  <RoutineCheckItem
                    key={r.id}
                    routine={r}
                    onEdit={() => handleEditAndAdd(r)}
                  />
                ))}
              </View>
            )}

            {error && (
              <View style={s.errorBox}>
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}
          </ScrollView>

          {/* ── 하단 선택 영역 ── */}
          {/* 💡 수정 2: 대화창에 첫 진입했을 때 하단 바에 분기 옵션 버튼 노출 */}
          {step === "start" && (
            <View style={s.bottomBar}>
              <Text style={s.optionGuidance}>
                원하시는 진행 방식을 선택해 주세요
              </Text>
              <View style={s.chipWrap}>
                {START_OPTIONS.map((o) => (
                  <Chip
                    key={o.key}
                    label={o.label}
                    selected={false}
                    onPress={() => {
                      if (o.key === "start") {
                        selectRecommendFlow();
                      } else if (o.key === "records") {
                        viewTodayRecords();
                      }
                    }}
                  />
                ))}
              </View>
            </View>
          )}

          {step === "goal" && (
            <View style={s.bottomBar}>
              <View style={s.chipWrap}>
                {categories.map((c) => (
                  <Chip
                    key={c.id}
                    label={c.name}
                    selected={localCategory?.id === c.id}
                    onPress={() => setLocalCategory(c)}
                  />
                ))}
              </View>
              <TouchableOpacity
                style={[s.nextBtn, !localCategory && { opacity: 0.4 }]}
                disabled={!localCategory}
                onPress={() => {
                  if (localCategory) {
                    submitCategory(localCategory);
                    setLocalCategory(null);
                  }
                }}
              >
                <Text style={s.nextBtnText}>다음</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === "purpose" && (
            <View style={s.bottomBar}>
              <View style={s.chipWrap}>
                {PURPOSE_OPTIONS.map((p) => (
                  <Chip
                    key={p}
                    label={p}
                    selected={localPurpose === p}
                    onPress={() => setLocalPurpose(p)}
                  />
                ))}
              </View>
              <TouchableOpacity
                style={[s.nextBtn, !localPurpose && { opacity: 0.4 }]}
                disabled={!localPurpose}
                onPress={() => {
                  submitPurpose(localPurpose);
                  setLocalPurpose("");
                }}
              >
                <Text style={s.nextBtnText}>다음</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === "time" && (
            <View style={s.bottomBar}>
              <View style={s.chipWrap}>
                {TIME_OPTIONS.map((t) => (
                  <Chip
                    key={t}
                    label={t}
                    selected={localTime === t}
                    onPress={() => setLocalTime(t)}
                  />
                ))}
              </View>
              <TouchableOpacity
                style={[s.nextBtn, !localTime && { opacity: 0.4 }]}
                disabled={!localTime}
                onPress={() => {
                  submitTime(localTime);
                  setLocalTime("");
                }}
              >
                <Text style={s.nextBtnText}>다음</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === "hobby" && (
            <View style={s.bottomBar}>
              <View style={s.chipWrap}>
                {HOBBY_OPTIONS.map((h) => (
                  <Chip
                    key={h}
                    label={h}
                    selected={localHobbies.includes(h)}
                    onPress={() => toggleHobby(h)}
                  />
                ))}
              </View>
              <TouchableOpacity
                style={[
                  s.nextBtn,
                  localHobbies.length === 0 && { opacity: 0.4 },
                ]}
                disabled={localHobbies.length === 0}
                onPress={() => {
                  submitHobbies(localHobbies);
                  setLocalHobbies([]);
                }}
              >
                <Text style={s.nextBtnText}>루틴 추천 받기</Text>
              </TouchableOpacity>
            </View>
          )}

          {(step === "done" || step === "result") && (
            <View style={s.bottomBar}>
              <TouchableOpacity
                style={s.restartBtn}
                onPress={() => {
                  setLocalCategory(null);
                  setLocalPurpose("");
                  setLocalTime("");
                  setLocalHobbies([]);
                  startConversation();
                }}
              >
                <Ionicons name="refresh" size={18} color={theme.main} />
                <Text style={s.restartBtnText}>다시 선택하기</Text>
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}
