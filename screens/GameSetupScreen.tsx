import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PlaylistOption {
  id: string;
  name: string;
  trackCount: number;
  isRecommended?: boolean;
}

interface GameSetupScreenProps {
  onSelectPlaylist: (playlistId: string) => void;
}

const MOCK_PLAYLISTS: PlaylistOption[] = [
  { id: "top-tracks", name: "My Top Tracks", trackCount: 50, isRecommended: true },
  { id: "recently-played", name: "Recently Played", trackCount: 30 },
  { id: "playlist-1", name: "Chill Vibes", trackCount: 45 },
  { id: "playlist-2", name: "Workout Mix", trackCount: 60 },
  { id: "playlist-3", name: "Road Trip", trackCount: 80 },
];

export default function GameSetupScreen({
  onSelectPlaylist,
}: GameSetupScreenProps) {
  const { theme } = useTheme();

  return (
    <ScreenScrollView contentContainerStyle={styles.container}>
      <ThemedText type="h3" style={styles.header}>
        Choose Your Music Source
      </ThemedText>
      <ThemedText type="small" style={[styles.description, { color: theme.textSecondary }]}>
        Select a playlist to generate quiz questions
      </ThemedText>

      {MOCK_PLAYLISTS.map((playlist) => (
        <PlaylistCard
          key={playlist.id}
          playlist={playlist}
          onPress={() => onSelectPlaylist(playlist.id)}
        />
      ))}
    </ScreenScrollView>
  );
}

function PlaylistCard({
  playlist,
  onPress,
}: {
  playlist: PlaylistOption;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => (scale.value = withSpring(0.98))}
      onPressOut={() => (scale.value = withSpring(1))}
      style={[styles.playlistCard, animatedStyle]}
    >
      <Card style={styles.card}>
        <View style={styles.playlistContent}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <Feather name="music" size={24} color={theme.primary} />
          </View>
          <View style={styles.playlistInfo}>
            <View style={styles.playlistTitleRow}>
              <ThemedText type="body" style={styles.playlistName}>
                {playlist.name}
              </ThemedText>
              {playlist.isRecommended ? (
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: theme.primary + "20" },
                  ]}
                >
                  <ThemedText
                    type="small"
                    style={[styles.badgeText, { color: theme.primary }]}
                  >
                    Recommended
                  </ThemedText>
                </View>
              ) : null}
            </View>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {playlist.trackCount} tracks
            </ThemedText>
          </View>
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        </View>
      </Card>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing["3xl"],
  },
  header: {
    marginBottom: Spacing.sm,
  },
  description: {
    marginBottom: Spacing["2xl"],
  },
  playlistCard: {
    marginBottom: Spacing.md,
  },
  card: {
    padding: 0,
  },
  playlistContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  playlistInfo: {
    flex: 1,
  },
  playlistTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  playlistName: {
    fontWeight: "600",
    marginRight: Spacing.sm,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
});
