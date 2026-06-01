import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import React from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";

interface HeaderProps {
  activeTab?: "left" | "right";
}
const LOGO = require("@/assets/images/logo_icon.png");
export function Header({ activeTab = "left" }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isIndex = pathname === "/" || pathname === "/index";
  return (
    <View style={styles.header}>
      <Image source={LOGO} style={styles.logoImage} resizeMode="contain" />
      <View style={styles.headerRight}>
        {isIndex && (
          <>
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: activeTab === "left" ? "#405886" : "#E2E5EC",
                },
              ]}
            />
            <View
              style={[
                styles.dot,
                {
                  backgroundColor:
                    activeTab === "right" ? "#405886" : "#E2E5EC",
                },
              ]}
            />
          </>
        )}
        <Pressable
          style={styles.settingButton}
          onPress={() => router.push("/settings")}
        >
          <Ionicons name="settings-outline" size={22} color="#405886" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  logoImage: {
    width: 110,
    height: 40,
    maxWidth: "50%",
  },
  logoText: {
    fontSize: 32,
    fontWeight: "800",
    color: "#2A3C6B",
    fontStyle: "italic",
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },

  settingButton: {
    width: 35,
    height: 35,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
  },
});
