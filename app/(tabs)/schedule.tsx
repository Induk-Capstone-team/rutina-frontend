import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function AiAnalysisScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>카테고리</Text>
      <Text style={styles.description}>
        여기에 카테고리 페이지를 추가하면 됩니다.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2A3C6B",
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
  },
});
