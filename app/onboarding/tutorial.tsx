import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
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

  const handlePrev = () => {
    if (page > 0) {
      setPage(page - 1);
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
      images: [
        require("../../assets/images/intro/timetable_1.png"),
        require("../../assets/images/intro/timetable_2.png"),
      ],
      title: "시간표 및 일정 관리",
      description: "스와이프를 통해서 시간표를 쉽게 확인하고, \n일정과 할 일을 한눈에 관리할 수 있습니다.",
    },
    {
      images: [
        require("../../assets/images/intro/routine.png"),
      ],
      title: "루틴 생성 및 관리",
      description: "나의 하루를 이끌 루틴을 \n생성하고 매일 꾸준히 실천해 보세요.",
    },
    {
      images: [
        require("../../assets/images/intro/category_1.png"),
        require("../../assets/images/intro/category_2.png"),
      ],
      title: "카테고리",
      description: "루틴을 카테고리별로 분류하여 \n나만의 루틴을 체계적으로 관리할 수 있습니다.",
    },
    {
      images: [
        require("../../assets/images/intro/ai.png"),
      ],
      title: "AI 루틴 제안",
      description: "AI에게 맞춤 루틴을 추천 받으세요. \n나의 생활 패턴에 맞는 루틴을 제안해 드립니다.",
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
      <View style={styles.imageContainer}>
        {pages.map((p, pIdx) => (
          <View
            key={pIdx}
            style={[
              styles.imageRow,
              { display: pIdx === page ? "flex" : "none" }
            ]}
          >
            {p.images.map((img, idx) => (
              <Image
                key={idx}
                source={img}
                style={[
                  styles.image,
                  p.images.length > 1 ? styles.halfImage : styles.fullImage,
                ]}
                contentFit="contain"
              />
            ))}
          </View>
        ))}
      </View>

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

      <View style={styles.buttonRow}>
        {page > 0 && (
          <TouchableOpacity
            style={styles.prevButton}
            onPress={handlePrev}
          >
            <Text style={styles.prevButtonText}>이전</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
        >
          <Text style={styles.nextButtonText}>
            {page === pages.length - 1 ? "시작하기" : "다음"}
          </Text>
        </TouchableOpacity>
      </View>
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
imageContainer: {
  justifyContent: "center",
  alignItems: "center",
  marginBottom: 24,
  width: "100%",
},
imageRow: {
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  width: "100%",
  gap: 12,
},
image: {
  height: 380,
},
fullImage: {
  width: 280,
},
halfImage: {
  flex: 1,
  maxWidth: 160,
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

  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  prevButton: {
    flex: 1,
    backgroundColor: "#F2F4F7",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  prevButtonText: {
    color: "#475467",
    fontSize: 16,
    fontWeight: "600",
  },
  nextButton: {
    flex: 1,
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