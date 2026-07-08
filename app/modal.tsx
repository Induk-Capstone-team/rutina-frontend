// app/modal.tsx
import RoutineForm, {
  makeStyles,
  RoutineFormHandle,
} from "@/components/routine_form";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import TodoForm, { TodoFormHandle } from "@/components/todo_form";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTheme } from "@/lib/constants/ThemeContext";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ModalScreen() {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    title?: string;
    startTime?: string;
    endTime?: string;
    category?: string;
    description?: string;
    type?: "routine" | "todo";
    date?: string;
  }>();

  //루틴 / Todo 토글 상태
  const [entryType, setEntryType] = useState<"routine" | "todo">(
    params.type === "todo" ? "todo" : "routine",
  );
  const lockedType = params.type === "todo" || params.type === "routine";
  //바텀시트 드래그 애니메이션
  const translateY = useRef(new Animated.Value(0)).current;
  const closeThreshold = 120;
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollOffsetRef = useRef(0);

  const routineFormRef = useRef<RoutineFormHandle>(null);
  const todoFormRef = useRef<TodoFormHandle>(null);

  // 현재 활성화된 폼의 draft 저장을 호출
  const saveActiveDraft = async () => {
    if (entryType === "routine") {
      await routineFormRef.current?.saveDraft();
    } else {
      await todoFormRef.current?.saveDraft();
    }
  };

  //모달 닫기 애니메이션
  const closeModal = () => {
    saveActiveDraft().then(() => {
      Animated.timing(translateY, {
        toValue: 500,
        duration: 180,
        useNativeDriver: true,
      }).start(() => {
        router.dismiss();
      });
    });
  };

  const resetSheetPosition = () => {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const isScrolledToTop = scrollOffsetRef.current <= 0;
        const isDraggingDown = gestureState.dy > 0;

        return (
          isScrolledToTop &&
          isDraggingDown &&
          Math.abs(gestureState.dy) > 8 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx)
        );
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > closeThreshold) {
          saveActiveDraft().then(() => {
            Animated.timing(translateY, {
              toValue: 500,
              duration: 180,
              useNativeDriver: true,
            }).start(() => {
              router.dismiss();
            });
          });
        } else {
          resetSheetPosition();
        }
      },
      onPanResponderTerminate: () => {
        resetSheetPosition();
      },
    }),
  ).current;

  return (
    <ThemedView style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={closeModal} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <Animated.View
          style={[
            styles.bottomSheet,
            {
              transform: [{ translateY }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <View style={styles.indicator} />

          <View style={styles.header}>
            <ThemedText type="subtitle" style={styles.headerTitle}>
              {entryType === "routine" ? "루틴 추가" : "할 일 추가"}
            </ThemedText>

            <TouchableOpacity onPress={closeModal}>
              <IconSymbol
                name="xmark.circle.fill"
                size={28}
                color={theme.handle}
              />
            </TouchableOpacity>
          </View>

          {/* 루틴 / Todo 토글 */}
          {!lockedType && (
            <View style={styles.typeToggleRow}>
              {(["routine", "todo"] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeToggleButton,
                    entryType === type && styles.typeToggleButtonActive,
                  ]}
                  onPress={() => setEntryType(type)}
                >
                  <ThemedText
                    style={[
                      styles.typeToggleText,
                      entryType === type && styles.typeToggleTextActive,
                    ]}
                  >
                    {type === "routine" ? "루틴" : "Todo"}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <ScrollView
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onScroll={(e) => {
              scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={16}
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingBottom: (insets.bottom > 0 ? insets.bottom : 20) + 12,
              },
            ]}
          >
            {entryType === "routine" ? (
              <RoutineForm ref={routineFormRef} params={params} />
            ) : (
              <TodoForm ref={todoFormRef} onSuccess={() => router.dismiss()} />
            )}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}
