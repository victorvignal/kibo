import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class NotificationService {
  private isInitialized = false;
  private expoPushToken: string | null = null;

  /** Returns the cached Expo push token, or null if not yet initialized. */
  getToken(): string | null {
    return this.expoPushToken;
  }

  async initialize(): Promise<string | null> {
    if (this.isInitialized) return this.expoPushToken;

    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Notification permissions not granted');
        return null;
      }

      // Set up Android channels
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('daily-reminder', {
          name: 'Lembrete Diário',
          description: 'Lembretes para fazer seu check-in diário',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#7C3AED',
          sound: 'default',
        });

        await Notifications.setNotificationChannelAsync('insights', {
          name: 'Insights do Kibo',
          description: 'Dicas e insights personalizados',
          importance: Notifications.AndroidImportance.DEFAULT,
          sound: 'default',
        });

        await Notifications.setNotificationChannelAsync('alerts', {
          name: 'Alertas',
          description: 'Alertas importantes de bem-estar',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 500, 250, 500],
          lightColor: '#DC2626',
          sound: 'default',
        });
      }

      // Get push token
      const { data: token } = await Notifications.getExpoPushTokenAsync();

      this.expoPushToken = token;
      this.isInitialized = true;

      // Set up listeners
      this.setupListeners();

      return token;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return null;
    }
  }

  private notificationSubscription: Notifications.Subscription | null = null;
  private responseSubscription: Notifications.Subscription | null = null;

  private setupListeners() {
    this.notificationSubscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification.request.content.title);
    });

    this.responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as Record<string, any>;
      console.log('Notification tapped:', data);
      if (data?.screen) {
        console.log('Navigate to:', data.screen);
      }
    });
  }

  dispose() {
    this.notificationSubscription?.remove();
    this.responseSubscription?.remove();
    this.notificationSubscription = null;
    this.responseSubscription = null;
  }

  async scheduleDailyReminder(hour: number = 9, minute: number = 0) {
    try {
      await this.cancelDailyReminder();

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '☀️ Bom dia! Como você está?',
          body: 'Faça seu check-in diário para acompanhar seu bem-estar mental.',
          data: { type: 'daily-checkin', screen: 'Checkin' },
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
          channelId: 'daily-reminder',
        },
      });

      console.log('Daily reminder scheduled for', `${hour}:${minute.toString().padStart(2, '0')}`);
    } catch (error) {
      console.error('Failed to schedule daily reminder:', error);
    }
  }

  async scheduleWeeklyReport(dayOfWeek: number = 1, hour: number = 10, minute: number = 0) {
    try {
      await this.cancelWeeklyReport();

      // Get next occurrence of dayOfWeek
      const now = new Date();
      const daysUntilTarget = (dayOfWeek - now.getDay() + 7) % 7 || 7;
      const nextDate = new Date(now);
      nextDate.setDate(now.getDate() + daysUntilTarget);
      nextDate.setHours(hour, minute, 0, 0);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📊 Seu resumo semanal do Kibo',
          body: 'Veja como foi sua semana - humor, sono, ansiedade e mais.',
          data: { type: 'weekly-report', screen: 'Home' },
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: dayOfWeek + 1, // 1=Sunday in notification API
          hour,
          minute,
          channelId: 'insights',
        },
      });

      console.log('Weekly report scheduled for day', dayOfWeek, `at ${hour}:${minute.toString().padStart(2, '0')}`);
    } catch (error) {
      console.error('Failed to schedule weekly report:', error);
    }
  }

  async cancelDailyReminder() {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const dailyReminders = scheduled.filter(
      n => (n.content.data as Record<string, any>)?.type === 'daily-checkin'
    );

    for (const notification of dailyReminders) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }

  async cancelWeeklyReport() {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const weeklyReports = scheduled.filter(
      n => (n.content.data as Record<string, any>)?.type === 'weekly-report'
    );

    for (const notification of weeklyReports) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }

  async areNotificationsEnabled(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  }

  async cancelAll() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  async getScheduledNotifications() {
    return Notifications.getAllScheduledNotificationsAsync();
  }
}

export const notificationService = new NotificationService();
