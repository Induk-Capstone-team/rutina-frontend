// hooks/useAiRecommend.ts
import type { RecommendedRoutine, UserProfile } from "@/lib/data/ai_api";
import { requestRoutineRecommendation, requestTodayRecommendations } from "@/lib/data/ai_api";
import { authApi } from "@/lib/data/auth_api";
import { CategoryApi } from "@/lib/data/category_api";
import { RoutineStorage } from "@/lib/storage";
import type { RoutineCategory, ScheduleRoutine } from "@/types/routine";
import { useCallback, useEffect, useState } from "react";

// ── 대화 단계 ──
export type ConversationStep =
  | "start" // 대화 or 기록 보기
  | "goal" // 카테고리 선택
  | "purpose" // 목적 선택
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

export const START_OPTIONS = [
  { key: "start", label: "루틴 추천 받기" },
  { key: "records", label: "오늘 기록 보기" },
];

// ── 선택지 ──
export const TIME_OPTIONS = ["아침", "오전", "오후", "저녁", "밤"];
export const PURPOSE_OPTIONS = [
  "건강 관리",
  "자기계발",
  "공부/집중",
  "생활 습관 개선",
  "취미 관리",
];
export const HOBBY_OPTIONS = [
  "독서",
  "운동",
  "음악",
  "영화/드라마",
  "게임",
  "요리",
  "산책",
  "일기",
  "공부",
  "청소/정리",
  "없음",
];


function mapCategoryToActivityType(categoryName: string): string {
  const name = categoryName.trim();
  if (
    name.includes("훈련") ||
    name.includes("운동") ||
    name.includes("등교") ||
    name.includes("활력")
  ) {
    return "동적인 활동";
  }
  if (
    name.includes("휴식") ||
    name.includes("멘탈") ||
    name.includes("회복") ||
    name.includes("정산")
  ) {
    return "정적인 활동";
  }
  if (name.includes("교류") || name.includes("가족")) {
    return "함께 하는 활동";
  }
  if (name.includes("나") || name.includes("취미")) {
    return "혼자 하는 활동";
  }
  return "실내 활동";
}


