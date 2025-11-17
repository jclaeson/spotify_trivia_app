import React from "react";
import { StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { QUESTION_COUNT } from "@/constants/config";

interface RoundResult {
  round: number;
  correct: boolean;
  trackName: string;
  artistName: string;
}

interface ResultsScreenProps {
  score: number;
  results: RoundResult[];
  onPlayAgain: () => void;
  onChangePlaylist: () => void;
}

export default function ResultsScreen({
  score,
  results,
  onPlayAgain,
  onChangePlaylist,
}: ResultsScreenProps) {
  const { theme } = useTheme();
  const accuracy = Math.round((score / QUESTION_COUNT) * 100);

  return (
    <ScreenScrollView contentContainerStyle={styles.container}>
      <View style={styles.scoreContainer}>
        <View
          style={[
            styles.scoreCircle,
            { backgroundColor: theme.backgroundDefault },
          ]}
        >
          <ThemedText type="h1" style={{ color: theme.primary }}>
            {score}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            out of {QUESTION_COUNT}
          </ThemedText>
        </View>
        <ThemedText type="h3" style={styles.accuracyText}>
          {accuracy}% Accuracy
        </ThemedText>
      </View>

      <ThemedText type="h4" style={styles.sectionTitle}>
        Round Breakdown
      </ThemedText>

      {results.map((result) => (
        <Card key={result.round} style={styles.resultCard}>
          <View style={styles.resultContent}>
            <View
              style={[
                styles.resultIcon,
                {
                  backgroundColor: result.correct
                    ? theme.success + "20"
                    : theme.error + "20",
                },
              ]}
            >
              <Feather
                name={result.correct ? "check" : "x"}
                size={20}
                color={result.correct ? theme.success : theme.error}
              />
            </View>
            <View style={styles.resultInfo}>
              <ThemedText type="body" style={styles.resultTrack}>
                {result.trackName}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {result.artistName}
              </ThemedText>
            </View>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Round {result.round}
            </ThemedText>
          </View>
        </Card>
      ))}

      <View style={styles.buttonContainer}>
        <Button onPress={onPlayAgain} style={styles.primaryButton}>
          Play Again
        </Button>
        <Button
          onPress={onChangePlaylist}
          style={[styles.secondaryButton, { backgroundColor: theme.backgroundDefault }]}
        >
          <ThemedText type="body" style={{ color: theme.text }}>
            Change Playlist
          </ThemedText>
        </Button>
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing["3xl"],
  },
  scoreContainer: {
    alignItems: "center",
    marginBottom: Spacing["4xl"],
  },
  scoreCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  accuracyText: {
    marginTop: Spacing.sm,
  },
  sectionTitle: {
    marginBottom: Spacing.lg,
  },
  resultCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  resultContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  resultInfo: {
    flex: 1,
  },
  resultTrack: {
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  buttonContainer: {
    marginTop: Spacing["2xl"],
    gap: Spacing.md,
  },
  primaryButton: {},
  secondaryButton: {},
});
