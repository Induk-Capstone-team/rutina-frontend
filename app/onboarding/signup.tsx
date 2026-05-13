import { useAuthViewModel } from "@/hooks/useAuthViewModel";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import React, { useState, useEffect } from "react";
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

export default function SignupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; nickname?: string }>();
  
  const {
    signup,
    sendVerificationCode,
    verifyCode,
    isLoading,
    error,
    setError,
  } = useAuthViewModel();

  const [nickname, setName] = useState(params.nickname || "");
  const [email, setEmail] = useState(params.email || "");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    if (params.email) {
      setEmail(params.email);
      setIsVerified(true);
    }
    if (params.nickname) {
      setName(params.nickname);
    }
  }, [params.email, params.nickname]);

  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeProfile, setAgreeProfile] = useState(false);
  const [agreePush, setAgreePush] = useState(false);

  const allAgreed = agreePrivacy && agreeProfile && agreePush;

  const handleAllAgree = () => {
    const nextState = !allAgreed;
    setAgreePrivacy(nextState);
    setAgreeProfile(nextState);
    setAgreePush(nextState);
  };

  const handleSendCode = async () => {
    if (!email || !email.includes("@")) {
      Alert.alert("알림", "유효한 이메일 주소를 입력해주세요.");
      return;
    }
    const data = await sendVerificationCode(email);
    if (data?.success) {
      setIsCodeSent(true);
      Alert.alert("알림", "인증 코드가 이메일로 발송되었습니다.");
    } else if (data === null && error) {
       Alert.alert("오류", error);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode) return;
    const data = await verifyCode(email, verificationCode);
    if (data?.success) {
      setIsVerified(true);
      Alert.alert("알림", "이메일 인증이 완료되었습니다.");
    } else if (data === null && error) {
       Alert.alert("오류", error);
    }
  };

  const handleSignup = async () => {
    if (!isVerified) {
      setError("이메일 인증이 필요합니다.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("비밀번호가 서로 다릅니다.");
      return;
    }
    if (!agreePrivacy) {
      setError("필수 약관에 동의해주세요.");
      return;
    }

    const success = await signup(email, password, nickname);
    if (success) {
      // 회원가입 성공 시 토큰이 저장되므로, 바로 2단계(추가정보) 화면으로 이동
      router.replace({
        pathname: "/onboarding/signup2",
        params: { email, nickname },
      });
    }
  };

  const isFormValid =
    nickname && isVerified && password && passwordConfirm && agreePrivacy;

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
            <Text style={styles.headerTitle}>계정 만들기</Text>
            <Text style={styles.headerSubtitle}>
              간편하게 가입하고 서비스를 이용해보세요.
            </Text>
          </View>

          <View style={styles.card}>
            {/* 이름 입력 */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>이름</Text>
              <TextInput
                style={styles.input}
                placeholder="성함을 입력해주세요"
                value={nickname}
                onChangeText={setName}
                placeholderTextColor="#A0B0D0"
              />
            </View>

            {/* 이메일 입력 + 인증번호 발송 */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>이메일</Text>
              <View style={styles.inlineInputContainer}>
                <TextInput
                  style={[
                    styles.inlineInput,
                    isVerified && styles.validatedInput,
                  ]}
                  placeholder="example@mail.com"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setIsVerified(false);
                    setIsCodeSent(false);
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholderTextColor="#A0B0D0"
                  editable={!isVerified}
                />
                <TouchableOpacity
                  style={[
                    styles.inlineButton,
                    (!email || isVerified) && styles.disabledInlineButton,
                  ]}
                  onPress={handleSendCode}
                  disabled={!email || isLoading || isVerified}
                >
                  <Text style={styles.inlineButtonText}>
                    {isVerified ? "확인됨" : isCodeSent ? "재발송" : "인증발송"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 인증번호 입력 (인증번호 발송 후에만 표시) */}
            {isCodeSent && !isVerified && (
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>인증번호</Text>
                <View style={styles.inlineInputContainer}>
                  <TextInput
                    style={styles.inlineInput}
                    placeholder="인증번호 입력"
                    value={verificationCode}
                    onChangeText={setVerificationCode}
                    keyboardType="number-pad"
                    placeholderTextColor="#A0B0D0"
                  />
                  <TouchableOpacity
                    style={[
                      styles.inlineButton,
                      !verificationCode && styles.disabledInlineButton,
                    ]}
                    onPress={handleVerifyCode}
                    disabled={!verificationCode || isLoading}
                  >
                    <Text style={styles.inlineButtonText}>인증확인</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* 비밀번호 입력 */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>비밀번호</Text>
              <TextInput
                style={styles.input}
                placeholder="8자 이상 입력"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholderTextColor="#A0B0D0"
              />
              <TextInput
                style={[styles.input, { marginTop: 10 }]}
                placeholder="비밀번호 재입력"
                value={passwordConfirm}
                onChangeText={setPasswordConfirm}
                secureTextEntry
                placeholderTextColor="#A0B0D0"
              />
            </View>

            {/* 약관 동의 섹션 */}
            <View style={styles.agreementSection}>
              <TouchableOpacity
                style={styles.allAgreeRow}
                onPress={handleAllAgree}
              >
                <Ionicons
                  name={allAgreed ? "checkbox" : "square-outline"}
                  size={24}
                  color={allAgreed ? "#2A3C6B" : "#A0B0D0"}
                />
                <Text style={styles.allAgreeText}>약관에 모두 동의합니다</Text>
              </TouchableOpacity>

              <View style={styles.divider} />

              {[
                {
                  label: "[필수] 개인정보 수집 및 이용",
                  state: agreePrivacy,
                  setState: setAgreePrivacy,
                  link: "/privacy",
                },
                {
                  label: "[선택] 프로필 정보 이용",
                  state: agreeProfile,
                  setState: setAgreeProfile,
                  link: "/profile",
                },
                {
                  label: "[선택] 마케팅 푸시 알림",
                  state: agreePush,
                  setState: setAgreePush,
                  link: "/push",
                },
              ].map((item, index) => (
                <View key={index} style={styles.agreeRow}>
                  <TouchableOpacity onPress={() => item.setState(!item.state)}>
                    <Ionicons
                      name={item.state ? "checkmark-circle" : "ellipse-outline"}
                      size={22}
                      color={item.state ? "#2A3C6B" : "#D1D9E6"}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.agreeTextBtn}>
                    <Text style={styles.agreeText}>{item.label}</Text>
                    <Ionicons
                      name="chevron-forward"
                      size={14}
                      color="#A0B0D0"
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {error && <Text style={styles.mainErrorText}>{error}</Text>}

            <TouchableOpacity
              style={[
                styles.submitButton,
                !isFormValid && styles.disabledSubmitButton,
              ]}
              onPress={handleSignup}
              disabled={!isFormValid || isLoading}
            >
              <Text style={styles.submitButtonText}>
                {isLoading ? "처리 중..." : "가입 완료"}
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
  inlineInputContainer: { flexDirection: "row", alignItems: "center" },
  inlineInput: {
    flex: 1,
    backgroundColor: "#F1F4F9",
    padding: 16,
    borderRadius: 14,
    fontSize: 16,
    color: "#333",
  },
  validatedInput: { backgroundColor: "#EDF9F0", color: "#2E7D32" },
  inlineButton: {
    marginLeft: 10,
    backgroundColor: "#2A3C6B",
    paddingHorizontal: 16,
    height: 54,
    borderRadius: 14,
    justifyContent: "center",
  },
  disabledInlineButton: { backgroundColor: "#D1D9E6" },
  inlineButtonText: { color: "#FFF", fontWeight: "700", fontSize: 13 },
  errorText: { color: "#FF5252", fontSize: 12, marginTop: 6, marginLeft: 4 },
  agreementSection: {
    marginTop: 10,
    padding: 16,
    backgroundColor: "#F8F9FB",
    borderRadius: 16,
  },
  allAgreeRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  allAgreeText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2A3C6B",
    marginLeft: 10,
  },
  divider: { height: 1, backgroundColor: "#E0E5ED", marginBottom: 12 },
  agreeRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  agreeTextBtn: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginLeft: 10,
  },
  agreeText: { fontSize: 14, color: "#5C6E91" },
  mainErrorText: {
    color: "#FF5252",
    textAlign: "center",
    marginTop: 15,
    fontWeight: "600",
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
