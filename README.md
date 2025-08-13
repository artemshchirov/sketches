# sketches

This is a repository for my generative art sketches. I'm using TypeScript for all my works and various graphics libraries, such as [Pixi.js](https://pixijs.com/) and [Three.js](https://threejs.org/), along with the pure WebGL API. You can preview them on my Github Pages [website](https://codedpalette.github.io).

## Installation

I'm using [Pnpm](https://pnpm.io/) as a package manager. You can find installation instructions [here](https://pnpm.io/installation).

To install dependencies run

```bash
pnpm install
```

## Usage

### Development

Run a dev server with hot reload (will open in an Electron window)

```bash
pnpm dev
```

In order to switch to a different sketch, go to `<root>/index.ts` and update the following import at the start of a file

```typescript
import constructor from "path/to/sketch" // Update path here
```

### Production

Build a library bundle

```bash
pnpm build
```

Entry point is `<root>/lib.ts`. It exports all finished artworks along with a `Sketch` class for embedding sketches in pages

Documentation for the public API is available in the [`docs`](docs/README.md) directory.

## Directory structure

For educational purposes and for future reference I will outline below all top level files and folders in this
repository and what they are for.

- `.github/` - Contains [GitHub Actions](https://github.com/features/actions) descriptions for automatically deploying
  latest version of my sketches to [Github Pages](https://pages.github.com/) on every commit to `master` branch
- `.husky/` - [Husky](https://typicode.github.io/husky/) pre-commit hooks
- `.vscode/` - VSCode workspace settings and code snippets
- `assets/` - Static assets for sketches: images, fonts etc.
- `library/` - Code unrelated to any specific sketch: setup code, helper and utility functions, shared GLSL chunks.
- `public/` - CSS files for local development workflow
- `sketches/` - Actual artworks code grouped by year
- `typings/` - TypeScript [type declarations](https://www.typescriptlang.org/docs/handbook/2/type-declarations.html) for 3rd party libraries that don't provide them
- `.gitignore` - [gitignore](https://git-scm.com/docs/gitignore) file
- `.prettierrc` - [Prettier](https://prettier.io/) formatter configuration file
- `electron.js` - [Electron](https://www.electronjs.org/) runner, used for running sketches in dev mode
- `eslint.config.js` - [ESLint](https://eslint.org/) linter configuration file
- `index.html` - Main html file specifying TypeScript entry point and main CSS stylesheet
- `index.ts` - TypeScript entry point for [development workflow](#development)
- `lib.ts` - TypeScript entry point for [library mode](#production)
- `pnpm-lock.yaml` - Pnpm lockfile for consistent and reproducible builds
- `tsconfig.json` - Configuration file for TypeScript compiler, for more info see [here](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html)
- `vite.config.ts` - [Vite](https://vitejs.dev/) bundler configuration file
