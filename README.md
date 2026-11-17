# Keitaro Wrapper — Full-Stack Campaign & Stream Studio (EN / RU)

An executive-grade Full-Stack web application wrapping the **Keitaro Admin API v1** (`https://tlgk.host/admin_api/v1`) with **FastAPI**, **SQLAlchemy 2.0**, **Alembic**, **PostgreSQL**, and **React 18 + Vite + Tailwind CSS + Lucide Icons**.

---

## 🇬🇧 English Documentation

### 1. Key Features & Business Logic

#### Part 1 — Campaign Creator ("Создаватор кампаний")
- **Auto-Prefixed Campaign Name**: Automatically prefixes every new campaign name with `test_pandey_` (with a live preview badge in the UI).
- **Multi/Single Geo Selector**: Supports quick-select country pills (`AU`, `MX`, `RO`, `US`, `IN`, `PE`, `CL`, `DE`, `BR`, `KZ`) as well as custom ISO country code entry.
- **Debounced Offer Autocomplete**: Searches live Keitaro offers (`GET /api/offers?search=...`) by Offer ID, Offer Name, or Group.
- **Automated 2-Stream Provisioning**:
  - Resolves default Domain (`https://in.posdk.xyz/` or active server domain), Group (`FORTESTS`), and Traffic Source (`FORTESTS`) from Keitaro.
  - Creates the campaign via `POST /campaigns` and immediately creates two streams via `POST /streams`:
    1. **Flow 1 (Geo Redirect)**: Filters traffic matching the chosen `Geo` country code(s) and redirects via HTTP to `https://google.com` (`schema="redirect"`, `action_type="http"`, `action_payload="https://google.com"`).
    2. **Flow 2 (Offer Flow)**: Sends all remaining traffic to the selected Offer at `100%` weight (`schema="landings"`, `offers=[{"offer_id": id, "share": 100, "state": "active"}]`).
  - Persists the campaign, streams, and initial offer state in PostgreSQL and shows a toast with a 1-click **"Open in Campaign Editor →"** button.

#### Part 2 — Existing Campaign Editor ("Редактор существующей кампании")
- **Fetch Streams (`GET /campaigns/{id}/streams`)**:
  - **Streams without offers** (such as Flow 1 -> Google) are rendered as a compact card showing only the stream title and the badge `"Redirect / No Offers (Ignored)"` — redirect URLs and filters are never parsed or shown.
  - **Streams with offers** display a multi-segment traffic split bar, individual animated percentage bars, weight badges, Pin locks, and Remove / Bring Back controls.
  - **Direct Keitaro Deletion Sync Rule**: If an offer existed in our local `stream_offers` table for that stream, but was deleted directly inside Keitaro's admin UI before clicking `Fetch Streams`, it is **never deleted** from our PostgreSQL database. Instead, it is marked `status='removed'`, `share=0`, `published_status='removed'`, `published_share=0` so it appears greyed-out with a **Bring Back** button.
- **Add / Remove / Bring Back / Pin Weight**:
  - **Add Offer**: Adds a new offer (`status='active'`, `is_published=False`), recalculates weights, and highlights the stream card in **Amber/Yellow** (`is_dirty=True`).
  - **Remove Offer**: Marks the offer `status='removed'`, `share=0`, `is_pinned=False`. The row turns **Greyed Out** with `0%` weight and a **Bring Back** button; the stream card turns **Amber/Yellow** (`is_dirty=True`).
  - **Bring Back**: Restores a `'removed'` offer to `'active'`, recalculates weights, and marks the stream **Amber/Yellow** (`is_dirty=True`).
  - **Pin Weight (Lock Icon + Slider/Input)**: Locks an active offer at a specific percentage (e.g. `25%`). All Add / Remove / Bring Back actions keep pinned offers locked at their exact `%` and split `(100 - sum_of_pinned)%` evenly across unpinned active offers so total active shares always equal `100%`.
