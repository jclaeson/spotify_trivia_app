import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface SettingsScreenProps {
  userProfile: {
    displayName: string;
    imageUrl?: string;
  };
  stats: {
    totalGames: number;
    bestScore: number;
    accuracy: number;
  };
  onLogout: () => void;
}

export default function SettingsScreen({
  userProfile,
  stats,
  onLogout,
}: SettingsScreenProps) {
  const { theme } = useTheme();

  return (
    <ScreenScrollView contentContainerStyle={styles.container}>
      <Card style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <View
            style={[
              styles.avatar,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <Feather name="user" size={32} color={theme.primary} />
          </View>
          <View style={styles.profileInfo}>
            <ThemedText type="h4">{userProfile.displayName}</ThemedText>
            <View style={styles.connectedBadge}>
              <Feather name="check-circle" size={14} color={theme.success} />
              <ThemedText
                type="small"
                style={[styles.connectedText, { color: theme.success }]}
              >
                Connected to Spotify
              </ThemedText>
            </View>
          </View>
        </View>
      </Card>

      <ThemedText type="h4" style={styles.sectionTitle}>
        Game Settings
      </ThemedText>

      <Card style={styles.settingCard}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <ThemedText type="body" style={styles.settingLabel}>
              Preview Duration
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Configured in code
            </ThemedText>
          </View>
          <ThemedText type="body" style={{ color: theme.primary }}>
            5s
          </ThemedText>
        </View>
      </Card>

      <Card style={styles.settingCard}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <ThemedText type="body" style={styles.settingLabel}>
              Sound Effects
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Audio feedback for answers
            </ThemedText>
          </View>
          <View
            style={[
              styles.toggle,
              { backgroundColor: theme.primary },
            ]}
          >
            <View style={styles.toggleHandle} />
          </View>
        </View>
      </Card>

      <ThemedText type="h4" style={styles.sectionTitle}>
        Your Stats
      </ThemedText>

      <Card style={styles.statsCard}>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <ThemedText type="h2" style={{ color: theme.primary }}>
              {stats.totalGames}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Total Games
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
          <View style={styles.statItem}>
            <ThemedText type="h2" style={{ color: theme.primary }}>
              {stats.accuracy}%
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Accuracy
            </ThemedText>
          </View>
        </View>
      </Card>

      <Pressable onPress={onLogout} style={styles.logoutButton}>
        <ThemedText type="body" style={[styles.logoutText, { color: theme.error }]}>
          Log Out
        </ThemedText>
      </Pressable>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing["3xl"],
  },
  profileCard: {
    padding: Spacing.lg,
    marginBottom: Spacing["3xl"],
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.lg,
  },
  profileInfo: {
    flex: 1,
  },
  connectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.xs,
    gap: Spacing.xs,
  },
  connectedText: {
    fontWeight: "600",
  },
  sectionTitle: {
    marginBottom: Spacing.lg,
    marginTop: Spacing.lg,
  },
  settingCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    padding: 2,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  toggleHandle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
  },
  statsCard: {
    padding: Spacing.lg,
    marginBottom: Spacing["3xl"],
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  logoutButton: {
    alignSelf: "center",
    paddingVertical: Spacing.lg,
  },
  logoutText: {
    fontWeight: "600",
  },
});
