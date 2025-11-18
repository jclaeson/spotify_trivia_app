import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, View, Pressable, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Audio } from "expo-av";
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
import { Track } from "@/utils/gameLogic";
import * as SpotifyPlayer from "@/utils/spotifyPlayer";

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
}

export default function GamePlayScreen({
  currentRound,
  score,
  answers,
  correctAnswerId,
  currentTrack,
  onAnswerSelected,
}: GamePlayScreenProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [usePremiumPlayback, setUsePremiumPlayback] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [trackDuration, setTrackDuration] = useState(PREVIEW_DURATION_MS);
  const soundRef = useRef<Audio.Sound | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const trackDurationRef = useRef<number>(PREVIEW_DURATION_MS);
  const lastPositionRef = useRef<number>(0);
  const idleTicksRef = useRef<number>(0);
  const nullStateTicksRef = useRef<number>(0);

  useEffect(() => {
    const initPlayer = async () => {
      if (Platform.OS === 'web') {
        try {
          const isPremium = await SpotifyPlayer.checkPremiumStatus();
          if (isPremium) {
            const deviceId = await SpotifyPlayer.initializePlayer();
            if (deviceId) {
              setUsePremiumPlayback(true);
              setPlayerReady(true);
            }
          }
        } catch (error) {
          console.log('Premium playback not available, using previews');
        }
      }
    };

    initPlayer();

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      SpotifyPlayer.disconnectPlayer();
    };
  }, []);

  useEffect(() => {
    setSelectedAnswer(null);
    setAudioPlaying(false);
    setAudioProgress(0);
    const fallbackDuration = usePremiumPlayback ? 180000 : PREVIEW_DURATION_MS;
    trackDurationRef.current = fallbackDuration;
    setTrackDuration(fallbackDuration);
    loadAudio();
    
    return () => {
      cleanupAudio();
    };
  }, [currentTrack, usePremiumPlayback, playerReady]);

  useEffect(() => {
    if (selectedAnswer) {
      cleanupAudio();
    }
  }, [selectedAnswer]);

  const loadAudio = async () => {
    await cleanupAudio();
    
    if (usePremiumPlayback && playerReady && currentTrack.id) {
      console.log('Premium playback ready for track:', currentTrack.id);
      return;
    }
    
    try {
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
            const actualDuration = status.durationMillis || PREVIEW_DURATION_MS;
            
            if (status.durationMillis) {
              trackDurationRef.current = status.durationMillis;
              setTrackDuration(status.durationMillis);
            }
            
            const progress = (status.positionMillis / actualDuration) * 100;
            setAudioProgress(Math.min(progress, 100));

            if (status.positionMillis >= actualDuration) {
              sound.pauseAsync();
              setAudioPlaying(false);
            }
          }
        });
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

    if (usePremiumPlayback) {
      await SpotifyPlayer.pausePlayback();
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

  const startProgressTracking = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    
    lastPositionRef.current = 0;
    idleTicksRef.current = 0;
    nullStateTicksRef.current = 0;

    progressIntervalRef.current = setInterval(async () => {
      const state = await SpotifyPlayer.getCurrentPlaybackState();
      if (state) {
        nullStateTicksRef.current = 0;
        
        if (lastPositionRef.current === 0 && state.position > 0) {
          lastPositionRef.current = state.position;
        }
        
        const activeDuration = trackDurationRef.current;
        
        if (state.duration > 0) {
          trackDurationRef.current = state.duration;
          setTrackDuration(state.duration);
          
          const progress = (state.position / state.duration) * 100;
          setAudioProgress(Math.min(progress, 100));
          
          if (state.position >= state.duration || state.paused) {
            if (!state.paused && state.position >= state.duration) {
              await SpotifyPlayer.pausePlayback();
            }
            setAudioPlaying(false);
            if (progressIntervalRef.current) {
              clearInterval(progressIntervalRef.current);
              progressIntervalRef.current = null;
            }
          } else {
            if (Math.abs(state.position - lastPositionRef.current) < 50) {
              idleTicksRef.current++;
              if (idleTicksRef.current >= 30) {
                console.warn('Premium playback frozen (duration known but position not advancing)');
                await SpotifyPlayer.pausePlayback();
                setAudioPlaying(false);
                if (progressIntervalRef.current) {
                  clearInterval(progressIntervalRef.current);
                  progressIntervalRef.current = null;
                }
              }
            } else {
              idleTicksRef.current = 0;
              lastPositionRef.current = state.position;
            }
          }
        } else {
          const progress = (state.position / activeDuration) * 100;
          setAudioProgress(Math.min(progress, 100));
          
          if (state.paused) {
            console.warn('Premium playback ended without SDK reporting duration');
            setAudioPlaying(false);
            if (progressIntervalRef.current) {
              clearInterval(progressIntervalRef.current);
              progressIntervalRef.current = null;
            }
          } else {
            if (Math.abs(state.position - lastPositionRef.current) < 50) {
              idleTicksRef.current++;
              if (idleTicksRef.current >= 30) {
                console.warn('Premium playback timeout: position not advancing (SDK never reported duration)');
                await SpotifyPlayer.pausePlayback();
                setAudioPlaying(false);
                if (progressIntervalRef.current) {
                  clearInterval(progressIntervalRef.current);
                  progressIntervalRef.current = null;
                }
              }
            } else {
              idleTicksRef.current = 0;
              lastPositionRef.current = state.position;
            }
          }
        }

        if (state.paused && audioPlaying) {
          setAudioPlaying(false);
        }
      } else {
        nullStateTicksRef.current++;
        if (nullStateTicksRef.current >= 20) {
          console.warn('Premium playback cleanup: SDK stopped reporting state');
          setAudioPlaying(false);
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
          }
        }
      }
    }, 100);
  };

  const handleToggleAudio = async () => {
    if (currentTrack.previewUrl === 'mock' && !usePremiumPlayback) {
      return;
    }

    try {
      if (usePremiumPlayback && playerReady && currentTrack.id) {
        if (audioPlaying) {
          await SpotifyPlayer.pausePlayback();
          setAudioPlaying(false);
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
          }
        } else {
          const trackUri = `spotify:track:${currentTrack.id}`;
          const success = await SpotifyPlayer.playTrack(trackUri);
          if (success) {
            setAudioPlaying(true);
            startProgressTracking();
          }
        }
      } else {
        if (!soundRef.current || !currentTrack.previewUrl) {
          return;
        }

        if (audioPlaying) {
          await soundRef.current.pauseAsync();
          setAudioPlaying(false);
        } else {
          const status = await soundRef.current.getStatusAsync();
          if (status.isLoaded && status.positionMillis >= trackDurationRef.current) {
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
          onPress={handleToggleAudio}
          style={[
            styles.playButton,
            {
              backgroundColor: (usePremiumPlayback || (currentTrack.previewUrl && currentTrack.previewUrl !== 'mock')) ? theme.primary : theme.backgroundDefault,
              shadowColor: "#000",
            },
          ]}
          disabled={!usePremiumPlayback && (!currentTrack.previewUrl || currentTrack.previewUrl === 'mock')}
        >
          <Feather
            name={audioPlaying ? "pause" : "play"}
            size={32}
            color={(usePremiumPlayback || (currentTrack.previewUrl && currentTrack.previewUrl !== 'mock')) ? "#FFFFFF" : theme.textSecondary}
          />
        </Pressable>
        <View style={styles.progressInfo}>
          {!usePremiumPlayback && currentTrack.previewUrl === 'mock' ? (
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Audio preview not available
            </ThemedText>
          ) : usePremiumPlayback || currentTrack.previewUrl ? (
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
                  {Math.floor((audioProgress / 100) * (trackDuration / 1000))}s / {Math.floor(trackDuration / 1000)}s
                </ThemedText>
                {usePremiumPlayback ? (
                  <View style={[styles.premiumBadge, { backgroundColor: theme.primary }]}>
                    <ThemedText type="small" style={{ color: "#FFFFFF", fontSize: 10, fontWeight: "600" }}>
                      FULL TRACK
                    </ThemedText>
                  </View>
                ) : null}
              </View>
            </>
          ) : (
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              No preview available for this track
            </ThemedText>
          )}
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
  playbackStatusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  premiumBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
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
