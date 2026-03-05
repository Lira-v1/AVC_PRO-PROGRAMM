import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

interface SupabaseLike {
  from: (table: string) => {
    update: (values: Record<string, unknown>) => {
      eq: (column: string, value: string) => Promise<{ error: Error | null }>;
    };
  };
}

interface RegisterMasterPushTokenParams {
  supabase: SupabaseLike;
  profileId: string;
  isMaster: boolean;
  projectId?: string;
}

/**
 * Вызывать при старте приложения после загрузки профиля пользователя.
 * Для мастеров регистрирует Expo push token и сохраняет его в profiles.expo_push_token.
 */
export async function registerMasterPushToken({
  supabase,
  profileId,
  isMaster,
  projectId,
}: RegisterMasterPushTokenParams): Promise<string | null> {
  if (!isMaster || !profileId || !Device.isDevice) {
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const permission = await Notifications.requestPermissionsAsync();
    finalStatus = permission.status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const tokenResponse = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );
  const expoPushToken = tokenResponse.data;

  const { error } = await supabase
    .from('profiles')
    .update({ expo_push_token: expoPushToken })
    .eq('id', profileId);

  if (error) {
    throw error;
  }

  return expoPushToken;
}
