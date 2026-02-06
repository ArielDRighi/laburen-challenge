# Laburen AI Sales Agent — MCP Server

## Stack

- Runtime: Cloudflare Workers (TypeScript)
- Database: Cloudflare D1 (SQLite)
- Protocol: MCP (Model Context Protocol)
- Deployment: Wrangler CLI

## Estructura del proyecto

src/
├── index.ts → Entry point del Worker, handler MCP
├── db/schema.sql → Esquema de la base de datos
├── tools/ → Cada tool MCP en su propio archivo
└── utils/ → Helpers compartidos (error handling, types)

## Comandos clave

- `wrangler dev` → Dev server local
- `wrangler deploy` → Deploy a Cloudflare
- `wrangler d1 execute laburen-challenge-db --command "SQL"` → Query a D1

## Reglas de negocio

- Un carrito por conversación (conversation_id único)
- Validar stock antes de agregar items al carrito
- qty = 0 en update_cart elimina el item
- Los tools deben retornar errores descriptivos, nunca explotar

## Convenciones

- TypeScript estricto
- Funciones async/await (no callbacks)
- Error handling con try/catch en cada tool
- Respuestas MCP con estructura consistente
