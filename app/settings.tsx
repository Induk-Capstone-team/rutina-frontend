import { useAuthViewModel } from "@/hooks/useAuthViewModel";
import { useTheme, type Theme } from "@/lib/constants/ThemeContext";
import { authApi } from "@/lib/data/auth_api";
import { useFocusEffect, useRouter } from "expo-router";
import { Bell, HelpCircle, Info, Megaphone, Moon } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type SettingItemProps = {
  icon: React.ReactNode;
  title: string;
  value?: string | boolean;
  type?: "link" | "switch" | "text";
  onToggle?: (val: boolean) => void;
};

const SettingItem = ({
  icon,
  title,
  value,
  type = "link",
  onToggle = () => {},
}: SettingItemProps) => {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  return (
    <TouchableOpacity
      style={styles.settingItem}
      activeOpacity={type === "link" ? 0.7 : 1}
    >
      <View style={styles.settingItemLeft}>
        <View style={styles.iconContainer}>{icon}</View>
        <Text style={styles.settingTitle}>{title}</Text>
      </View>
      <View style={styles.settingItemRight}>
        {type === "link" && (
          <>
            {value && <Text style={styles.settingValue}>{value}</Text>}
            <Text style={styles.chevron}>›</Text>
          </>
        )}
        {type === "switch" && (
          <Switch
            value={!!value}
            onValueChange={onToggle}
            trackColor={{ false: "#E2E5EC", true: "#405886" }}
            thumbColor={theme.card}
          />
        )}
        {type === "text" && <Text style={styles.settingValue}>{value}</Text>}
      </View>
    </TouchableOpacity>
  );
};

const getEmailDisplay = (emailStr: string) => {
  if (!emailStr) return { isSocial: false, text: "이메일 정보 없음" };
  const lower = emailStr.toLowerCase();
  if (lower.includes("kakao")) return { isSocial: true, text: "카카오 로그인" };
  if (lower.includes("naver")) return { isSocial: true, text: "네이버 로그인" };
  if (lower.includes("google")) return { isSocial: true, text: "구글 로그인" };
  if (lower.includes("apple")) return { isSocial: true, text: "애플 로그인" };
  return { isSocial: false, text: emailStr };
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 8,
    },

    backButton: {
      width: 32,
      height: 32,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 3,
    },

    backIcon: {
      fontSize: 34,
      color: theme.text,
      fontWeight: "500",
      marginTop: -5,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: "800",
      color: theme.text,
    },
    container: {
      flex: 1,
      paddingHorizontal: 16,
    },
    profileSection: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.card,
      padding: 20,
      borderRadius: 24,
      marginTop: 10,
      marginBottom: 24,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
    },
    profileImageContainer: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: "#405886",
      justifyContent: "center",
      alignItems: "center",
    },
    profileImageText: {
      color: theme.card,
      fontSize: 24,
      fontWeight: "700",
    },
    profileInfo: {
      flex: 1,
      marginLeft: 16,
    },
    profileName: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.text,
      marginBottom: 4,
    },
    profileEmail: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    editProfileBtn: {
      backgroundColor: theme.bg,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 16,
    },
    editProfileText: {
      color: "#405886",
      fontSize: 14,
      fontWeight: "600",
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.textSecondary,
      marginLeft: 12,
      marginBottom: 8,
    },
    card: {
      backgroundColor: theme.card,
      borderRadius: 24,
      paddingVertical: 8,
      marginBottom: 24,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.03,
      shadowRadius: 8,
      elevation: 2,
    },
    settingItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 12,
      paddingHorizontal: 20,
    },
    settingItemLeft: {
      flexDirection: "row",
      alignItems: "center",
    },
    iconContainer: {
      width: 32,
      height: 32,
      borderRadius: 12,
      backgroundColor: theme.cardAlt,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    iconText: {
      fontSize: 16,
    },
    settingTitle: {
      fontSize: 16,
      color: theme.textBody,
      fontWeight: "500",
    },
    settingItemRight: {
      flexDirection: "row",
      alignItems: "center",
    },
    settingValue: {
      fontSize: 15,
      color: theme.textSecondary,
      marginRight: 8,
    },
    chevron: {
      fontSize: 20,
      color: theme.textFaint,
      fontWeight: "400",
      marginTop: -2,
    },
    divider: {
      height: 1,
      backgroundColor: theme.bg,
      marginLeft: 64,
      marginRight: 20,
    },
    accountActionsRow: {
      marginTop: 8,
      paddingHorizontal: 12,
    },
    logoutButton: {
      alignItems: "center",
      paddingVertical: 14,
      backgroundColor: theme.card,
      borderRadius: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 4,
      elevation: 1,
    },
    logoutText: {
      color: theme.warning,
      fontSize: 16,
      fontWeight: "600",
    },
  });

export default function SettingsScreen() {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const router = useRouter();
  const [notifications, setNotifications] = useState(true);
  const { mode, setMode } = useTheme();
  const { logout } = useAuthViewModel();

  const [profileName, setProfileName] = useState("홍길동");
  const [profileEmail, setProfileEmail] = useState("gildong@rutia.app");

  useFocusEffect(
    useCallback(() => {
      const loadProfile = async () => {
        try {
          const response = await authApi.getProfile();
          const userData = response?.data || response;
          if (userData) {
            if (userData.nickname) setProfileName(userData.nickname);
            if (userData.email) setProfileEmail(userData.email);
          }
        } catch (error: any) {
          const status = error?.response?.status;
          if (status === 401 || status === 403) return;
          console.error("Failed to load profile in settings:", error);
        }
      };
      loadProfile();
    }, []),
  );

  const handleLogout = () => {
    Alert.alert("로그아웃", "정말 로그아웃 하시겠습니까?", [
      {
        text: "취소",
        style: "cancel",
      },
      {
        text: "로그아웃",
        onPress: () => logout(),
        style: "destructive",
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>설정</Text>
      </View>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <TouchableOpacity
          style={styles.profileSection}
          onPress={() => router.push("/profile")}
          activeOpacity={0.7}
        >
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profileName}</Text>
            <Text style={styles.profileEmail}>
              {getEmailDisplay(profileEmail).text}
            </Text>
          </View>
          <View style={styles.editProfileBtn}>
            <Text style={styles.editProfileText}>수정</Text>
          </View>
        </TouchableOpacity>

        {/* General Settings */}
        <Text style={styles.sectionTitle}>일반</Text>
        <View style={styles.card}>
          <SettingItem
            icon={<Bell size={18} color="#405886" />}
            title="알림 설정"
            type="switch"
            value={notifications}
            onToggle={setNotifications}
          />
          <SettingItem
            icon={<Moon size={18} color="#405886" />}
            title="다크모드"
            type="switch"
            value={mode === "dark"}
            onToggle={(val) => setMode(val ? "dark" : "light")}
          />
        </View>

        {/* Support & Info empty */}
        <Text style={styles.sectionTitle}>지원 및 정보</Text>
        <View style={styles.card}>
          <SettingItem
            icon={<Megaphone size={18} color="#405886" />}
            title="공지사항"
          />
          <View style={styles.divider} />
          <SettingItem
            icon={<HelpCircle size={18} color="#405886" />}
            title="고객센터 / 도움말"
          />
          <View style={styles.divider} />
          <SettingItem
            icon={<Info size={18} color="#405886" />}
            title="앱 버전"
            type="text"
            value="1.0.0"
          />
        </View>

        {/* Account Actions */}
        <View style={styles.accountActionsRow}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>로그아웃</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
