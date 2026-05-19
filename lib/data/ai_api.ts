// lib/data/ai_api.ts
import apiClient from "./api_client";

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
  categoryId?: number;
}

// ── 대화 단계별 사용자 입력 ──
export interface ConversationInput {
  goals: string[]; // 목적 (운동, 공부, 명상 ...)
  timeSlot: string; // 주요 활동 시간 (아침, 점심, 저녁)
  hobbies: string[]; // 취미 (독서, 등산, 기타 ...)
}

export interface RoutineRecommendationRequest {
  categoryId: number;
  purpose: string;
  mainActivityTime: string;
  activityType: string;
  hobbies: string[];
}

export interface BackendRecommendationRoutine {
  optionId: number;
  title: string;
  recommendedTime: string; // e.g. "06:00"
  durationMinutes: number;
}

export interface BackendRecommendationResponse {
  success: boolean;
  code: string;
  message: string;
  data: {
    recommendationId: number;
    categoryId: number;
    routines: BackendRecommendationRoutine[];
  };
}

// ── 시작 시간과 진행 시간을 통해 종료 시간 계산 ──
export function calculateEndTime(
  startTime: string,
  durationMinutes: number,
): string {
  const [hourStr, minuteStr] = startTime.split(":");
  const hour = parseInt(hourStr, 10);
  const min = parseInt(minuteStr, 10);

  if (isNaN(hour) || isNaN(min)) {
    return startTime;
  }

  const date = new Date();
  date.setHours(hour, min + durationMinutes, 0, 0);

  const endHour = String(date.getHours()).padStart(2, "0");
  const endMin = String(date.getMinutes()).padStart(2, "0");
  return `${endHour}:${endMin}`;
}

// ── 백엔드 API로 루틴 추천 요청 ──
export const requestRoutineRecommendation = async (
  requestBody: RoutineRecommendationRequest,
  categoryName: string,
): Promise<RecommendedRoutine[]> => {
  try {
    console.log("=========================================");
    console.log("🤖 [AI API Request] AI 루틴 추천 요청 정보:");
    console.log(JSON.stringify(requestBody, null, 2));
    console.log("=========================================");

    const response = await apiClient.post<BackendRecommendationResponse>(
      "/api/v1/ai-routines/recommend",
      requestBody,
    );

    console.log("=========================================");
    console.log("🤖 [AI API Response] AI 루틴 추천 응답 성공!");
    console.log(JSON.stringify(response.data, null, 2));
    console.log("=========================================");

    if (!response.data.success) {
      throw new Error(
        response.data.message || "추천을 가져오는데 실패했습니다.",
      );
    }

    const { categoryId, routines } = response.data.data;

    return routines.map((r, i) => {
      const startTime = r.recommendedTime; // e.g. "06:00"
      const endTime = calculateEndTime(startTime, r.durationMinutes);

      return {
        id: `ai-${r.optionId || i}-${Date.now()}`,
        title: r.title,
        startTime,
        endTime,
        description: "AI 추천 루틴",
        category: categoryName,
        categoryId: categoryId,
      };
    });
  } catch (error: any) {
    console.error("AI 백엔드 연동 에러:", error);
    if (error?.response) {
      console.error("❌ [AI API Error Response Data]:", JSON.stringify(error.response.data, null, 2));
      console.error("❌ [AI API Error Response Status]:", error.response.status);
      console.error("❌ [AI API Error Response Headers]:", JSON.stringify(error.response.headers, null, 2));
    } else if (error?.request) {
      console.error("❌ [AI API Error Request Details (No Response received)]:", error.request);
    } else {
      console.error("❌ [AI API Error Message]:", error.message);
    }

    const serverMessage = error?.response?.data?.message || error?.response?.data?.error;
    throw new Error(
      serverMessage || error?.message || "AI 응답을 처리하는데 실패했습니다.",
    );
  }
};
