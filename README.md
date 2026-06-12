# Трекер времени (Time Tracker)

Веб-приложение для отслеживания действий в течение дня и анализа личной
эффективности. Mobile-first.

- **Frontend:** React + TypeScript + Vite, SCSS-модули, Zustand, React Query, Recharts
- **Backend:** Django + DRF, JWT-аутентификация, PostgreSQL
- Подробности архитектуры — в [PLAN.md](./PLAN.md)

## Возможности

- Регистрация / вход (мультиюзер, JWT).
- **Страница «День»:** свободные интервалы (по умолчанию 10 строк), авто-подстановка
  времени старта от конца предыдущего интервала, лента дня 00:00–24:00 и donut за день.
- **Страница «Статистика»:** неделя / месяц — структура дней (stacked bar), распределение
  по категориям, по типу времени, топ категорий, KPI и **индекс продуктивности**.
- **Категории:** базовые засеиваются при регистрации, можно добавлять свои
  (цвет, иконка, тип: продуктивно / нейтрально / впустую). Удаление — мягкое (архив).

---

## Запуск через Docker (рекомендуется)

```bash
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000/api
- Swagger-доки: http://localhost:8000/api/docs/

Миграции применяются автоматически при старте backend-контейнера.
Создать суперпользователя для админки:

```bash
docker compose exec backend python manage.py createsuperuser
```

---

## Локальный запуск без Docker

### Backend

```bash
cd backend
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env   # отредактируйте DATABASE_URL под свой Postgres
python manage.py makemigrations
python manage.py migrate
python manage.py runserver
```

> Нужен запущенный PostgreSQL и база `timetracker`. Либо поднимите только БД:
> `docker compose up db`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Vite проксирует `/api` на `http://localhost:8000` (см. `vite.config.ts`).

---

## Линтеры

Frontend:

```bash
cd frontend
npm run lint          # ESLint + jsx-a11y
npm run lint:style    # stylelint (SCSS)
npm run format        # prettier
```

Backend:

```bash
cd backend
ruff check .
ruff format .
```

---

## Структура

```
reporting-project/
├── docker-compose.yml
├── PLAN.md                # детальный план/архитектура
├── backend/               # Django + DRF
│   ├── config/            # settings, urls
│   └── apps/
│       ├── accounts/      # auth, регистрация, сид категорий
│       ├── categories/    # модель + CRUD
│       ├── entries/       # интервалы времени + bulk-сохранение
│       └── stats/         # агрегаты для графиков
└── frontend/              # React + Vite
    └── src/
        ├── api/           # axios + react-query хуки
        ├── components/    # Layout, IntervalRow, DayTimeline, charts
        ├── pages/         # Day, Stats, Categories, Login/Register
        ├── store/         # zustand (auth)
        ├── styles/        # глобальный scss + переменные
        └── utils/         # работа со временем
```
