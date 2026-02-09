# Laburen AI Sales Agent - Challenge Técnico

> Agente de IA que vende productos por WhatsApp usando MCP, Cloudflare Workers y Chatwoot

## 📋 Descripción

Este proyecto implementa un agente de IA conversacional capaz de:

- Listar productos disponibles
- Mostrar detalles de productos
- Crear y gestionar carritos de compra
- Aplicar etiquetas CRM a conversaciones en Chatwoot
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
│   ├── index.ts                  # Entry point del Worker + routing MCP
│   ├── types.ts                  # Tipos TypeScript (Env, MCPRequest, etc.)
│   ├── tools/                    # Implementación de herramientas MCP
│   │   ├── list-products.ts      # Tool para buscar productos
│   │   ├── get-product.ts        # Tool para obtener detalles de producto
│   │   ├── create-cart.ts        # Tool para crear/actualizar carritos
│   │   ├── update-cart.ts        # Tool para modificar/eliminar items
│   │   └── apply-labels.ts      # Tool para aplicar etiquetas CRM en Chatwoot
│   ├── utils/
│   │   ├── response.ts           # Helpers para respuestas HTTP y MCP
│   │   └── pricing.ts            # Lógica de precios por volumen
│   └── db/
│       ├── schema.sql            # Esquema de la base de datos
│       └── seed.sql              # 100 productos importados desde XLSX
├── scripts/
│   └── seed-products.js          # Script para importar productos desde XLSX
├── docs/                         # Documentación conceptual
│   ├── flujo-agente.md           # Diagrama de flujo e interacción del agente
│   ├── especificacion-mcp.md     # Documento conceptual del MCP Server
│   ├── specs-mcp-tools.md        # Especificaciones técnicas de cada tool
│   └── error-handling.md          # Documentación del sistema de errores
├── wrangler.toml                 # Configuración de Cloudflare Worker
├── .env.example                  # Template de variables de entorno
├── package.json
└── README.md
```

## ⚠️ Notas Técnicas

### Pricing de Productos

Durante la implementación detecté que **algunos productos en los datos provistos tienen precios con lógica inconsistente** entre los tiers de volumen. Por ejemplo:

- **Producto ID 55** (Camisa L Blanco): precio_50_u = $551, precio_100_u = $1055, precio_200_u = $921
  - El precio para 100 unidades es **más caro** que para 50 unidades
  - El precio para 200 unidades cae entre ambos

**Decisión de implementación:**

- El MCP aplica **fielmente los precios especificados** en los datos provistos, sin asumir lógica de negocio que corrija estas inconsistencias
- El bot está preparado para manejar estos casos: cuando un usuario consulta, el agente:
  - Aplica correctamente el precio del tier correspondiente
  - Explica profesionalmente la anomalía al usuario
  - Ofrece alternativas (ajustar cantidad, escalar a humano, proceder igual)

Esta decisión demuestra que el bot puede manejar edge cases reales donde los datos no son perfectos, sin hacer suposiciones incorrectas sobre reglas de negocio.

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
# Crear esquema
npm run db:init

# Importar productos
npm run db:seed
```

## 🚀 Comandos

```bash
# Desarrollo local
npm run dev

# Deploy a Cloudflare
npm run deploy

# Ejecutar queries en D1
npm run db:query -- --command "SELECT * FROM products"
```

## 📡 MCP Endpoint

Una vez deployado, el Worker expone:

- `GET /` — Health check
- `POST /mcp` — Endpoint principal MCP (Streamable HTTP)
- `GET /sse` — Transporte SSE legacy

**URL de producción:** `https://laburen-challenge-mcp.laburen-challenge.workers.dev`

## 🏷️ Etiquetas CRM (Chatwoot)

Se configuraron 12 etiquetas en Chatwoot para trackear el estado de cada conversación:

| Tipo | Etiqueta | Cuándo se aplica |
|---|---|---|
| Estado | `busqueda-productos` | El usuario explora el catálogo |
| Estado | `carrito-creado` | Se crea un carrito de compra |
| Estado | `carrito-editado` | Se modifican cantidades o items |
| Derivación | `derivado-a-humano` | El bot deriva a un agente humano |
| Derivación | `motivo-consulta-envio` | Consulta sobre envíos |
| Derivación | `motivo-consulta-pago` | Consulta sobre pagos |
| Derivación | `motivo-solicitud-cliente` | El cliente pide hablar con una persona |
| Producto | `producto-camiseta` | Interés o compra de camisetas |
| Producto | `producto-chaqueta` | Interés o compra de chaquetas |
| Producto | `producto-falda` | Interés o compra de faldas |
| Producto | `producto-pantalon` | Interés o compra de pantalones |
| Producto | `producto-sudadera` | Interés o compra de sudaderas |

El system prompt del agente incluye instrucciones (`<crm_tags>`) para que el LLM aplique las etiquetas correspondientes según la interacción. El MCP Server expone el tool `apply_labels` que aplica etiquetas directamente a las conversaciones de Chatwoot vía su API REST, acumulándolas sin eliminar las existentes.

## 📝 Documentación

- [Diagrama de flujo del agente](docs/flujo-agente.md)
- [Documento conceptual del MCP](docs/especificacion-mcp.md)
- [Especificaciones técnicas de tools](docs/specs-mcp-tools.md)
- [Manejo de errores](docs/error-handling.md)

## 🔗 Enlaces

- [Panel de Laburen](https://dashboard.laburen.com/)
- [Chatwoot Instance](https://chatwootchallenge.laburen.com/)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [MCP Specification](https://modelcontextprotocol.io/)

## 👤 Autor

Ariel - Challenge Técnico AI Engineer
