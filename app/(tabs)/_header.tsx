import React from "react";
import { StyleSheet, Text, View } from "react-native";

export function Header() {
  return (
    <View style={styles.header}>
      <Text style={styles.logoText}>Rutia</Text>
      <View style={styles.headerRight}>
        <View style={[styles.dot, { backgroundColor: "#405886" }]} />
        <View style={[styles.dot, { backgroundColor: "#E2E5EC" }]} />
        <View style={styles.profileIcon}>
          <Text style={styles.profileText}>나</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  logoText: {
    fontSize: 32,
    fontWeight: "800",
    color: "#2A3C6B",
    fontStyle: "italic",
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#405886",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
  },
  profileText: { color: "#FFFFFF", fontSize: 18, fontWeight: "600" },
});
