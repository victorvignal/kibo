import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Text, View, StyleSheet, ActivityIndicator } from 'react-native';

import HomeScreen from '../screens/HomeScreen';
import ChatScreen from '../screens/ChatScreen';
import CheckinScreen from '../screens/CheckinScreen';
import ColorCheckinScreen from '../screens/ColorCheckinScreen';
import ProfileScreen from '../screens/ProfileScreen';
import GoalsScreen from '../screens/GoalsScreen';
import InsightsScreen from '../screens/InsightsScreen';
import CrisisScreen from '../screens/CrisisScreen';
import LoginScreen from '../screens/LoginScreen';
import BreathingExerciseScreen from '../screens/BreathingExerciseScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import JournalScreen from '../screens/JournalScreen';
import ActivityDataScreen from '../screens/ActivityDataScreen';
import WearableDataScreen from '../screens/WearableDataScreen';
import { onAuthChange } from '../services/firebase';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Minimal tab icon component using simple shapes + color
function TabBarIcon({ label, focused }: { label: string; focused: boolean }) {
  const color = focused ? '#7C3AED' : '#9CA3AF';
  const size = focused ? 28 : 24;

  const icons: Record<string, () => React.ReactNode> = {
    Home: () => (
      <View style={[styles.iconContainer, { width: size, height: size }]}>
        <View style={[styles.homeIcon, { borderColor: color }]}>
          <View style={[styles.homeRoof, { borderBottomColor: color }]} />
        </View>
      </View>
    ),
    Chat: () => (
      <View style={[styles.iconContainer, { width: size, height: size }]}>
        <View style={[styles.chatBubble, { backgroundColor: color }]}>
          <View style={styles.chatDot} />
          <View style={[styles.chatDot, { marginLeft: 2 }]} />
          <View style={[styles.chatDot, { marginLeft: 2 }]} />
        </View>
      </View>
    ),
    Checkin: () => (
      <View style={[styles.iconContainer, { width: size, height: size }]}>
        <View style={[styles.checkIcon, { borderColor: color }]}>
          <View style={[styles.checkLine1, { backgroundColor: color }]} />
          <View style={[styles.checkLine2, { backgroundColor: color }]} />
        </View>
      </View>
    ),
    Profile: () => (
      <View style={[styles.iconContainer, { width: size, height: size }]}>
        <View style={[styles.profileIcon, { borderColor: color }]}>
          <View style={[styles.profileHead, { backgroundColor: color }]} />
          <View style={[styles.profileBody, { backgroundColor: color }]} />
        </View>
      </View>
    ),
  };

  return (
    <View style={styles.tabIcon}>
      {icons[label]?.()}
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => (
          <TabBarIcon label={route.name} focused={focused} />
        ),
        tabBarActiveTintColor: '#7C3AED',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Home' }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{ title: 'Chat' }}
      />
      <Tab.Screen
        name="Checkin"
        component={CheckinScreen}
        options={{ title: 'Check-in' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Perfil' }}
      />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const [initialRoute, setInitialRoute] = useState<'loading' | 'Onboarding' | 'Login' | 'Main'>('loading');

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setTimeout(async () => {
        if (user) {
          setInitialRoute('Main');
        } else {
          try {
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            const onboardingComplete = await AsyncStorage.getItem('onboarding_complete');
            setInitialRoute(onboardingComplete === 'true' ? 'Login' : 'Onboarding');
          } catch {
            setInitialRoute('Login');
          }
        }
      }, 50);
    });

    return () => unsubscribe();
  }, []);

  if (initialRoute === 'loading') {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.loadingLogo}>🐱</Text>
        <ActivityIndicator size="large" color="#7C3AED" style={{ marginTop: 16 }} />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen 
          name="BreathingExercise" 
          component={BreathingExerciseScreen}
        />
        <Stack.Screen 
          name="ColorCheckin" 
          component={ColorCheckinScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen name="Goals" component={GoalsScreen} />
        <Stack.Screen name="Insights" component={InsightsScreen} />
        <Stack.Screen name="Journal" component={JournalScreen} />
        <Stack.Screen name="Crisis" component={CrisisScreen} />
        <Stack.Screen name="ActivityData" component={ActivityDataScreen} />
        <Stack.Screen name="WearableData" component={WearableDataScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function AppNavigator() {
  return <RootNavigator />;
}

const styles = StyleSheet.create({
  tabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Home icon (house)
  homeIcon: {
    width: 20,
    height: 16,
    borderWidth: 2.5,
    borderTopWidth: 0,
    borderRadius: 2,
    position: 'relative',
  },
  homeRoof: {
    position: 'absolute',
    top: -8,
    left: -4,
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  // Chat bubble
  chatBubble: {
    width: 22,
    height: 18,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  chatDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFF',
  },
  // Check icon
  checkIcon: {
    width: 20,
    height: 20,
    borderWidth: 2.5,
    borderRadius: 4,
    position: 'relative',
  },
  checkLine1: {
    position: 'absolute',
    width: 6,
    height: 2.5,
    borderRadius: 1,
    transform: [{ rotate: '45deg' }],
    bottom: 4,
    left: 1,
  },
  checkLine2: {
    position: 'absolute',
    width: 10,
    height: 2.5,
    borderRadius: 1,
    transform: [{ rotate: '-45deg' }],
    bottom: 5,
    right: 0,
  },
  // Profile icon
  profileIcon: {
    width: 20,
    height: 20,
    borderWidth: 2.5,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  profileHead: {
    width: 6,
    height: 6,
    borderRadius: 3,
    position: 'absolute',
    top: 3,
  },
  profileBody: {
    width: 10,
    height: 5,
    borderRadius: 0,
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
    position: 'absolute',
    bottom: 2,
  },
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  loadingLogo: {
    fontSize: 64,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
});
