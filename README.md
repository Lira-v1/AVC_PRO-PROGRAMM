# AVC_PRO-PROGRAMM

## Push Notifications Setup

### 1) База данных

Добавьте миграцию для поля `profiles.expo_push_token`:

```sql
alter table public.profiles
add column if not exists expo_push_token text;
```

Файл миграции: `supabase/migrations/202603040001_add_expo_push_token_to_profiles.sql`.

### 2) Мобильное приложение (Expo)

При запуске приложения вызовите `registerMasterPushToken` после загрузки профиля.

- Функция запрашивает разрешения на push.
- Регистрирует Expo push token.
- Для роли мастера сохраняет token в `profiles.expo_push_token`.

Файл: `mobile/src/notifications/registerMasterPushToken.ts`.

Пример:

```ts
await registerMasterPushToken({
  supabase,
  profileId: profile.id,
  isMaster: profile.role === 'master',
  projectId: process.env.EXPO_PROJECT_ID,
});
```

### 3) Отправка push через backend

Реализована функция `sendPush`:

- принимает массив `pushTokens`
- отправляет уведомления через Expo Push API
- текст уведомления: `Новая заявка рядом с вами`
- передает `lead_id`, `policy_code`, `address_text` в `data`

Файл: `backend/push/sendPush.ts`.

### 4) Интеграция при создании offers

В `createOffers` после создания offers:

- получаем `expo_push_token` мастеров из `profiles`
- вызываем `sendPush`

Файл: `backend/offers/createOffers.ts`.
