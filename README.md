# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.
You can also try [the experimental native React Compiler support in plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md#rust-react-compiler) by using `compiler: true` in the plugin options instead of using the Babel plugin.

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

## Location suggestions

Set `GROK_API_KEY` in `.env.local` and run `npm run dev`. The existing
`VITE_GROK_API_KEY` is also accepted server-side for compatibility; the UI does not
read it. `GROK_MODEL` defaults to `grok-4.6`. The model must support
web search together with structured JSON output.

Enter a city or neighborhood in the sidebar and select **Find 3 options**.
Switching Hotels, Attractions, or Food searches that category for the same location.
Results are cached in the browser for the session and on the server for 30 minutes
(up to 100 location/category searches). Identical pending searches share one Grok
request, including when a browser reconnects. Submitting the same location reuses
server results until they expire. The server cache resets when the server restarts.
Grok uses low reasoning effort and a brief web lookup to reduce search overhead.
Image search finds a photo of each specific place when available; photo URLs and
source links are cached with the suggestions and saved when a card is dropped.
Drag a result onto its canvas to save its name and address. Search does not assign
booking dates, prices, or unrelated placeholder photos.

`/api/suggestions` runs in the Vite development and preview servers. A static-only
deployment needs a server hosting this endpoint and the private Grok key.
See [xAI’s web search documentation](https://docs.x.ai/developers/tools/web-search).
