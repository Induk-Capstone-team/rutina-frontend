//category.tsx
import { DraggableCategoryList } from "@/components/DraggableCategoryList";
import { Header } from "@/components/ui/_header";
import {
  DEFAULT_CATEGORIES,
  EVENT_TYPES,
  getCategoryBadgeStyle,
  normalizeCategoryName,
  normalizeHexColor,
  uniqueColors,
  type CustomCategory,
} from "@/lib/category";
import { getRoutineOccurrenceDates } from "@/lib/storage";
import type { Category } from "@/services/category_service";
import { CategoryService } from "@/services/category_service";
import { RoutineService } from "@/services/routine_service";
import { authStore } from "@/store/authStore";
import type { ScheduleRoutine } from "@/types/routine";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import ColorPicker, {
  HueSlider,
  Panel1,
  Preview,
} from "reanimated-color-picker";
// 카테고리 탭 상태 타입: 진행중 / 완료됨
type CategoryTab = "ACTIVE" | "COMPLETED";

// 카테고리 숨김/수정 상태를 저장하는 메타 정보
interface CategoryMeta {
  id: string;
  linkedCategoryId?: number | null;
  name: string;
  color: string;
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
}

// 화면에 보여줄 카테고리 요약 데이터
interface CategorySummary {
  key: string;
  metaId?: string;
  linkedCategoryId?: number | null;
  name: string;
  color: string;
  isHidden: boolean;
  routines: ScheduleRoutine[];
  totalCount: number;
  completedCount: number;
  isCompletedCategory: boolean;
  isFixedCategory: boolean;
}
// 카테고리 숨김/수정 상태를 저장하는 AsyncStorage 키
const CATEGORY_META_STORAGE_KEY = "category_meta_v1";
// 사용자가 직접 추가한 색상 목록 저장 키
const CUSTOM_COLOR_STORAGE_KEY = "@rutina/custom_colors";
// 기본 선택 색상
const DEFAULT_COLOR = "#405886";
// 기본으로 보여줄 사용자 색상 팔레트
const DEFAULT_USER_COLOR_PALETTE = [
  "#405886",
  "#E79A95",
  "#EFB996",
  "#9FA2D6",
  "#A8CD9B",
  "#C4C6D0",
];
// 기본 카테고리인지 확인
const isFixedCategoryName = (categoryName: string) => {
  return Object.prototype.hasOwnProperty.call(EVENT_TYPES, categoryName);
};
// 오늘 날짜를 YYYY-MM-DD 형식으로 반환
const getTodayString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, "0");
  const date = `${today.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${date}`;
};

const isPastEndDate = (endDate?: string | null) => {
  if (!endDate) return false;

  // 종료일이 오늘보다 이전이면 기간이 지난 루틴으로 판단
  return endDate < getTodayString();
};
// 루틴이 완료 상태인지 판단
const isRoutineCompleted = (routine: ScheduleRoutine): boolean => {
  // 종료일이 지났으면 완료로 처리
  if (isPastEndDate(routine.endDate)) return true;

  // state가 false이면 수동 완료로 처리
  if (routine.state === false) return true;

  const completedDates = routine.completedDates ?? [];
  if (completedDates.length === 0) return false;

  // 단일 날짜 루틴은 해당 날짜가 완료 목록에 있는지 확인
  if (routine.startDate === routine.endDate) {
    return completedDates.includes(routine.startDate);
  }

  // 반복/기간 루틴은 시작일부터 오늘 또는 종료일까지의 발생 날짜를 계산
  const today = getTodayString();
  const effectiveEnd =
    routine.endDate && routine.endDate <= today ? routine.endDate : today;

  const allDates = getRoutineOccurrenceDates(
    routine,
    routine.startDate,
    effectiveEnd,
  );

  const normalizedCompletedDates = completedDates.map(
    (date) => date.split("T")[0],
  );

  return (
    allDates.length > 0 &&
    allDates.every((date) => normalizedCompletedDates.includes(date))
  );
};

const loadRoutines = async () => {
  return RoutineService.getAll();
};
// 숨김/수정된 카테고리 메타 정보를 불러옴
const loadCategoryMetas = async (): Promise<CategoryMeta[]> => {
  try {
    const raw = await AsyncStorage.getItem(CATEGORY_META_STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(Boolean) as CategoryMeta[];
  } catch (error) {
    console.error("카테고리 메타 로드 실패", error);
    return [];
  }
};

const loadCustomColors = async (): Promise<string[]> => {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_COLOR_STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return uniqueColors(
      parsed.filter((item): item is string => typeof item === "string"),
    ).slice(0, 16);
  } catch (error) {
    console.error("사용자 색상 로드 실패", error);
    return [];
  }
};

