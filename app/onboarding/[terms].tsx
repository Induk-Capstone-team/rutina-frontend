import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function TermsScreen() {
  const router = useRouter();
  const { terms } = useLocalSearchParams();

  let title = "";
  let content = null;

  if (terms === "privacy") {
    title = "개인정보 수집 및 이용 동의";
    content = (
      <View>
        <Text style={styles.paragraph}>수집항목: 이메일, 닉네임, 비밀번호</Text>
        <Text style={styles.paragraph}>
          이용목적: 회원가입, 로그인, 회원관리, 서비스 제공, 부정이용 방지
        </Text>
        <Text style={styles.paragraph}>보유기간: 회원 탈퇴 시까지</Text>
      </View>
    );
  } else if (terms === "profile") {
    title = "프로필 정보 수집 및 이용 동의";
    content = (
      <View>
        <Text style={styles.paragraph}>수집항목: 성별, 직업, 연령대</Text>
        <Text style={styles.paragraph}>
          이용목적: 프로필 구성, 맞춤형 서비스 제공, 서비스 개선
        </Text>
        <Text style={styles.paragraph}>
          보유기간: 회원 탈퇴 시까지 또는 이용자가 삭제할 때까지
        </Text>
      </View>
    );
  } else if (terms === "push") {
    title = "푸시 알림 수신 동의";
    content = (
      <View>
        <Text style={styles.paragraph}>이용목적: 루틴 알림, 공지 및 안내</Text>
        <Text style={styles.paragraph}>
          거부 시에도 기본 서비스 이용은 가능합니다.
        </Text>
        <Text style={styles.helperText}>
          * 추가 정보 수집은 프로필 설정에서 언제든지 변경할 수 있습니다.
        </Text>
      </View>
    );
  } else {
    title = "약관 열람";
    content = <Text style={styles.paragraph}>잘못된 접근입니다.</Text>;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#2A3C6B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>{content}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F3F4F8",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#2A3C6B",
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  paragraph: {
    fontSize: 16,
    color: "#333333",
    lineHeight: 24,
    marginBottom: 12,
  },
  helperText: {
    fontSize: 14,
    color: "#8A8C9A",
    lineHeight: 20,
    marginTop: 12,
  },
});
