import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface MenuScreenProps {
  onPlayNow: () => void;
  onSettings: () => void;
  stats: {
    gamesPlayed: number;
    bestScore: number;
  };
}

export default function MenuScreen({
  onPlayNow,
  onSettings,
  stats,
}: MenuScreenProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const playScale = useSharedValue(1);
  const settingsScale = useSharedValue(1);

  const playAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: playScale.value }],
  }));

  const settingsAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: settingsScale.value }],
  }));

  return (
    <ThemedView
      style={[
        styles.container,
        {
          paddingTop: Spacing.xl,
          paddingBottom: insets.bottom + Spacing.xl,
          paddingHorizontal: Spacing.lg,
        },
      ]}
    >
      <View style={styles.content}>
        <AnimatedPressable
          onPress={onPlayNow}
          onPressIn={() => (playScale.value = withSpring(0.95))}
          onPressOut={() => (playScale.value = withSpring(1))}
          style={[
            styles.playButton,
            {
              backgroundColor: theme.primary,
              shadowColor: "#000",
            },
            playAnimatedStyle,
          ]}
        >
          <ThemedText type="h3" style={styles.playButtonText}>
            Play Now
          </ThemedText>
        </AnimatedPressable>

        <Card style={styles.statsCard}>
          <ThemedText type="h4" style={styles.statsTitle}>
            Quick Stats
          </ThemedText>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <ThemedText type="h2" style={{ color: theme.primary }}>
                {stats.gamesPlayed}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Games Played
              </ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText type="h2" style={{ color: theme.primary }}>
                {stats.bestScore}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Best Score
              </ThemedText>
            </View>
          </View>
        </Card>
      </View>

      <AnimatedPressable
        onPress={onSettings}
        onPressIn={() => (settingsScale.value = withSpring(0.9))}
        onPressOut={() => (settingsScale.value = withSpring(1))}
        style={[styles.settingsButton, settingsAnimatedStyle]}
      >
        <Feather name="settings" size={24} color={theme.text} />
      </AnimatedPressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
  },
  playButton: {
    height: 80,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing["3xl"],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  playButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  statsCard: {
    padding: Spacing["2xl"],
  },
  statsTitle: {
    marginBottom: Spacing.lg,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  settingsButton: {
    alignSelf: "center",
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
});
