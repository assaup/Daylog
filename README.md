# DayLog

Трекер дня: записываешь, чем занимался, и видишь, сколько времени ушло на полезное,
сколько на ерунду и как ты спишь.

**Демо:** https://daylogapp.ru

## Что умеет

- **День** — интервалы времени с категорией и заметкой, подъём/отбой и расчёт сна,
  автосохранение, проверка пересечений. Прошедшие дни открываются только для чтения.
- **Статистика** — за день, неделю, месяц или произвольный период: полезное/впустую,
  индекс продуктивности, режим сна, продуктивные часы, тренды, цель и серия дней.
- **Тренировки** — журнал упражнений с подходами, весом, дистанцией и временем.
- **Категории** — свои и готовые пресеты, тип (полезное / нейтральное / впустую),
  архивирование без потери истории.
- Тёмная и светлая тема, адаптив под телефон, горячие клавиши на десктопе.

## Стек

- **Frontend:** React 18, TypeScript, Vite, SCSS-модули, TanStack Query, Zustand, Recharts
- **Backend:** Django 5, DRF, SimpleJWT, PostgreSQL, drf-spectacular
- **Инфраструктура:** Docker Compose, Caddy, gunicorn, WhiteNoise

## Запуск

```bash
docker compose up --build
```

- приложение — http://localhost:5173
- API — http://localhost:8000/api
- Swagger — http://localhost:8000/api/docs/

Миграции применяются при старте. Админ:
`docker compose exec backend python manage.py createsuperuser`

<details>
<summary>Без Docker</summary>

Нужен PostgreSQL (можно поднять только его: `docker compose up db`).

```bash
cd backend
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python manage.py migrate
python manage.py runserver
```

```bash
cd frontend
npm install
npm run dev
```

Vite проксирует `/api` на `localhost:8000`.
</details>

## Деплой

**VPS.** `docker-compose.prod.yml` поднимает Postgres, бэкенд на gunicorn и Caddy, который
раздаёт собранный фронт, проксирует `/api` и сам выпускает HTTPS-сертификат.

```bash
cp .env.prod.example .env.prod   # домен, SECRET_KEY, пароль БД
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

**Бесплатно: Render + Vercel + Neon.**

1. Neon — создать базу, взять connection string.
2. Render — New → Blueprint из этого репозитория (`render.yaml`), указать `DATABASE_URL`.
3. Vercel — импорт репозитория, Root Directory `frontend`,
   `VITE_API_BASE=https://<render-app>.onrender.com/api`.
4. На Render прописать домен Vercel в `CORS_ALLOWED_ORIGINS` и `CSRF_TRUSTED_ORIGINS`.

Оба сервиса пересобираются сами при пуше в `main`. Бесплатный Render засыпает после
15 минут простоя, первый запрос после этого идёт около минуты.

## Структура

```
backend/
  apps/          accounts, categories, entries, stats, workouts
  config/        настройки Django, урлы
frontend/src/
  api/           axios-клиент и хуки React Query
  components/    общие компоненты (layout, графики, строки интервалов)
  pages/         День, Статистика, Тренировки, Категории, вход
  store/         Zustand: авторизация, тема
  styles/        токены и глобальные стили
deploy/          Caddy и Dockerfile для прод-сборки фронта
```

## Проверки

```bash
cd frontend
npm run lint         # ESLint
npm run lint:style   # stylelint
npm run build        # tsc + сборка
```
