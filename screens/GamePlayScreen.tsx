import React, { useState, useEffect } from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { PREVIEW_DURATION_MS, QUESTION_COUNT } from "@/constants/config";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Answer {
  id: string;
  trackName: string;
  artistName: string;
}

interface GamePlayScreenProps {
  currentRound: number;
  score: number;
  answers: Answer[];
  correctAnswerId: string;
  onAnswerSelected: (answerId: string) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  playbackProgress: number;
}

export default function GamePlayScreen({
  currentRound,
  score,
  answers,
  correctAnswerId,
  onAnswerSelected,
  isPlaying,
  onTogglePlay,
  playbackProgress,
}: GamePlayScreenProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  const handleAnswerPress = (answerId: string) => {
    if (!selectedAnswer) {
      setSelectedAnswer(answerId);
      onAnswerSelected(answerId);
    }
  };

  return (
    <ThemedView
      style={[
        styles.container,
        {
          paddingTop: Spacing.xl,
          paddingBottom: insets.bottom + Spacing.xl,
        },
      ]}
    >
      <View style={styles.header}>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          Round {currentRound} of {QUESTION_COUNT}
        </ThemedText>
        <ThemedText type="h4" style={{ color: theme.primary }}>
          Score: {score}
        </ThemedText>
      </View>

      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { backgroundColor: theme.backgroundDefault }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: theme.primary,
                width: `${(currentRound / QUESTION_COUNT) * 100}%`,
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.albumContainer}>
        <View
          style={[
            styles.albumPlaceholder,
            { backgroundColor: theme.backgroundDefault },
          ]}
        >
          <Feather name="music" size={64} color={theme.textSecondary} />
        </View>
      </View>

      <View style={styles.playerContainer}>
        <Pressable
          onPress={onTogglePlay}
          style={[
            styles.playButton,
            {
              backgroundColor: theme.primary,
              shadowColor: "#000",
            },
          ]}
        >
          <Feather
            name={isPlaying ? "pause" : "play"}
            size={32}
            color="#FFFFFF"
          />
        </Pressable>
        <View style={styles.progressInfo}>
          <View
            style={[
              styles.waveform,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
            <View
              style={[
                styles.waveformFill,
                {
                  backgroundColor: theme.primary,
                  width: `${playbackProgress}%`,
                },
              ]}
            />
          </View>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {Math.floor((playbackProgress / 100) * (PREVIEW_DURATION_MS / 1000))}s / {PREVIEW_DURATION_MS / 1000}s
          </ThemedText>
        </View>
      </View>

      <View style={styles.answersContainer}>
        <ThemedText type="body" style={styles.questionText}>
          What's this track?
        </ThemedText>
        {answers.map((answer) => (
          <AnswerButton
            key={answer.id}
            answer={answer}
            onPress={() => handleAnswerPress(answer.id)}
            isSelected={selectedAnswer === answer.id}
            isCorrect={answer.id === correctAnswerId}
            showResult={selectedAnswer !== null}
          />
        ))}
      </View>
    </ThemedView>
  );
}

function AnswerButton({
  answer,
  onPress,
  isSelected,
  isCorrect,
  showResult,
}: {
  answer: Answer;
  onPress: () => void;
  isSelected: boolean;
  isCorrect: boolean;
  showResult: boolean;
}) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const getButtonColor = () => {
    if (showResult && isCorrect) return theme.success;
    if (showResult && isSelected && !isCorrect) return theme.error;
    if (isSelected) return theme.primary;
    return theme.backgroundDefault;
  };

  const getBorderColor = () => {
    if (showResult && isCorrect) return theme.success;
    if (showResult && isSelected && !isCorrect) return theme.error;
    if (isSelected) return "#FFFFFF";
    return "transparent";
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => (scale.value = withSpring(0.98))}
      onPressOut={() => (scale.value = withSpring(1))}
      disabled={showResult}
      style={[
        styles.answerButton,
        {
          backgroundColor: getButtonColor(),
          borderColor: getBorderColor(),
        },
        animatedStyle,
      ]}
    >
      <View style={styles.answerContent}>
        <View style={styles.answerTextContainer}>
          <ThemedText
            type="body"
            style={[
              styles.trackName,
              { color: isSelected || (showResult && isCorrect) ? "#FFFFFF" : theme.text },
            ]}
          >
            {answer.trackName}
          </ThemedText>
          <ThemedText
            type="small"
            style={[
              styles.artistName,
              {
                color: isSelected || (showResult && isCorrect)
                  ? "rgba(255,255,255,0.8)"
                  : theme.textSecondary,
              },
            ]}
          >
            {answer.artistName}
          </ThemedText>
        </View>
        {showResult && isCorrect ? (
          <Feather name="check-circle" size={24} color="#FFFFFF" />
        ) : null}
        {showResult && isSelected && !isCorrect ? (
          <Feather name="x-circle" size={24} color="#FFFFFF" />
        ) : null}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  progressContainer: {
    marginBottom: Spacing["3xl"],
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  albumContainer: {
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  albumPlaceholder: {
    width: 200,
    height: 200,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  playerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing["3xl"],
    gap: Spacing.lg,
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  progressInfo: {
    flex: 1,
  },
  waveform: {
    height: 8,
    borderRadius: 4,
    marginBottom: Spacing.sm,
    overflow: "hidden",
  },
  waveformFill: {
    height: "100%",
    borderRadius: 4,
  },
  answersContainer: {
    flex: 1,
  },
  questionText: {
    fontWeight: "600",
    marginBottom: Spacing.lg,
  },
  answerButton: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 2,
  },
  answerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  answerTextContainer: {
    flex: 1,
  },
  trackName: {
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  artistName: {},
});