- **Push to Keitaro (`PUT /streams/{keitaro_id}`)**:
  - Sends **only** `'active'` offers and their shares to Keitaro.
  - Removed offers disappear from Keitaro, but remain stored in PostgreSQL as greyed-out `'removed'` rows so **Bring Back** remains available at any time.
  - Updates `published_*` snapshot columns and resets the stream card to **White / Synced** (`is_dirty=False`).
- **Cancel**:
  - Deletes unpublished newly added offers (`is_published=False`), restores `share`, `status`, and `is_pinned` from `published_*` columns, and resets the stream card to **White / Synced** (`is_dirty=False`).

---

### 2. Tech Stack & Database Schema

- **Backend**: Python 3.11+, FastAPI, SQLAlchemy 2.0, Alembic, Psycopg2, HTTPX
- **Database**: PostgreSQL 15+ (`keitaro_wrapper`)
  - `campaigns`: `id`, `keitaro_id` (unique int), `name`, `alias`, `geo`, `created_at`
  - `streams`: `id`, `keitaro_id` (unique int), `campaign_id` (FK), `name`, `schema`, `type`, `has_offers` (bool), `is_dirty` (bool)
  - `stream_offers`: `id`, `stream_id` (FK), `offer_id` (int), `offer_name` (str), `share` (int), `is_pinned` (bool), `status` (`'active' | 'removed'`), `is_published` (bool), `published_share` (int, nullable), `published_status` (str, nullable), `published_is_pinned` (bool)
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Instant `EN / RU` i18n Context

---

### 3. Step-by-Step Setup & Launch Instructions (EN)

#### Step 1: Start PostgreSQL via Docker Compose
```bash
docker compose up -d
```

#### Step 2: Create Python Virtual Environment & Install Dependencies
```powershell
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
```

#### Step 3: Initialize Database & Run Alembic Migrations
Run `init_db.py`, which automatically creates the `keitaro_wrapper` database if it does not exist yet and executes `alembic upgrade head`:
```powershell
.\.venv\Scripts\python init_db.py
```
*(Or run Alembic directly: `.\.venv\Scripts\alembic upgrade head`)*

#### Step 4: Start the FastAPI Backend Server
```powershell
.\.venv\Scripts\uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- API Docs (Swagger UI): `http://localhost:8000/docs`

#### Step 5: Install & Start the React/Vite Frontend
In a second terminal:
```powershell
cd frontend
npm install
npm run dev
```
- Open the app in your browser: `http://localhost:5173`

---

## 🇷🇺 Документация на русском языке

### 1. Описание функционала и бизнес-логики

#### Часть 1 — Создаватор кампаний (Campaign Creator)
- **Авто-префикс имени кампании**: Автоматически добавляет префикс `test_pandey_` к названию создаваемой кампании (с живым предпросмотром итогового имени).
- **Выбор Гео (ISO-коды стран)**: Быстрый выбор стран кнопками (`AU`, `MX`, `RO`, `US`, `IN`, `PE`, `CL`, `DE`, `BR`, `KZ`) или ручной ввод одного/нескольких ISO-кодов.
- **Автодополнение офферов**: Удобный поиск офферов из Keitaro (`GET /api/offers?search=...`) по ID или названию с debounce-задержкой.
- **Автоматическое создание кампании и 2 потоков**:
  - Получает из Keitaro дефолтный домен (`https://in.posdk.xyz/` или активный домен сервера), группу (`FORTESTS`) и источник трафика (`FORTESTS`).
  - Создаёт кампанию (`POST /campaigns`) и 2 потока (`POST /streams`):
    1. **Поток 1 (Гео-редирект)**: Фильтрует пользователей по указанному `Geo` и перенаправляет их на `https://google.com` (`schema="redirect"`, `action_type="http"`, `action_payload="https://google.com"`).
    2. **Поток 2 (Поток оффера)**: Направляет весь остальной трафик на выбранный оффер со 100% весом (`schema="landings"`, `offers=[{"offer_id": id, "share": 100, "state": "active"}]`).
  - Сохраняет данные в PostgreSQL и показывает уведомление с кнопкой перехода в Редактор кампании в 1 клик.

