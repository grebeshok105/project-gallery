# Project Gallery

Личная десктоп-галерея проектов на **Rust + Tauri 2 + React/TypeScript**.
Сделана под одного пользователя, всё хранится локально, инсталлятор — под Windows.

## Что умеет

- **Галерея проектов** — карточки с обложкой, статусом, тегами, языком, ссылками. Поиск, фильтры по статусу/тегу, сортировка, избранное.
- **Ручное добавление** + **импорт из GitHub** (репозитории `grebeshok105`: язык, звёзды, описание, топики → теги, дата последнего коммита). Дедупликация по `github_id`.
- **Система достижений** — авто-ачивки (число проектов, завершённые, языки, звёзды, избранное, импорт) с прогресс-барами + личные цели, которые ты заводишь и отмечаешь сам. Всплывающие уведомления при разблокировке.
- **AI-ассистент** — чат и кнопки «идеи / описание / теги» по конкретному проекту. Работает с любым **OpenAI-совместимым** API (OpenAI, OpenRouter, Together, локальный Ollama/LM Studio в OpenAI-режиме). Провайдера и модель задаёшь в настройках.
- **Безопасность** — API-ключ LLM и GitHub-токен лежат в **Windows Credential Manager**, не в базе. Остальное — в локальной SQLite.

## Стек

| Слой | Технология |
|------|-----------|
| Оболочка | Tauri 2 (Rust) |
| Фронтенд | React 18 + TypeScript + Vite |
| Стили | Tailwind CSS, framer-motion, lucide-react |
| Состояние | zustand |
| БД | SQLite (`rusqlite`, bundled) |
| HTTP | `reqwest` (GitHub + LLM) |
| Секреты | `keyring` → Windows Credential Manager |

## Требования (на Windows)

1. **Node.js** 18+ — https://nodejs.org
2. **Rust** (stable) — https://rustup.rs
3. **Microsoft C++ Build Tools** + **WebView2** (на Win11 уже есть). Build Tools: «Desktop development with C++».

## Запуск в режиме разработки

```bash
cd project-gallery
npm install
npm run tauri dev
```

Первая сборка Rust долгая (несколько минут) — это нормально.

## Сборка инсталлятора (.exe / .msi)

```bash
# один раз сгенерировать иконки
npm run tauri icon src-tauri/icons/app-icon.svg

# собрать релиз
npm run tauri build
```

Готовые установщики появятся в:

```
src-tauri/target/release/bundle/nsis/   ← Project Gallery_0.1.0_x64-setup.exe
src-tauri/target/release/bundle/msi/    ← Project Gallery_0.1.0_x64_en-US.msi
```

NSIS-инсталлятор ставится для текущего пользователя (`installMode: currentUser`), без прав администратора.

## Первый запуск

1. Открой **Настройки**.
2. GitHub: имя пользователя (по умолчанию `grebeshok105`), при желании — personal access token.
3. LLM: base URL, модель, API-ключ — когда определишься с провайдером.
4. На вкладке **Галерея** жми «Импорт GitHub» или «Новый проект».

## Структура

```
project-gallery/
├── src/                  # React-фронтенд
│   ├── views/            # экраны: галерея, достижения, ассистент, настройки
│   ├── components/       # карточки, диалоги, сайдбар, тосты
│   └── lib/              # api-обёртки, типы, store, утилиты
└── src-tauri/            # Rust-бэкенд
    ├── migrations/       # SQL-схема
    └── src/
        ├── db.rs         # SQLite + CRUD
        ├── achievements.rs  # движок достижений
        ├── github.rs     # импорт репозиториев
        ├── llm.rs        # OpenAI-совместимый клиент
        ├── secrets.rs    # Credential Manager
        └── commands.rs   # Tauri-команды
```

## Где лежат данные

```
%APPDATA%\com.grebeshok105.projectgallery\gallery.db
```

Секреты — в Windows Credential Manager (service `com.grebeshok105.projectgallery`).
