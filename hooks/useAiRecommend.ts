// hooks/useAiRecommend.ts
import type {
  ConversationInput,
  RecommendedRoutine,
  UserProfile,
} from "@/lib/data/ai_api";
import {
  getDummyUserProfile,
  requestRoutineRecommendation,
} from "@/lib/data/ai_api";
import { RoutineStorage } from "@/lib/storage";
import type { ScheduleRoutine } from "@/types/routine";
import { useCallback, useEffect, useState } from "react";

// ── 대화 단계 ──
export type ConversationStep =
  | "init" // 시작 전
  | "goal" // 목적 선택
  | "time" // 활동 시간 선택
  | "hobby" // 취미 선택
  | "loading" // AI 응답 대기
  | "result" // 루틴 추천 결과
  | "done"; // 저장 완료

// ── 채팅 메시지 ──
export interface ChatMessage {
  id: string;
  role: "ai" | "user";
  text: string;
}

// ── 선택지 ──
export const GOAL_OPTIONS = ["운동", "공부", "명상", "독서", "건강관리", "기타"];
export const TIME_OPTIONS = ["아침", "점심", "저녁"];
export const HOBBY_OPTIONS = [
  "독서", "등산", "요리", "게임", "음악", "그림", "영화감상", "기타",
];

export const useAiRecommend = () => {
  const [step, setStep] = useState<ConversationStep>("init");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 유저 프로필 (DB에서 가져올 데이터 — 지금은 더미)
  const [profile, setProfile] = useState<UserProfile>({
    job: "",
    gender: "",
    ageGroup: "",
  });

  // 대화 입력
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState("");

  // 추천 결과
  const [recommendedRoutines, setRecommendedRoutines] = useState<RecommendedRoutine[]>([]);
  const [checkedRoutineIds, setCheckedRoutineIds] = useState<Set<string>>(new Set());

  // 메시지 추가
  const addMessage = useCallback((msg: Omit<ChatMessage, "id">) => {
    const newMsg: ChatMessage = {
      ...msg,
      id: `msg-${Date.now()}-${Math.random()}`,
    };
    setMessages((prev) => [...prev, newMsg]);
  }, []);

  // ── 초기화: 유저 프로필 로드 (더미) ──
  useEffect(() => {
    const p = getDummyUserProfile();
    setProfile(p);
  }, []);

  // ── 대화 시작 ──
  const startConversation = useCallback(() => {
    setMessages([]);
    setSelectedGoals([]);
    setSelectedTime("");
    setRecommendedRoutines([]);
    setCheckedRoutineIds(new Set());
    setError(null);

    const profileText =
      profile.job && profile.gender && profile.ageGroup
        ? `프로필: ${profile.gender} / ${profile.ageGroup} / ${profile.job}\n\n`
        : "";

    addMessage({
      role: "ai",
      text: `안녕하세요! 🤖\n${profileText}맞춤 루틴을 추천해 드릴게요.\n어떤 목표를 가지고 계신가요?`,
    });

    setStep("goal");
  }, [profile, addMessage]);

  // ── 목적 선택 완료 ──
  const submitGoals = useCallback(
    (goals: string[]) => {
      setSelectedGoals(goals);
      addMessage({ role: "user", text: goals.join(" + ") });
      addMessage({
        role: "ai",
        text: `목표: ${goals.join(" + ")} 👍\n\n주로 활동 가능한 시간은 언제인가요?`,
      });
      setStep("time");
    },
    [addMessage]
  );

  // ── 시간대 선택 완료 ──
  const submitTime = useCallback(
    (time: string) => {
      setSelectedTime(time);
      addMessage({ role: "user", text: time });
      addMessage({
        role: "ai",
        text: `주요 활동 시간: ${time} ⏰\n\n어떤 활동을 선호하시나요?`,
      });
      setStep("hobby");
    },
    [addMessage]
  );

  // ── 취미 선택 완료 → AI 호출 ──
  const submitHobbies = useCallback(
    async (hobbies: string[]) => {
      addMessage({ role: "user", text: hobbies.join(" + ") });

      setStep("loading");
      setIsLoading(true);

      try {
        const input: ConversationInput = {
          goals: selectedGoals,
          timeSlot: selectedTime,
          hobbies,
        };

        const routines = await requestRoutineRecommendation(profile, input);
        setRecommendedRoutines(routines);

        const allIds = new Set(routines.map((r) => r.id));
        setCheckedRoutineIds(allIds);

        const summary = `'${selectedGoals.join(" + ")} + ${hobbies.join(" + ")}', ${selectedTime}에 맞춰\n다음과 같은 루틴을 추천드립니다 👇`;
        addMessage({ role: "ai", text: summary });

        setStep("result");
      } catch (e: any) {
        setError(e?.message || "루틴 추천에 실패했습니다.");
        addMessage({
          role: "ai",
          text: `죄송합니다, 추천 중 오류가 발생했습니다.`,
        });
        setStep("goal");
      } finally {
        setIsLoading(false);
      }
    },
    [selectedGoals, selectedTime, profile, addMessage]
  );

  // ── 루틴 체크 토글 ──
  const toggleRoutineCheck = useCallback((routineId: string) => {
    setCheckedRoutineIds((prev) => {
      const next = new Set(prev);
      if (next.has(routineId)) next.delete(routineId);
      else next.add(routineId);
      return next;
    });
  }, []);

  // ── 선택된 루틴 저장 ──
  const saveSelectedRoutines = useCallback(async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const selected = recommendedRoutines.filter((r) =>
        checkedRoutineIds.has(r.id)
      );

      for (const routine of selected) {
        const newRoutine: ScheduleRoutine = {
          id: Date.now() + Math.floor(Math.random() * 10000),
          title: routine.title,
          categoryName: routine.category,
          startDate: today,
          endDate: today,
          startTime: routine.startTime,
          endTime: routine.endTime,
          alarm: false,
          state: true,
          completedDates: [],
          repeatOption: "DAILY",
        };
        await RoutineStorage.save(newRoutine);
      }

      addMessage({
        role: "ai",
        text: `✅ ${selected.length}개의 루틴이 추가되었습니다!\n타임테이블에서 확인해 보세요.`,
      });
      setStep("done");
      return true;
    } catch (e) {
      console.error("루틴 저장 실패", e);
      setError("루틴 저장에 실패했습니다.");
      return false;
    }
  }, [recommendedRoutines, checkedRoutineIds, addMessage]);

  return {
    step,
    messages,
    isLoading,
    error,
    profile,
    recommendedRoutines,
    checkedRoutineIds,
    startConversation,
    submitGoals,
    submitTime,
    submitHobbies,
    toggleRoutineCheck,
    saveSelectedRoutines,
    setError,
  };
};
