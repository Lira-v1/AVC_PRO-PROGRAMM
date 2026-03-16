Техническая карта архитектуры MasterPro

Назначение документа

Этот документ описывает архитектуру системы и правила разработки.

Он используется вместе с:

MASTERPRO_CORE_CONTEXT.md

---

1. Архитектурные уровни системы

Система состоит из слоёв:

UI Layer  
Role System  
Service Core  
Engineering Core  
Marketplace Core  
Industrial Core  
Geo System  
Object System  
Job Market System

---

2. UI Layer

UI Layer отвечает только за отображение интерфейса.

Он не содержит бизнес-логики.

Основные элементы:

- SplashScreen
- HomeScreen
- MainMenu
- BannerGrid
- BottomNavigation
- HeaderSystem
- ModalSystem
- NotificationSystem

---

3. Role System

Роли пользователей:

Client  
Master  
ShopPartner  
IndustrialPartner  
Admin

Роль определяет доступные функции.

---

4. Service Core

Service Core управляет заявками.

Основные компоненты:

- ChatMaster
- orderDraft
- Dispatch
- Emergency System
- Job Status
- Rating
- Tariff

---

5. Engineering Core

Engineering Core отвечает за инженерную среду.

Компоненты:

- Project Editor
- Canvas Engine
- Room Geometry
- Surface System
- Object Placement
- Route Engine
- SmetMaster

---

6. Marketplace Core

Marketplace обеспечивает работу магазинов.

Компоненты:

- Shop Registry
- Shop Cabinet
- Product Catalog
- Material Database
- Price Feed
- Shop Map

---

7. Geo System

Geo System обеспечивает географическую инфраструктуру.

Компоненты:

- Geo Location
- Map Engine
- Nearest Master
- Route Calculation
- Traffic Integration

---

8. Object System

Object System управляет объектами.

Компоненты:

- Object Passport
- QR Object
- Maintenance History

---

9. Job Market

Job Market управляет вакансиями.

Компоненты:

- Jobs Feed
- Profession Index
- Salary Analytics
- Geo Jobs Map

---

10. Архитектурные инварианты

Следующие правила нельзя нарушать:

UI Layer не содержит бизнес-логики.

Canvas Engine изолирован от UI Overlay.

SmetMaster не зависит от интерфейса.

Модули не должны напрямую менять состояние других модулей.

Глобальный рефактор запрещён без отдельной задачи.

---

11. Development Flow

Каждая задача разработки должна включать:

1. ссылку на MASTERPRO_CORE_CONTEXT.md  
2. ссылку на MASTERPRO_TECH_MAP.md  
3. ссылку на контекст движка  
4. описание задачи  
5. ограничения

---

12. Работа Codex

Алгоритм работы Codex:

1. Изучить CORE_CONTEXT
2. Изучить TECH_MAP
3. Изучить контекст движка
4. Получить задачу
5. Изменять только нужный модуль

---

13. Ограничения для Codex

Codex не должен:

- переписывать архитектуру
- менять структуру папок
- менять UI Layer
- выполнять глобальный рефактор

Если задача относится к одному модулю — остальные модули менять нельзя.

---

14. Итог

MasterPro — модульная инженерная платформа.

Каждый движок развивается независимо, но работает внутри общей архитектуры.
