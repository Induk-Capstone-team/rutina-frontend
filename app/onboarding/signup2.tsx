import { useAuthViewModel } from "@/hooks/useAuthViewModel";
import { CategoryApi } from "@/lib/data/category_api";
import { authStore } from "@/store/authStore";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const JOB_CATEGORIES: Record<string, { name: string; colorCode: string }[]> = {
  학생: [
    { name: "학습", colorCode: "#007AFF" },
    { name: "등교", colorCode: "#34C759" },
    { name: "성취", colorCode: "#FFD700" },
  ],
  무직: [
    { name: "규칙", colorCode: "#8E8E93" },
    { name: "준비", colorCode: "#FF9500" },
    { name: "활력", colorCode: "#FFCC00" },
  ],
  주부: [
    { name: "살림", colorCode: "#F2F2F7" },
    { name: "나", colorCode: "#AF52DE" },
    { name: "가족", colorCode: "#FF2D55" },
  ],
  회사원: [
    { name: "업무", colorCode: "#004080" },
    { name: "건강", colorCode: "#58D68D" },
    { name: "휴식", colorCode: "#5856D6" },
  ],
  운동선수: [
    { name: "훈련", colorCode: "#FF3B30" },
    { name: "멘탈", colorCode: "#5AC8FA" },
    { name: "회복", colorCode: "#A52A2A" },
  ],
  자영업자: [
    { name: "운영", colorCode: "#F5F5DC" },
    { name: "관리", colorCode: "#008080" },
    { name: "정산", colorCode: "#50C878" },
  ],
  은퇴자: [
    { name: "건강", colorCode: "#90EE90" },
    { name: "취미", colorCode: "#E6E6FA" },
    { name: "교류", colorCode: "#FFDAB9" },
  ],
  프리랜서: [
    { name: "집중", colorCode: "#00008B" },
    { name: "관리", colorCode: "#32CD32" },
    { name: "마감", colorCode: "#000000" },
  ],
};

export default function SignupStep2Screen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    email?: string;
    password?: string;
    nickname?: string;
    isSocial?: string;
  }>();

  const {updateProfile, isLoading, error } = useAuthViewModel();

  const [age, setAge] = useState("");
  const [job, setJob] = useState("");
  const [gender, setGender] = useState("");

  const isFormValid = age && job && gender;

  const handleComplete = async () => {
    // 성별 값을 백엔드 형식(0 = 남성, 1 = 여성)으로 변환
    let mappedGender: number | null = null;
    if (gender === "남성") mappedGender = 0;
    else if (gender === "여성") mappedGender = 1;

    const success = await updateProfile(Number(age), job, mappedGender as any);

    if (success) {
      // 직업에 따른 카테고리 자동 추가
      const categoriesToAdd = JOB_CATEGORIES[job];
      if (categoriesToAdd) {
        try {
          await Promise.all(
            categoriesToAdd.map((cat) => CategoryApi.create(cat)),
          );
        } catch (e) {
          console.error("카테고리 생성 실패:", e);
        }
      }

      // 모든 과정 완료 후 로그인 상태로 전환
      authStore.setLoggedIn(true);

      Alert.alert("환영합니다!", "회원가입이 모두 완료되었습니다.", [
        { text: "시작하기", onPress: () => router.replace("/(tabs)") },
      ]);
    } else {
      if (error) {
        Alert.alert("오류 (400)", error || "입력한 정보를 다시 확인해주세요.");
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={26} color="#2A3C6B" />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.headerTitle}>추가 정보 입력</Text>
            <Text style={styles.headerSubtitle}>
              더 나은 맞춤형 서비스를 위해 정보를 입력해주세요.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>나이</Text>
              <TextInput
                style={styles.input}
                placeholder="나이를 입력해주세요"
                value={age}
                onChangeText={setAge}
                keyboardType="number-pad"
                placeholderTextColor="#A0B0D0"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>직업</Text>
              <View style={styles.jobContainer}>
                {[
                  "학생",
                  "무직",
                  "주부",
                  "회사원",
                  "운동선수",
                  "자영업자",
                  "은퇴자",
                  "프리랜서",
                ].map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.jobButton,
                      job === item && styles.jobButtonActive,
                    ]}
                    onPress={() => setJob(item)}
                  >
                    <Text
                      style={[
                        styles.jobButtonText,
                        job === item && styles.jobButtonTextActive,
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>성별</Text>
              <View style={styles.genderContainer}>
                {["남성", "여성"].map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.genderButton,
                      gender === item && styles.genderButtonActive,
                    ]}
                    onPress={() => setGender(item)}
                  >
                    <Text
                      style={[
                        styles.genderButtonText,
                        gender === item && styles.genderButtonTextActive,
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.submitButton,
                !isFormValid && styles.disabledSubmitButton,
              ]}
              onPress={handleComplete}
              disabled={!isFormValid || isLoading}
            >
              <Text style={styles.submitButtonText}>
                {isLoading ? "처리 중..." : "완료"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFF" },
  scrollContainer: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    marginBottom: 10,
  },
  header: { marginBottom: 30 },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#2A3C6B",
    marginBottom: 8,
  },
  headerSubtitle: { fontSize: 15, color: "#8A8C9A", fontWeight: "500" },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 24,
    shadowColor: "#2A3C6B",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
  },
  inputWrapper: { marginBottom: 18 },
  inputLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#5C6E91",
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: "#F1F4F9",
    padding: 16,
    borderRadius: 14,
    fontSize: 16,
    color: "#333",
  },
  jobContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  jobButton: {
    width: "48%",
    backgroundColor: "#F1F4F9",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  jobButtonActive: {
    backgroundColor: "#2A3C6B",
  },
  jobButtonText: {
    fontSize: 15,
    color: "#A0B0D0",
    fontWeight: "600",
  },
  jobButtonTextActive: {
    color: "#FFFFFF",
  },
  genderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  genderButton: {
    flex: 1,
    backgroundColor: "#F1F4F9",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginHorizontal: 4,
  },
  genderButtonActive: {
    backgroundColor: "#2A3C6B",
  },
  genderButtonText: {
    fontSize: 15,
    color: "#A0B0D0",
    fontWeight: "600",
  },
  genderButtonTextActive: {
    color: "#FFFFFF",
  },
  submitButton: {
    backgroundColor: "#2A3C6B",
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 25,
    shadowColor: "#2A3C6B",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  disabledSubmitButton: {
    backgroundColor: "#BCC8E0",
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: { color: "#FFF", fontSize: 18, fontWeight: "800" },
});
