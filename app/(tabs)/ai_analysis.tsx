import {
  useAiRecommend,
  GOAL_OPTIONS,
  TIME_OPTIONS,
  HOBBY_OPTIONS,
  type ChatMessage,
} from "@/hooks/useAiRecommend";
import type { RecommendedRoutine } from "@/lib/data/ai_api";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ── Colors ──
const C = {
  bg: "#F3F5FA",
  primary: "#4A7CFF",
  bubble: "#F0F2F8",
  userBubble: "#4A7CFF",
  text: "#2A3054",
  textSub: "#8A8C9A",
  border: "#E8EAF0",
  check: "#4A7CFF",
  checkBg: "#EBF0FF",
};

function AiAvatar() {
  return (
    <View style={s.avatar}>
      <Text style={{ fontSize: 18 }}>🤖</Text>
    </View>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[s.chip, selected && s.chipSelected]} onPress={onPress} activeOpacity={0.7}>
      {selected && <Ionicons name="checkmark" size={14} color="#fff" style={{ marginRight: 4 }} />}
      <Text style={[s.chipText, selected && s.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

function RoutineCheckItem({ routine, checked, onToggle }: { routine: RecommendedRoutine; checked: boolean; onToggle: () => void }) {
  return (
    <TouchableOpacity style={s.routineItem} onPress={onToggle} activeOpacity={0.7}>
      <View style={[s.checkbox, checked && s.checkboxChecked]}>
        {checked && <Ionicons name="checkmark" size={14} color="#fff" />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.routineTitle}>{routine.startTime} – {routine.endTime} {routine.title}</Text>
        {routine.description ? <Text style={s.routineDesc}>({routine.description})</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

function AiBubble({ msg }: { msg: ChatMessage }) {
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
  const {
    step, messages, isLoading, error, profile,
    recommendedRoutines, checkedRoutineIds,
    startConversation, submitGoals, submitTime, submitHobbies,
    toggleRoutineCheck, saveSelectedRoutines,
  } = useAiRecommend();

  const scrollRef = useRef<ScrollView>(null);
  const [localGoals, setLocalGoals] = useState<string[]>([]);
  const [localTime, setLocalTime] = useState("");
  const [localHobbies, setLocalHobbies] = useState<string[]>([]);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
  }, [messages, step, isLoading]);

  const toggleGoal = (g: string) =>
    setLocalGoals((p) => (p.includes(g) ? p.filter((x) => x !== g) : [...p, g]));
  const toggleHobby = (h: string) =>
    setLocalHobbies((p) => (p.includes(h) ? p.filter((x) => x !== h) : [...p, h]));

  const handleSaveRoutines = useCallback(async () => {
    if (checkedRoutineIds.size === 0) {
      Alert.alert("선택 없음", "추가할 루틴을 선택해주세요.");
      return;
    }
    const ok = await saveSelectedRoutines();
    if (ok) Alert.alert("완료", `${checkedRoutineIds.size}개의 루틴이 추가되었습니다!`);
  }, [checkedRoutineIds, saveSelectedRoutines]);

  // ── 대화 시작 전 ──
  if (step === "init") {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <Text style={s.headerTitle}>루틴 추천</Text>
        </View>
        <View style={s.centerCard}>
          <Text style={s.centerIcon}>🤖</Text>
          <Text style={s.centerTitle}>AI 루틴 추천</Text>
          <Text style={s.centerDesc}>
            대화를 통해 나에게 맞는{"\n"}루틴을 추천받아 보세요!
          </Text>
          {profile.job ? (
            <View style={s.profileBadge}>
              <Text style={s.profileBadgeText}>
                {profile.gender} · {profile.ageGroup} · {profile.job}
              </Text>
            </View>
          ) : null}
          <TouchableOpacity style={s.primaryBtn} onPress={startConversation}>
            <Ionicons name="chatbubbles" size={20} color="#fff" />
            <Text style={s.primaryBtnText}>대화 시작하기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── 대화 진행 중 ──
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.headerTitle}>루틴 추천</Text>
        {(step === "goal" || step === "time" || step === "hobby") && (
          <View style={s.stepBadge}>
            <Text style={s.stepBadgeText}>
              {step === "goal" ? "1/3" : step === "time" ? "2/3" : "3/3"}
            </Text>
          </View>
        )}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView ref={scrollRef} style={s.chatArea} contentContainerStyle={s.chatContent} showsVerticalScrollIndicator={false}>
          {messages.map((msg) =>
            msg.role === "ai" ? <AiBubble key={msg.id} msg={msg} /> : <UserBubble key={msg.id} msg={msg} />
          )}

          {isLoading && (
            <View style={s.aiBubbleRow}>
              <AiAvatar />
              <View style={[s.aiBubble, { flexDirection: "row" }]}>
                <ActivityIndicator size="small" color={C.primary} />
                <Text style={[s.aiBubbleText, { marginLeft: 8 }]}>루틴을 생성하고 있어요...</Text>
              </View>
            </View>
          )}

          {step === "result" && recommendedRoutines.length > 0 && (
            <View style={s.resultCard}>
              {recommendedRoutines.map((r) => (
                <RoutineCheckItem key={r.id} routine={r} checked={checkedRoutineIds.has(r.id)} onToggle={() => toggleRoutineCheck(r.id)} />
              ))}
              <TouchableOpacity style={s.addRoutineBtn} onPress={handleSaveRoutines}>
                <Text style={s.addRoutineBtnText}>루틴 추가하기</Text>
              </TouchableOpacity>
            </View>
          )}

          {error && (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}
        </ScrollView>

        {/* ── 하단 선택 영역 ── */}
        {step === "goal" && (
          <View style={s.bottomBar}>
            <View style={s.chipWrap}>
              {GOAL_OPTIONS.map((g) => (
                <Chip key={g} label={g} selected={localGoals.includes(g)} onPress={() => toggleGoal(g)} />
              ))}
            </View>
            <TouchableOpacity style={[s.nextBtn, localGoals.length === 0 && { opacity: 0.4 }]} disabled={localGoals.length === 0} onPress={() => { submitGoals(localGoals); setLocalGoals([]); }}>
              <Text style={s.nextBtnText}>다음</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === "time" && (
          <View style={s.bottomBar}>
            <View style={s.chipWrap}>
              {TIME_OPTIONS.map((t) => (
                <Chip key={t} label={t} selected={localTime === t} onPress={() => setLocalTime(t)} />
              ))}
            </View>
            <TouchableOpacity style={[s.nextBtn, !localTime && { opacity: 0.4 }]} disabled={!localTime} onPress={() => { submitTime(localTime); setLocalTime(""); }}>
              <Text style={s.nextBtnText}>다음</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === "hobby" && (
          <View style={s.bottomBar}>
            <View style={s.chipWrap}>
              {HOBBY_OPTIONS.map((h) => (
                <Chip key={h} label={h} selected={localHobbies.includes(h)} onPress={() => toggleHobby(h)} />
              ))}
            </View>
            <TouchableOpacity style={[s.nextBtn, localHobbies.length === 0 && { opacity: 0.4 }]} disabled={localHobbies.length === 0} onPress={() => { submitHobbies(localHobbies); setLocalHobbies([]); }}>
              <Text style={s.nextBtnText}>루틴 추천 받기</Text>
            </TouchableOpacity>
          </View>
        )}

        {(step === "done" || step === "result") && (
          <View style={s.bottomBar}>
            <TouchableOpacity style={s.restartBtn} onPress={() => { setLocalGoals([]); setLocalTime(""); setLocalHobbies([]); startConversation(); }}>
              <Ionicons name="refresh" size={18} color={C.primary} />
              <Text style={s.restartBtnText}>다시 추천받기</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ──
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: C.text },
  stepBadge: { backgroundColor: C.primary, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  stepBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  centerCard: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 },
  centerIcon: { fontSize: 56, marginBottom: 16 },
  centerTitle: { fontSize: 22, fontWeight: "800", color: C.text, marginBottom: 8 },
  centerDesc: { fontSize: 15, color: C.textSub, textAlign: "center", lineHeight: 22, marginBottom: 20 },
  profileBadge: { backgroundColor: C.checkBg, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 20 },
  profileBadgeText: { color: C.primary, fontSize: 13, fontWeight: "600" },
  primaryBtn: { flexDirection: "row", backgroundColor: C.primary, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 28, alignItems: "center", gap: 8, shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4, marginTop: 4, width: "100%", justifyContent: "center" },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  chatArea: { flex: 1 },
  chatContent: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 },

  aiBubbleRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.checkBg, justifyContent: "center", alignItems: "center", marginRight: 8, marginTop: 2 },
  aiBubble: { backgroundColor: C.bubble, borderRadius: 18, borderTopLeftRadius: 4, padding: 14, maxWidth: "78%", flexWrap: "wrap", alignItems: "center" },
  aiBubbleText: { fontSize: 14, color: C.text, lineHeight: 21 },
  userBubbleRow: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 12 },
  userBubble: { backgroundColor: C.userBubble, borderRadius: 18, borderTopRightRadius: 4, padding: 14, maxWidth: "70%" },
  userBubbleText: { fontSize: 14, color: "#fff", lineHeight: 21 },

  chip: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1.5, borderColor: C.border },
  chipSelected: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { fontSize: 14, color: C.text, fontWeight: "600" },
  chipTextSelected: { color: "#fff" },

  bottomBar: { backgroundColor: "#fff", borderTopWidth: 1, borderColor: C.border, paddingHorizontal: 16, paddingTop: 14, paddingBottom: Platform.OS === "ios" ? 28 : 14 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  nextBtn: { backgroundColor: C.primary, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  nextBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  resultCard: { backgroundColor: "#fff", borderRadius: 20, padding: 16, marginTop: 4, marginBottom: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  routineItem: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 10, borderBottomWidth: 1, borderColor: "#F3F4F8" },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: C.border, marginRight: 12, marginTop: 1, justifyContent: "center", alignItems: "center" },
  checkboxChecked: { backgroundColor: C.check, borderColor: C.check },
  routineTitle: { fontSize: 14, fontWeight: "700", color: C.text, lineHeight: 20 },
  routineDesc: { fontSize: 12, color: C.textSub, marginTop: 2 },
  addRoutineBtn: { backgroundColor: C.primary, borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 14 },
  addRoutineBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  restartBtn: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, paddingVertical: 8 },
  restartBtnText: { color: C.primary, fontSize: 15, fontWeight: "700" },

  errorBox: { backgroundColor: "#FFF0F0", borderRadius: 12, padding: 12, marginTop: 8 },
  errorText: { color: "#E74C3C", fontSize: 13 },
});
