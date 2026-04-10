import { useAuthViewModel } from "@/hooks/useAuthViewModel";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Image,
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

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  // ViewModel에서 필요한 기능만 쏙 빼오기
  const { login, isLoading, error } = useAuthViewModel();

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
          <View style={styles.header}>
            <Text style={styles.headerTitle}>로그인</Text>
            <Text style={styles.headerSubtitle}>
              다시 오신 것을 환영합니다!
            </Text>
          </View>

          <View style={styles.card}>
            <TextInput
              style={styles.input}
              placeholder="이메일"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
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

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => login(email, password)}
              disabled={isLoading}
            >
              <Text style={styles.primaryButtonText}>
                {isLoading ? "로그인 중..." : "로그인"}
              </Text>
            </TouchableOpacity>

            <View style={styles.linksContainer}>
              <TouchableOpacity onPress={() => router.push("/signup")}>
                <Text style={styles.linkText}>회원가입</Text>
              </TouchableOpacity>
              <Text style={styles.linkDivider}>|</Text>
              <TouchableOpacity>
                <Text style={styles.linkText}>비밀번호 찾기</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>또는</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialContainer}>
              <TouchableOpacity
                style={[
                  styles.socialButton,
                  {
                    backgroundColor: "#FFFFFF",
                    borderColor: "#EDEEF1",
                    borderWidth: 1,
                  },
                ]}
                onPress={() => {}}
              >
                <Image
                  source={require("../assets/images/google_icon.png")}
                  style={styles.socialIcon}
                  resizeMode="contain"
                />
                <Text style={[styles.socialText, { color: "#000000" }]}>
                  구글계정으로 로그인
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.socialButton, { backgroundColor: "#000000" }]}
                onPress={() => {}}
              >
                <Image
                  source={require("../assets/images/apple_icon.png")}
                  style={styles.socialIcon}
                  resizeMode="contain"
                />
                <Text style={[styles.socialText, { color: "#FFFFFF" }]}>
                  Apple로 로그인
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.socialButton, { backgroundColor: "#03A94D" }]}
                onPress={() => {}}
              >
                <Image
                  source={require("../assets/images/naver_icon.png")}
                  style={styles.socialIcon}
                />
                <Text style={[styles.socialText, { color: "#FFFFFF" }]}>
                  네이버 로그인
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.socialButton, { backgroundColor: "#FEE500" }]}
                onPress={() => {}}
              >
                <Image
                  source={require("../assets/images/kakao_icon.png")}
                  style={styles.socialIcon}
                  resizeMode="contain"
                />
                <Text
                  style={[
                    styles.socialText,
                    { color: "#000000", marginLeft: 0 },
                  ]}
                >
                  카카오 로그인
                </Text>
              </TouchableOpacity>
            </View>
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
    paddingTop: 40,
    paddingBottom: 40,
    justifyContent: "center",
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
    marginBottom: 20,
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
  linksContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  linkText: {
    color: "#8A8C9A",
    fontSize: 14,
    fontWeight: "500",
  },
  linkDivider: {
    color: "#E2E5EC",
    marginHorizontal: 12,
    fontSize: 14,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 32,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E5EC",
  },
  dividerText: {
    marginHorizontal: 12,
    color: "#8A8C9A",
    fontSize: 14,
    fontWeight: "500",
  },
  socialContainer: { gap: 14 },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 16,
  },
  socialIcon: {
    width: 22,
    height: 22,
    position: "absolute",
    left: 20,
  },
  socialText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
