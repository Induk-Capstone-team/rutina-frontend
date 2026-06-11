import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useState } from "react";
import { DeviceEventEmitter, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
export default function TutorialScreen() {
  const router = useRouter();
  const [page, setPage] = useState(0); // 현재 페이지 상태

  const handleNext = async () => {
  console.log("현재 페이지", page);

  if (page < pages.length - 1) {
    setPage(page + 1);
  } else {
    console.log("튜토리얼 종료");

    await AsyncStorage.setItem("tutorialCompleted", "true");
    DeviceEventEmitter.emit('TutorialCompletedEvent');
    router.replace("/(tabs)");
  }
};

  const handleFinishTutorial = async () => {
    try {
      // 1. 로컬 스토리지에 완료 상태 저장
      await AsyncStorage.setItem("tutorialCompleted", "true");
      
      // 2. 💡 RootLayout에게 튜토리얼 끝났다고 신호 보내기!
      DeviceEventEmitter.emit('TutorialCompletedEvent'); 
      
      // 3. 메인 화면(탭)으로 이동
      router.replace("/(tabs)");
    } catch (e) {
      console.error(e);
    }
  };

  const pages = [
  {
    //image: require("../assets/tutorial/tutorial1.png"),
    title: "환영합니다",
    description: "Rutina에 오신 것을 환영합니다.",
  },
  {
   // image: require("../assets/tutorial/tutorial2.png"),
    title: "루틴 생성",
    description: "원하는 루틴을 쉽게 만들 수 있습니다.",
  },
  {
    //image: require("../assets/tutorial/tutorial3.png"),
    title: "타임 테이블",
    description: "나의 성장 과정을 확인해보세요.",
  },
  {
    //image: require("../assets/tutorial/tutorial1.png"),
    title: "카테고리",
    description: "Rutina에 오신 것을 환영합니다.",
  },
  {
   // image: require("../assets/tutorial/tutorial2.png"),
    title: "히트맵",
    description: "원하는 루틴을 쉽게 만들 수 있습니다.",
  },
  {
    //image: require("../assets/tutorial/tutorial3.png"),
    title: "사용자 맞춤형 루틴 추천",
    description: "나의 성장 과정을 확인해보세요.",
  },
];


  return (
    <SafeAreaView style={styles.safeArea}>
  <View style={styles.container}>
    <TouchableOpacity
      style={styles.skipButton}
      onPress={handleFinishTutorial}
    >
      <Text style={styles.skipText}>건너뛰기</Text>
    </TouchableOpacity>

    <View style={styles.content}>
      {/* <Image
        source={pages[page].image}
        style={styles.image}
        resizeMode="contain"
      /> */}

      <Text style={styles.title}>
        {pages[page].title}
      </Text>

      <Text style={styles.description}>
        {pages[page].description}
      </Text>
    </View>

    <View style={styles.footer}>
      <View style={styles.indicatorContainer}>
        {pages.map((_, index) => (
          <View
            key={index}
            style={[
              styles.indicator,
              page === index && styles.activeIndicator,
            ]}
          />
        ))}
      </View>

      <TouchableOpacity
        style={styles.nextButton}
        onPress={handleNext}
      >
        <Text style={styles.nextButtonText}>
          {page === pages.length - 1
            ? "시작하기"
            : "다음"}
        </Text>
      </TouchableOpacity>
    </View>
  </View>
</SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  scrollContainer: {
    padding: 24,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#666666",
  },
  card: {
    backgroundColor: "#f7f7f7",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  tutorialText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  container: {
  flex: 1,
  paddingHorizontal: 24,
},

skipButton: {
  alignSelf: "flex-end",
  marginTop: 10,
},

skipText: {
  fontSize: 14,
  color: "#666",
},

content: {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
},

image: {
  width: 280,
  height: 280,
  marginBottom: 40,
},

title: {
  fontSize: 28,
  fontWeight: "700",
  textAlign: "center",
  marginBottom: 16,
},

description: {
  fontSize: 16,
  textAlign: "center",
  color: "#666",
  lineHeight: 24,
  paddingHorizontal: 20,
},

footer: {
  marginBottom: 40,
},

indicatorContainer: {
  flexDirection: "row",
  justifyContent: "center",
  marginBottom: 24,
},

indicator: {
  width: 8,
  height: 8,
  borderRadius: 4,
  backgroundColor: "#D0D0D0",
  marginHorizontal: 4,
},

activeIndicator: {
  width: 24,
  backgroundColor: "#007AFF",
},

nextButton: {
  backgroundColor: "#007AFF",
  borderRadius: 16,
  paddingVertical: 16,
  alignItems: "center",
},

nextButtonText: {
  color: "#fff",
  fontSize: 16,
  fontWeight: "600",
},
});