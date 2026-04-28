import { Header } from "@/components/ui/_header";
import { RoutineStorage } from "@/lib/storage";
import type { ScheduleRoutine } from "@/types/routine";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Modal,
  PanResponder,
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

type CategoryTab = "ACTIVE" | "COMPLETED";

type CustomCategory = {
  name: string;
  color: string;
};

interface CategoryMeta {
  id: string;
  linkedCategoryId?: number | null;
  name: string;
  color: string;
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
}

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
// 사용자가 직접 추가한 카테고리 목록 저장 키
const CUSTOM_CATEGORY_STORAGE_KEY = "@rutina/custom_categories";
const DEFAULT_COLOR = "#405886";

// 기본으로 제공되는 고정 카테고리
const DEFAULT_CATEGORIES = [
  "기상",
  "운동",
  "공부",
  "명상",
  "저녁",
  "기타",
] as const;

// 고정 카테고리별 배지/점 색상 설정
const FIXED_EVENT_TYPES = {
  기상: { bg: "#FAEEEE", dot: "#E79A95", text: "#5D4645" },
  운동: { bg: "#FDF4EC", dot: "#EFB996", text: "#675141" },
  공부: { bg: "#F1F1FB", dot: "#9FA2D6", text: "#3E426F" },
  명상: { bg: "#F1F7EE", dot: "#A8CD9B", text: "#4C5D44" },
  저녁: { bg: "#FEF9EE", dot: "#E6CF8A", text: "#685A3F" },
  기타: { bg: "#F3F4F8", dot: "#C4C6D0", text: "#8A8C9A" },
} as const;

const DEFAULT_USER_COLOR_PALETTE = [
  "#405886",
  "#E79A95",
  "#EFB996",
  "#9FA2D6",
  "#A8CD9B",
  "#C4C6D0",
];
// 색상값을 항상 #이 붙은 대문자 HEX 형식으로 맞춤
const normalizeHexColor = (color: string) => {
  const value = color.trim().toUpperCase();
  return value.startsWith("#") ? value : `#${value}`;
};

const uniqueColors = (colors: string[]) => {
  return Array.from(new Set(colors.map(normalizeHexColor)));
};
// 사용자 카테고리 중복 제거: 이름이 같으면 마지막 값으로 덮어씀
const uniqueCustomCategories = (categories: CustomCategory[]) => {
  const map = new Map<string, CustomCategory>();

  categories.forEach((item) => {
    const name = item.name.trim();
    if (!name) return;

    map.set(name.toLowerCase(), {
      name,
      color: normalizeHexColor(item.color),
    });
  });

  return Array.from(map.values());
};

const normalizeCategoryName = (name?: string | null) => {
  const trimmed = name?.trim();
  return trimmed ? trimmed : "기타";
};

const toCategoryNameKey = (name: string) =>
  `name:${normalizeCategoryName(name).toLowerCase()}`;

const toCategoryIdKey = (id: number) => `id:${id}`;

const isFixedCategoryName = (categoryName: string) => {
  return Object.prototype.hasOwnProperty.call(FIXED_EVENT_TYPES, categoryName);
};

const getCategoryBadgeStyle = (categoryName: string, categoryColor: string) => {
  if (isFixedCategoryName(categoryName)) {
    const fixedStyle =
      FIXED_EVENT_TYPES[categoryName as keyof typeof FIXED_EVENT_TYPES];

    return {
      backgroundColor: fixedStyle.bg,
      textColor: fixedStyle.text,
      borderColor: fixedStyle.dot,
    };
  }

  return {
    backgroundColor: `${categoryColor}22`,
    textColor: categoryColor,
    borderColor: categoryColor,
  };
};
// 루틴이 속한 카테고리를 id 우선으로 구분함
const getRoutineCategoryKey = (routine: ScheduleRoutine) => {
  if (typeof routine.categoryId === "number") {
    return toCategoryIdKey(routine.categoryId);
  }

  return toCategoryNameKey(normalizeCategoryName(routine.categoryName));
};

const getMetaCategoryKey = (meta: CategoryMeta) => {
  if (typeof meta.linkedCategoryId === "number") {
    return toCategoryIdKey(meta.linkedCategoryId);
  }

  return toCategoryNameKey(meta.name);
};

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

