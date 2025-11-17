import React, { useState, useEffect } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, Image, StyleSheet, Platform } from "react-native";

import LoginScreen from "@/screens/LoginScreen";
import MenuScreen from "@/screens/MenuScreen";
import GameSetupScreen from "@/screens/GameSetupScreen";
import GamePlayScreen from "@/screens/GamePlayScreen";
import ResultsScreen from "@/screens/ResultsScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import { ThemedText } from "@/components/ThemedText";
import { getCommonScreenOptions } from "@/navigation/screenOptions";
import { useTheme } from "@/hooks/useTheme";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Spacing } from "@/constants/theme";
import { QUESTION_COUNT, ANSWER_OPTIONS_COUNT } from "@/constants/config";
import { checkSpotifyAuth, initiateSpotifyLogin } from "@/utils/auth";
import { loadTracksForPlaylist, generateQuestion, Track, GameQuestion } from "@/utils/gameLogic";

export type MainStackParamList = {
  Login: undefined;
  Menu: undefined;
  GameSetup: undefined;
  GamePlay: { playlistId: string };
  Results: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<MainStackParamList>();

interface Answer {
  id: string;
  trackName: string;
  artistName: string;
}

interface RoundResult {
  round: number;
  correct: boolean;
  trackName: string;
  artistName: string;
}

export default function MainStackNavigator() {
  const { theme } = useTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [stats, setStats] = useState({
    gamesPlayed: 0,
    bestScore: 7,
    totalGames: 12,
    accuracy: 68,
  });

  const [gameTracks, setGameTracks] = useState<Track[]>([]);
  const [usedTrackIds, setUsedTrackIds] = useState<string[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<GameQuestion | null>(null);
  const [gameState, setGameState] = useState({
    currentRound: 1,
    score: 0,
    results: [] as RoundResult[],
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    if (Platform.OS === 'web') {
      const isAuth = await checkSpotifyAuth();
      setIsAuthenticated(isAuth);
    } else {
      setIsAuthenticated(true);
    }
    setIsCheckingAuth(false);
  };

  const handleLogin = async () => {
    if (Platform.OS === 'web') {
      initiateSpotifyLogin();
    } else {
      setIsAuthenticated(true);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  const handleStartGame = async (playlistId: string, navigation: any) => {
    const tracks = await loadTracksForPlaylist(playlistId);
    
    const minTracksNeeded = QUESTION_COUNT + ANSWER_OPTIONS_COUNT - 1;
    if (tracks.length < minTracksNeeded) {
      alert(`This playlist doesn't have enough tracks with audio previews. Need at least ${minTracksNeeded} tracks, found ${tracks.length}.`);
      return;
    }
    
    setGameTracks(tracks);
    setUsedTrackIds([]);
    
    const firstQuestion = generateQuestion(tracks, []);
    if (!firstQuestion) {
      alert('Unable to generate questions from this playlist. Please try a different one.');
      return;
    }
    
    setCurrentQuestion(firstQuestion);
    setGameState({
      currentRound: 1,
      score: 0,
      results: [],
    });
    
    navigation.navigate("GamePlay", { playlistId });
  };

  const handleAnswerSelected = (answerId: string) => {
    if (!currentQuestion) return;

    const isCorrect = answerId === currentQuestion.correctAnswerId;
    const correctAnswer = currentQuestion.correctTrack;

    const newResults = [
      ...gameState.results,
      {
        round: gameState.currentRound,
        correct: isCorrect,
        trackName: correctAnswer?.name || "",
        artistName: correctAnswer?.artist || "",
      },
    ];

    setTimeout(() => {
      if (gameState.currentRound < QUESTION_COUNT) {
        const newUsedIds = [...usedTrackIds, currentQuestion.correctAnswerId];
        setUsedTrackIds(newUsedIds);
        
        const nextQuestion = generateQuestion(gameTracks, newUsedIds);
        if (nextQuestion) {
          setCurrentQuestion(nextQuestion);
          setGameState({
            currentRound: gameState.currentRound + 1,
            score: isCorrect ? gameState.score + 1 : gameState.score,
            results: newResults,
          });
        }
      } else {
        const finalScore = isCorrect ? gameState.score + 1 : gameState.score;
        setGameState({
          ...gameState,
          score: finalScore,
          results: newResults,
        });
        setStats({
          ...stats,
          gamesPlayed: stats.gamesPlayed + 1,
          totalGames: stats.totalGames + 1,
          bestScore: Math.max(stats.bestScore, finalScore),
        });
      }
    }, 2000);
  };


  if (isCheckingAuth) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
        <ThemedText type="body" style={{ color: theme.textSecondary }}>
          Loading...
        </ThemedText>
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={getCommonScreenOptions({
        theme,
        isDark,
        transparent: true,
      })}
    >
      {!isAuthenticated ? (
        <Stack.Screen
          name="Login"
          options={{ headerShown: false }}
        >
          {() => <LoginScreen onLogin={handleLogin} />}
        </Stack.Screen>
      ) : (
        <>
          <Stack.Screen
            name="Menu"
            options={{
              headerTitle: () => (
                <View style={styles.headerTitleContainer}>
                  <Image
                    source={require("@/assets/images/icon.png")}
                    style={styles.headerLogo}
                  />
                  <ThemedText type="h4" style={styles.headerTitleText}>
                    Guess That Track!
                  </ThemedText>
                </View>
              ),
            }}
          >
            {({ navigation }) => (
              <MenuScreen
                onPlayNow={() => navigation.navigate("GameSetup")}
                onSettings={() => navigation.navigate("Settings")}
                stats={stats}
              />
            )}
          </Stack.Screen>
          <Stack.Screen
            name="GameSetup"
            options={{ title: "Choose Playlist" }}
          >
            {({ navigation }) => (
              <GameSetupScreen
                onSelectPlaylist={(playlistId) => {
                  handleStartGame(playlistId, navigation);
                }}
              />
            )}
          </Stack.Screen>
          <Stack.Screen
            name="GamePlay"
            options={{ title: "Playing", headerBackVisible: false }}
          >
            {({ navigation }) => currentQuestion ? (
              <GamePlayScreen
                currentRound={gameState.currentRound}
                score={gameState.score}
                answers={currentQuestion.options.map(track => ({
                  id: track.id,
                  trackName: track.name,
                  artistName: track.artist,
                }))}
                correctAnswerId={currentQuestion.correctAnswerId}
                currentTrack={currentQuestion.correctTrack}
                onAnswerSelected={(answerId) => {
                  handleAnswerSelected(answerId);
                  if (gameState.currentRound >= QUESTION_COUNT) {
                    setTimeout(() => {
                      navigation.replace("Results");
                    }, 2500);
                  }
                }}
              />
            ) : null}
          </Stack.Screen>
          <Stack.Screen
            name="Results"
            options={{ title: "Game Over", headerBackVisible: false }}
          >
            {({ navigation }) => (
              <ResultsScreen
                score={gameState.score}
                results={gameState.results}
                onPlayAgain={() => {
                  navigation.replace("GameSetup");
                }}
                onChangePlaylist={() => {
                  navigation.replace("GameSetup");
                }}
              />
            )}
          </Stack.Screen>
          <Stack.Screen
            name="Settings"
            options={{ title: "Settings" }}
          >
            {({ navigation }) => (
              <SettingsScreen
                userProfile={{ displayName: "Spotify User" }}
                stats={stats}
                onLogout={() => {
                  handleLogout();
                  navigation.reset({ index: 0, routes: [{ name: "Login" }] });
                }}
              />
            )}
          </Stack.Screen>
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerLogo: {
    width: 32,
    height: 32,
    marginRight: Spacing.sm,
  },
  headerTitleText: {
    fontWeight: "700",
  },
});