const saveCategoryMetas = async (metas: CategoryMeta[]) => {
  try {
    await AsyncStorage.setItem(
      CATEGORY_META_STORAGE_KEY,
      JSON.stringify(metas),
    );
  } catch (error) {
    console.error("카테고리 메타 저장 실패", error);
  }
};
//서버 카테고리만 기준으로
const buildCategorySummaries = (
  routines: ScheduleRoutine[],
  metas: CategoryMeta[],
  serverCategories: Category[],
  serverSortOrderMap: Record<number, number>,
): CategorySummary[] => {
  const getKey = (name: string) => normalizeCategoryName(name).toLowerCase();
  const summaryMap = new Map<string, CategorySummary>();

  // 서버에 있는 카테고리만 기준으로 목록 구성
  serverCategories.forEach((sc) => {
    const key = getKey(sc.name);
    summaryMap.set(key, {
      key,
      linkedCategoryId: sc.id,
      name: sc.name,
      color: sc.colorCode,
      isHidden: sc.hidden,
      routines: [],
      totalCount: 0,
      completedCount: 0,
      isCompletedCategory: false,
      isFixedCategory: isFixedCategoryName(sc.name),
    });
  });

  // 루틴 집계
  routines.forEach((routine) => {
    const key = getKey(routine.categoryName ?? "기타");
    const existing = summaryMap.get(key);
    if (existing) {
      existing.routines.push(routine);
      existing.totalCount += 1;
      existing.completedCount += isRoutineCompleted(routine) ? 1 : 0;
    }
  });

  // 메타(숨김) 반영 — 서버 hidden 필드와 중복이지만 로컬 우선
  metas.forEach((meta) => {
    const key = getKey(meta.name);
    const existing = summaryMap.get(key);
    if (existing) {
      existing.isHidden = meta.isHidden;
      existing.metaId = meta.id;
    }
  });

  return Array.from(summaryMap.values())
    .map((category) => ({
      ...category,
      isCompletedCategory:
        category.totalCount > 0 &&
        category.completedCount === category.totalCount,
    }))
    .sort((a, b) => {
      const orderA = serverSortOrderMap[a.linkedCategoryId!] ?? 9999;
      const orderB = serverSortOrderMap[b.linkedCategoryId!] ?? 9999;
      if (orderA === orderB) return a.name.localeCompare(b.name, "ko");
      return orderA - orderB;
    });
};
export default function CategoryScreen() {
  const [selectedTab, setSelectedTab] = useState<CategoryTab>("ACTIVE");
  const [routines, setRoutines] = useState<ScheduleRoutine[]>([]);
  const [serverSortOrderMap, setServerSortOrderMap] = useState<
    Record<number, number>
  >({});
  const [serverCategoryList, setServerCategoryList] = useState<Category[]>([]);
  const [categoryMetas, setCategoryMetas] = useState<CategoryMeta[]>([]);
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showHiddenSection, setShowHiddenSection] = useState(false);
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<CategorySummary | null>(null);
  const [categoryNameInput, setCategoryNameInput] = useState("");
  const [selectedColor, setSelectedColor] = useState(DEFAULT_COLOR);
  const [customColors, setCustomColors] = useState<string[]>([]);
  const [showColorPickerModal, setShowColorPickerModal] = useState(false);
  const [pickerColor, setPickerColor] = useState(DEFAULT_COLOR);
  const [serverCategoryIdMap, setServerCategoryIdMap] = useState<
    Record<string, number>
  >({});

  const categoryModalTranslateY = useRef(new Animated.Value(0)).current;
  const CATEGORY_MODAL_CLOSE_THRESHOLD = 120;

  const refreshData = useCallback(async () => {
    if (!authStore.isLoggedIn) return;
    try {
      setIsLoading(true);
      const [
        storedRoutines,
        storedMetas,
        storedCustomColors,
        fetchedCategories,
      ] = await Promise.all([
        loadRoutines(),
        loadCategoryMetas(),
        loadCustomColors(),
        CategoryService.getAllIncludingHidden(),
      ]);

      const serverCustomCategories: CustomCategory[] = fetchedCategories
        .filter((c) => !DEFAULT_CATEGORIES.includes(c.name as any))
        .map((c) => ({ name: c.name, color: c.colorCode }));

      const idMap: Record<string, number> = {};
      fetchedCategories.forEach((c) => {
        idMap[c.name] = c.id;
      });
      const sortOrderMap: Record<number, number> = {};
      fetchedCategories.forEach((c) => {
        idMap[c.name] = c.id;
        sortOrderMap[c.id] = c.sortOrder;
      });
      setRoutines(storedRoutines);
      setCategoryMetas(storedMetas);
      setCustomColors(storedCustomColors);
      setCustomCategories(serverCustomCategories);
      setServerCategoryIdMap(idMap);
      setServerSortOrderMap(sortOrderMap);
      setServerCategoryList(fetchedCategories);
    } catch (error) {
      if ((error as any)?.name === "NoTokenError") return;
      if (
        (error as any)?.response?.status === 401 ||
        (error as any)?.response?.status === 403
      )
        return;
      console.error("카테고리 데이터 불러오기 실패", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshData();
    }, [refreshData]),
  );

  const categories = useMemo(() => {
    return buildCategorySummaries(
      routines,
      categoryMetas,
      serverCategoryList,
      serverSortOrderMap,
    );
  }, [routines, categoryMetas, serverCategoryList, serverSortOrderMap]);

  const visibleCategories = useMemo(() => {
    const result = categories
      .filter((category) => !category.isHidden)
      .map((category) => {
        const filteredRoutines = category.routines.filter((routine) => {
          const completed = isRoutineCompleted(routine);
          return selectedTab === "ACTIVE" ? !completed : completed;
        });
        return {
          ...category,
          routines: filteredRoutines,
          totalCount: category.totalCount,
          completedCount: category.completedCount,
          isCompletedCategory: selectedTab === "COMPLETED",
        };
      });

    return result;
  }, [categories, selectedTab]);

  const hiddenCategories = useMemo(() => {
    return categories.filter((category) => category.isHidden);
  }, [categories]);

  const allSelectableColors = useMemo(() => {
    return uniqueColors([...DEFAULT_USER_COLOR_PALETTE, ...customColors]);
  }, [customColors]);

  const resetCategoryModalState = () => {
    setEditingCategory(null);
    setCategoryNameInput("");
    setSelectedColor(DEFAULT_COLOR);
    setPickerColor(DEFAULT_COLOR);
    setShowColorPickerModal(false);
  };

  const openAddCategoryModal = () => {
    categoryModalTranslateY.setValue(0);
    setEditingCategory(null);
    setCategoryNameInput("");
    setSelectedColor(DEFAULT_COLOR);
    setPickerColor(DEFAULT_COLOR);
    setShowColorPickerModal(false);
    setIsCategoryModalVisible(true);
  };

  const openEditCategoryModal = (category: CategorySummary) => {
    categoryModalTranslateY.setValue(0);
    setEditingCategory(category);
    setCategoryNameInput(category.name);
    setSelectedColor(category.color);
    setPickerColor(category.color);
    setShowColorPickerModal(false);
    setIsCategoryModalVisible(true);
  };

  const closeCategoryModal = () => {
    if (isSaving) return;
    setIsCategoryModalVisible(false);
    resetCategoryModalState();
    categoryModalTranslateY.setValue(0);
  };

  const closeCategoryModalWithSwipe = () => {
    if (isSaving) return;
    Animated.timing(categoryModalTranslateY, {
      toValue: 700,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setIsCategoryModalVisible(false);
      resetCategoryModalState();
      categoryModalTranslateY.setValue(0);
    });
  };

  const resetCategoryModalPosition = () => {
    Animated.spring(categoryModalTranslateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  };

  const categoryModalPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return (
          Math.abs(gestureState.dy) > 8 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx)
        );
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          categoryModalTranslateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (
          gestureState.dy > CATEGORY_MODAL_CLOSE_THRESHOLD ||
          gestureState.vy > 1.2
        ) {
          closeCategoryModalWithSwipe();
        } else {
          resetCategoryModalPosition();
        }
      },
      onPanResponderTerminate: () => {
        resetCategoryModalPosition();
      },
    }),
  ).current;

  const upsertCategoryMeta = async (
    updater: (prev: CategoryMeta[]) => CategoryMeta[],
  ) => {
    const next = updater(categoryMetas);
    setCategoryMetas(next);
    await saveCategoryMetas(next);
  };

  const handleSelectFixedCategory = (categoryName: string) => {
    const fixedStyle = EVENT_TYPES[categoryName as keyof typeof EVENT_TYPES];
    setCategoryNameInput(categoryName);
    setSelectedColor(fixedStyle.dot);
    setPickerColor(fixedStyle.dot);
  };

  const handleSavePickedColor = async () => {
    const normalizedColor = normalizeHexColor(pickerColor);
    const isHexColor = /^#([0-9A-F]{6}|[0-9A-F]{3})$/i.test(normalizedColor);

    if (!isHexColor) {
      Alert.alert("색상 저장 실패", "올바른 색상을 선택해주세요.");
      return;
    }

    try {
      const nextColors = uniqueColors([normalizedColor, ...customColors]).slice(
        0,
        16,
      );
      await AsyncStorage.setItem(
        CUSTOM_COLOR_STORAGE_KEY,
        JSON.stringify(nextColors),
      );
      setCustomColors(nextColors);
      setSelectedColor(normalizedColor);
      setPickerColor(normalizedColor);
      setShowColorPickerModal(false);
    } catch (error) {
      console.error("사용자 색상 저장 실패", error);
      Alert.alert("색상 저장 실패", "색상을 저장하지 못했어요.");
    }
  };

  const handleConfirmDeleteCustomColor = (color: string) => {
    Alert.alert("색상 삭제", "이 색상을 삭제할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: () => handleDeleteCustomColor(color),
      },
    ]);
  };

  const handleDeleteCustomColor = async (color: string) => {
    try {
      const filtered = customColors.filter((item) => item !== color);
      await AsyncStorage.setItem(
        CUSTOM_COLOR_STORAGE_KEY,
        JSON.stringify(filtered),
      );
      setCustomColors(filtered);
      if (selectedColor === color) {
        setSelectedColor(DEFAULT_COLOR);
        setPickerColor(DEFAULT_COLOR);
      }
    } catch (error) {
      console.error("사용자 색상 삭제 실패", error);
      Alert.alert("색상 삭제 실패", "색상을 삭제하지 못했어요.");
    }
  };

  // 카테고리 삭제 (서버 + 메타)
  const handleDeleteCustomCategory = async (category: CategorySummary) => {
    try {
      setIsLoading(true);

      const serverId =
        category.linkedCategoryId ?? serverCategoryIdMap[category.name];

      // 1. 먼저 해당 카테고리에 연결된 루틴 삭제
      await deleteRoutinesInCategory(category);

      // 2. 그 다음 카테고리 삭제
      if (serverId) {
        await CategoryService.delete(serverId);
      }

      // 3. 로컬 메타 삭제
      await upsertCategoryMeta((prev) =>
        prev.filter((meta) => {
          if (category.metaId) return meta.id !== category.metaId;
          return meta.name.toLowerCase() !== category.name.toLowerCase();
        }),
      );

      if (
        categoryNameInput.trim().toLowerCase() ===
        category.name.trim().toLowerCase()
      ) {
        setCategoryNameInput("");
        setSelectedColor(DEFAULT_COLOR);
        setPickerColor(DEFAULT_COLOR);
      }

      await refreshData();
    } catch (error) {
      console.error("사용자 카테고리 삭제 실패", error);
      Alert.alert(
        "카테고리 삭제 실패",
        "루틴 또는 카테고리를 삭제하지 못했어요.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDeleteCustomCategory = (
    customCategory: CustomCategory,
  ) => {
    const matchedCategory = categories.find(
      (category) =>
        !category.isFixedCategory &&
        category.name.trim().toLowerCase() ===
          customCategory.name.trim().toLowerCase(),
    );

    const categoryToDelete: CategorySummary = matchedCategory ?? {
      key: normalizeCategoryName(customCategory.name).toLowerCase(),
      linkedCategoryId: null,
      name: customCategory.name,
      color: customCategory.color,
      isHidden: false,
      routines: [],
      totalCount: 0,
      completedCount: 0,
      isCompletedCategory: false,
      isFixedCategory: false,
    };

    if (categoryToDelete.totalCount > 0) {
      Alert.alert(
        "카테고리 삭제",
        `"${categoryToDelete.name}" 카테고리에 연결된 루틴 ${categoryToDelete.totalCount}개가 있어요.\n\n삭제하면 연결된 루틴도 함께 삭제됩니다. 계속할까요?`,
        [
          { text: "취소", style: "cancel" },
          {
            text: "삭제",
            style: "destructive",
            onPress: () => handleDeleteCustomCategory(categoryToDelete),
          },
        ],
      );
      return;
    }

    Alert.alert(
      "카테고리 삭제",
      `"${categoryToDelete.name}" 카테고리를 삭제할까요?`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: () => handleDeleteCustomCategory(categoryToDelete),
        },
      ],
    );
  };

  const handleSaveCategory = async () => {
    const trimmedName = categoryNameInput.trim();

    if (!trimmedName) {
      Alert.alert("알림", "카테고리 이름을 입력해주세요.");
      return;
    }

    const duplicated = categories.some((category) => {
      if (editingCategory && category.key === editingCategory.key) return false;
      return category.name.trim().toLowerCase() === trimmedName.toLowerCase();
    });

    if (duplicated) {
      Alert.alert("알림", "같은 이름의 카테고리가 이미 있어요.");
      return;
    }

    try {
      setIsSaving(true);
      const normalizedColor = normalizeHexColor(selectedColor);

      if (!isFixedCategoryName(trimmedName)) {
        if (!editingCategory) {
          await CategoryService.create(trimmedName, normalizedColor);
        } else {
          let targetId = editingCategory.linkedCategoryId ?? null;

          if (!targetId) {
            const freshCategories = await CategoryService.getAll();
            const matched = freshCategories.find(
              (c) =>
                c.name.trim().toLowerCase() ===
                editingCategory.name.trim().toLowerCase(),
            );
            targetId = matched?.id ?? null;
          }

          if (targetId) {
            await CategoryService.update(targetId, {
              name: trimmedName,
              colorCode: normalizedColor,
              hidden: editingCategory.isHidden ?? false,
            });
          } else {
            await CategoryService.create(trimmedName, normalizedColor);
          }
        }
      }

      await refreshData();
      closeCategoryModal();
    } finally {
      setIsSaving(false);
    }
  };

  // 카테고리 숨김 — 서버 실패 시 중단
  const handleHideCategory = async (category: CategorySummary) => {
    // 서버 ID가 있으면 서버 먼저 업데이트
    if (category.linkedCategoryId) {
      try {
        await CategoryService.update(category.linkedCategoryId, {
          name: category.name,
          colorCode: category.color,
          hidden: true,
        });
      } catch (error) {
        //서버 실패 시 로컬 업데이트 없이 중단
        console.error("서버 카테고리 숨김 처리 실패", error);
        Alert.alert(
          "숨기기 실패",
          "서버 연결에 문제가 생겼어요. 잠시 후 다시 시도해주세요.",
        );
        return;
      }
    }

    // 서버 성공(또는 서버 ID 없는 경우)에만 로컬 메타 업데이트
    await upsertCategoryMeta((prev) => {
      const now = new Date().toISOString();
      const matchedIndex = prev.findIndex((meta) => {
        if (category.metaId) return meta.id === category.metaId;
        return meta.name.toLowerCase() === category.name.toLowerCase();
      });

      if (matchedIndex >= 0) {
        return prev.map((meta, index) =>
          index === matchedIndex
            ? { ...meta, isHidden: true, updatedAt: now }
            : meta,
        );
      }

      return [
        ...prev,
        {
          id: `${Date.now()}`,
          linkedCategoryId: category.linkedCategoryId ?? null,
          name: category.name,
          color: category.color,
          isHidden: true,
          createdAt: now,
          updatedAt: now,
        },
      ];
    });

    await refreshData();
  };

  // 숨긴 카테고리 복구 — 서버 실패 시 중단
  const handleRestoreCategory = async (category: CategorySummary) => {
    if (category.linkedCategoryId) {
      try {
        await CategoryService.update(category.linkedCategoryId, {
          name: category.name,
          colorCode: category.color,
          hidden: false,
        });
      } catch (error) {
        //서버 실패 시 로컬 업데이트 없이 중단
        console.error("서버 카테고리 복구 실패", error);
        Alert.alert(
          "복구 실패",
          "서버 연결에 문제가 생겼어요. 잠시 후 다시 시도해주세요.",
        );
        return;
      }
    }

    // 서버 성공에만 로컬 메타 업데이트
    await upsertCategoryMeta((prev) =>
      prev.map((meta) => {
        const isMatched =
          (category.metaId && meta.id === category.metaId) ||
          meta.name.toLowerCase() === category.name.toLowerCase();
        if (!isMatched) return meta;
        return {
          ...meta,
          isHidden: false,
          updatedAt: new Date().toISOString(),
        };
      }),
    );

    await refreshData();
  };

  const deleteRoutinesInCategory = async (category: CategorySummary) => {
    // 1. 모든 루틴을 다시 가져와서 현재 카테고리에 속한 루틴 필터링
    const latestRoutines = await RoutineService.getAll();

    // 서버 카테고리 ID가 있는지 확인
    const targetId = category.linkedCategoryId;
    const targetName = normalizeCategoryName(category.name).toLowerCase();

    const routinesToDelete = latestRoutines.filter((routine) => {
      // ID가 있으면 ID로 비교
      if (targetId && routine.categoryId === targetId) return true;

      // ID가 없는 예전 데이터일 경우 이름으로 비교
      const rName = normalizeCategoryName(
        routine.categoryName || "",
      ).toLowerCase();
      return rName === targetName;
    });

    if (routinesToDelete.length === 0) return;

    // 2. 루틴 삭제 호출 (순차적으로 처리하여 에러 확인)
    for (const routine of routinesToDelete) {
      try {
        await RoutineService.deleteById(routine.id);
      } catch (error: any) {
        // 500 에러가 발생한다면 여기서 catch 됨
        console.error(
          `루틴 ID ${routine.id} 삭제 중 서버 에러:`,
          error.response?.status,
        );
        // 서버 에러가 나더라도 다음 루틴 삭제를 계속 시도하려면 skip, 아니면 throw
      }
    }
  };
  // 서버 카테고리 id 찾기
  const getServerCategoryId = async (category: CategorySummary) => {
    if (category.linkedCategoryId) return category.linkedCategoryId;

    // 숨겨진 카테고리까지 포함해서 서버에서 전체 목록을 가져와 매칭
    const allCategories = await CategoryService.getAllIncludingHidden();
    const matched = allCategories.find(
      (item) =>
        normalizeCategoryName(item.name).toLowerCase() ===
        normalizeCategoryName(category.name).toLowerCase(),
    );

    return matched?.id ?? null;
  };
  const handleDeleteCategory = async (category: CategorySummary) => {
    if (category.isFixedCategory) {
      Alert.alert(
        "삭제 불가",
        `"${category.name}"은 기본 카테고리라 삭제할 수 없어요.`,
      );
      return;
    }

    const hasRoutines = category.totalCount > 0;

    const message = hasRoutines
      ? `"${category.name}" 카테고리에 연결된 루틴 ${category.totalCount}개가 있어요.\n\n삭제하면 연결된 루틴도 함께 삭제됩니다. 계속할까요?`
      : `"${category.name}" 카테고리를 삭제할까요?`;

    Alert.alert("카테고리 삭제", message, [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            setIsLoading(true);

            const serverId = await getServerCategoryId(category);
            // 루틴이 있으면 카테고리 삭제 전에 먼저 루틴 삭제
            if (hasRoutines) {
              await deleteRoutinesInCategory(category);
            }

            // 루틴 삭제 후 카테고리 삭제
            if (serverId) {
              await CategoryService.delete(serverId);
            }

            // 로컬 메타 삭제
            await upsertCategoryMeta((prev) =>
              prev.filter((meta) => {
                if (category.metaId) return meta.id !== category.metaId;
                return (
                  meta.name.trim().toLowerCase() !==
                  category.name.trim().toLowerCase()
                );
              }),
            );

            await refreshData();
          } catch (error) {
            console.error("카테고리 삭제 실패", error);
            Alert.alert("삭제 실패", "루틴 또는 카테고리를 삭제하지 못했어요.");
          } finally {
            setIsLoading(false);
          }
        },
      },
    ]);
  };
  // 카테고리 순서 변경 — 낙관적 업데이트 후 서버 동기화, 실패 시 롤백
  const handleReorder = async (reorderedCategories: CategorySummary[]) => {
    const categoryIds = reorderedCategories
      .filter((c) => c.linkedCategoryId != null)
      .map((c) => c.linkedCategoryId as number);

    if (categoryIds.length === 0) return;

    // 롤백용으로 현재 순서 저장
    const previousSortOrderMap = { ...serverSortOrderMap };

    //  낙관적 업데이트: 서버 응답 전에 로컬 상태 먼저 반영
    const newSortOrderMap: Record<number, number> = {};
    categoryIds.forEach((id, index) => {
      newSortOrderMap[id] = index;
    });
    setServerSortOrderMap(newSortOrderMap);

    try {
      await CategoryService.reorder(categoryIds);
    } catch (error) {
      console.error("순서 변경 실패 — 롤백");

      setServerSortOrderMap(previousSortOrderMap);
    }
  };
  const renderRoutineItem = (routine: ScheduleRoutine) => {
    const completed = isRoutineCompleted(routine);

    return (
      <View key={routine.id} style={styles.routineItem}>
        <View
          style={[
            styles.routineDot,
            completed && {
              backgroundColor: routine.color ?? DEFAULT_COLOR,
            },
          ]}
        />
        <View style={styles.routineTextWrapper}>
          <Text
            style={[
              styles.routineTitle,
              completed && styles.routineTitleCompleted,
            ]}
          >
            {routine.title}
          </Text>
          <Text style={styles.routineSubText}>
            {routine.startDate} ~ {routine.endDate}
          </Text>
        </View>
      </View>
    );
  };
  // 카테고리 카드 한 개를 렌더링
  const renderCategoryItem = useCallback(
    (item: CategorySummary, index: number) => {
      const badgeText = selectedTab === "COMPLETED" ? "완료됨" : "진행중";
      const badgeStyle =
        selectedTab === "COMPLETED" ? styles.badgeCompleted : undefined;
      const badgeTextStyle =
        selectedTab === "COMPLETED" ? styles.badgeTextCompleted : undefined;

      return (
        <View style={styles.card}>
          {/* 드래그 힌트 */}
          <View style={styles.dragHandle}>
            <Text style={styles.dragHandleText}>⠿</Text>
          </View>

          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleRow}>
              <View
                style={[styles.colorDot, { backgroundColor: item.color }]}
              />
              <View style={styles.cardTitleTextBox}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardCountText}>
                  전체 {item.totalCount}개 · 완료 {item.completedCount}개
                </Text>
              </View>
            </View>
            <View style={[styles.badge, badgeStyle]}>
              <Text style={[styles.badgeText, badgeTextStyle]}>
                {badgeText}
              </Text>
            </View>
          </View>

          <View style={styles.routineBox}>
            {item.routines.length > 0 ? (
              item.routines.slice(0, 3).map(renderRoutineItem)
            ) : (
              <Text style={styles.emptyRoutineText}>
                {selectedTab === "ACTIVE"
                  ? "연결된 루틴이 아직 없어요."
                  : "완료된 루틴이 아직 없어요."}
              </Text>
            )}
          </View>

          <View style={styles.actionRow}>
            <Pressable
              style={[styles.actionButton, styles.editButton]}
              onPress={() => openEditCategoryModal(item)}
            >
              <Text style={[styles.actionButtonText, styles.editButtonText]}>
                수정
              </Text>
            </Pressable>
            <Pressable
              style={[styles.actionButton, styles.hideButton]}
              onPress={() => handleHideCategory(item)}
            >
              <Text style={styles.actionButtonText}>숨기기</Text>
            </Pressable>
            <Pressable
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDeleteCategory(item)}
            >
              <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
                삭제
              </Text>
            </Pressable>
          </View>
        </View>
      );
    },
    [selectedTab],
  );

  const renderHiddenCard = (item: CategorySummary) => {
    return (
      <View key={item.key} style={styles.hiddenCard}>
        <View style={styles.hiddenLeft}>
          <View style={[styles.colorDot, { backgroundColor: item.color }]} />
          <View style={styles.hiddenTextBox}>
            <Text style={styles.hiddenTitle}>{item.name}</Text>
            <Text style={styles.hiddenDescription}>
              목록에서만 숨김 · 히트맵/통계용 데이터는 유지
            </Text>
          </View>
        </View>

        <Pressable
          style={styles.restoreButton}
          onPress={() => handleRestoreCategory(item)}
        >
          <Text style={styles.restoreButtonText}>복구</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerWrapper}>
          <Header />
        </View>

        <View style={styles.mainCard}>
          <View style={styles.headerArea} />

          <View style={styles.tabRow}>
            <View style={styles.tabWrapper}>
              <Pressable
                style={[
                  styles.tabButton,
                  selectedTab === "ACTIVE" && styles.tabButtonActive,
                ]}
                onPress={() => setSelectedTab("ACTIVE")}
              >
                <Text
                  style={[
                    styles.tabText,
                    selectedTab === "ACTIVE" && styles.tabTextActive,
                  ]}
                >
                  진행중
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.tabButton,
                  selectedTab === "COMPLETED" && styles.tabButtonActive,
                ]}
                onPress={() => setSelectedTab("COMPLETED")}
              >
                <Text
                  style={[
                    styles.tabText,
                    selectedTab === "COMPLETED" && styles.tabTextActive,
                  ]}
                >
                  완료됨
                </Text>
              </Pressable>
            </View>

            <Pressable
              style={styles.floatingAddButton}
              onPress={openAddCategoryModal}
            >
              <Text style={styles.floatingAddButtonText}>+</Text>
            </Pressable>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#405886" />
              <Text style={styles.loadingText}>카테고리를 불러오는 중...</Text>
            </View>
          ) : (
            <DraggableCategoryList
              data={visibleCategories}
              renderItem={renderCategoryItem}
              onReorder={handleReorder}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyTitle}>
                    {selectedTab === "ACTIVE"
                      ? "진행중인 루틴이 없어요"
                      : "완료된 루틴이 없어요"}
                  </Text>
                  <Text style={styles.emptyDescription}>
                    우측의 + 버튼으로 카테고리를 추가해보세요.
                  </Text>
                </View>
              }
              ListFooterComponent={
                <View style={styles.footerSection}>
                  <Pressable
                    style={styles.hiddenToggleButton}
                    onPress={() => setShowHiddenSection((prev) => !prev)}
                  >
                    <Text style={styles.hiddenToggleButtonText}>
                      {showHiddenSection
                        ? "숨긴 카테고리 접기"
                        : `숨긴 카테고리 보기 (${hiddenCategories.length})`}
                    </Text>
                  </Pressable>

                  {showHiddenSection && (
                    <View style={styles.hiddenSection}>
                      <Text style={styles.hiddenSectionTitle}>
                        숨긴 카테고리
                      </Text>

                      {hiddenCategories.length === 0 ? (
                        <Text style={styles.hiddenEmptyText}>
                          숨긴 카테고리가 없어요.
                        </Text>
                      ) : (
                        hiddenCategories.map(renderHiddenCard)
                      )}
                    </View>
                  )}
                </View>
              }
            />
          )}
        </View>

        {/* 카테고리 추가/수정 바텀시트 모달 */}
        <Modal
          visible={isCategoryModalVisible}
          transparent
          animationType="fade"
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={closeCategoryModal}
          />
          <KeyboardAvoidingView
            style={styles.keyboardAvoidingView}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <Animated.View
              style={[
                styles.modalContainer,
                { transform: [{ translateY: categoryModalTranslateY }] },
              ]}
              {...categoryModalPanResponder.panHandlers}
            >
              <View style={styles.modalHandle} />

              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalContent}
              >
                <Text style={styles.modalTitle}>
                  {editingCategory ? "카테고리 수정" : "카테고리 추가"}
                </Text>

                <Text style={styles.inputLabel}>카테고리 이름</Text>
                <TextInput
                  style={styles.input}
                  placeholder="카테고리 이름을 입력하세요"
                  placeholderTextColor="#9CA3AF"
                  value={categoryNameInput}
                  onChangeText={setCategoryNameInput}
                  maxLength={20}
                />
                {!editingCategory && (
                  <>
                    <Text style={styles.inputLabel}>고정 카테고리</Text>
                    <View style={styles.categoryGrid}>
                      {DEFAULT_CATEGORIES.map((categoryName) => {
                        const fixedStyle = EVENT_TYPES[categoryName];
                        const badgeStyle = getCategoryBadgeStyle(
                          categoryName,
                          fixedStyle.dot,
                        );
                        const isSelected =
                          categoryNameInput.trim() === categoryName;

                        return (
                          <Pressable
                            key={categoryName}
                            style={[
                              styles.categoryBadge,
                              {
                                backgroundColor: badgeStyle.backgroundColor,
                                borderColor: isSelected
                                  ? badgeStyle.borderColor
                                  : "transparent",
                                borderWidth: isSelected ? 1.5 : 1,
                              },
                            ]}
                            onPress={() =>
                              handleSelectFixedCategory(categoryName)
                            }
                          >
                            <View
                              style={[
                                styles.categoryBadgeDot,
                                { backgroundColor: fixedStyle.dot },
                              ]}
                            />
                            <Text
                              style={[
                                styles.categoryBadgeText,
                                { color: badgeStyle.textColor },
                              ]}
                            >
                              {categoryName}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </>
                )}
                {!editingCategory && customCategories.length > 0 && (
                  <>
                    <Text style={styles.inputLabel}>사용자 카테고리</Text>
                    <View style={styles.categoryGrid}>
                      {customCategories.map((item) => {
                        const badgeStyle = getCategoryBadgeStyle(
                          item.name,
                          item.color,
                        );
                        const isSelected =
                          categoryNameInput.trim() === item.name;

                        return (
                          <Pressable
                            key={item.name}
                            style={[
                              styles.categoryBadge,
                              {
                                backgroundColor: badgeStyle.backgroundColor,
                                borderColor: isSelected
                                  ? badgeStyle.borderColor
                                  : "transparent",
                                borderWidth: isSelected ? 1.5 : 1,
                              },
                            ]}
                            onPress={() => {
                              setCategoryNameInput(item.name);
                              setSelectedColor(item.color);
                              setPickerColor(item.color);
                            }}
                            //사용자 카테고리를 길게 누르면 삭제 확인창 표시
                            onLongPress={() =>
                              handleConfirmDeleteCustomCategory(item)
                            }
                          >
                            <View
                              style={[
                                styles.categoryBadgeDot,
                                { backgroundColor: item.color },
                              ]}
                            />
                            <Text
                              style={[
                                styles.categoryBadgeText,
                                { color: badgeStyle.textColor },
                              ]}
                            >
                              {item.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </>
                )}

                <Text style={styles.inputLabel}>카테고리 색상</Text>
                <View style={styles.colorRowWrap}>
                  {allSelectableColors.map((color) => {
                    const isSelected = color === selectedColor;
                    const isCustom = customColors.includes(color);

                    return (
                      <View key={color} style={styles.colorItem}>
                        <Pressable
                          style={[
                            styles.colorButton,
                            { backgroundColor: color },
                            isSelected && styles.colorButtonSelected,
                          ]}
                          onPress={() => {
                            setSelectedColor(color);
                            setPickerColor(color);
                          }}
                          onLongPress={() =>
                            isCustom && handleConfirmDeleteCustomColor(color)
                          }
                        />
                        {isCustom && (
                          <Pressable
                            style={styles.colorDeleteMiniButton}
                            onPress={() =>
                              handleConfirmDeleteCustomColor(color)
                            }
                          >
                            <Text style={styles.colorDeleteMiniButtonText}>
                              −
                            </Text>
                          </Pressable>
                        )}
                      </View>
                    );
                  })}

                  <Pressable
                    style={[
                      styles.plusColorCircle,
                      showColorPickerModal && styles.plusColorCircleActive,
                    ]}
                    onPress={() => setShowColorPickerModal((prev) => !prev)}
                  >
                    <Text style={styles.plusColorCircleText}>
                      {showColorPickerModal ? "−" : "+"}
                    </Text>
                  </Pressable>
                </View>

                {showColorPickerModal && (
                  <View style={styles.inlineColorPickerBox}>
                    <View style={styles.inlineColorPickerHeader}>
                      <Text style={styles.inlineColorPickerTitle}>
                        색상 선택
                      </Text>

                      <Pressable onPress={handleSavePickedColor}>
                        <Text style={styles.inlineColorPickerSaveText}>
                          저장
                        </Text>
                      </Pressable>
                    </View>

                    <ColorPicker
                      value={pickerColor}
                      onCompleteJS={(color) => {
                        setPickerColor(color.hex);
                      }}
                      style={styles.colorPicker}
                    >
                      <Preview hideInitialColor style={styles.colorPreview} />
                      <Panel1 style={styles.colorPanel} />
                      <HueSlider style={styles.hueSlider} />
                    </ColorPicker>

                    <View style={styles.selectedColorInfoRow}>
                      <View
                        style={[
                          styles.selectedColorPreviewDot,
                          { backgroundColor: pickerColor },
                        ]}
                      />
                      <Text style={styles.selectedColorHexText}>
                        {pickerColor.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.modalButtonRow}>
                  <Pressable
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={closeCategoryModal}
                    disabled={isSaving}
                  >
                    <Text style={styles.cancelButtonText}>취소</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.modalButton, styles.saveButton]}
                    onPress={handleSaveCategory}
                    disabled={isSaving}
                  >
                    <Text style={styles.saveButtonText}>
                      {isSaving
                        ? "저장 중..."
                        : editingCategory
                          ? "수정 완료"
                          : "추가"}
                    </Text>
                  </Pressable>
                </View>
              </ScrollView>
            </Animated.View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F3F4F8",
  },
  container: {
    flex: 1,
    backgroundColor: "#F3F4F8",
  },

  headerWrapper: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },

  mainCard: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    borderColor: "#EEF1F6",
  },

  headerArea: {
    height: 10,
  },

  tabRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 14,
  },

  tabWrapper: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#EEF1F7",
    borderRadius: 18,
    padding: 4,
    marginRight: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 14,
  },
  tabButtonActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#233255",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#8A8C9A",
  },
  tabTextActive: {
    color: "#233255",
  },

  floatingAddButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#233255",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#233255",
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  floatingAddButtonText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "600",
    lineHeight: 26,
    marginTop: -1,
    includeFontPadding: false,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#8A8C9A",
  },

  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 28,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#EEF1F6",
    shadowColor: "#1F2937",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    marginRight: 10,
    marginTop: 3,
  },
  cardTitleTextBox: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#233255",
  },
  cardCountText: {
    marginTop: 4,
    fontSize: 13,
    color: "#8A8C9A",
  },

  badge: {
    backgroundColor: "#EEF2FF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeCompleted: {
    backgroundColor: "#EDF7EE",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#586B9A",
  },
  badgeTextCompleted: {
    color: "#4C7A53",
  },

  routineBox: {
    backgroundColor: "#F8F9FB",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  routineItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  routineDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#CBD5E1",
    marginRight: 10,
    marginTop: 2,
  },
  routineTextWrapper: {
    flex: 1,
  },
  routineTitle: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  routineTitleCompleted: {
    color: "#9CA3AF",
    textDecorationLine: "line-through",
  },
  routineSubText: {
    marginTop: 3,
    fontSize: 12,
    color: "#A0B0D0",
  },
  emptyRoutineText: {
    fontSize: 14,
    color: "#9CA3AF",
  },

  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  editButton: {
    backgroundColor: "#EEF2FF",
    marginRight: 8,
  },
  hideButton: {
    backgroundColor: "#F3F4F6",
    marginRight: 8,
  },
  deleteButton: {
    backgroundColor: "#FDECEC",
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4B5563",
  },
  editButtonText: {
    color: "#4D5F8E",
  },
  deleteButtonText: {
    color: "#C35F5F",
  },

  emptyContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEF1F6",
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 6,
  },
  emptyDescription: {
    fontSize: 14,
    color: "#8A8C9A",
    textAlign: "center",
    lineHeight: 20,
  },

  footerSection: {
    marginTop: 2,
  },
  hiddenToggleButton: {
    backgroundColor: "#EEF2FF",
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: "center",
  },
  hiddenToggleButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#233255",
  },

  hiddenSection: {
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EEF1F6",
  },
  hiddenSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#233255",
    marginBottom: 12,
  },
  hiddenEmptyText: {
    fontSize: 14,
    color: "#9CA3AF",
  },

  hiddenCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8F9FB",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  hiddenLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  hiddenTextBox: {
    flex: 1,
  },
  hiddenTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
  },
  hiddenDescription: {
    marginTop: 4,
    fontSize: 12,
    color: "#8A8C9A",
  },
  restoreButton: {
    backgroundColor: "#EEF2FF",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  restoreButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#233255",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.28)",
  },

  modalHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#D9DEE8",
    marginTop: 10,
    marginBottom: 6,
  },

  modalContainer: {
    maxHeight: "88%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },

  modalContent: {
    padding: 20,
    paddingBottom: 32,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#233255",
    marginBottom: 18,
  },

  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D7DEEA",
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#1F2937",
    backgroundColor: "#FFFFFF",
  },

  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 2,
    gap: 6,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
  },
  categoryBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginRight: 7,
  },
  categoryBadgeText: {
    fontSize: 13,
    fontWeight: "700",
  },

  colorRowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginTop: 4,
  },
  colorItem: {
    position: "relative",
    marginRight: 12,
    marginBottom: 12,
  },
  colorButton: {
    width: 34,
    height: 34,
    borderRadius: 999,
  },
  colorButtonSelected: {
    borderWidth: 3,
    borderColor: "#1F2937",
  },
  colorDeleteMiniButton: {
    position: "absolute",
    top: -5,
    right: -5,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#D9534F",
    alignItems: "center",
    justifyContent: "center",
  },
  colorDeleteMiniButtonText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 11,
  },
  plusColorCircle: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#D7E4FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginBottom: 12,
  },
  plusColorCircleActive: {
    backgroundColor: "#DCE6FF",
    borderColor: "#9FB6E9",
  },
  plusColorCircleText: {
    color: "#405886",
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 21,
    marginTop: -1,
  },

  inlineColorPickerBox: {
    marginTop: 6,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#F8F9FB",
    borderWidth: 1,
    borderColor: "#E7ECF4",
  },
  inlineColorPickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  inlineColorPickerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#233255",
  },
  inlineColorPickerSaveText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#405886",
  },

  colorPicker: {
    width: "100%",
  },
  colorPreview: {
    marginBottom: 16,
  },
  colorPanel: {
    width: "100%",
    height: 180,
    borderRadius: 16,
    marginBottom: 16,
  },
  hueSlider: {
    width: "100%",
    height: 36,
    borderRadius: 12,
    marginBottom: 16,
  },
  selectedColorInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
    justifyContent: "center",
  },
  selectedColorPreviewDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  selectedColorHexText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#405886",
  },

  modalButtonRow: {
    flexDirection: "row",
    marginTop: 22,
  },
  modalButton: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#F3F4F6",
    marginRight: 10,
  },
  saveButton: {
    backgroundColor: "#233255",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#4B5563",
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: "flex-end",
  },
  dragHandle: {
    position: "absolute",
    top: 16,
    right: 16,
    padding: 4,
    zIndex: 1,
  },
  dragHandleText: {
    fontSize: 18,
    color: "#C4C6D0",
    letterSpacing: 1,
  },
});
