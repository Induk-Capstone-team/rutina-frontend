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

// ── ChatGPT API로 루틴 추천 ──
export const requestRoutineRecommendation = async (
  profile: UserProfile,
  input: ConversationInput,
): Promise<RecommendedRoutine[]> => {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OpenAI API Key가 설정되지 않았습니다. .env 파일을 확인해주세요.");
  }

  const prompt = `
당신은 사용자의 일상과 목표에 맞춰 최적의 스케줄(루틴)을 추천해주는 AI입니다.
사용자 프로필: 성별(${profile.gender}), 나이대(${profile.ageGroup}), 직업(${profile.job})
사용자 목표: ${input.goals.join(", ")}
주요 활동 시간: ${input.timeSlot}
선호 취미: ${input.hobbies.join(", ")}

위 정보를 바탕으로, 해당 시간대(${input.timeSlot})에 수행하기 좋은 하루 루틴 3~5개를 JSON 배열로 응답해주세요.
각 루틴은 다음 형식을 가져야 합니다:
[
  {
    "title": "루틴 이름 (예: 유산소 운동)",
    "startTime": "HH:MM (예: 06:00)",
    "endTime": "HH:MM (예: 06:30)",
    "description": "구체적인 활동 설명",
    "category": "운동, 공부, 명상, 기상, 저녁, 기타 중 하나"
  }
]

응답은 마크다운 코드 블록(예: \`\`\`json) 등을 제외하고 순수한 JSON 배열 형식만 반환하세요.
`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // GPT-4o-mini 모델 사용
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI API Error:", errorData);
      throw new Error("루틴 추천을 가져오는데 실패했습니다.");
    }

    const data = await response.json();
    let content = data.choices[0].message.content.trim();
    
    // 혹시 마크다운 블록이 포함되어 있다면 제거
    if (content.startsWith("```json")) {
      content = content.replace(/^```json/, "").replace(/```$/, "").trim();
    } else if (content.startsWith("```")) {
      content = content.replace(/^```/, "").replace(/```$/, "").trim();
    }

    const parsed = JSON.parse(content);
    return parsed.map((r: any, i: number) => ({
      ...r,
      id: `ai-${Date.now()}-${i}`,
    }));
  } catch (error) {
    console.error("ChatGPT 연동 에러:", error);
    throw new Error("AI 응답을 처리하는데 실패했습니다.");
  }
};
