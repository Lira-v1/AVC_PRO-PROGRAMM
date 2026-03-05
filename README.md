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
Реализован базовый flow заявок и рассылки офферов мастерам через Supabase.

## Что добавлено

- SQL-миграция `supabase/migrations/20260304120000_leads_offers_flow.sql`:
  - таблицы `leads`, `lead_items`, `master_presence`, `offers`
  - функция Haversine `distance_km`
  - RPC `create_lead_and_dispatch`:
    - создает lead
    - сохраняет услуги в `lead_items`
    - находит онлайн мастеров с координатами
    - выбирает мастеров в радиусе 5км
    - создает до 10 офферов со статусом `sent`
  - RPC `accept_offer` для отклика мастера
  - RPC `assign_master_to_lead` для назначения мастера клиентом

- Клиентский слой Supabase:
  - `src/lib/supabase.ts`

- Бизнес-логика:
  - `src/features/leads/createLeadAndDispatch.ts`
  - `src/features/master/masterOffers.ts`
  - `src/features/client/clientResponses.ts`

- Минимальные экраны (UI без значимых изменений):
  - `src/features/master/MasterOffersScreen.tsx`
  - `src/features/client/ClientResponsesScreen.tsx`

## Realtime

Для мастера добавлена подписка на новые `offers` (INSERT) с фильтром по `master_id`.
Новые офферы со статусом `sent` отображаются без перезапуска приложения.
## mobile

В репозитории добавлено мобильное приложение на **React Native + Expo + TypeScript** в папке `mobile`.

### Что реализовано
- Expo SDK (актуальная ветка SDK 53)
- Навигация React Navigation: stack + tabs
- Архитектура `src/screens`, `src/components`, `src/services`, `src/store`, `src/types`, `src/constants`
- Локальное хранилище через AsyncStorage (демо-БД)
- Роли `client` и `master` с выбором на экране входа
- Клиентский сценарий: каталог услуг, ценовая политика, корзина, создание локальной заявки
- Мастерский сценарий: статус online/offline, список новых заявок, отклик (offer)

### Установка
```bash
cd mobile
npm install
```

### Запуск
```bash
npm run start
```

Дополнительно:
```bash
npm run android
npm run ios
npm run web
```