const isRoutineCompleted = (routine: ScheduleRoutine) => {
  const today = getTodayString();

  // 오늘 일정 화면에서 체크한 루틴은 completedDates에 오늘 날짜가 들어왔다고 판단
  const isCompletedToday =
    Array.isArray(routine.completedDates) &&
    routine.completedDates.includes(today);

  //state가 false인 경우 사용자가 직접 비활성화/완료 처리한 루틴으로 판단
  const isManuallyCompleted = routine.state === false;

  // 종료 기간이 지난 루틴도 완료된 루틴으로 판단
  const isExpired = isPastEndDate(routine.endDate);

  return isCompletedToday || isManuallyCompleted || isExpired;
};

const loadRoutines = async () => {
  return RoutineStorage.getAll();
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
// 사용자 카테고리를 불러오고, 예전 string[] 저장 형태도 함께 처리함
const loadCustomCategories = async (): Promise<CustomCategory[]> => {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_CATEGORY_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as string[] | CustomCategory[];

    const normalized = Array.isArray(parsed)
      ? uniqueCustomCategories(
          parsed.map((item) => {
            if (typeof item === "string") {
              return {
                name: item,
                color: DEFAULT_USER_COLOR_PALETTE[0],
              };
            }

            return {
              name: item.name,
              color: item.color || DEFAULT_USER_COLOR_PALETTE[0],
            };
          }),
        )
      : [];

    return normalized;
  } catch (error) {
    console.error("사용자 카테고리 로드 실패", error);
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

const saveCustomCategories = async (categories: CustomCategory[]) => {
  try {
    await AsyncStorage.setItem(
      CUSTOM_CATEGORY_STORAGE_KEY,
      JSON.stringify(categories),
    );
  } catch (error) {
    console.error("사용자 카테고리 저장 실패", error);
    throw error;
  }
};
// 루틴, 고정 카테고리, 사용자 카테고리, 메타 정보를 하나의 화면용 데이터로 합침
const buildCategorySummaries = (
  routines: ScheduleRoutine[],
  metas: CategoryMeta[],
  customCategories: CustomCategory[],
): CategorySummary[] => {
  const summaryMap = new Map<string, CategorySummary>();

  routines.forEach((routine) => {
    const key = getRoutineCategoryKey(routine);
    const routineName = normalizeCategoryName(routine.categoryName);
    const routineColor = routine.color ?? DEFAULT_COLOR;

    const existing = summaryMap.get(key);

    if (existing) {
      existing.routines.push(routine);
      existing.totalCount += 1;
      existing.completedCount += isRoutineCompleted(routine) ? 1 : 0;
      return;
    }

    summaryMap.set(key, {
      key,
      linkedCategoryId:
        typeof routine.categoryId === "number" ? routine.categoryId : null,
      name: routineName,
      color: routineColor,
      isHidden: false,
      routines: [routine],
      totalCount: 1,
      completedCount: isRoutineCompleted(routine) ? 1 : 0,
      isCompletedCategory: false,
      isFixedCategory: isFixedCategoryName(routineName),
    });
  });

  const presetCategories: CustomCategory[] = [
    ...DEFAULT_CATEGORIES.map((name) => ({
      name,
      color: FIXED_EVENT_TYPES[name].dot,
    })),
    ...customCategories,
  ];

  presetCategories.forEach((category) => {
    const key = toCategoryNameKey(category.name);
    const existing = summaryMap.get(key);

    if (existing) {
      summaryMap.set(key, {
        ...existing,
        name: category.name,
        color: category.color,
        isFixedCategory: isFixedCategoryName(category.name),
      });
      return;
    }

    summaryMap.set(key, {
      key,
      linkedCategoryId: null,
      name: category.name,
      color: category.color,
      isHidden: false,
      routines: [],
      totalCount: 0,
      completedCount: 0,
      isCompletedCategory: false,
      isFixedCategory: isFixedCategoryName(category.name),
    });
  });

  metas.forEach((meta) => {
    const key = getMetaCategoryKey(meta);
    const existing = summaryMap.get(key);

    if (existing) {
      summaryMap.set(key, {
        ...existing,
        metaId: meta.id,
        linkedCategoryId:
          typeof meta.linkedCategoryId === "number"
            ? meta.linkedCategoryId
            : (existing.linkedCategoryId ?? null),
        name: meta.name,
        color: meta.color,
        isHidden: meta.isHidden,
      });
      return;
    }

    summaryMap.set(key, {
      key,
      metaId: meta.id,
      linkedCategoryId:
        typeof meta.linkedCategoryId === "number"
          ? meta.linkedCategoryId
          : null,
      name: meta.name,
      color: meta.color,
      isHidden: meta.isHidden,
      routines: [],
      totalCount: 0,
      completedCount: 0,
      isCompletedCategory: false,
      isFixedCategory: isFixedCategoryName(meta.name),
    });
  });

  return Array.from(summaryMap.values())
    .map((category) => ({
      ...category,
      isCompletedCategory:
        category.totalCount > 0 &&
        category.completedCount === category.totalCount,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
};

export default function CategoryScreen() {
  // 현재 선택된 탭: 진행중 / 완료됨
  const [selectedTab, setSelectedTab] = useState<CategoryTab>("ACTIVE");

  const [routines, setRoutines] = useState<ScheduleRoutine[]>([]);
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

  const [moveSourceCategory, setMoveSourceCategory] =
    useState<CategorySummary | null>(null);
  const [moveTargetKey, setMoveTargetKey] = useState<string | null>(null);
  const [isMoveModalVisible, setIsMoveModalVisible] = useState(false);
  const categoryModalTranslateY = useRef(new Animated.Value(0)).current;
  const CATEGORY_MODAL_CLOSE_THRESHOLD = 120;
  // 화면에 진입할 때 AsyncStorage와 루틴 저장소 데이터를 다시 불러옴
  const refreshData = useCallback(async () => {
    try {
      setIsLoading(true);

      const [
        storedRoutines,
        storedMetas,
        storedCustomColors,
        storedCustomCategories,
      ] = await Promise.all([
        loadRoutines(),
        loadCategoryMetas(),
        loadCustomColors(),
        loadCustomCategories(),
      ]);

      setRoutines(storedRoutines);
      setCategoryMetas(storedMetas);
      setCustomColors(storedCustomColors);
      setCustomCategories(storedCustomCategories);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshData();
    }, [refreshData]),
  );
  // 원본 데이터를 화면에서 사용할 카테고리 요약 데이터로 변환
  const categories = useMemo(() => {
    return buildCategorySummaries(routines, categoryMetas, customCategories);
  }, [routines, categoryMetas, customCategories]);
  // 숨김 처리되지 않은 카테고리 중 현재 탭에 맞는 루틴만 보여줌
  const visibleCategories = useMemo(() => {
    return categories
      .filter((category) => !category.isHidden)
      .map((category) => {
        // 카테고리 자체를 이동시키지 않고, 탭에 맞는 루틴만 분리해서 보여줌
        const filteredRoutines = category.routines.filter((routine) => {
          const completed = isRoutineCompleted(routine);

          if (selectedTab === "ACTIVE") {
            return !completed;
          }

          return completed;
        });

        return {
          ...category,
          routines: filteredRoutines,
          totalCount: filteredRoutines.length,
          completedCount: filteredRoutines.filter(isRoutineCompleted).length,
          // 완료 탭에서는 루틴 기준으로 완료 상태를 표시
          isCompletedCategory: selectedTab === "COMPLETED",
        };
      })
      .filter((category) => category.totalCount > 0);
  }, [categories, selectedTab]);

  const hiddenCategories = useMemo(() => {
    return categories.filter((category) => category.isHidden);
  }, [categories]);

  const movableTargetCategories = useMemo(() => {
    if (!moveSourceCategory) return [];

    return categories.filter(
      (category) =>
        !category.isHidden && category.key !== moveSourceCategory.key,
    );
  }, [categories, moveSourceCategory]);

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
  // 모달을 아래로 스와이프하면 닫히도록 처리
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
  const closeMoveModal = () => {
    setIsMoveModalVisible(false);
    setMoveSourceCategory(null);
    setMoveTargetKey(null);
  };
  // 카테고리 메타 상태와 AsyncStorage를 함께 업데이트
  const upsertCategoryMeta = async (
    updater: (prev: CategoryMeta[]) => CategoryMeta[],
  ) => {
    const next = updater(categoryMetas);
    setCategoryMetas(next);
    await saveCategoryMetas(next);
  };

  const handleSelectFixedCategory = (categoryName: string) => {
    const fixedStyle =
      FIXED_EVENT_TYPES[categoryName as keyof typeof FIXED_EVENT_TYPES];

    setCategoryNameInput(categoryName);
    setSelectedColor(fixedStyle.dot);
    setPickerColor(fixedStyle.dot);
  };
  // 컬러피커에서 선택한 색상을 사용자 색상 목록에 저장
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
        onPress: () => {
          handleDeleteCustomColor(color);
        },
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

  const handleDeleteCustomCategory = async (category: CategorySummary) => {
    try {
      //사용자 카테고리 목록에서 삭제
      const filteredCustomCategories = customCategories.filter(
        (item) =>
          item.name.trim().toLowerCase() !== category.name.trim().toLowerCase(),
      );

      await saveCustomCategories(filteredCustomCategories);
      setCustomCategories(filteredCustomCategories);

      //카테고리 메타 정보에서도 삭제
      await upsertCategoryMeta((prev) =>
        prev.filter((meta) => {
          if (category.metaId) return meta.id !== category.metaId;
          return getMetaCategoryKey(meta) !== category.key;
        }),
      );

      //현재 입력 중인 카테고리를 삭제한 경우 입력값 초기화
      if (
        categoryNameInput.trim().toLowerCase() ===
        category.name.trim().toLowerCase()
      ) {
        setCategoryNameInput("");
        setSelectedColor(DEFAULT_COLOR);
        setPickerColor(DEFAULT_COLOR);
      }
    } catch (error) {
      console.error("사용자 카테고리 삭제 실패", error);
      Alert.alert("카테고리 삭제 실패", "카테고리를 삭제하지 못했어요.");
    }
  };

  const handleConfirmDeleteCustomCategory = (
    customCategory: CustomCategory,
  ) => {
    //사용자 카테고리 이름으로 현재 화면의 카테고리 정보를 찾음
    const matchedCategory = categories.find(
      (category) =>
        !category.isFixedCategory &&
        category.name.trim().toLowerCase() ===
          customCategory.name.trim().toLowerCase(),
    );

    const categoryToDelete: CategorySummary = matchedCategory ?? {
      key: toCategoryNameKey(customCategory.name),
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

    //연결된 루틴이 있으면 기존 이동 후 삭제 흐름을 사용
    if (categoryToDelete.totalCount > 0) {
      Alert.alert(
        "카테고리 삭제",
        `"${categoryToDelete.name}"에 연결된 일정이 있어요. 다른 카테고리로 이동한 뒤 삭제할까요?`,
        [
          { text: "취소", style: "cancel" },
          {
            text: "이동 후 삭제",
            style: "destructive",
            onPress: () => {
              setIsCategoryModalVisible(false);
              resetCategoryModalState();
              categoryModalTranslateY.setValue(0);
              setMoveSourceCategory(categoryToDelete);
              setMoveTargetKey(null);
              setIsMoveModalVisible(true);
            },
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
  // 카테고리 추가/수정 저장 처리
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
      const now = new Date().toISOString();

      if (!isFixedCategoryName(trimmedName)) {
        const nextCustomCategories = editingCategory
          ? uniqueCustomCategories(
              customCategories.map((item) => {
                if (
                  item.name.trim().toLowerCase() ===
                  editingCategory.name.trim().toLowerCase()
                ) {
                  return {
                    name: trimmedName,
                    color: normalizedColor,
                  };
                }

                return item;
              }),
            )
          : uniqueCustomCategories([
              ...customCategories,
              {
                name: trimmedName,
                color: normalizedColor,
              },
            ]);

        await saveCustomCategories(nextCustomCategories);
        setCustomCategories(nextCustomCategories);
      }

      if (editingCategory) {
        await upsertCategoryMeta((prev) => {
          const matchedIndex = prev.findIndex((meta) => {
            if (editingCategory.metaId)
              return meta.id === editingCategory.metaId;
            return getMetaCategoryKey(meta) === editingCategory.key;
          });

          if (matchedIndex >= 0) {
            return prev.map((meta, index) =>
              index === matchedIndex
                ? {
                    ...meta,
                    name: trimmedName,
                    color: normalizedColor,
                    updatedAt: now,
                  }
                : meta,
            );
          }

          return [
            ...prev,
            {
              id: `${Date.now()}`,
              linkedCategoryId: null,
              name: trimmedName,
              color: normalizedColor,
              isHidden: false,
              createdAt: now,
              updatedAt: now,
            },
          ];
        });
      } else {
        await upsertCategoryMeta((prev) => [
          ...prev,
          {
            id: `${Date.now()}`,
            linkedCategoryId: null,
            name: trimmedName,
            color: normalizedColor,
            isHidden: false,
            createdAt: now,
            updatedAt: now,
          },
        ]);
      }

      closeCategoryModal();
    } finally {
      setIsSaving(false);
    }
  };
  // 카테고리를 삭제하지 않고 목록에서만 숨김 처리
  const handleHideCategory = async (category: CategorySummary) => {
    await upsertCategoryMeta((prev) => {
      const now = new Date().toISOString();
      const matchedIndex = prev.findIndex((meta) => {
        if (category.metaId) return meta.id === category.metaId;
        return getMetaCategoryKey(meta) === category.key;
      });

      if (matchedIndex >= 0) {
        return prev.map((meta, index) =>
          index === matchedIndex
            ? {
                ...meta,
                isHidden: true,
                updatedAt: now,
              }
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
  };

  const handleRestoreCategory = async (category: CategorySummary) => {
    await upsertCategoryMeta((prev) =>
      prev.map((meta) => {
        const isMatched =
          (category.metaId && meta.id === category.metaId) ||
          getMetaCategoryKey(meta) === category.key;

        if (!isMatched) return meta;

        return {
          ...meta,
          isHidden: false,
          updatedAt: new Date().toISOString(),
        };
      }),
    );
  };
  // 삭제할 카테고리에 연결된 루틴을 다른 카테고리로 이동
  const replaceRoutineCategory = async (
    source: CategorySummary,
    target: CategorySummary,
  ) => {
    const updatedRoutines = routines.map((routine) => {
      const isMatched = getRoutineCategoryKey(routine) === source.key;

      if (!isMatched) return routine;

      return {
        ...routine,
        categoryId: target.linkedCategoryId ?? routine.categoryId ?? null,
        categoryName: target.name,
        color: target.color,
      };
    });

    await RoutineStorage.saveAll(updatedRoutines);
    setRoutines(updatedRoutines);
  };
  // 카테고리 삭제: 연결된 루틴이 있으면 먼저 이동 모달을 띄움
  const handleDeleteCategory = async (category: CategorySummary) => {
    if (category.totalCount > 0) {
      setMoveSourceCategory(category);
      setMoveTargetKey(null);
      setIsMoveModalVisible(true);
      return;
    }

    Alert.alert("카테고리 삭제", `"${category.name}" 카테고리를 삭제할까요?`, [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          if (!category.isFixedCategory) {
            const filteredCustomCategories = customCategories.filter(
              (item) =>
                item.name.trim().toLowerCase() !==
                category.name.trim().toLowerCase(),
            );

            await saveCustomCategories(filteredCustomCategories);
            setCustomCategories(filteredCustomCategories);
          }

          await upsertCategoryMeta((prev) =>
            prev.filter((meta) => {
              if (category.metaId) return meta.id !== category.metaId;
              return getMetaCategoryKey(meta) !== category.key;
            }),
          );
        },
      },
    ]);
  };
  // 루틴 이동을 완료한 뒤 원래 카테고리 정보를 삭제
  const handleMoveAndDelete = async () => {
    if (!moveSourceCategory || !moveTargetKey) {
      Alert.alert("알림", "이동할 카테고리를 선택해주세요.");
      return;
    }

    const targetCategory = categories.find(
      (category) => category.key === moveTargetKey,
    );

    if (!targetCategory) {
      Alert.alert("알림", "이동할 카테고리를 찾을 수 없어요.");
      return;
    }

    await replaceRoutineCategory(moveSourceCategory, targetCategory);

    if (!moveSourceCategory.isFixedCategory) {
      const filteredCustomCategories = customCategories.filter(
        (item) =>
          item.name.trim().toLowerCase() !==
          moveSourceCategory.name.trim().toLowerCase(),
      );

      await saveCustomCategories(filteredCustomCategories);
      setCustomCategories(filteredCustomCategories);
    }

    await upsertCategoryMeta((prev) =>
      prev.filter((meta) => {
        if (moveSourceCategory.metaId)
          return meta.id !== moveSourceCategory.metaId;
        return getMetaCategoryKey(meta) !== moveSourceCategory.key;
      }),
    );

    closeMoveModal();
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
  const renderCategoryCard = ({ item }: { item: CategorySummary }) => {
    const badgeText = selectedTab === "COMPLETED" ? "완료됨" : "진행중";
    const badgeStyle =
      selectedTab === "COMPLETED" ? styles.badgeCompleted : undefined;
    const badgeTextStyle =
      selectedTab === "COMPLETED" ? styles.badgeTextCompleted : undefined;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardTitleRow}>
            <View style={[styles.colorDot, { backgroundColor: item.color }]} />
            <View style={styles.cardTitleTextBox}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardCountText}>
                전체 {item.totalCount}개 · 완료 {item.completedCount}개
              </Text>
            </View>
          </View>

          <View style={[styles.badge, badgeStyle]}>
            <Text style={[styles.badgeText, badgeTextStyle]}>{badgeText}</Text>
          </View>
        </View>

        <View style={styles.routineBox}>
          {item.routines.length > 0 ? (
            item.routines.slice(0, 3).map(renderRoutineItem)
          ) : (
            <Text style={styles.emptyRoutineText}>
              연결된 일정이 아직 없어요.
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
  };

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
            <FlatList
              data={visibleCategories}
              keyExtractor={(item) => item.key}
              renderItem={renderCategoryCard}
              showsVerticalScrollIndicator={false}
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
          animationType="none"
          transparent
          onRequestClose={closeCategoryModalWithSwipe}
        >
          <View style={styles.modalOverlay}>
            <Pressable
              style={styles.modalBackdrop}
              onPress={closeCategoryModalWithSwipe}
            />

            <Animated.View
              style={[
                styles.modalContainer,
                { transform: [{ translateY: categoryModalTranslateY }] },
              ]}
              {...categoryModalPanResponder.panHandlers}
            >
              <View style={styles.modalHandle} />

              <ScrollView
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
                        const fixedStyle = FIXED_EVENT_TYPES[categoryName];
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
          </View>
        </Modal>
        {/* 삭제 전 연결된 루틴을 다른 카테고리로 이동시키는 모달 */}
        <Modal
          visible={isMoveModalVisible}
          animationType="fade"
          transparent
          onRequestClose={closeMoveModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.moveModalContainer}>
              <Text style={styles.modalTitle}>카테고리 이동 후 삭제</Text>

              <Text style={styles.moveDescription}>
                "{moveSourceCategory?.name}"에 연결된 일정이 있어서 바로 삭제할
                수 없어요. 다른 카테고리로 옮긴 뒤 삭제할게요.
              </Text>

              <View style={styles.moveTargetList}>
                {movableTargetCategories.map((category) => {
                  const isSelected = moveTargetKey === category.key;

                  return (
                    <Pressable
                      key={category.key}
                      style={[
                        styles.moveTargetItem,
                        isSelected && styles.moveTargetItemSelected,
                      ]}
                      onPress={() => setMoveTargetKey(category.key)}
                    >
                      <View
                        style={[
                          styles.colorDot,
                          styles.moveTargetDot,
                          { backgroundColor: category.color },
                        ]}
                      />
                      <Text
                        style={[
                          styles.moveTargetText,
                          isSelected && styles.moveTargetTextSelected,
                        ]}
                      >
                        {category.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.modalButtonRow}>
                <Pressable
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={closeMoveModal}
                >
                  <Text style={styles.cancelButtonText}>취소</Text>
                </Pressable>

                <Pressable
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleMoveAndDelete}
                >
                  <Text style={styles.saveButtonText}>이동 후 삭제</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F6F8FC",
  },
  container: {
    flex: 1,
    backgroundColor: "#F6F8FC",
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
    overflow: "hidden",
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
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContainer: {
    maxHeight: "88%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  moveModalContainer: {
    marginHorizontal: 20,
    marginBottom: 28,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
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

  moveDescription: {
    fontSize: 14,
    lineHeight: 22,
    color: "#6B7280",
    marginBottom: 16,
  },
  moveTargetList: {
    marginBottom: 8,
  },
  moveTargetItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
  },
  moveTargetItemSelected: {
    borderColor: "#405886",
    backgroundColor: "#EEF2FF",
  },
  moveTargetDot: {
    marginTop: 0,
  },
  moveTargetText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  moveTargetTextSelected: {
    color: "#233255",
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
});
