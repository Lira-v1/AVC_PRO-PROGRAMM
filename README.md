# AVC_PRO-PROGRAMM

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
