# 🚀 MCP Server - Documentación de Desarrollo

## Descripción

Cloudflare Worker que implementa un servidor MCP (Model Context Protocol) para exponer herramientas que el agente de IA puede invocar. El Worker se conecta a una base de datos D1 con el catálogo de productos y gestiona carritos de compra.

## 🛠️ Stack Tecnológico

- **Runtime:** Cloudflare Workers (V8 Isolates)
- **Lenguaje:** TypeScript
- **Base de Datos:** Cloudflare D1 (SQLite)
- **Protocolo:** MCP (Model Context Protocol)

## 📁 Estructura del Proyecto

```
src/
├── index.ts              # Entry point del Worker, define endpoints y tools
├── types.ts              # Tipos TypeScript (Env, MCPRequest, etc.)
├── utils/
│   └── response.ts       # Helpers para respuestas HTTP y MCP
└── db/
    ├── schema.sql        # Esquema de la base de datos
    └── seed.sql          # 100 productos importados
```

## 🔧 Configuración Inicial

### 1. Instalar dependencias

```bash
npm install
```

### 2. Verificar configuración de D1

El Worker ya está configurado con el binding a la base de datos D1:

```toml
# wrangler.toml
[[d1_databases]]
binding = "DB"
database_name = "laburen-challenge-db"
database_id = "91a940ad-ee7e-4fa8-b853-950e5e5880ae"
```

### 3. Variables de entorno (opcional)

Copiar `.env.example` a `.dev.vars` si necesitas configurar variables locales:

```bash
cp .env.example .dev.vars
```

## 🚀 Comandos de Desarrollo

### Iniciar servidor local

```bash
npm run dev
# o directamente:
wrangler dev
```

El Worker estará disponible en: **http://localhost:8787**

### Verificar que el Worker funciona

```bash
# Health check
curl http://localhost:8787/

# Listar herramientas disponibles
curl http://localhost:8787/tools

# Invocar un tool MCP (ejemplo)
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "list_products",
      "arguments": { "limit": 5 }
    }
  }'
```

### Deploy a producción

```bash
npm run deploy
# o directamente:
wrangler deploy
```

## 📡 Endpoints Disponibles

### `GET /`

Health check del servidor.

**Respuesta:**

```json
{
  "service": "Laburen MCP Server",
  "status": "online",
  "version": "1.0.0",
  "tools_available": 4,
  "database": "connected"
}
```

### `GET /tools`

Lista todas las herramientas MCP disponibles.

**Respuesta:**

```json
{
  "tools": [
    {
      "name": "list_products",
      "description": "Busca y lista productos disponibles...",
      "inputSchema": { ... }
    },
    ...
  ]
}
```

### `POST /mcp`

Endpoint principal para invocar herramientas MCP.

**Request:**

```json
{
  "method": "tools/call",
  "params": {
    "name": "list_products",
    "arguments": {
      "query": "remera",
      "limit": 10
    }
  }
}
```

**Response:**

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"success\":true,\"data\":{...}}"
    }
  ],
  "isError": false
}
```

## 🛠️ Herramientas MCP Implementadas

| Tool            | Estado                   | Descripción                         |
| --------------- | ------------------------ | ----------------------------------- |
| `list_products` | ✅ Implementado          | Busca y lista productos con filtros |
| `get_product`   | ✅ Implementado          | Obtiene detalle de un producto      |
| `create_cart`   | 🔄 Pendiente (Tarea 4.4) | Crea o actualiza un carrito         |
| `update_cart`   | 🔄 Pendiente (Tarea 4.5) | Modifica cantidades o elimina items |

## 🔍 Testing Local

### 1. Verificar conexión a D1

```bash
# Verificar tablas
wrangler d1 execute laburen-challenge-db --local --command "SELECT name FROM sqlite_master WHERE type='table'"

# Contar productos
wrangler d1 execute laburen-challenge-db --local --command "SELECT COUNT(*) FROM products"

# Ver primeros 3 productos
wrangler d1 execute laburen-challenge-db --local --command "SELECT * FROM products LIMIT 3"
```

### 2. Testear tools MCP

Una vez implementados los tools, puedes usar el siguiente script de test:

```bash
# list_products
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "list_products",
      "arguments": {
        "query": "pantalon",
        "categoria": "Deportivo",
        "limit": 5
      }
    }
  }' | jq

# get_product
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "get_product",
      "arguments": { "product_id": 1 }
    }
  }' | jq
```

## 📝 Logs y Debugging

### Ver logs en desarrollo

Los logs aparecen automáticamente en la terminal donde ejecutaste `wrangler dev`:

```
[MCP] Invocando tool: list_products {"query":"remera"}
[MCP] Result: SUCCESS
```

### Ver logs en producción

```bash
wrangler tail
```

## 🔒 Seguridad

- **CORS:** El Worker permite requests desde cualquier origen (`Access-Control-Allow-Origin: *`)
- **Prepared Statements:** Todas las queries SQL usan prepared statements para prevenir SQL injection
- **Error Handling:** No se exponen detalles internos de la DB en los errores

## 📚 Referencias

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Especificaciones MCP Tools](../docs/specs-mcp-tools.md)

## 🐛 Troubleshooting

### Error: "binding DB is undefined"

Verificar que el binding esté correctamente configurado en `wrangler.toml` y que la base de datos D1 exista:

```bash
wrangler d1 list
```

### Error: "Failed to fetch"

Asegurarse de que el Worker esté corriendo:

```bash
wrangler dev
```

### Los cambios no se reflejan

Reiniciar el servidor de desarrollo (Ctrl+C y volver a ejecutar `wrangler dev`).

---

**Próximos pasos:**

- Implementar `list_products` (Tarea 4.2)
- Implementar `get_product` (Tarea 4.3)
- Implementar `create_cart` (Tarea 4.4)
- Implementar `update_cart` (Tarea 4.5)
