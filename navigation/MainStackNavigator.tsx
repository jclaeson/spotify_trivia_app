import React, { useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, Image, StyleSheet } from "react-native";

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
import { QUESTION_COUNT } from "@/constants/config";

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

const MOCK_TRACKS = [
  { id: "1", name: "Blinding Lights", artist: "The Weeknd" },
  { id: "2", name: "Shape of You", artist: "Ed Sheeran" },
  { id: "3", name: "Dance Monkey", artist: "Tones and I" },
  { id: "4", name: "Someone Like You", artist: "Adele" },
  { id: "5", name: "Uptown Funk", artist: "Mark Ronson ft. Bruno Mars" },
  { id: "6", name: "Bohemian Rhapsody", artist: "Queen" },
  { id: "7", name: "Hotel California", artist: "Eagles" },
  { id: "8", name: "Smells Like Teen Spirit", artist: "Nirvana" },
  { id: "9", name: "Billie Jean", artist: "Michael Jackson" },
  { id: "10", name: "Wonderwall", artist: "Oasis" },
  { id: "11", name: "Sweet Child O' Mine", artist: "Guns N' Roses" },
  { id: "12", name: "Rolling in the Deep", artist: "Adele" },
  { id: "13", name: "Thinking Out Loud", artist: "Ed Sheeran" },
  { id: "14", name: "Shallow", artist: "Lady Gaga & Bradley Cooper" },
  { id: "15", name: "Bad Guy", artist: "Billie Eilish" },
];

function generateQuestion(round: number): {
  answers: Answer[];
  correctAnswerId: string;
} {
  const shuffled = [...MOCK_TRACKS].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 4);
  const correct = selected[0];

  return {
    answers: selected.map((track) => ({
      id: track.id,
      trackName: track.name,
      artistName: track.artist,
    })),
    correctAnswerId: correct.id,
  };
}

export default function MainStackNavigator() {
  const { theme } = useTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [stats, setStats] = useState({
    gamesPlayed: 0,
    bestScore: 7,
    totalGames: 12,
    accuracy: 68,
  });

  const [gameState, setGameState] = useState({
    currentRound: 1,
    score: 0,
    results: [] as RoundResult[],
    currentQuestion: generateQuestion(1),
    isPlaying: false,
    playbackProgress: 0,
  });

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  const handleStartGame = (playlistId: string) => {
    setGameState({
      currentRound: 1,
      score: 0,
      results: [],
      currentQuestion: generateQuestion(1),
      isPlaying: false,
      playbackProgress: 0,
    });
  };

  const handleAnswerSelected = (answerId: string) => {
    const isCorrect = answerId === gameState.currentQuestion.correctAnswerId;
    const correctAnswer = gameState.currentQuestion.answers.find(
      (a) => a.id === gameState.currentQuestion.correctAnswerId
    );

    const newResults = [
      ...gameState.results,
      {
        round: gameState.currentRound,
        correct: isCorrect,
        trackName: correctAnswer?.trackName || "",
        artistName: correctAnswer?.artistName || "",
      },
    ];

    setTimeout(() => {
      if (gameState.currentRound < QUESTION_COUNT) {
        setGameState({
          currentRound: gameState.currentRound + 1,
          score: isCorrect ? gameState.score + 1 : gameState.score,
          results: newResults,
          currentQuestion: generateQuestion(gameState.currentRound + 1),
          isPlaying: false,
          playbackProgress: 0,
        });
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

  const handleTogglePlay = () => {
    setGameState({
      ...gameState,
      isPlaying: !gameState.isPlaying,
    });

    if (!gameState.isPlaying) {
      const interval = setInterval(() => {
        setGameState((prev) => {
          if (prev.playbackProgress >= 100) {
            clearInterval(interval);
            return { ...prev, isPlaying: false, playbackProgress: 100 };
          }
          return { ...prev, playbackProgress: prev.playbackProgress + 2 };
        });
      }, 100);
    }
  };

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
                  handleStartGame(playlistId);
                  navigation.navigate("GamePlay", { playlistId });
                }}
              />
            )}
          </Stack.Screen>
          <Stack.Screen
            name="GamePlay"
            options={{ title: "Playing", headerBackVisible: false }}
          >
            {({ navigation }) => (
              <GamePlayScreen
                currentRound={gameState.currentRound}
                score={gameState.score}
                answers={gameState.currentQuestion.answers}
                correctAnswerId={gameState.currentQuestion.correctAnswerId}
                onAnswerSelected={(answerId) => {
                  handleAnswerSelected(answerId);
                  if (gameState.currentRound >= QUESTION_COUNT) {
                    setTimeout(() => {
                      navigation.replace("Results");
                    }, 2500);
                  }
                }}
                isPlaying={gameState.isPlaying}
                onTogglePlay={handleTogglePlay}
                playbackProgress={gameState.playbackProgress}
              />
            )}
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
