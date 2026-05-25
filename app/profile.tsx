import { useAuthViewModel } from "@/hooks/useAuthViewModel";
import { authApi } from "@/lib/data/auth_api";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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

const getEmailDisplay = (emailStr: string) => {
  if (!emailStr) return { isSocial: false, text: "이메일 정보 없음" };
  const lower = emailStr.toLowerCase();
  if (lower.includes("kakao")) return { isSocial: true, text: "카카오 로그인" };
  if (lower.includes("naver")) return { isSocial: true, text: "네이버 로그인" };
  if (lower.includes("google")) return { isSocial: true, text: "구글 로그인" };
  if (lower.includes("apple")) return { isSocial: true, text: "애플 로그인" };
  return { isSocial: false, text: emailStr };
};

export default function ProfileScreen() {
  const router = useRouter();
  const { updateProfile, updateNickname, deleteAccount, isLoading: isViewModelLoading, error } = useAuthViewModel();

  // Mode state: false = View Mode (조회), true = Edit Mode (수정)
  const [isEditing, setIsEditing] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Original Profile States (Loaded from Server)
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [age, setAge] = useState("");
  const [job, setJob] = useState("");
  const [gender, setGender] = useState("");

  // Edit Mode Form States
  const [editNickname, setEditNickname] = useState("");
  const [editAge, setEditAge] = useState("");
  const [editJob, setEditJob] = useState("");
  const [editGender, setEditGender] = useState("");

  // Load user profile on mount
  const fetchProfile = async () => {
    try {
      setIsFetching(true);
      const response = await authApi.getProfile();
      const userData = response?.data || response;
      
      if (userData) {
        setEmail(userData.email || "");
        setNickname(userData.nickname || "");
        setAge(userData.age ? String(userData.age) : "");
        setJob(userData.job || "");
        
        let genderStr = "";
        if (userData.gender === 0 || userData.gender === "0" || userData.gender === "남성") {
          genderStr = "남성";
        } else if (userData.gender === 1 || userData.gender === "1" || userData.gender === "여성") {
          genderStr = "여성";
        }
        setGender(genderStr);
      }
    } catch (err: any) {
      console.error("내 정보 불러오기 에러:", err);
      Alert.alert("오류", "프로필 정보를 불러오지 못했습니다.");
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Enter Edit Mode
  const handleEnterEditMode = () => {
    setEditNickname(nickname);
    setEditAge(age);
    setEditJob(job);
    setEditGender(gender);
    setIsEditing(true);
  };

  // Cancel Editing
  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  // Form Validation
  const isFormValid = 
    editNickname.trim().length > 0 &&
    editAge.trim().length > 0 && 
    !isNaN(Number(editAge)) && 
    Number(editAge) > 0 &&
    editJob.trim().length > 0 && 
    editGender.trim().length > 0;

  // Save changes
  const handleSave = async () => {
    if (!isFormValid) {
      Alert.alert("입력 오류", "모든 항목을 올바르게 채워주세요.");
      return;
    }

    try {
      setIsSaving(true);

      let nicknameChanged = editNickname.trim() !== nickname;
      let profileChanged = 
        editAge.trim() !== age || 
        editJob !== job || 
        editGender !== gender;

      // 1. Update Nickname if changed
      if (nicknameChanged) {
        const nickSuccess = await updateNickname(editNickname.trim());
        if (!nickSuccess) {
          Alert.alert("수정 실패", "닉네임 업데이트 중 오류가 발생했습니다.");
          setIsSaving(false);
          return;
        }
      }

      // 2. Update Profile if changed
      if (profileChanged) {
        let mappedGender = 0;
        if (editGender === "남성") mappedGender = 0;
        else if (editGender === "여성") mappedGender = 1;

        const profileSuccess = await updateProfile(Number(editAge), editJob, mappedGender);
        if (!profileSuccess) {
          Alert.alert("수정 실패", "프로필 정보 업데이트 중 오류가 발생했습니다.");
          setIsSaving(false);
          return;
        }
      }

      if (nicknameChanged || profileChanged) {
        Alert.alert("성공", "내 정보가 수정되었습니다.", [
          {
            text: "확인",
            onPress: () => {
              setIsEditing(false);
              fetchProfile(); // Reload updated profile
            },
          },
        ]);
      } else {
        // No changes made
        setIsEditing(false);
      }
    } catch (e) {
      console.error("저장 에러:", e);
      Alert.alert("수정 실패", "저장 중 예상치 못한 에러가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  // Account Deletion
  const handleDeleteAccount = () => {
    Alert.alert(
      "회원 탈퇴 안내",
      "정말 탈퇴하시겠습니까?\n\n탈퇴 시 귀하의 데이터는 안전을 위해 며칠 동안만 보관되며, 그 이후에는 완전히 삭제되어 복구할 수 없습니다.\n\n계정 삭제 후 7일 이내에는 재가입이 불가능합니다.",
      [
        { text: "취소", style: "cancel" },
        {
          text: "탈퇴하기",
          style: "destructive",
          onPress: async () => {
            try {
              setIsFetching(true);
              const success = await deleteAccount();
              if (success) {
                Alert.alert("탈퇴 완료", "회원 탈퇴가 완료되었습니다. 그동안 이용해 주셔서 감사합니다.");
              } else {
                Alert.alert("탈퇴 실패", "회원 탈퇴 처리 중 오류가 발생했습니다.");
              }
            } catch (err) {
              console.error("회원탈퇴 에러:", err);
              Alert.alert("오류", "탈퇴 처리 중 예상치 못한 에러가 발생했습니다.");
            } finally {
              setIsFetching(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  if (isFetching) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2A3C6B" />
        <Text style={styles.loadingText}>정보를 불러오는 중입니다...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={26} color="#2A3C6B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEditing ? "내 정보 수정" : "내 정보 보기"}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {isEditing ? (
            /* ========================================================
               EDIT MODE (수정 모드)
               ======================================================== */
            <View>
              <Text style={styles.sectionTitle}>계정 정보 수정</Text>
              <View style={styles.card}>
                {/* Email (Read-only even in Edit Mode) */}
                <View style={styles.infoRow}>
                  <View style={styles.infoLabelContainer}>
                    <Ionicons name="mail-outline" size={18} color="#8A8C9A" style={styles.infoIcon} />
                    <Text style={styles.infoLabel}>계정 구분</Text>
                  </View>
                  <View style={styles.readOnlyValueContainer}>
                    <Text style={styles.readOnlyValue}>{getEmailDisplay(email).text}</Text>
                    <View style={[styles.badge, getEmailDisplay(email).isSocial && { backgroundColor: "#EBF0FA" }]}>
                      <Text style={[styles.badgeText, getEmailDisplay(email).isSocial && { color: "#405886" }]}>
                        {getEmailDisplay(email).isSocial ? "소셜 연동" : "이메일 가입"}
                      </Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.divider} />

                {/* Nickname Input */}
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>닉네임</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="닉네임을 입력해 주세요"
                    value={editNickname}
                    onChangeText={setEditNickname}
                    placeholderTextColor="#A0B0D0"
                  />
                </View>
              </View>

              <Text style={styles.sectionTitle}>추가 정보 수정</Text>
              <View style={styles.card}>
                {/* Age Input */}
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>나이</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="나이를 입력해 주세요"
                    value={editAge}
                    onChangeText={setEditAge}
                    keyboardType="number-pad"
                    placeholderTextColor="#A0B0D0"
                  />
                </View>

                {/* Gender Selection */}
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>성별</Text>
                  <View style={styles.genderContainer}>
                    {["남성", "여성"].map((item) => (
                      <TouchableOpacity
                        key={item}
                        style={[
                          styles.genderButton,
                          editGender === item && styles.genderButtonActive,
                        ]}
                        onPress={() => setEditGender(item)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.genderButtonText,
                            editGender === item && styles.genderButtonTextActive,
                          ]}
                        >
                          {item}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Job Selection */}
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>직업</Text>
                  <View style={styles.jobGrid}>
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
                          editJob === item && styles.jobButtonActive,
                        ]}
                        onPress={() => setEditJob(item)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.jobButtonText,
                            editJob === item && styles.jobButtonTextActive,
                          ]}
                        >
                          {item}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Edit Mode Buttons */}
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancelEdit}
                  disabled={isSaving}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelButtonText}>취소</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    (!isFormValid || isSaving) && styles.disabledSaveButton,
                  ]}
                  onPress={handleSave}
                  disabled={!isFormValid || isSaving}
                  activeOpacity={0.8}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>저장하기</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* ========================================================
               VIEW MODE (조회 모드)
               ======================================================== */
            <View>
              <Text style={styles.sectionTitle}>계정 정보</Text>
              <View style={styles.card}>
                <View style={styles.infoRow}>
                  <View style={styles.infoLabelContainer}>
                    <Ionicons name="mail-outline" size={18} color="#8A8C9A" style={styles.infoIcon} />
                    <Text style={styles.infoLabel}>계정 구분</Text>
                  </View>
                  <Text style={styles.readOnlyValue}>{getEmailDisplay(email).text}</Text>
                </View>
                
                <View style={styles.divider} />

                <View style={styles.infoRow}>
                  <View style={styles.infoLabelContainer}>
                    <Ionicons name="person-outline" size={18} color="#8A8C9A" style={styles.infoIcon} />
                    <Text style={styles.infoLabel}>닉네임</Text>
                  </View>
                  <Text style={styles.readOnlyValue}>{nickname || "닉네임 정보 없음"}</Text>
                </View>
              </View>

              <Text style={styles.sectionTitle}>추가 정보</Text>
              <View style={styles.card}>
                <View style={styles.infoRow}>
                  <View style={styles.infoLabelContainer}>
                    <Ionicons name="calendar-outline" size={18} color="#8A8C9A" style={styles.infoIcon} />
                    <Text style={styles.infoLabel}>나이</Text>
                  </View>
                  <Text style={styles.readOnlyValue}>{age ? `${age}세` : "정보 없음"}</Text>
                </View>
                
                <View style={styles.divider} />

                <View style={styles.infoRow}>
                  <View style={styles.infoLabelContainer}>
                    <Ionicons name="transgender-outline" size={18} color="#8A8C9A" style={styles.infoIcon} />
                    <Text style={styles.infoLabel}>성별</Text>
                  </View>
                  <Text style={styles.readOnlyValue}>{gender || "정보 없음"}</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.infoRow}>
                  <View style={styles.infoLabelContainer}>
                    <Ionicons name="briefcase-outline" size={18} color="#8A8C9A" style={styles.infoIcon} />
                    <Text style={styles.infoLabel}>직업</Text>
                  </View>
                  <Text style={styles.readOnlyValue}>{job || "정보 없음"}</Text>
                </View>
              </View>

              {/* View Mode Buttons */}
              <TouchableOpacity
                style={styles.editModeButton}
                onPress={handleEnterEditMode}
                activeOpacity={0.8}
              >
                <Text style={styles.editModeButtonText}>수정하기</Text>
              </TouchableOpacity>

              {/* Delete Account */}
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDeleteAccount}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteButtonText}>회원 탈퇴</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFF",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#5C6E91",
    fontWeight: "600",
    fontFamily: "PretendardMedium",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EBF0FA",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#2A3C6B",
    fontFamily: "PretendardBold",
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#5C6E91",
    marginLeft: 8,
    marginBottom: 8,
    fontFamily: "PretendardSemiBold",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#2A3C6B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  infoLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoIcon: {
    marginRight: 8,
  },
  infoLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#8A8C9A",
    fontFamily: "PretendardMedium",
  },
  readOnlyValueContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  readOnlyValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2A3C6B",
    fontFamily: "PretendardSemiBold",
  },
  badge: {
    backgroundColor: "#F1F4F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#8A8C9A",
    fontFamily: "PretendardSemiBold",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F4F9",
    marginVertical: 12,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#5C6E91",
    marginBottom: 8,
    marginLeft: 4,
    fontFamily: "PretendardSemiBold",
  },
  input: {
    backgroundColor: "#F1F4F9",
    padding: 14,
    borderRadius: 14,
    fontSize: 16,
    color: "#333333",
    fontFamily: "Pretendard",
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
    fontFamily: "PretendardSemiBold",
  },
  genderButtonTextActive: {
    color: "#FFFFFF",
  },
  jobGrid: {
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
    fontFamily: "PretendardSemiBold",
  },
  jobButtonTextActive: {
    color: "#FFFFFF",
  },
  editModeButton: {
    backgroundColor: "#2A3C6B",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#2A3C6B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  editModeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    fontFamily: "PretendardBold",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  saveButton: {
    flex: 2,
    backgroundColor: "#2A3C6B",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    marginLeft: 8,
    shadowColor: "#2A3C6B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledSaveButton: {
    backgroundColor: "#BCC8E0",
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    fontFamily: "PretendardBold",
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#E2E5EC",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    marginRight: 8,
  },
  cancelButtonText: {
    color: "#5C6E91",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "PretendardSemiBold",
  },
  deleteButton: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    paddingVertical: 8,
  },
  deleteButtonText: {
    color: "#E79A95",
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "PretendardSemiBold",
    textDecorationLine: "underline",
  },
});
