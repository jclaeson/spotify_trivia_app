import React from "react";
import { StyleSheet, View, Image, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface LoginScreenProps {
  onLogin: () => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <LinearGradient
      colors={["#1DB954", "#191414"]}
      style={[
        styles.container,
        {
          paddingTop: insets.top + Spacing.xl,
          paddingBottom: insets.bottom + Spacing.xl,
        },
      ]}
    >
      <View style={styles.content}>
        <Image
          source={require("@/assets/images/icon.png")}
          style={styles.logo}
        />
        <ThemedText type="h1" style={styles.title}>
          Guess That Track!
        </ThemedText>
        <ThemedText type="body" style={styles.subtitle}>
          Test your music knowledge with Spotify
        </ThemedText>

        <AnimatedPressable
          onPress={onLogin}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[
            styles.loginButton,
            {
              backgroundColor: "#1DB954",
              shadowColor: "#000",
            },
            animatedStyle,
          ]}
        >
          <ThemedText type="body" style={styles.loginButtonText}>
            Login with Spotify
          </ThemedText>
        </AnimatedPressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing["3xl"],
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: Spacing["2xl"],
  },
  title: {
    color: "#FFFFFF",
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  subtitle: {
    color: "#B3B3B3",
    textAlign: "center",
    marginBottom: Spacing["5xl"],
  },
  loginButton: {
    width: "100%",
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
