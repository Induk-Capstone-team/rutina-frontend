// services/notification_service.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import type { ScheduleRoutine } from "@/types/routine";

const CHANNEL_ID = "routine";
const NOTIFICATION_STORAGE_KEY = "routine_notifications";

type NotificationMap = Record<string, string>;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const getNotificationMap = async (): Promise<NotificationMap> => {
  const value = await AsyncStorage.getItem(NOTIFICATION_STORAGE_KEY);
  return value ? JSON.parse(value) : {};
};

const saveNotificationMap = async (map: NotificationMap) => {
  await AsyncStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(map));
};

const getNextTriggerDate = (startTime: string) => {
  const [hour, minute] = startTime.split(":").map(Number);

  const date = new Date();
  date.setHours(hour);
  date.setMinutes(minute);
  date.setSeconds(0);
  date.setMilliseconds(0);

  if (date <= new Date()) {
    date.setDate(date.getDate() + 1);
  }

  return date;
};

export const NotificationService = {
  requestPermission: async () => {
    const current = await Notifications.getPermissionsAsync();

    if (current.status === "granted") return true;

    const requested = await Notifications.requestPermissionsAsync();
    return requested.status === "granted";
  },

  setupAndroidChannel: async () => {
    if (Platform.OS !== "android") return;

    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "루틴 알림",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#405886",
    });
  },

  scheduleRoutineNotification: async (routine: ScheduleRoutine) => {
    if (!routine.id || !routine.alarm || !routine.startTime) return null;

    const hasPermission = await NotificationService.requestPermission();
    if (!hasPermission) return null;

    await NotificationService.setupAndroidChannel();

    // 기존 알림이 있으면 먼저 취소
    await NotificationService.cancelRoutineNotification(routine.id);

    const triggerDate = getNextTriggerDate(routine.startTime);

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "루틴 시작 시간이에요",
        body: `${routine.title} 할 시간이에요.`,
        sound: "default",
        data: {
          routineId: routine.id,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        channelId: CHANNEL_ID,
      },
    });

    const map = await getNotificationMap();
    map[String(routine.id)] = notificationId;
    await saveNotificationMap(map);

    return notificationId;
  },

  cancelRoutineNotification: async (routineId: number) => {
    const map = await getNotificationMap();
    const notificationId = map[String(routineId)];

    if (!notificationId) return;

    await Notifications.cancelScheduledNotificationAsync(notificationId);

    delete map[String(routineId)];
    await saveNotificationMap(map);
  },
  syncRoutineNotification: async (routine: ScheduleRoutine) => {
    if (routine.alarm && routine.startTime) {
      await NotificationService.scheduleRoutineNotification(routine);
      return;
    }

    await NotificationService.cancelRoutineNotification(routine.id);
  },
};
