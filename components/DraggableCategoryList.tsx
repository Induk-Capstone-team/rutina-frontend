// components/DraggableCategoryList.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, LayoutChangeEvent, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
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

function DraggableRow<T extends DraggableItem>({
  item,
  index,
  draggingIndex,
  hoverIndex,
  dragY,
  draggedHeight,
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
    [index, onDragStart, onDragUpdate, onDragEnd],
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
        transform: [
          { translateY: withSpring(0, { damping: 20, stiffness: 200 }) },
        ],
        zIndex: 1,
        opacity: 1,
      };
    }

    const from = draggingIndex;
    const to = hoverIndex;

    if (from > to && index >= to && index < from) {
      return {
        transform: [
          {
            translateY: withSpring(draggedHeight, {
              damping: 20,
              stiffness: 200,
            }),
          },
        ],
        zIndex: 1,
        opacity: 1,
      };
    }

    if (from < to && index > from && index <= to) {
      return {
        transform: [
          {
            translateY: withSpring(-draggedHeight, {
              damping: 20,
              stiffness: 200,
            }),
          },
        ],
        zIndex: 1,
        opacity: 1,
      };
    }

    return {
      transform: [
        { translateY: withSpring(0, { damping: 20, stiffness: 200 }) },
      ],
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
  const startAbsoluteYRef = useRef(0);
  const isEndedRef = useRef(false);
  const flatListRef = useRef<FlatList>(null);
  const containerRef = useRef<View>(null); // ← View ref로 measure
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const dragY = useSharedValue(0);
  const isDragging = useSharedValue(false);

  useEffect(() => {
    if (draggingIndex === null) {
      // 드래그 종료 후 500ms 이내엔 외부 data 변경 무시
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
        scrollOffsetY.current += direction === "down" ? 8 : -8;
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
      isEndedRef.current = false;
      draggingIndexRef.current = index;
      hoverIndexRef.current = index;
      startAbsoluteYRef.current = absoluteY;
      dragY.value = 0;
      isDragging.value = true;
      setDraggedHeight(itemHeights.current[index] ?? 200);
      setDraggingIndex(index);
      setHoverIndex(index);
    },
    [dragY, isDragging],
  );

  const handleDragUpdate = useCallback(
    (absoluteY: number) => {
      dragY.value = absoluteY - startAbsoluteYRef.current;

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
    [dragY, getIndexFromY, startAutoScroll, stopAutoScroll],
  );
  const lastReorderTime = useRef<number>(0);
  const handleDragEnd = useCallback(() => {
    if (isEndedRef.current) return;
    isEndedRef.current = true;

    stopAutoScroll();

    const from = draggingIndexRef.current;
    const to = hoverIndexRef.current;
    console.log("from:", from, "to:", to);
    console.log(
      "현재 내부 순서:",
      itemsRef.current.map((item) => item.name),
    );
    isDragging.value = false;
    dragY.value = withSpring(0, { damping: 20, stiffness: 200 });

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
      onLayout={(e) => {
        listHeight.current = e.nativeEvent.layout.height;
        containerRef.current?.measure(
          (
            _x: number,
            _y: number,
            _w: number,
            _h: number,
            _px: number,
            py: number,
          ) => {
            listTopY.current = py;
          },
        );
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
