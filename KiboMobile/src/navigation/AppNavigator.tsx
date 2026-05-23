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

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Home: '🏠',
    Chat: '💬',
    Checkin: '📋',
    Profile: '👤',
    Goals: '🎯',
    Insights: '📊',
    Journal: '📓',
    Crisis: '🆘',
    ActivityData: '📈',
    WearableData: '⌚',
  };

  return (
    <View style={styles.tabIcon}>
      <Text style={{ fontSize: focused ? 26 : 22 }}>{icons[name]}</Text>
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => (
          <TabIcon name={route.name} focused={focused} />
        ),
        tabBarActiveTintColor: '#7C3AED',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingTop: 8,
          paddingBottom: 8,
          height: 70,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: '#7C3AED',
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Kibo' }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{ title: 'Assistente Kibo' }}
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
      <Tab.Screen
        name="Goals"
        component={GoalsScreen}
        options={{ title: 'Metas' }}
      />
      <Tab.Screen
        name="Insights"
        component={InsightsScreen}
        options={{ title: 'Insights' }}
      />
      <Tab.Screen
        name="Journal"
        component={JournalScreen}
        options={{ title: 'Diário' }}
      />
      <Tab.Screen
        name="Crisis"
        component={CrisisScreen}
        options={{ 
          title: 'Ajuda',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="Crisis" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="ActivityData"
        component={ActivityDataScreen}
        options={{ title: 'Atividade' }}
      />
      <Tab.Screen
        name="WearableData"
        component={WearableDataScreen}
        options={{ title: 'Wearables' }}
      />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const [initialRoute, setInitialRoute] = useState<'loading' | 'Onboarding' | 'Login' | 'Main'>('loading');

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      // Small delay to avoid flash of wrong screen
      setTimeout(async () => {
        if (user) {
          setInitialRoute('Main');
        } else {
          // Check if onboarding was completed
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
        <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen 
          name="BreathingExercise" 
          component={BreathingExerciseScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="ColorCheckin" 
          component={ColorCheckinScreen} 
          options={{ 
            headerShown: false,
            presentation: 'modal',
          }}
        />
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
