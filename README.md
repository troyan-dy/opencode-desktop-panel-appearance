# opencode-desktop-panel-appearance

VS Code file icons, explorer colors and adjustable navigation text in OpenCode Desktop.

## Install in OpenCode Desktop

From the global OpenCode configuration directory (normally `~/.config/opencode`), run:

```sh
git clone https://github.com/troyan-dy/opencode-desktop-panel-appearance.git local-themes/panel-appearance
```

Add the following entries to the existing `plugins` array in your global `opencode.jsonc`:

```jsonc
{
  "plugins": [
    "./local-themes/panel-appearance"
  ]
}
```

## Usage

The prebuilt GUI includes [VSCode Great Icons](https://github.com/EmmanuelBeziat/vscode-great-icons) and colors from [One Dark Pro](https://github.com/Binaryify/OneDark-Pro). Their license notices are in `third-party/`. The server part uses `git check-ignore` for ignored-file decorations; Git must be on PATH for this feature.

### Rebuild the GUI (optional)

The checked-in bundle is ready to use. To rebuild it, install the VS Code extensions `emmanuelbeziat.vscode-great-icons` and `zhuangtongfa.material-theme` under `~/.vscode/extensions`, then run `node build.cjs` from this repository. The published bundle was checked against versions 2.1.121 and 3.20.7 respectively.

This plugin uses the [experimental OpenCode Desktop GUI plugin API](https://opencode.ai/docs/build/plugins/gui).