export const useAiRecommend = () => {
  const [step, setStep] = useState<ConversationStep>("start");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [start, setStart] = useState<"goal" | "records" | null>(null);

  // 유저 프로필
  const [profile, setProfile] = useState<UserProfile>({
    job: "",
    gender: "",
    ageGroup: "",
  });

  // 로드된 카테고리 목록
  const [categories, setCategories] = useState<RoutineCategory[]>([]);

  // 대화 입력
  const [selectedCategory, setSelectedCategory] =
    useState<RoutineCategory | null>(null);
  const [selectedPurpose, setSelectedPurpose] = useState("");
  const [selectedTime, setSelectedTime] = useState("");

  // 추천 결과
  const [recommendedRoutines, setRecommendedRoutines] = useState<
    RecommendedRoutine[]
  >([]);
  const [checkedRoutineIds, setCheckedRoutineIds] = useState<Set<string>>(
    new Set(),
  );

  // 메시지 추가
  const addMessage = useCallback((msg: Omit<ChatMessage, "id">) => {
    const newMsg: ChatMessage = {
      ...msg,
      id: `msg-${Date.now()}-${Math.random()}`,
    };
    setMessages((prev) => [...prev, newMsg]);
  }, []);

  useEffect(() => {
    
  }, [profile]);

  // ── 초기화: 유저 프로필 & 카테고리 목록 로드 ──
  useEffect(() => {
    const loadProfile = async () => {
      try {
        console.log("🤖 [Profile Request] 사용자 프로필 정보 조회 시작...");
        const response = await authApi.getProfile();
        // 백엔드 응답 구조가 { success: true, data: { age: 25, job: "회사원", gender: 0, ... } } 형식인 경우 대응
        const userData = response?.data || response;
        console.log("🤖 [Profile Response] 사용자 프로필 정보 수신 성공:", JSON.stringify(userData, null, 2));
        if (userData) {
          const age = Number(userData.age) || 0;
          const ageGroup = age > 0 ? `${Math.floor(age / 10) * 10}대` : "";
          
          let genderStr = "";
          if (userData.gender === 0 || userData.gender === "0" || userData.gender === "남성") {
            genderStr = "남성";
          } else if (userData.gender === 1 || userData.gender === "1" || userData.gender === "여성") {
            genderStr = "여성";
          }

          setProfile({
            job: userData.job || "",
            gender: genderStr,
            ageGroup: ageGroup,
          });
        }
      } catch (err: any) {
        console.error("사용자 프로필 로드 에러:", err);
        if (err?.response) {
          console.error("❌ [Profile Error Response Data]:", JSON.stringify(err.response.data, null, 2));
          console.error("❌ [Profile Error Status]:", err.response.status);
        }
      }
    };

    const loadCategories = async () => {
      try {
        console.log("🤖 [Categories Request] 사용자 카테고리 목록 조회 시작...");
        const list = await CategoryApi.getAll();
        console.log("🤖 [Categories Response] 사용자 카테고리 목록 수신 성공:", JSON.stringify(list, null, 2));
        setCategories(list);
      } catch (err: any) {
        console.error("카테고리 목록 로드 에러:", err);
        if (err?.response) {
          console.error("❌ [Categories Error Response Data]:", JSON.stringify(err.response.data, null, 2));
          console.error("❌ [Categories Error Status]:", err.response.status);
        }
      }
    };

    loadProfile();
    loadCategories();
    
    addMessage({
      role: "ai",
      text: `안녕하세요! 🤖 맞춤 루틴 도우미입니다.\n오늘의 루틴을 새로 추천받으시겠어요, 아니면 이전에 불러온 오늘 기록을 확인하시겠어요?`,
    });
  }, []);

// ── 오늘 기록 조회 ──
  const viewTodayRecords = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log("🤖 [AI hook] 오늘 추천 기록 조회 시작...");
      const routines = await requestTodayRecommendations();
      setRecommendedRoutines(routines);
      setCheckedRoutineIds(new Set(routines.map((r) => r.id)));
      setStep("result"); // 💡 기록을 가져오면 바로 결과 화면으로 전환
    } catch (e: any) {
      console.error("오늘 기록 조회 에러:", e);
      setError(e?.message || "오늘 기록을 가져오는데 실패했습니다.");
      setStep("start"); // 에러 시 다시 선택 단계로 복귀
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── 대화 시작 진입점 ──
  const startConversation = useCallback(() => {
    setMessages([]);
    setSelectedCategory(null);
    setSelectedPurpose("");
    setSelectedTime("");
    setRecommendedRoutines([]);
    setCheckedRoutineIds(new Set());
    setError(null);

    addMessage({
      role: "ai",
      text: `안녕하세요! 🤖 맞춤 루틴 도우미입니다.\n오늘의 루틴을 새로 추천받으시겠어요, 아니면 이전에 불러온 오늘 기록을 확인하시겠어요?`,
    });

    setStep("start"); // 💡 첫 진입 단계를 'start' 분기점으로 설정
  }, [addMessage]);

  // 훅 내부 하단에 추가
const selectRecommendFlow = useCallback(() => {
  addMessage({
    role: "ai",
    text: "좋습니다! 맞춤 루틴 추천을 시작합니다. 먼저 추천을 원하시는 루틴 카테고리를 선택해 주세요. 🎯",
  });
  setStep("goal"); // 💡 다음 단계인 카테고리 선택(goal)으로 명확히 전환
}, [addMessage]);


  // ── 카테고리 선택 완료 ──
  const submitCategory = useCallback(
    (category: RoutineCategory) => {
      setSelectedCategory(category);
      addMessage({ role: "user", text: category.name });
      addMessage({
        role: "ai",
        text: `선택하신 카테고리: ${category.name} 👍\n\n이 카테고리를 관리하시는 주요 목적이 무엇인가요?`,
      });
      setStep("purpose");
    },
    [addMessage],
  );

  // ── 목적 선택 완료 ──
  const submitPurpose = useCallback(
    (purpose: string) => {
      setSelectedPurpose(purpose);
      addMessage({ role: "user", text: purpose });
      addMessage({
        role: "ai",
        text: `목적: ${purpose} 👍\n\n주로 활동 가능한 시간은 언제인가요?`,
      });
      setStep("time");
    },
    [addMessage],
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
    [addMessage],
  );

  // ── 취미 선택 완료 → AI 호출 ──
  const submitHobbies = useCallback(
    async (hobbies: string[]) => {
      if (!selectedCategory) {
        setError("카테고리가 선택되지 않았습니다.");
        addMessage({
          role: "ai",
          text: `오류: 카테고리가 선택되지 않았습니다. 대화를 다시 시작해주세요.`,
        });
        setStep("goal");
        return;
      }

      addMessage({ role: "user", text: hobbies.join(" + ") });

      setStep("loading");
      setIsLoading(true);
      setError(null);

      try {
        const requestBody = {
          categoryId: selectedCategory.id,
          purpose: selectedPurpose,
          mainActivityTime: selectedTime,
          activityType: mapCategoryToActivityType(selectedCategory.name),
          hobbies,
        };

        const routines = await requestRoutineRecommendation(
          requestBody,
          selectedCategory.name,
        );
        setRecommendedRoutines(routines);

        const allIds = new Set(routines.map((r) => r.id));
        setCheckedRoutineIds(allIds);

        const summary = `'${selectedCategory.name} + ${hobbies.join(" + ")}', ${selectedTime}에 맞춰\n다음과 같은 루틴을 추천드립니다 👇`;
        addMessage({ role: "ai", text: summary });

        setStep("result");
      } catch (e: any) {
        setError(e?.message || "루틴 추천에 실패했습니다.");
        addMessage({
          role: "ai",
          text: `죄송합니다, 추천 중 오류가 발생했습니다.\n오류 내용: ${e?.message || "추천 서버 장애"}`,
        });
        setStep("goal");
      } finally {
        setIsLoading(false);
      }
    },
    [selectedCategory, selectedPurpose, selectedTime, addMessage],
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
        checkedRoutineIds.has(r.id),
      );

      for (const routine of selected) {
        const newRoutine: ScheduleRoutine = {
          id: Date.now() + Math.floor(Math.random() * 10000),
          title: routine.title,
          categoryId: routine.categoryId || selectedCategory?.id || null,
          categoryName: routine.category,
          startDate: today,
          endDate: today,
          startTime: routine.startTime,
          endTime: routine.endTime,
          alarm: false,
          state: true,
          completedDates: [],
          repeatType: "DAILY",
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
  }, [recommendedRoutines, checkedRoutineIds, selectedCategory, addMessage]);

  return {
    step,
    setStart,
    messages,
    isLoading,
    error,
    profile,
    categories,
    recommendedRoutines,
    checkedRoutineIds,
    startConversation,
    selectRecommendFlow,
    submitCategory,
    submitPurpose,
    submitTime,
    submitHobbies,
    toggleRoutineCheck,
    saveSelectedRoutines,
    setError,
    selectedCategory,
    viewTodayRecords,
  };
};
