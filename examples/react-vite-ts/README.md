# shiplet-example-react-vite-ts

> Shiplet example — **React 18 + TypeScript + SWC** via **Vite 5**, running on **Docker** with Redis and pnpm.

## Stack

| Service   | Image          | Port | Purpose               |
| --------- | -------------- | ---- | --------------------- |
| **app**   | node:22-slim   | 5173 | Vite dev server + HMR |
| **redis** | redis:7-alpine | 6379 | Cache / state store   |

## Quick Start

```bash
# Requires Docker Desktop or Docker Engine + Compose plugin
shiplet up -d
shiplet pnpm install
# Vite dev server starts automatically via compose command:
# → http://localhost:5173
```

## Key Docker/Vite settings

The `vite.config.ts` in this example includes the settings required for HMR inside Docker:

```ts
server: {
  host: '0.0.0.0',       // listen on all container interfaces
  port: 5173,
  hmr: {
    host: 'localhost',   // browser connects to localhost (the host machine)
    port: 5173,
  },
  watch: {
    usePolling: true,    // needed when files are in Docker volumes on some OSes
    interval: 300,
  },
}
```

Without `host: '0.0.0.0'`, the dev server only listens on the container's loopback and is unreachable from your browser.

Without `usePolling: true`, file changes may not be detected on Linux hosts with certain filesystem configurations.

## Useful Commands

```bash
shiplet up -d                  # Start everything
shiplet pnpm install           # Install deps inside the container
shiplet pnpm run build         # Production build
shiplet pnpm run lint          # Run ESLint

shiplet logs -f app            # Follow Vite dev server output
shiplet shell                  # Open a shell in the container
shiplet db redis               # Open redis-cli
shiplet health                 # Live container health dashboard
shiplet dashboard              # Web UI → http://localhost:6171
```

## Switching to a Different Package Manager

Change `packageManager` in `shiplet.config.json` and update the `shiplet.yml` `command:` field:

```yaml
# In shiplet.yml:
command: npm run dev         # npm
command: yarn dev            # yarn
command: pnpm run dev        # pnpm
command: bun run dev         # bun
```

## Production Build

```bash
shiplet pnpm run build
# Output is in ./dist — serve with any static host or nginx
```

## Other Vite Templates

You can use `shiplet init` with any Vite template:

```bash
shiplet init --language vite
# → select vue-ts, svelte-ts, solid-ts, astro, etc.
```
