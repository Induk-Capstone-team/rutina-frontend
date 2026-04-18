import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/lib/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import React from "react";
import { Platform } from "react-native";

type IconSymbolName = React.ComponentProps<typeof IconSymbol>["name"];
type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  const renderIcon = (
    iosName: IconSymbolName,
    androidName: IoniconName,
    color: string,
  ) => {
    return Platform.OS === "ios" ? (
      <IconSymbol size={28} name={iosName} color={color} />
    ) : (
      <Ionicons name={androidName} size={28} color={color} />
    );
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "타임테이블",
          tabBarIcon: ({ color }) =>
            renderIcon("calendar", "calendar-outline", color),
        }}
      />

      <Tabs.Screen
        name="schedule"
        options={{
          title: "일정",
          tabBarIcon: ({ color }) =>
            renderIcon("list.bullet", "list-outline", color),
        }}
      />

      <Tabs.Screen
        name="add"
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push("/modal");
          },
        }}
        options={{
          title: "일정 추가",
          tabBarIcon: ({ color }) => renderIcon("plus", "add", color),
        }}
      />

      <Tabs.Screen
        name="data"
        options={{
          title: "데이터",
          tabBarIcon: ({ color }) =>
            renderIcon("chart.bar.xaxis", "bar-chart-outline", color),
        }}
      />

      <Tabs.Screen
        name="ai_analysis"
        options={{
          title: "AI분석",
          tabBarIcon: ({ color }) =>
            renderIcon("sparkles", "sparkles-outline", color),
        }}
      />
    </Tabs>
  );
}
