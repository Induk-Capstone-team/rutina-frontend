// lib/data/ai_api.ts

// ── 유저 프로필 (DB에서 가져올 정보) ──
export interface UserProfile {
  job: string; // 직업
  gender: string; // 성별
  ageGroup: string; // 나이대
}

// ── AI 가 추천해 줄 개별 루틴 아이템 ──
export interface RecommendedRoutine {
  id: string;
  title: string;
  startTime: string; // "06:00"
  endTime: string; // "06:30"
  description: string; // 부가 설명
  category: string;
}

// ── 대화 단계별 사용자 입력 ──
export interface ConversationInput {
  goals: string[]; // 목적 (운동, 공부, 명상 ...)
  timeSlot: string; // 주요 활동 시간 (아침, 점심, 저녁)
  hobbies: string[]; // 취미 (독서, 등산, 기타 ...)
}

// ── 더미 유저 프로필 (나중에 DB에서 가져올 데이터) ──
export const getDummyUserProfile = (): UserProfile => ({
  job: "대학생",
  gender: "남성",
  ageGroup: "20대",
});

// ── 더미 루틴 추천 결과 (시간대별) ──
const DUMMY_ROUTINES: Record<string, RecommendedRoutine[]> = {
  아침: [
    { id: "d1", title: "유산소 운동", startTime: "06:00", endTime: "06:30", description: "가벼운 조깅 또는 사이클", category: "운동" },
    { id: "d2", title: "근력 운동", startTime: "06:30", endTime: "07:30", description: "스쿼트, 푸시업", category: "운동" },
    { id: "d3", title: "단백질 식사", startTime: "07:30", endTime: "08:00", description: "닭가슴살 샐러드", category: "기상" },
    { id: "d4", title: "공부", startTime: "08:00", endTime: "09:00", description: "집중 시간대 학습", category: "공부" },
    { id: "d5", title: "독서", startTime: "09:30", endTime: "10:00", description: "자기계발서, 에세이", category: "기타" },
  ],
  점심: [
    { id: "d6", title: "가벼운 스트레칭", startTime: "11:00", endTime: "11:30", description: "점심 전 몸 풀기", category: "운동" },
    { id: "d7", title: "건강한 점심 식사", startTime: "11:30", endTime: "12:00", description: "균형 잡힌 영양 식단", category: "기상" },
    { id: "d8", title: "낮잠 또는 명상", startTime: "12:30", endTime: "13:00", description: "15~20분 파워냅", category: "명상" },
    { id: "d9", title: "집중 학습", startTime: "13:00", endTime: "14:00", description: "오후 핵심 공부 시간", category: "공부" },
  ],
  저녁: [
    { id: "d10", title: "유산소 운동", startTime: "18:00", endTime: "18:30", description: "가벼운 조깅 또는 사이클", category: "운동" },
    { id: "d11", title: "근력 운동", startTime: "18:30", endTime: "19:30", description: "스쿼트, 푸시업", category: "운동" },
    { id: "d12", title: "단백질 식사", startTime: "19:30", endTime: "20:00", description: "닭가슴살 샐러드", category: "저녁" },
    { id: "d13", title: "공부", startTime: "20:00", endTime: "21:00", description: "집중 시간대 학습", category: "공부" },
    { id: "d14", title: "독서", startTime: "21:30", endTime: "22:00", description: "자기계발서, 에세이", category: "기타" },
  ],
};

// ── 더미 데이터로 루틴 추천 (나중에 ChatGPT API로 교체) ──
export const requestRoutineRecommendation = async (
  _profile: UserProfile,
  input: ConversationInput,
): Promise<RecommendedRoutine[]> => {
  // 네트워크 호출 시뮬레이션 (1.5초 딜레이)
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const base = DUMMY_ROUTINES[input.timeSlot] || DUMMY_ROUTINES["저녁"];

  // 선택한 목적/취미에 맞게 필터링 (더미에서는 전부 반환)
  return base.map((r, i) => ({
    ...r,
    id: `ai-${Date.now()}-${i}`,
  }));
};
