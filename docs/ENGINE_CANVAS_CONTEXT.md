Контекст движка Canvas

Назначение документа

Этот документ описывает архитектуру Canvas Engine — геометрического движка Project Editor.

Он используется вместе с:

MASTERPRO_CORE_CONTEXT.md  
MASTERPRO_TECH_MAP.md

---

1. Назначение Canvas Engine

Canvas Engine — это геометрическое ядро Project Editor.

Он используется для:

- построения помещений
- работы с комнатами
- работы с поверхностями
- размещения инженерных объектов
- отображения точек
- подготовки маршрутов
- расчётной геометрии проекта

Canvas Engine является частью Engineering Core.

---

2. Общий принцип Canvas V3

Canvas V3 создаётся с нуля.

Он не должен наследовать архитектуру старого Canvas.

Canvas V3 должен быть:

- независимым геометрическим модулем
- чистой системой координат
- отделённым от UI Overlay
- пригодным для нескольких инженерных систем

Canvas должен работать не только для электрики, но и для:

- сантехники
- отопления
- отделки
- других инженерных систем

---

3. Иерархия геометрии

Основная иерархия Canvas:

Canvas → Room → Surface → Object → Route

Эта иерархия является обязательной.

---

4. Canvas

Canvas — это общая сцена редактора.

Canvas отвечает за:

- world coordinates
- camera
- zoom
- pan
- grid
- selection
- world → screen transforms
- screen → world transforms

Canvas хранит геометрию сцены.

Canvas не содержит бизнес-логики платформы.

---

5. Camera

Camera управляет отображением сцены.

Camera отвечает за:

- zoom
- pan
- центрирование сцены

Camera не должна изменять геометрию объектов.

Она изменяет только отображение.

---

6. Grid

Grid — инфраструктура Canvas.

Grid:

- работает в world coordinates
- масштабируется вместе с zoom
- используется для snap

Grid не содержит логики помещений.

---

7. Room

Room — контейнер помещения.

Комната содержит:

- roomId
- геометрию
- высоту
- position
- rotation
- surfaces

Комната должна поддерживать:

- прямоугольную геометрию
- произвольные контуры в будущем

---

8. Surface

Surface — рабочая поверхность комнаты.

Минимальные поверхности:

- north
- south
- west
- east
- floor
- ceiling

Surface имеет:

- surfaceId
- roomId
- тип поверхности
- ширину
- высоту

Surface — рабочая плоскость размещения объектов.

---

9. Object

Object — инженерный элемент.

Примеры:

- розетка
- выключатель
- светильник
- сантехническая точка
- инженерный вывод

Объект содержит:

- objectId
- roomId
- surfaceId
- position
- параметры объекта

---

10. Route

Route — инженерный маршрут.

Используется для:

- кабелей
- труб
- инженерных трасс

Route является отдельной сущностью.

---

11. UI Overlay

UI Overlay — слой интерфейса.

Он содержит:

- кнопки
- resize handles
- rotate controls
- подписи размеров
- всплывающие меню

UI Overlay работает в screen coordinates.

Он не должен смешиваться с геометрией Canvas.

---

12. Архитектурные ограничения

Canvas Engine должен строго разделять:

- world geometry
- camera transforms
- grid
- room geometry
- object placement
- routes
- UI overlay

Смешивание этих систем запрещено.

---

13. Этапы разработки Canvas V3

Canvas должен развиваться поэтапно:

1. Canvas Core
2. Grid
3. Camera
4. Room Base
5. Room Transform
6. Room UI Overlay
7. Room Geometry
8. Surface Scene
9. Object Placement
10. Route Engine

---

14. Итог

Canvas Engine — фундамент Project Editor.

Если Canvas построен правильно, на нём смогут работать:

- проектировщик
- SmetMaster
- размещение объектов
- маршруты
- инженерные системы
