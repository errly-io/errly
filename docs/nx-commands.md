# Nx Commands Configuration

## 🔧 **Problem**
In Nx 21+ executors for Next.js have changed. The `@nx/next:dev` executor was removed.

## ✅ **Solution**
Use `nx:run-commands` to run Next.js commands directly.

## 📋 **Available commands**

### **Through pnpm:**
```bash
pnpm run dev          # Run in development mode
pnpm run build        # Build for production
pnpm run serve        # Run in development mode (alias for dev)
pnpm run start        # Run production build
pnpm run lint         # Code linting
```

### **Through nx directly:**
```bash
pnpm exec nx run web:dev      # Run in development mode
pnpm exec nx run web:build    # Build for production
pnpm exec nx run web:serve    # Run in development mode
pnpm exec nx run web:start    # Run production build
pnpm exec nx run web:lint     # Code linting
```

## 🔧 **Configuration**

### **web/project.json:**
```json
{
  "targets": {
    "dev": {
      "executor": "nx:run-commands",
      "options": {
        "command": "next dev --port=3000",
        "cwd": "{projectRoot}"
      }
    },
    "build": {
      "executor": "@nx/next:build",
      "outputs": ["{projectRoot}/.next"],
      "options": {}
    },
    "serve": {
      "executor": "nx:run-commands",
      "options": {
        "command": "next dev --port=3000",
        "cwd": "{projectRoot}"
      }
    },
    "start": {
      "executor": "nx:run-commands",
      "options": {
        "command": "next start --port=3000",
        "cwd": "{projectRoot}"
      },
      "dependsOn": ["build"]
    },
    "lint": {
      "executor": "@nx/eslint:lint",
      "outputs": ["{options.outputFile}"],
      "options": {
        "lintFilePatterns": ["{projectRoot}/**/*.{ts,tsx,js,jsx}"]
      }
    }
  }
}
```

## 🚀 **Complete development workflow**

### **1. Start backend:**
```bash
pnpm run backend:start
```

### **2. Start frontend:**
```bash
pnpm run dev
```

### **3. Apply migrations:**
```bash
pnpm run db:migrate
```

### **4. Check status:**
```bash
pnpm run db:status
```

## 📝 **Notes**

- **Port 3000** - standard port for development
- **SVGR warnings** - can be ignored, this is a deprecated Nx feature
- **Nx Cloud warnings** - can be ignored for local development
- All commands work from the project root