#### Часть 2 — Редактор существующей кампании (Campaign Editor)
- **Выбор кампании + кнопка «Загрузить потоки» (`Fetch Streams`)**:
  - Загружает актуальные потоки из Keitaro (`GET /campaigns/{id}/streams`).
  - **Потоки без офферов** (например, Поток 1 -> Google) отображаются как компактная плашка только с названием потока и бейджем `«Редирект / Без офферов (Игнорируется)»` — URL редиректа и фильтры не парсятся и не отображаются.
  - **Потоки с офферами** отображают все офферы, визуальные шкалы распределения трафика, кнопки закрепления веса (`Pin`) и кнопки `Удалить` / `Вернуть`.
  - **Правило синхронизации при прямом удалении в Keitaro**: Если оффер существовал в нашей локальной таблице `stream_offers`, но был удалён напрямую в админке Keitaro перед нажатием `Загрузить потоки`, он **не удаляется** из нашей БД, а получает статус `status='removed'`, `share=0`, `published_status='removed'`, `published_share=0` и отображается серым со 100% рабочей кнопкой **«Вернуть» (`Bring Back`)**.
- **Добавление / Удаление / Возврат офферов и Закрепление весов (`Pin`)**:
  - **Добавить оффер**: Добавляет оффер в поток (`status='active'`, `is_published=False`), пересчитывает веса и окрашивает карточку потока в **жёлтый цвет** (`is_dirty=True`).
  - **Удалить оффер**: Переводит оффер в `status='removed'`, `share=0`, `is_pinned=False`. Строка оффера становится **серой** (`0%`) с кнопкой **«Вернуть»**, а карточка потока становится **жёлтой** (`is_dirty=True`).
  - **Вернуть оффер (`Bring Back`)**: Возвращает удалённый оффер обратно в `'active'`, пересчитывает доли трафика и помечает поток **жёлтым** (`is_dirty=True`).
  - **Закрепить вес (`Pin`)**: Позволяет зафиксировать за активным оффером точный процент (например, `25%`) с помощью иконки замка, ползунка или поля ввода. При любых операциях добавления/удаления/возврата закреплённые офферы сохраняют свой точный `%`, а остаток `(100 - сумма_закрепленных)%` делится поровну между незакреплёнными активными офферами (сумма активных долей всегда равна `100%`).
- **Push в Keitaro (`Push to Keitaro`)**:
  - Отправляет `PUT /streams/{keitaro_id}` в Keitaro **только** с активными (`'active'`) офферами и их весами.
  - Удалённые офферы исчезают из Keitaro, но остаются в нашей PostgreSQL базе как серые строки со статусом `'removed'`, поэтому их можно вернуть кнопкой **«Вернуть»** в любой момент.
  - Обновляет `published_*` поля и возвращает карточку потока в **белый (синхронизированный)** вид (`is_dirty=False`).
- **Отмена (`Cancel`)**:
  - Удаляет новые неопубликованные офферы (`is_published=False`), восстанавливает `share`, `status` и `is_pinned` из `published_*` колонок и возвращает карточку потока в **белое** состояние (`is_dirty=False`).

---

### 2. Пошаговая инструкция по запуску (RU)

#### Шаг 1: Запуск PostgreSQL в Docker
```bash
docker compose up -d
```

#### Шаг 2: Создание виртуального окружения и установка зависимостей
```powershell
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
```

#### Шаг 3: Инициализация БД и применение миграций Alembic
Запустите скрипт `init_db.py`, который автоматически создаст базу данных `keitaro_wrapper` (если её ещё нет) и выполнит `alembic upgrade head`:
```powershell
.\.venv\Scripts\python init_db.py
```

#### Шаг 4: Запуск бэкенда (FastAPI)
```powershell
.\.venv\Scripts\uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Шаг 5: Запуск фронтенда (React + Vite)
Во втором терминале:
```powershell
cd frontend
npm install
npm run dev
```
Откройте приложение в браузере по адресу: `http://localhost:5173`
