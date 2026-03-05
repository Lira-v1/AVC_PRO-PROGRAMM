# AVC_PRO-PROGRAMM

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
