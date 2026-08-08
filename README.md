# English Learner Project

Multi-platform English learning application.

## Structure

```
src/
├── web/        ← Web frontend (Vue 3 + Vite)
├── desktop/    ← Tauri desktop shell
└── server/     ← Backend API service

shared/
├── assets/     ← Shared images, icons
└── docs/       ← Project documentation
```

## Development

**Web:**
```bash
cd src/web
npm install
npm run dev
```

**Desktop:**
```bash
cd src/desktop
npm install
npm run tauri dev
```

**Server:**
```bash
cd src/server
npm install
npm run dev
```

## Build

**Web production:**
```bash
cd src/web
npm run build
```

**Desktop production:**
```bash
cd src/desktop
npm run tauri build
```
