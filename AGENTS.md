# Agent Guidelines

## Commands
- **Build**: `npm run build`
- **Test**: `npm test` (Runs Vitest via Angular CLI)
  - Single Test: `npx vitest run src/app/path/to/file.spec.ts`
- **Format**: `npx prettier --write .` (Configuration in `package.json`)

## Code Style & Conventions
- **Framework**: Angular (NgModule-based, not Standalone). adhere to `src/app/app-module.ts`.
- **Naming**: `kebab-case` for files/selectors, `PascalCase` for classes, `camelCase` for variables.
- **Types**: Strict TypeScript. Define interfaces in `src/app/core/models/`. Avoid `any`.
- **Architecture**: Logic in Services (`src/app/core/services/`), UI in Components (`src/app/features/`).
- **Modules**: Core (singletons), Shared (common), Features (components with modules).
- **Async**: manage RxJS subscriptions via `new Subscription()` and `add()`/`unsubscribe()`.
- **Imports**: standard Angular imports; clean unused imports.
- **Formatting**: Prettier with 100 char line width, single quotes.
- **Persistence**: Uses LocalStorage (see `contraction.service.ts`).
- **Paths**: Use absolute paths for file operations.
- **Error Handling**: Try-catch with user-friendly messages via alerts.

## Environment
- **Local**: `environment.localMode` flag available.
- **PWA**: Service Worker enabled. Respect `ngsw-config.json`.
