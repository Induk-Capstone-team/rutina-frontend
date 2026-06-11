import { useTheme } from "@/lib/constants/ThemeContext";
import type { ViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function ThemedSafeArea({ style, ...props }: ViewProps) {
  const { theme } = useTheme();
  return (
    <SafeAreaView
      style={[{ flex: 1, backgroundColor: theme.bg }, style]}
      {...props}
    />
  );
}
