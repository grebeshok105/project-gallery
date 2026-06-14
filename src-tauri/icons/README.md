# Иконки

Tauri требует набор иконок (`32x32.png`, `128x128.png`, `128x128@2x.png`, `icon.ico`,
а под Windows ещё `.ico`) до сборки. В репозитории лежит исходник `app-icon.svg`.

Сгенерируй полный набор одной командой из корня проекта:

```bash
# из app-icon.svg (или любого квадратного PNG ≥ 512×512)
npm run tauri icon src-tauri/icons/app-icon.svg
```

Команда сама положит все нужные форматы в `src-tauri/icons/`.
Если хочешь свой логотип — подставь свой PNG/SVG вместо `app-icon.svg`.
