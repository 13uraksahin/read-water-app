import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url'; // 1. Bu satırı ekledik

// 2. ESM ortamında __dirname'i manuel tanımlıyoruz
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sunucu Tanımı
const server = new Server(
  {
    name: "read-water-frontend-context",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Proje Kök Dizini (app klasörü)
// Bu script 'app/scripts/mcp-server.ts' içinde çalışacak, bu yüzden bir üst dizine çıkıyoruz.
const APP_ROOT = path.resolve(__dirname, '..');

// Helper: Klasör içeriğini listele
function listDirectory(dirPath: string): string[] {
    try {
        const fullPath = path.join(APP_ROOT, dirPath);
        if (!fs.existsSync(fullPath)) return [`Directory not found: ${dirPath}`];
        return fs.readdirSync(fullPath).map(file => path.join(dirPath, file));
    } catch (e) {
        return [`Error reading directory: ${e}`];
    }
}

// Helper: Dosya Oku
function readFile(filePath: string): string {
    try {
        const fullPath = path.join(APP_ROOT, filePath);
        if (!fs.existsSync(fullPath)) return `Error: File not found at ${filePath}`;
        return fs.readFileSync(fullPath, 'utf-8');
    } catch (e) {
        return `Error reading file: ${e}`;
    }
}

// TOOL LİSTESİ
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_frontend_structure",
        description: "Lists the files in critical Nuxt directories (pages, components, stores, layouts). Use this to understand the project structure.",
        inputSchema: {
          type: "object",
          properties: {
             targetDir: { type: "string", description: "Specific directory to list (e.g., 'pages/meters')" }
          },
        },
      },
      {
        name: "read_frontend_file",
        description: "Reads the content of a specific file in the Frontend app (e.g., 'pages/index.vue', 'stores/auth.ts').",
        inputSchema: {
          type: "object",
          properties: {
            filePath: { type: "string", description: "Relative path from app root (e.g., 'pages/devices/index.vue')" }
          },
          required: ["filePath"]
        },
      }
    ],
  };
});

// TOOL MANTIĞI
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  
  if (request.params.name === "get_frontend_structure") {
    const target = request.params.arguments?.targetDir as string;
    
    if (target) {
        return { content: [{ type: "text", text: listDirectory(target).join('\n') }] };
    }

    const pages = listDirectory('pages');
    const components = listDirectory('components');
    const stores = listDirectory('stores');
    const layouts = listDirectory('layouts');

    const structure = `
=== PAGES ===
${pages.join('\n')}

=== STORES ===
${stores.join('\n')}

=== LAYOUTS ===
${layouts.join('\n')}

=== COMPONENTS (Root Level) ===
${components.slice(0, 10).join('\n')}... (and more)
    `;

    return { content: [{ type: "text", text: structure }] };
  }

  if (request.params.name === "read_frontend_file") {
    const filePath = request.params.arguments?.filePath as string;
    if (!filePath) throw new Error("filePath is required");

    return { content: [{ type: "text", text: readFile(filePath) }] };
  }

  throw new Error("Tool not found");
});

// Başlat
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error in Frontend MCP:", error);
  process.exit(1);
});
