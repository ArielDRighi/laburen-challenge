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
├── src/                  # Código del MCP Server
│   ├── index.ts          # Entry point del Worker
│   ├── db/
│   │   └── schema.sql    # Esquema de la DB
│   ├── tools/            # Funciones/herramientas del MCP
│   └── utils/            # Utilidades compartidas
├── docs/                 # Documentación conceptual
├── wrangler.toml         # Config de Cloudflare Worker
├── package.json
└── README.md
```

## 🚀 Comandos

```bash
# Instalar dependencias
npm install

# Desarrollo local
npm run dev

# Deploy a Cloudflare
npm run deploy

# Ejecutar queries en D1
wrangler d1 execute laburen-challenge-db --command "SELECT * FROM products"
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
