# Repository Guidelines

## Project Structure & Module Organization

Finly is a dependency-free, browser-based financial dashboard. `index.html` is the entry point, while `pages/` contains the individual Portuguese-language screens such as `dashboard.html`, `receitas.html`, and `metas.html`. Keep JavaScript grouped by responsibility under `src/js/` (`auth/`, `core/`, `dashboard/`, `finance/`, `profile/`, `services/`, and `ui/`). Styles live in `src/css/`: shared foundations are in `base/`, reusable rules in `components/`, and screen-specific rules in `pages/`; `style.css` imports them all. Store images in `src/assets/`. `docs/` and `database/schema.sql` are currently placeholders and should be updated when those areas become active.

## Build, Test, and Development Commands

No package manager or build step is configured. Serve the repository instead of opening files directly so relative paths behave consistently:

```sh
python3 -m http.server 8000
```

Then visit `http://localhost:8000`. Before submitting changes, run `git diff --check` to catch whitespace errors. There are currently no automated lint or test commands.

## Coding Style & Naming Conventions

Match the existing four-space indentation in HTML, CSS, and JavaScript. Use semicolons and double-quoted JavaScript strings. Prefer `const`, use `let` only for reassignment, write variables/functions in `camelCase`, and constants in `UPPER_SNAKE_CASE`. Existing scripts use browser-safe IIFEs; avoid introducing globals unless they are an intentional shared API. Name feature files in lowercase Portuguese (`parcelamentos.js`) and CSS classes in kebab-case with BEM-like elements where useful (`index-loader__title`). Reuse tokens from `src/css/base/variables.css` instead of duplicating colors, spacing, radii, or shadows. Keep user-facing copy in Brazilian Portuguese. Because scripts are loaded directly by HTML, place shared/core scripts before dependent feature scripts.

## Testing Guidelines

Verification is manual today. Test the changed page through the local server, check the browser console, reload to confirm `localStorage` persistence, and verify both light/dark themes plus mobile and desktop layouts. For finance changes, exercise create, edit, filter, and delete flows. If automated tests are introduced, place them under `tests/`, mirror the source area, and use `*.test.js`.

## Commit & Pull Request Guidelines

History uses short Portuguese summaries without Conventional Commit prefixes. Keep messages specific and action-oriented, for example `Corrige cálculo de parcelas`. Pull requests should explain the purpose and affected pages/modules, link an issue when applicable, list manual verification steps, and include before/after screenshots for visual changes. Never commit credentials, real financial data, or editor/OS artifacts; browser storage is not a secrets store.

## Regras específicas do Finly

- Não apagar, substituir ou quebrar funcionalidades que já funcionam.
- Trabalhar apenas um arquivo por vez, salvo quando eu autorizar.
- Sempre informar o caminho exato do arquivo alterado.
- Não criar arquivos, funções, estilos ou componentes duplicados.
- Utilizar corretamente os arquivos vazios já existentes.
- Preservar o FinlyStorage e os dados salvos no localStorage.
- Não instalar dependências ou frameworks sem minha autorização.
- Não fazer commit, push ou criar branches sem minha autorização.
- Manter o sistema responsivo nos temas claro e escuro.
- Depois de cada alteração, explicar o que mudou e como testar.