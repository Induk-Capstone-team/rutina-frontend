import { useAuthViewModel } from "@/hooks/useAuthViewModel";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
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

export default function SignupStep2Screen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    email?: string;
    password?: string;
    nickname?: string;
    isSocial?: string;
  }>();

  const { signup, updateProfile, isLoading, error } = useAuthViewModel();

  const [age, setAge] = useState("");
  const [job, setJob] = useState("");
  const [gender, setGender] = useState("");

  const isFormValid = age && job && gender;

  const handleComplete = async () => {
    let success = false;
    if (params.isSocial === "true") {
      // 소셜 로그인: 이미 계정은 있으므로 프로필 업데이트만
      success = await updateProfile(Number(age), job, gender);
    } else {
      // 일반 로그인: 모든 정보를 모아서 한 번에 회원가입
      success = await signup(
        params.email || "",
        params.password || "",
        params.nickname || "",
        Number(age),
        job,
        gender
      );
    }

    if (success) {
      Alert.alert("환영합니다!", "회원가입이 모두 완료되었습니다.", [
        { text: "시작하기", onPress: () => router.replace("/") },
      ]);
    } else {
      if (error) {
        Alert.alert("오류", error);
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
            {/* 나이 입력 */}
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

            {/* 직업 선택 */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>직업</Text>
              <View style={styles.jobContainer}>
                {[
                  "학생",
                  "무직",
                  "주부",
                  "회사원",
                  "운동 선수",
                  "자영업자",
                  "은퇴",
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

            {/* 성별 선택 */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>성별</Text>
              <View style={styles.genderContainer}>
                {["남성", "여성", "선택 안함"].map((item) => (
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
              disabled={!isFormValid}
            >
              <Text style={styles.submitButtonText}>완료</Text>
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
