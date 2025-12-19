// app/scripts/generate-llms-txt.ts
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const APP_ROOT = path.resolve(__dirname, '..');

const OUTPUT_FILE = path.join(APP_ROOT, 'public', 'llms.txt');

// AI'a projenin ne olduğunu anlatan ana metin
const HEADER = `
# Read Water - Frontend Architecture (Nuxt 4)

## Project Overview
This is the frontend application for the Read Water IoT platform.
- Framework: Nuxt 4 (Vue 3.5+)
- UI Library: Shadcn/UI + TailwindCSS
- State Management: Pinia
- Realtime: Socket.IO Client
- Map: Leaflet

## Key Directories
- /pages: Application routes (File-based routing)
- /components: Reusable Vue components (Auto-imported)
- /stores: Pinia state stores (Auth, Device, Meter, Dashboard)
- /layouts: Page layouts (Default, Auth)
- /composables: Shared logic (useApi, useAuth)

## Architecture Rules
1. Asset & Device Decoupling: Meters (Assets) and Devices (Inventory) are separate entities.
2. API Communication: All requests go through 'useApi' composable via Proxy.
3. Strict Typing: All DTOs must allow interfaces defined in /types.
`;

function listFiles(dir: string, extension: string): string[] {
  const fullPath = path.join(APP_ROOT, dir);
  if (!fs.existsSync(fullPath)) return [];
  
  return fs.readdirSync(fullPath, { recursive: true })
    .filter(file => file.toString().endsWith(extension))
    .map(file => `- ${path.join(dir, file.toString())}`);
}

function generate() {
  console.log('Generating public/llms.txt for AI Context...');

  const pages = listFiles('pages', '.vue');
  const components = listFiles('components', '.vue');
  const stores = listFiles('stores', '.ts');
  const composables = listFiles('composables', '.ts');
  const types = listFiles('types', '.ts');

  const content = `
${HEADER}

## Project Structure Map

### Pages (Routes)
${pages.join('\n')}

### Stores (State)
${stores.join('\n')}

### Composables (Logic)
${composables.join('\n')}

### Components (UI)
${components.slice(0, 50).join('\n')}
${components.length > 50 ? `... and ${components.length - 50} more components` : ''}

### Types & Interfaces
${types.join('\n')}

## Developer Guide for AI
- When fixing UI bugs, check 'pages' first, then 'components'.
- When fixing logic bugs, check 'stores' and 'composables'.
- Use 'useApi' for all backend calls. Do not use 'fetch' directly.
  `.trim();

  // Public klasörü yoksa oluştur
  if (!fs.existsSync(path.join(APP_ROOT, 'public'))) {
    fs.mkdirSync(path.join(APP_ROOT, 'public'));
  }

  fs.writeFileSync(OUTPUT_FILE, content);
  console.log(`✅ AI Context generated at: ${OUTPUT_FILE}`);
}

generate();
