import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, View, Pressable, Linking, Platform, Image } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { PREVIEW_DURATION_MS, QUESTION_COUNT } from "@/constants/config";
import { Track } from "@/utils/gameLogic";
import {
  checkPremiumStatus,
  initializePlayer,
  playTrack,
  pausePlayback,
  resumePlayback,
  getCurrentPlaybackState,
} from "@/utils/spotifyPlayer";

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
  currentTrack: Track;
  onAnswerSelected: (answerId: string) => void;
  onBackToMenu?: () => void;
}

export default function GamePlayScreen({
  currentRound,
  score,
  answers,
  correctAnswerId,
  currentTrack,
  onAnswerSelected,
  onBackToMenu,
}: GamePlayScreenProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [hasPremium, setHasPremium] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const playbackStartTimeRef = useRef<number>(0);
  const imageOpacity = useSharedValue(0);
  const progressWidth = useSharedValue((currentRound / QUESTION_COUNT) * 100);

  useEffect(() => {
    if (Platform.OS === 'web') {
      checkPremiumStatus().then((isPremium) => {
        setHasPremium(isPremium);
        if (isPremium) {
          initializePlayer();
        }
      });
    }
  }, []);

  useEffect(() => {
    progressWidth.value = withSpring((currentRound / QUESTION_COUNT) * 100, {
      damping: 15,
      stiffness: 90,
    });
  }, [currentRound]);

  useEffect(() => {
    setSelectedAnswer(null);
    setAudioPlaying(false);
    setAudioProgress(0);
    imageOpacity.value = 0;
    imageOpacity.value = withTiming(1, { duration: 500 });
    loadAudio();
    
    return () => {
      cleanupAudio();
    };
  }, [currentTrack]);

  useEffect(() => {
    if (selectedAnswer) {
      cleanupAudio();
    }
  }, [selectedAnswer]);

  const loadAudio = async () => {
    await cleanupAudio();
    
    try {
      if (!hasPremium) {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });

        if (currentTrack.previewUrl && currentTrack.previewUrl !== 'mock') {
          const { sound } = await Audio.Sound.createAsync(
            { uri: currentTrack.previewUrl },
            { shouldPlay: false }
          );
          soundRef.current = sound;

          sound.setOnPlaybackStatusUpdate((status) => {
            if (status.isLoaded) {
              const progress = (status.positionMillis / PREVIEW_DURATION_MS) * 100;
              setAudioProgress(Math.min(progress, 100));

              if (status.positionMillis >= PREVIEW_DURATION_MS) {
                sound.pauseAsync();
                setAudioPlaying(false);
              }
            }
          });
        }
      }
    } catch (error) {
      console.error('Error loading audio:', error);
    }
  };

  const cleanupAudio = async () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    if (hasPremium && Platform.OS === 'web') {
      try {
        await pausePlayback();
      } catch (error) {
        console.error('Error pausing premium playback:', error);
      }
    }

    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch (error) {
        console.error('Error unloading audio:', error);
      }
      soundRef.current = null;
    }
  };

  const startPremiumProgressTracking = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    playbackStartTimeRef.current = Date.now();

    progressIntervalRef.current = setInterval(async () => {
      const elapsed = Date.now() - playbackStartTimeRef.current;
      const progress = Math.min((elapsed / PREVIEW_DURATION_MS) * 100, 100);
      setAudioProgress(progress);

      if (elapsed >= PREVIEW_DURATION_MS) {
        await pausePlayback();
        setAudioPlaying(false);
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
      }
    }, 100);
  };

  const handleToggleAudio = async () => {
    try {
      if (hasPremium && Platform.OS === 'web') {
        if (audioPlaying) {
          await pausePlayback();
          setAudioPlaying(false);
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
          }
        } else {
          const trackUri = `spotify:track:${currentTrack.id}`;
          const success = await playTrack(trackUri, 0);
          if (success) {
            setAudioPlaying(true);
            startPremiumProgressTracking();
          }
        }
      } else {
        if (currentTrack.previewUrl === 'mock' || !currentTrack.previewUrl) {
          return;
        }

        if (!soundRef.current) {
          return;
        }

        if (audioPlaying) {
          await soundRef.current.pauseAsync();
          setAudioPlaying(false);
        } else {
          const status = await soundRef.current.getStatusAsync();
          if (status.isLoaded && status.positionMillis >= PREVIEW_DURATION_MS) {
            await soundRef.current.setPositionAsync(0);
            setAudioProgress(0);
          }
          await soundRef.current.playAsync();
          setAudioPlaying(true);
        }
      }
    } catch (error) {
      console.error('Error toggling audio:', error);
    }
  };

  const handleOpenInSpotify = () => {
    if (currentTrack.id) {
      const spotifyUrl = `https://open.spotify.com/track/${currentTrack.id}`;
      Linking.openURL(spotifyUrl);
    }
  };

  const handleAnswerPress = (answerId: string) => {
    if (!selectedAnswer) {
      setSelectedAnswer(answerId);
      onAnswerSelected(answerId);
    }
  };

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const albumAnimatedStyle = useAnimatedStyle(() => ({ 
    opacity: imageOpacity.value 
  }));

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
          <Animated.View
            style={[
              styles.progressFill,
              {
                backgroundColor: theme.primary,
              },
              progressAnimatedStyle,
            ]}
          />
        </View>
      </View>

      <View style={styles.albumContainer}>
        <Animated.View
          style={[
            styles.albumPlaceholder,
            { backgroundColor: theme.backgroundDefault },
            albumAnimatedStyle,
          ]}
        >
          {currentTrack.albumImageUrl ? (
            <>
              <Image
                source={{ uri: currentTrack.albumImageUrl }}
                style={styles.albumImage}
                resizeMode="cover"
              />
              <BlurView
                intensity={40}
                tint="dark"
                style={StyleSheet.absoluteFill}
              />
            </>
          ) : (
            <Feather name="music" size={64} color={theme.textSecondary} />
          )}
        </Animated.View>
      </View>

      <View style={styles.playerContainer}>
        <Pressable
          onPress={handleToggleAudio}
          style={[
            styles.playButton,
            {
              backgroundColor: (hasPremium || (currentTrack.previewUrl && currentTrack.previewUrl !== 'mock')) ? theme.primary : theme.backgroundDefault,
              shadowColor: "#000",
            },
          ]}
          disabled={!hasPremium && (!currentTrack.previewUrl || currentTrack.previewUrl === 'mock')}
        >
          <Feather
            name={audioPlaying ? "square" : "play"}
            size={32}
            color={(hasPremium || (currentTrack.previewUrl && currentTrack.previewUrl !== 'mock')) ? "#FFFFFF" : theme.textSecondary}
          />
        </Pressable>
        <View style={styles.progressInfo}>
          {!hasPremium && currentTrack.previewUrl === 'mock' ? (
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Audio preview not available
            </ThemedText>
          ) : (hasPremium || currentTrack.previewUrl) ? (
            <>
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
                      width: `${audioProgress}%`,
                    },
                  ]}
                />
              </View>
              <View style={styles.playbackStatusRow}>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {Math.floor((audioProgress / 100) * (PREVIEW_DURATION_MS / 1000))}s / {PREVIEW_DURATION_MS / 1000}s
                </ThemedText>
              </View>
            </>
          ) : (
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              No preview available for this track
            </ThemedText>
          )}
        </View>
      </View>

      <View style={styles.actionBar}>
        {onBackToMenu ? (
          <Pressable
            onPress={onBackToMenu}
            style={[
              styles.actionButton,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <Feather name="arrow-left" size={18} color={theme.text} />
            <ThemedText type="small" style={{ color: theme.text, marginLeft: Spacing.sm }}>
              Back to Menu
            </ThemedText>
          </Pressable>
        ) : null}
        {currentTrack.id ? (
          <Pressable
            onPress={handleOpenInSpotify}
            style={[
              styles.actionButton,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <Feather name="external-link" size={18} color={theme.primary} />
            <ThemedText type="small" style={{ color: theme.primary, marginLeft: Spacing.sm }}>
              Open in Spotify
            </ThemedText>
          </Pressable>
        ) : null}
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
  const hasTriggeredHaptic = useRef(false);

  useEffect(() => {
    if (showResult && isSelected && !hasTriggeredHaptic.current) {
      hasTriggeredHaptic.current = true;
      if (Platform.OS !== 'web') {
        if (isCorrect) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      }
    }
    
    if (!showResult) {
      hasTriggeredHaptic.current = false;
    }
  }, [showResult, isSelected, isCorrect]);

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

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
      onPress={handlePress}
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
    overflow: "hidden",
  },
  albumImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
    top: 0,
    left: 0,
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
  playbackStatusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.md,
    marginBottom: Spacing["3xl"],
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
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
