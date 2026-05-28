# Project Guidelines

## Code Style
- JavaScript/JSX codebase (no TypeScript). Follow existing patterns in src/app and src/components.
- Prefer Tailwind utility classes and shadcn/ui components in src/components/ui.
- Use path aliases from jsconfig.json/components.json: @/ (src), @/components, @/lib, @/components/ui, @/hooks.

## Architecture
- Next.js App Router lives in src/app; root layout in src/app/layout.js.
- Firebase client setup is in src/lib/firebase.js; auth state flows through AuthProvider.
- Data model should be device-centric. See ../contextandupdate.md for the refactor goal and pitfalls.

## Build and Test
- npm run dev
- npm run build
- npm run start
- npm run lint

## Conventions
- Any code that touches Firebase or browser-only APIs must be in client components ("use client").
- Sensor reads should use devices/{deviceId} as the canonical source; user docs only store membership/device mapping.
