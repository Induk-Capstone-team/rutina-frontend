// components/DraggableCategoryList.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, LayoutChangeEvent, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue
} from "react-native-reanimated";

export interface DraggableItem {
  key: string;
  [key: string]: any;
}

interface Props<T extends DraggableItem> {
  data: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  onReorder: (newData: T[]) => void;
  ListFooterComponent?: React.ReactElement;
  ListEmptyComponent?: React.ReactElement;
  style?: any;
  contentContainerStyle?: any;
}

const SPRING_CONFIG = { damping: 20, stiffness: 100, mass: 0.6 };

function DraggableRow<T extends DraggableItem>({
  item,
  index,
  draggingIndex,
  hoverIndex,
  dragY,
  draggedHeight,
  startAbsoluteY,
  onLayout,
  onDragStart,
  onDragUpdate,
  onDragEnd,
  renderItem,
}: {
  item: T;
  index: number;
  draggingIndex: number | null;
  hoverIndex: number | null;
  dragY: SharedValue<number>;
  draggedHeight: number;
  startAbsoluteY: SharedValue<number>;
  onLayout: (index: number, e: LayoutChangeEvent) => void;
  onDragStart: (index: number, absoluteY: number) => void;
  onDragUpdate: (absoluteY: number) => void;
  onDragEnd: () => void;
  renderItem: (item: T, index: number) => React.ReactNode;
}) {
  const isDraggingThis = draggingIndex === index;

  const gesture = React.useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(400)
        .onStart((e) => {
          "worklet";
          runOnJS(onDragStart)(index, e.absoluteY);
        })
        .onUpdate((e) => {
          "worklet";
          // dragY를 worklet에서 직접 업데이트 — JS 스레드 경유 없이 즉시 반영
          dragY.value = e.absoluteY - startAbsoluteY.value;
          // hover 인덱스 계산만 JS 스레드로
          runOnJS(onDragUpdate)(e.absoluteY);
        })
        .onEnd(() => {
          "worklet";
          runOnJS(onDragEnd)();
        })
        .onFinalize(() => {
          "worklet";
          runOnJS(onDragEnd)();
        }),
    [index, onDragStart, onDragUpdate, onDragEnd, dragY, startAbsoluteY],
  );

  const animatedStyle = useAnimatedStyle(() => {
    if (isDraggingThis) {
      return {
        transform: [{ translateY: dragY.value }],
        zIndex: 999,
        opacity: 0.95,
        shadowOpacity: 0.18,
        elevation: 8,
      };
    }

    if (draggingIndex === null || hoverIndex === null) {
      return {
        transform: [{ translateY: 0 }],
        zIndex: 1,
        opacity: 1,
      };
    }

    const from = draggingIndex;
    const to = hoverIndex;

    if (from > to && index >= to && index < from) {
      return {
        transform: [{ translateY: draggedHeight }],
        zIndex: 1,
        opacity: 1,
      };
    }

    if (from < to && index > from && index <= to) {
      return {
        transform: [{ translateY: -draggedHeight }],
        zIndex: 1,
        opacity: 1,
      };
    }

    return {
      transform: [{ translateY: 0 }],
      zIndex: 1,
      opacity: 1,
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        onLayout={(e) => onLayout(index, e)}
        style={[isDraggingThis && styles.draggingCard, animatedStyle]}
      >
        {renderItem(item, index)}
      </Animated.View>
    </GestureDetector>
  );
}

export function DraggableCategoryList<T extends DraggableItem>({
  data,
  renderItem,
  onReorder,
  ListFooterComponent,
  ListEmptyComponent,
  style,
  contentContainerStyle,
}: Props<T>) {
  const [items, setItems] = useState<T[]>(data);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [draggedHeight, setDraggedHeight] = useState(200);

  const itemHeights = useRef<number[]>([]);
  const itemOffsets = useRef<number[]>([]);
  const scrollOffsetY = useRef(0);
  const listTopY = useRef(0);
  const listHeight = useRef(0);
  const itemsRef = useRef<T[]>(data);
  const draggingIndexRef = useRef<number | null>(null);
  const hoverIndexRef = useRef<number | null>(null);
  const isEndedRef = useRef(false);
  const flatListRef = useRef<FlatList>(null);
  const containerRef = useRef<View>(null);
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastReorderTime = useRef<number>(0);

  const dragY = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const startAbsoluteY = useSharedValue(0);

  useEffect(() => {
    if (draggingIndex === null) {
      if (Date.now() - lastReorderTime.current < 500) return;
      setItems([...data]);
      itemsRef.current = data;
    }
  }, [data, draggingIndex]);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollTimer.current) {
      clearInterval(autoScrollTimer.current);
      autoScrollTimer.current = null;
    }
  }, []);

  const startAutoScroll = useCallback(
    (direction: "up" | "down") => {
      stopAutoScroll();
      autoScrollTimer.current = setInterval(() => {
        scrollOffsetY.current += direction === "down" ? 10 : -10;
        if (scrollOffsetY.current < 0) scrollOffsetY.current = 0;
        flatListRef.current?.scrollToOffset({
          offset: scrollOffsetY.current,
          animated: false,
        });
      }, 16);
    },
    [stopAutoScroll],
  );

  const updateOffsets = useCallback((heights: number[]) => {
    const offsets: number[] = [];
    let acc = 0;
    for (const h of heights) {
      offsets.push(acc);
      acc += h;
    }
    itemOffsets.current = offsets;
  }, []);

  const onItemLayout = useCallback(
    (index: number, e: LayoutChangeEvent) => {
      itemHeights.current[index] = e.nativeEvent.layout.height;
      updateOffsets(itemHeights.current);
    },
    [updateOffsets],
  );

  const getIndexFromY = useCallback((absoluteY: number): number => {
    const relY = absoluteY - listTopY.current + scrollOffsetY.current;
    const offsets = itemOffsets.current;
    const heights = itemHeights.current;
    for (let i = 0; i < offsets.length; i++) {
      const top = offsets[i];
      const bottom = top + (heights[i] ?? 200);
      if (relY >= top && relY < bottom) return i;
    }
    if (relY < 0) return 0;
    return itemsRef.current.length - 1;
  }, []);

  const handleDragStart = useCallback(
    (index: number, absoluteY: number) => {
      // 드래그 시작마다 재측정
      containerRef.current?.measureInWindow((_x, y, _w, h) => {
        listTopY.current = y;
        listHeight.current = h;
      });

      isEndedRef.current = false;
      draggingIndexRef.current = index;
      hoverIndexRef.current = index;
      startAbsoluteY.value = absoluteY;
      dragY.value = 0;
      isDragging.value = true;
      setDraggedHeight(itemHeights.current[index] ?? 200);
      setDraggingIndex(index);
      setHoverIndex(index);
    },
    [dragY, isDragging, startAbsoluteY],
  );

  const handleDragUpdate = useCallback(
    (absoluteY: number) => {
      // dragY는 이미 worklet에서 업데이트됨 — 여기선 hover 인덱스와 오토스크롤만 처리
      const listBottom = listTopY.current + listHeight.current;
      const scrollZone = 80;
      if (absoluteY > listBottom - scrollZone) {
        startAutoScroll("down");
      } else if (absoluteY < listTopY.current + scrollZone) {
        startAutoScroll("up");
      } else {
        stopAutoScroll();
      }

      const newHover = getIndexFromY(absoluteY);
      if (newHover !== hoverIndexRef.current) {
        hoverIndexRef.current = newHover;
        setHoverIndex(newHover);
      }
    },
    [getIndexFromY, startAutoScroll, stopAutoScroll],
  );

  const handleDragEnd = useCallback(() => {
    if (isEndedRef.current) return;
    isEndedRef.current = true;

    stopAutoScroll();

    const from = draggingIndexRef.current;
    const to = hoverIndexRef.current;

    isDragging.value = false;
    dragY.value = 0;

    if (from !== null && to !== null && from !== to) {
      const currentItems = [...itemsRef.current];
      const [moved] = currentItems.splice(from, 1);
      currentItems.splice(to, 0, moved);

      itemsRef.current = currentItems;
      setItems(currentItems);
      onReorder(currentItems);
    }

    setDraggingIndex(null);
    setHoverIndex(null);
    draggingIndexRef.current = null;
    hoverIndexRef.current = null;
    lastReorderTime.current = Date.now();
  }, [onReorder, isDragging, dragY, stopAutoScroll]);

  return (
    <View
      ref={containerRef}
      style={style}
      onLayout={() => {
        containerRef.current?.measureInWindow((_x, y, _w, h) => {
          listTopY.current = y;
          listHeight.current = h;
        });
      }}
    >
      <FlatList
        ref={flatListRef}
        data={items}
        keyExtractor={(item) => item.key}
        style={{ flex: 1 }}
        contentContainerStyle={contentContainerStyle}
        showsVerticalScrollIndicator={false}
        scrollEnabled={draggingIndex === null}
        onScroll={(e) => {
          scrollOffsetY.current = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        ListEmptyComponent={ListEmptyComponent}
        ListFooterComponent={ListFooterComponent}
        renderItem={({ item, index }) => (
          <DraggableRow
            key={item.key}
            item={item}
            index={index}
            draggingIndex={draggingIndex}
            hoverIndex={hoverIndex}
            dragY={dragY}
            draggedHeight={draggedHeight}
            startAbsoluteY={startAbsoluteY}
            onLayout={onItemLayout}
            onDragStart={handleDragStart}
            onDragUpdate={handleDragUpdate}
            onDragEnd={handleDragEnd}
            renderItem={renderItem}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  draggingCard: {
    shadowColor: "#233255",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    borderRadius: 20,
  },
});
