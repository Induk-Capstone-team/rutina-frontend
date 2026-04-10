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

export default function SignupScreen() {
  const router = useRouter();
  const { signup, isLoading, error, setError } = useAuthViewModel();

  const [nickname, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const handleSignup = async () => {
    if (password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (!email || !password || !nickname) {
      setError("모든 필드를 입력해주세요.");
      return;
    }

    const success = await signup(email, password, nickname);
    if (success) {
      Alert.alert("성공", "회원가입이 완료되었습니다!", [
        { text: "확인", onPress: () => router.back() },
      ]);
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
            <Ionicons name="arrow-back" size={24} color="#2A3C6B" />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.headerTitle}>회원가입</Text>
            <Text style={styles.headerSubtitle}>
              새로운 계정을 만들어보세요.
            </Text>
          </View>

          <View style={styles.card}>
            <TextInput
              style={styles.input}
              placeholder="이름"
              value={nickname}
              onChangeText={setName}
              autoCapitalize="words"
              placeholderTextColor="#A0B0D0"
            />

            <TextInput
              style={styles.input}
              placeholder="이메일"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor="#A0B0D0"
            />

            <TextInput
              style={styles.input}
              placeholder="비밀번호"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor="#A0B0D0"
            />

            <TextInput
              style={styles.input}
              placeholder="비밀번호 확인"
              value={passwordConfirm}
              onChangeText={setPasswordConfirm}
              secureTextEntry
              placeholderTextColor="#A0B0D0"
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleSignup}
              disabled={isLoading}
            >
              <Text style={styles.primaryButtonText}>
                {isLoading ? "가입 중..." : "가입하기"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F3F4F8",
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
    justifyContent: "center",
  },
  backButton: {
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  header: {
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#2A3C6B",
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#8A8C9A",
    fontWeight: "500",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  input: {
    backgroundColor: "#F8F9FB",
    padding: 16,
    marginVertical: 8,
    borderRadius: 16,
    fontSize: 16,
    color: "#333333",
    borderWidth: 1,
    borderColor: "#EDEEF1",
  },
  errorText: {
    color: "#E74C3C",
    marginTop: 4,
    marginBottom: 8,
    alignSelf: "center",
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: "#2A3C6B",
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 16,
    shadowColor: "#2A3C6B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
