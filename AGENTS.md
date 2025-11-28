# Agent Guidelines

## Commands
- **Build**: `npm run build`
- **Test**: `npm test` (Runs Vitest via Angular CLI)
  - Single Test: `npx vitest run src/app/path/to/file.spec.ts`
- **Format**: `npx prettier --write .` (Configuration in `package.json`)

## Code Style & Conventions
- **Framework**: Angular (NgModule-based, not Standalone). adhere to `src/app/app-module.ts`.
- **Naming**: `kebab-case` for files/selectors, `PascalCase` for classes, `camelCase` for variables.
- **Types**: Strict TypeScript. Define interfaces in `src/app/models/`. Avoid `any`.
- **Architecture**: Logic in Services (`src/app/services/`), UI in Components.
- **Async**: manage RxJS subscriptions via `new Subscription()` and `add()`/`unsubscribe()`.
- **Imports**: standard Angular imports; clean unused imports.
- **Persistence**: Uses LocalStorage (see `contraction.service.ts`).
- **Paths**: Use absolute paths for file operations.

## Environment
- **Local**: `environment.localMode` flag available.
- **PWA**: Service Worker enabled. Respect `ngsw-config.json`.
