const EXPO_PUSH_API_URL = 'https://exp.host/--/api/v2/push/send';
const CHUNK_SIZE = 100;

export interface PushPayloadData {
  lead_id: string;
  policy_code: string;
  address_text: string;
}

export interface SendPushParams {
  pushTokens: string[];
  data: PushPayloadData;
}

interface ExpoPushMessage {
  to: string;
  sound: 'default';
  title: string;
  body: string;
  data: PushPayloadData;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function isExpoPushToken(token: string): boolean {
  return /^ExponentPushToken\[.+\]$/.test(token) || /^ExpoPushToken\[.+\]$/.test(token);
}

/**
 * Отправляет push-уведомления через Expo Push API.
 */
export async function sendPush({ pushTokens, data }: SendPushParams): Promise<void> {
  const validTokens = pushTokens.filter((token) => token && isExpoPushToken(token));
  if (!validTokens.length) {
    return;
  }

  const messages: ExpoPushMessage[] = validTokens.map((token) => ({
    to: token,
    sound: 'default',
    title: 'Новая заявка рядом с вами',
    body: 'Новая заявка рядом с вами',
    data,
  }));

  const messageChunks = chunk(messages, CHUNK_SIZE);

  for (const messageChunk of messageChunks) {
    const response = await fetch(EXPO_PUSH_API_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messageChunk),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Expo push error: ${response.status} ${errorText}`);
    }
  }
}
