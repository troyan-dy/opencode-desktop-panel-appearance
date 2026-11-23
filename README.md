# opencode-desktop-panel-appearance

## Установка через агента

Скопируйте в чат агента:

```text
Установи https://github.com/troyan-dy/opencode-desktop-panel-appearance для OpenCode Desktop по инструкции в README. Подключи плагин глобально, сохрани текущие настройки и не дублируй запись, если он уже подключён.
```

Из терминала ту же задачу можно передать агенту OpenCode:

```sh
opencode run "Установи https://github.com/troyan-dy/opencode-desktop-panel-appearance для OpenCode Desktop по инструкции в README. Подключи плагин глобально, сохрани текущие настройки и не дублируй запись, если он уже подключён."
```

---

VS Code file icons, explorer colors and adjustable navigation text in OpenCode Desktop.

From your global OpenCode configuration directory (normally `~/.config/opencode`):

```sh
git clone https://github.com/troyan-dy/opencode-desktop-panel-appearance.git local-themes/panel-appearance
```

Add `"./local-themes/panel-appearance"` to the `plugins` array in the global `opencode.jsonc`.
