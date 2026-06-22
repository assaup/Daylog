# DayLog — трекер времени и личной эффективности

Веб-приложение, чтобы записывать, на что уходит день, и анализировать свою
продуктивность, сон и распределение времени. Mobile-first.

🔗 **Живой проект:** https://daylogapp.ru

- **Frontend:** React + TypeScript + Vite, SCSS-модули, Zustand, React Query, Recharts
- **Backend:** Django + DRF, JWT-аутентификация, PostgreSQL
- **Инфраструктура:** Docker Compose, в продакшене — Caddy (HTTPS) + gunicorn + WhiteNoise
- Подробности архитектуры — в [PLAN.md](./PLAN.md)

## Возможности

- Регистрация / вход (мультиюзер, JWT с авто-рефрешем токена).
- **Страница «День»** — ввод данных:
  - свободные интервалы времени с категорией и заметкой; новый интервал появляется
    автоматически, интервалы сортируются по времени;
  - подъём / отбой и расчёт сна (отбой прошлого дня → подъём сегодня);
  - автосохранение, валидация пересечений интервалов;
  - прошедшие дни — режим **только для чтения** с возможностью включить редактирование;
    будущие даты заблокированы.
- **Страница «Статистика»** — аналитика за **день / неделю / месяц / произвольный период**:
  - KPI: полезное и бесполезное время, индекс продуктивности, режим сна;
  - графики (круг, столбцы, тренд продуктивности, продуктивные часы дня, структура дней);
  - **цель** по полезному времени, календарь достижения и серия (streak);
  - фильтр-фокус по конкретной категории.
- **Категории:** базовые засеиваются при регистрации, плюс пресеты «в один тап»; свои
  категории (название, эмодзи-иконка, цвет, тип: полезное / нейтральное / впустую),
  редактирование с выбором «применить ко всем или только к новым записям»; мягкое
  удаление (архив) с восстановлением при пересоздании.
- **Светлая / тёмная тема**, адаптив (нижние табы на мобилке, навигация в шапке на десктопе),
  доступность (a11y), SEO (мета-теги, Open Graph, sitemap).

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

## Деплой на VPS (production)

Прод-конфигурация: бэкенд через **gunicorn** + **whitenoise**, фронт собирается и
раздаётся через **Caddy**, который также проксирует `/api` на бэкенд и автоматически
выпускает HTTPS-сертификат для домена.

Файлы: `docker-compose.prod.yml`, `deploy/web.Dockerfile`, `deploy/Caddyfile`,
`backend/entrypoint.prod.sh`, `.env.prod.example`.

### Шаги

1. **Арендуй VPS** (например Hetzner CX22 или DigitalOcean, Ubuntu 22.04+) и наведи
   свой домен `A`-записью на IP сервера.

2. **Установи Docker** на сервере:
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```

3. **Скопируй проект** на сервер (через `git clone` своего репозитория).

4. **Создай `.env.prod`** из примера и заполни реальными значениями
   (домен, длинный `SECRET_KEY`, надёжный пароль БД):
   ```bash
   cp .env.prod.example .env.prod
   nano .env.prod
   ```

5. **Открой порты** 80 и 443 в фаерволе сервера.

6. **Запусти:**
   ```bash
   docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
   ```
   Флаг `--env-file .env.prod` обязателен — из него подставляются `${DOMAIN}` и
   параметры БД в compose-файл.

7. Создай суперпользователя для админки:
   ```bash
   docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
   ```

Готово — открой `https://твой-домен`. Caddy сам получит сертификат Let's Encrypt.

> Локально прод-сборку можно проверить, поставив `DOMAIN=localhost` в `.env.prod`
> (тогда сайт поднимется на `http://localhost` без HTTPS).

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
        ├── api/           # axios (JWT-интерсепторы) + react-query хуки
        ├── components/    # Layout, IntervalRow, DayBounds, GoalCalendar, charts, Loader
        ├── pages/         # Day, Stats, Categories, Login/Register
        ├── store/         # zustand (auth, тема)
        ├── styles/        # глобальный scss + переменные (светлая/тёмная тема)
        └── utils/         # работа со временем и валидация интервалов
```
