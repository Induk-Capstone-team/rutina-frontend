import { useAuthViewModel } from "@/hooks/useAuthViewModel";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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

export default function ResetPasswordScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const { localPasswordReset, localPasswordResetVerify, localPasswordResetConfirm } = useAuthViewModel();

  // 1. 인증번호 발송 요청
  const handleSendCode = async () => {
    if (!email) {
      Alert.alert("알림", "이메일을 입력해주세요.");
      return;
    }

    try {
      // 서버 요청이 완료될 때까지 기다립니다.
      await localPasswordReset(email);
      setIsCodeSent(true);
      Alert.alert("알림", "인증번호가 발송되었습니다.");
    } catch (err) {
      // 실패 시 흐름을 막고 에러 메시지를 보여줍니다.
      Alert.alert("오류", "인증번호 발송에 실패했습니다. 다시 시도해주세요.");
    }
  };

  // 2. 인증번호 검증 요청
  const handleVerifyCode = async () => {
    if (!verificationCode) {
      Alert.alert("알림", "인증번호를 입력해주세요.");
      return;
    }

    try {
      await localPasswordResetVerify(email, verificationCode);
      setIsVerified(true);
      Alert.alert("알림", "이메일 인증이 완료되었습니다.");
    } catch (error) {
      Alert.alert("오류", "인증번호가 올바르지 않거나 만료되었습니다.");
    }
  };

  // 3. 비밀번호 최종 재설정 요청
  const handleResetPassword = async () => {
    // 프론트단 검증을 서버 요청보다 '먼저' 수행합니다.
    if (newPassword !== passwordConfirm) {
      Alert.alert("오류", "비밀번호가 일치하지 않습니다.");
      return;
    }

    if (!newPassword || !passwordConfirm) {
      Alert.alert("오류", "새 비밀번호를 입력해주세요.");
      return;
    }

    try {
      // 서버의 비밀번호 변경 API가 성공할 때만 아래 Alert가 실행됩니다.
      await localPasswordResetConfirm(email, newPassword);
      
      Alert.alert(
        "완료",
        "비밀번호가 변경되었습니다.",
        [
          {
            text: "확인",
            onPress: () => router.replace("/onboarding/login"),
          },
        ]
      );
    } catch (error) {
      Alert.alert("오류", "비밀번호 변경에 실패했습니다. 다시 시도해주세요.");
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
            <Ionicons
              name="arrow-back"
              size={26}
              color="#2A3C6B"
            />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              비밀번호 재설정
            </Text>

            <Text style={styles.headerSubtitle}>
              가입한 이메일로 인증 후
              새로운 비밀번호를 설정하세요.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>
                이메일
              </Text>

              <View style={styles.inlineInputContainer}>
                <TextInput
                  style={styles.inlineInput}
                  placeholder="example@mail.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <TouchableOpacity
                  style={styles.inlineButton}
                  onPress={handleSendCode}
                >
                  <Text style={styles.inlineButtonText}>
                    {isCodeSent
                      ? "재발송"
                      : "인증발송"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {isCodeSent && !isVerified && (
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>
                  인증번호
                </Text>

                <View style={styles.inlineInputContainer}>
                  <TextInput
                    style={styles.inlineInput}
                    placeholder="인증번호 입력"
                    value={verificationCode}
                    onChangeText={setVerificationCode}
                  />

                  <TouchableOpacity
                    style={styles.inlineButton}
                    onPress={handleVerifyCode}
                  >
                    <Text style={styles.inlineButtonText}>
                      인증확인
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {isVerified && (
              <>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>
                    새 비밀번호
                  </Text>

                  <TextInput
                    style={styles.input}
                    placeholder="8자 이상 입력"
                    secureTextEntry
                    value={newPassword}
                    onChangeText={setNewPassword}
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>
                    비밀번호 확인
                  </Text>

                  <TextInput
                    style={styles.input}
                    placeholder="비밀번호 재입력"
                    secureTextEntry
                    value={passwordConfirm}
                    onChangeText={setPasswordConfirm}
                  />
                </View>
              </>
            )}

            <TouchableOpacity
              style={[
                styles.submitButton,
                !isVerified &&
                  styles.disabledSubmitButton,
              ]}
              disabled={!isVerified}
              onPress={handleResetPassword}
            >
              <Text style={styles.submitButtonText}>
                비밀번호 변경
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

  divider: { height: 1, backgroundColor: "#E0E5ED", marginBottom: 12 },
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

