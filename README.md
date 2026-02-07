# Laburen AI Sales Agent - Challenge Técnico

> Agente de IA que vende productos por WhatsApp usando MCP, Cloudflare Workers y Chatwoot

## 📋 Descripción

Este proyecto implementa un agente de IA conversacional capaz de:

- Listar productos disponibles
- Mostrar detalles de productos
- Crear y gestionar carritos de compra
- Integración con WhatsApp vía Chatwoot
- Comunicación mediante Model Context Protocol (MCP)

## 🛠️ Stack Tecnológico

- **Runtime**: Cloudflare Workers (TypeScript)
- **Base de Datos**: Cloudflare D1 (SQLite)
- **Protocolo**: MCP (Model Context Protocol)
- **CRM**: Chatwoot
- **Deployment**: Wrangler CLI

## 📁 Estructura del Proyecto

```
laburen-challenge/
├── src/                          # Código del MCP Server (Cloudflare Worker)
│   ├── index.ts                  # Entry point del Worker + definición de tools
│   ├── types.ts                  # Tipos TypeScript (Env, MCPRequest, etc.)
│   ├── utils/
│   │   └── response.ts           # Helpers para respuestas HTTP y MCP
│   ├── db/
│   │   ├── schema.sql            # Esquema de la base de datos
│   │   └── seed.sql              # Datos de productos importados
│   └── README.md                 # Documentación del Worker
├── scripts/
│   └── seed-products.js          # Script para importar productos desde XLSX
├── docs/                         # Documentación conceptual
│   ├── flujo-agente.md           # Diagramas de flujo e interacción
│   ├── especificacion-mcp.md    # Documento conceptual del MCP
│   └── specs-mcp-tools.md        # Especificaciones técnicas detalladas
├── wrangler.toml                 # Configuración de Cloudflare Worker
├── package.json
└── README.md
```

## ⚙️ Configuración Inicial

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

```bash
# Copiar template de variables
cp .env.example .dev.vars

# Crear base de datos D1
wrangler d1 create laburen-challenge-db

# Copiar el database_id generado a wrangler.toml
```

### 3. Inicializar base de datos

```bash
npm run db:init
```

Para más detalles sobre configuración de secrets y variables de entorno, ver [SECRETS.md](SECRETS.md).

## 🚀 Comandos

```bash
# Desarrollo local
npm run dev

# Deploy a Cloudflare
npm run deploy

# Ejecutar queries en D1
npm run db:query -- --command "SELECT * FROM products"
```

## 📝 Documentación

Ver carpeta `/docs` para diagramas de flujo y especificaciones técnicas.

## 🔗 Enlaces

- [Panel de Laburen](https://dashboard.laburen.com/)
- [Chatwoot Instance](https://chatwootchallenge.laburen.com/)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [MCP Specification](https://modelcontextprotocol.io/)

## 👤 Autor

Ariel - Challenge Técnico AI Engineer
