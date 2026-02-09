# Especificacion MCP Server

## Resumen de Arquitectura

Este proyecto implementa un **agente de ventas conversacional** que opera sobre WhatsApp mediante el **Model Context Protocol (MCP)**. El agente esta orquestado por Laburen Platform, que ejecuta un LLM con capacidad de invocar herramientas (tools) expuestas por nuestro MCP Server.

El servidor MCP esta implementado como un **Cloudflare Worker** usando **Durable Objects** (`McpAgent` del paquete `agents`) con transporte **Streamable HTTP + SSE**. Se comunica con una base de datos **Cloudflare D1** (SQLite en el edge).

**Flujo:** Usuario (WhatsApp) → Meta Cloud API → Chatwoot CRM → Laburen Platform (LLM) → MCP Server (Cloudflare Worker) → Cloudflare D1 → respuesta al usuario.

Cada conversacion esta aislada por `conversation_id`, garantizando que cada cliente tenga su propio carrito de compra independiente.

---

## Stack Tecnico

| Componente      | Tecnologia                                                   |
| --------------- | ------------------------------------------------------------ |
| Runtime         | Cloudflare Workers (TypeScript)                              |
| Base de datos   | Cloudflare D1 (SQLite)                                       |
| Protocolo       | MCP (Model Context Protocol) via `@modelcontextprotocol/sdk` |
| Transporte      | Streamable HTTP (`/mcp`) + SSE legacy (`/sse`)               |
| Durable Objects | `McpAgent` del paquete `agents`                              |
| Validacion      | Zod v4                                                       |
| Deploy          | Wrangler CLI                                                 |

---

## Endpoints del Worker

| Ruta                    | Metodo  | Descripcion                                                    |
| ----------------------- | ------- | -------------------------------------------------------------- |
| `/`                     | GET     | Health check (status, version, endpoints, estado DB)           |
| `/mcp`                  | POST    | **Transporte Streamable HTTP (PRINCIPAL)** — Usado por Laburen |
| `/sse`                  | GET     | Transporte SSE legacy (compatibilidad)                         |
| `/message`, `/messages` | POST    | Envio de mensajes SSE legacy                                   |
| `*`                     | OPTIONS | CORS preflight                                                 |

> 📌 **Endpoint recomendado:** Laburen Platform se conecta vía `/mcp` (Streamable HTTP transport), que es el estándar moderno del MCP SDK. El endpoint `/sse` se mantiene para compatibilidad con clientes legacy.

---

## Base de Datos (D1)

### Tabla: `products`

Catalogo de indumentaria (100 productos importados desde XLSX).

| Columna               | Tipo             | Descripcion                                      |
| --------------------- | ---------------- | ------------------------------------------------ |
| `id`                  | INTEGER PK       | ID del producto (del XLSX)                       |
| `tipo_prenda`         | TEXT NOT NULL    | Tipo de prenda (Pantalon, Camiseta, Falda, etc.) |
| `talla`               | TEXT NOT NULL    | Talla: S, M, L, XL, XXL                          |
| `color`               | TEXT NOT NULL    | Color del producto                               |
| `cantidad_disponible` | INTEGER NOT NULL | Stock actual                                     |
| `precio_50_u`         | INTEGER NOT NULL | Precio unitario para pedido de 50 unidades       |
| `precio_100_u`        | INTEGER NOT NULL | Precio unitario para pedido de 100 unidades      |
| `precio_200_u`        | INTEGER NOT NULL | Precio unitario para pedido de 200 unidades      |
| `disponible`          | TEXT NOT NULL    | Flag: 'Si' / 'No'                                |
| `categoria`           | TEXT NOT NULL    | Deportivo, Casual o Formal                       |
| `descripcion`         | TEXT             | Descripcion del producto                         |

**Indices:** `tipo_prenda`, `categoria`, `talla`, `color`, `disponible`.

### Tabla: `carts`

| Columna           | Tipo                     | Descripcion                         |
| ----------------- | ------------------------ | ----------------------------------- |
| `id`              | INTEGER PK AUTOINCREMENT | ID interno del carrito              |
| `conversation_id` | TEXT UNIQUE NOT NULL     | ID de conversacion Chatwoot/Laburen |
| `created_at`      | DATETIME                 | Fecha de creacion                   |
| `updated_at`      | DATETIME                 | Ultima actualizacion                |

### Tabla: `cart_items`

| Columna      | Tipo                           | Descripcion       |
| ------------ | ------------------------------ | ----------------- |
| `id`         | INTEGER PK AUTOINCREMENT       | ID interno        |
| `cart_id`    | INTEGER FK → carts(id) CASCADE | Carrito asociado  |
| `product_id` | INTEGER FK → products(id)      | Producto asociado |
| `qty`        | INTEGER NOT NULL DEFAULT 1     | Cantidad          |

**Constraint:** `UNIQUE(cart_id, product_id)` — un producto solo aparece una vez por carrito.

---

## Herramientas MCP (Tools)

El servidor expone **5 herramientas** que el LLM puede invocar:

> **Nota:** La derivación a humano (human handoff) NO se implementa como tool MCP. El LLM detecta cuándo derivar (usuario pide hablar con humano, consultas fuera del alcance del agente, etc.) y responde al cliente indicando que será atendido por un agente humano. Las etiquetas se aplican vía el tool `apply_labels`, que se comunica directamente con la API de Chatwoot.

### 1. `list_products` — Buscar Productos

**Descripcion:** Busca y lista productos disponibles en el catalogo. Puede filtrar por texto, categoria, talla y color.

**Parametros:**

```typescript
{
  query?: string          // Texto de busqueda (case-insensitive) en tipo_prenda, color, descripcion
  categoria?: "Deportivo" | "Casual" | "Formal"  // Filtrar por categoria
  talla?: "S" | "M" | "L" | "XL" | "XXL"        // Filtrar por talla
  color?: string          // Filtrar por color exacto (case-insensitive)
  limit?: number          // Max resultados (default: 10, max: 50)
}
```

Todos los parametros son opcionales.

**Respuesta exitosa:**

```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": 1,
        "tipo_prenda": "Camiseta",
        "talla": "M",
        "color": "Negro",
        "cantidad_disponible": 150,
        "precio_50_u": 5000,
        "precio_100_u": 4500,
        "precio_200_u": 4000,
        "disponible": "Si",
        "categoria": "Casual",
        "descripcion": "Camiseta casual de algodon"
      }
    ],
    "total": 1,
    "showing": 1
  }
}
```

**Logica:**

- Solo retorna productos con `disponible = 'Si'`
- Busqueda de texto usa `LIKE` con `LOWER()` en tipo_prenda, color y descripcion
- Filtros se aplican con operador AND
- Ordenados por `tipo_prenda ASC, talla ASC`

---

### 2. `get_product` — Detalle de Producto

**Descripcion:** Obtiene los detalles completos de un producto especifico por su ID.

**Parametros:**

```typescript
{
  product_id: number; // Requerido: ID del producto
}
```

**Respuesta exitosa:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "tipo_prenda": "Camiseta",
    "talla": "M",
    "color": "Negro",
    "cantidad_disponible": 150,
    "precios": {
      "50_unidades": 5000,
      "100_unidades": 4500,
      "200_unidades": 4000
    },
    "disponible": true,
    "categoria": "Casual",
    "descripcion": "Camiseta casual de algodon"
  }
}
```

**Logica:**

- Valida que `product_id` sea un numero positivo
- Convierte `disponible` de "Si"/"No" a booleano
- Agrupa los 3 precios en un objeto `precios` para mayor claridad
- Si el producto no esta disponible, agrega `message: "Este producto no esta disponible actualmente."`

**Errores:**

| Codigo             | Causa                          |
| ------------------ | ------------------------------ |
| `validation_error` | product_id invalido o faltante |
| `not_found`        | No existe producto con ese ID  |

---

### 3. `create_cart` — Crear/Actualizar Carrito

**Descripcion:** Crea un nuevo carrito de compra asociado a una conversacion o actualiza uno existente agregando productos.

**Parametros:**

```typescript
{
  conversation_id: string; // Requerido: ID de la conversacion
  items: Array<{
    product_id: number; // Requerido: ID del producto
    qty: number; // Requerido: Cantidad (minimo 1)
  }>; // Requerido: Al menos 1 item
}
```

**Respuesta exitosa:**

```json
{
  "success": true,
  "data": {
    "cart_id": 42,
    "items": [
      {
        "product_id": 1,
        "tipo_prenda": "Camiseta",
        "talla": "M",
        "color": "Negro",
        "precio_unitario": 5000,
        "qty": 50,
        "subtotal": 250000
      }
    ],
    "total": 250000,
    "message": "Carrito actualizado. Se agregaron 1 producto(s)."
  }
}
```

**Logica:**

1. Valida que todos los productos existan
2. Verifica disponibilidad (`disponible = 'Si'`)
3. **UPSERT carrito:** Si ya existe para ese `conversation_id`, reutiliza el cart_id (actualiza `updated_at`); si no, crea uno nuevo
4. **Obtiene cantidades actuales:** Consulta cuánto de cada producto ya está en el carrito
5. **Valida stock acumulado:** Verifica que `(cantidad_actual_en_carrito + cantidad_nueva) <= cantidad_disponible`
6. **UPSERT items:** Si el producto ya esta en el carrito, **suma** las cantidades (`ON CONFLICT DO UPDATE SET qty = qty + excluded.qty`)
7. Calcula precios con **descuento por volumen** (ver seccion Pricing)
8. Retorna carrito completo con items y total

> ⚠️ **Importante:** Este tool **suma cantidades** cuando el producto ya está en el carrito. El LLM debe entender el contexto del usuario:
>
> - "Quiero 50 **más**" → usar `create_cart` (suma a lo existente)
> - "Quiero 100 **en total**" → usar `update_cart` (reemplaza la cantidad)
>
> La validación de stock considera la cantidad **acumulada** (actual + nueva), no solo la cantidad del request actual.

**Errores:**

| Codigo                | Causa                            |
| --------------------- | -------------------------------- |
| `validation_error`    | Parametros invalidos             |
| `product_not_found`   | Producto no existe               |
| `product_unavailable` | Producto con `disponible = 'No'` |
| `insufficient_stock`  | Stock insuficiente               |

---

### 4. `update_cart` — Modificar Carrito

**Descripcion:** Modifica la cantidad de productos en un carrito existente o elimina items (qty = 0).

**Parametros:**

```typescript
{
  conversation_id: string; // Requerido: ID de la conversacion
  updates: Array<{
    product_id: number; // Requerido: ID del producto a actualizar
    qty: number; // Requerido: Nueva cantidad (0 = eliminar)
  }>; // Requerido: Al menos 1 update
}
```

**Respuesta exitosa:**

```json
{
  "success": true,
  "data": {
    "cart_id": 42,
    "items": [
      {
        "product_id": 1,
        "tipo_prenda": "Camiseta",
        "talla": "M",
        "color": "Negro",
        "precio_unitario": 4500,
        "qty": 100,
        "subtotal": 450000
      }
    ],
    "total": 450000,
    "message": "Carrito actualizado: 1 producto(s) actualizado(s)."
  }
}
```

**Logica:**

1. Verifica que exista un carrito para el `conversation_id`
2. **Solo para incrementos de cantidad**, valida existencia, disponibilidad y stock del producto
3. `qty = 0` → elimina el item del carrito (DELETE)
4. `qty > 0` → actualiza la cantidad (UPDATE). Si el producto no estaba en el carrito, retorna error
5. Si el carrito queda vacio, lo mantiene (no se elimina automaticamente)
6. Actualiza `updated_at` del carrito
7. Recalcula total con precios escalonados

**Errores:**

| Codigo                | Causa                                       |
| --------------------- | ------------------------------------------- |
| `validation_error`    | Parametros invalidos                        |
| `cart_not_found`      | No existe carrito para esa conversacion     |
| `product_not_found`   | Producto no existe (al incrementar qty)     |
| `product_unavailable` | Producto no disponible (al incrementar qty) |
| `insufficient_stock`  | Stock insuficiente (al incrementar qty)     |
| `item_not_found`      | El producto no esta en el carrito           |

---

### 5. `apply_labels` — Aplicar Etiquetas CRM

**Descripcion:** Aplica etiquetas a la conversacion actual en Chatwoot. Las etiquetas se acumulan sin eliminar las existentes.

**Parametros:**

```typescript
{
  conversation_id: string;   // Requerido: ID de la conversacion
  labels: string[];          // Requerido: Array de etiquetas a aplicar (minimo 1)
}
```

**Etiquetas validas:** `busqueda-productos`, `carrito-creado`, `carrito-editado`, `derivado-a-humano`, `motivo-consulta-envio`, `motivo-consulta-pago`, `motivo-solicitud-cliente`, `producto-camiseta`, `producto-chaqueta`, `producto-falda`, `producto-pantalon`, `producto-sudadera`.

**Respuesta exitosa:**

```json
{
  "success": true,
  "data": {
    "applied_labels": ["busqueda-productos", "carrito-creado", "producto-camiseta"],
    "message": "Etiquetas aplicadas correctamente."
  }
}
```

**Logica:**

1. Valida que las etiquetas sean del set permitido
2. Extrae el `conversation_id` numerico de Chatwoot del formato compuesto de Laburen
3. GET etiquetas actuales de la conversacion (API Chatwoot)
4. Mergea las nuevas con las existentes (sin duplicar)
5. POST el array completo (la API de Chatwoot sobreescribe, por eso se hace merge previo)

**Errores:**

| Codigo              | Causa                                    |
| ------------------- | ---------------------------------------- |
| `validation_error`  | Parametros invalidos o etiquetas invalidas |
| `chatwoot_api_error`| Error al comunicarse con la API de Chatwoot |

---

## Precios Escalonados por Volumen

Los productos tienen 3 niveles de precio segun la cantidad del item en el carrito:

| Cantidad         | Precio aplicado |
| ---------------- | --------------- |
| qty < 100        | `precio_50_u`   |
| 100 <= qty < 200 | `precio_100_u`  |
| qty >= 200       | `precio_200_u`  |

El precio unitario se recalcula en cada operacion de carrito. Un mayor volumen por item reduce el precio unitario.

**Implementacion:** `src/utils/pricing.ts`

```typescript
function calculateUnitPrice(qty, precio_50_u, precio_100_u, precio_200_u) {
  if (qty >= 200) return precio_200_u;
  if (qty >= 100) return precio_100_u;
  return precio_50_u;
}
```

---

## Formato de Respuesta Estandar

Todas las herramientas retornan un formato consistente:

**Exito:**

```json
{
  "success": true,
  "data": {
    /* resultado especifico */
  }
}
```

**Error:**

```json
{
  "success": false,
  "error": "codigo_error",
  "message": "Descripcion clara del error",
  "details": {
    /* info adicional opcional */
  }
}
```

**Codigos de error:**

| Codigo                | Descripcion                |
| --------------------- | -------------------------- |
| `validation_error`    | Parametros invalidos       |
| `not_found`           | Recurso no encontrado      |
| `product_not_found`   | Producto no existe         |
| `cart_not_found`      | Carrito no existe          |
| `item_not_found`      | Item no esta en el carrito |
| `product_unavailable` | Producto no disponible     |
| `insufficient_stock`  | Stock insuficiente         |
| `chatwoot_api_error`  | Error de API de Chatwoot   |
| `database_error`      | Error de base de datos     |
| `internal_error`      | Error interno del servidor |

---

## Decisiones de Diseno

### Cloudflare D1

1. **Co-localizacion:** Worker y DB en el mismo edge → latencia minima (~1-5ms)
2. **Costo cero:** Plan gratuito suficiente (5GB storage, 5M reads/day)
3. **Simplicidad:** SQLite familiar, sin pools de conexiones
4. **Zero-ops:** Escala automaticamente

### Transporte SSE/Streamable HTTP

Se usa `McpAgent` de Durable Objects (paquete `agents`) en vez de REST puro:

- `/mcp` para Streamable HTTP (transporte principal)
- `/sse` para compatibilidad con clientes SSE legacy
- Soporta session management nativo del MCP SDK

### 3 Tablas Normalizadas (3NF)

- **products** → Catalogo maestro (single source of truth)
- **carts** → Un carrito por conversacion (1:1 con user session)
- **cart_items** → Many-to-many entre carts y products con cantidad

Ventajas: integridad referencial con FK, `ON DELETE CASCADE`, extensible.

### UPSERT en Carritos

`create_cart` usa `INSERT...ON CONFLICT` tanto para el carrito como para los items. Esto permite que el LLM invoque `create_cart` multiples veces sin preocuparse por duplicados — simplemente suma cantidades al carrito existente.

### Validacion de Stock Selectiva

`update_cart` solo valida stock cuando se **incrementa** la cantidad. Reducir o eliminar items no requiere validacion, lo que optimiza las operaciones.

---

## Seguridad

1. **Prepared Statements:** Todos los queries usan placeholders (`?`) para prevenir SQL injection
2. **Input Validation:** Zod valida tipos en el MCP SDK; validacion adicional en cada tool
3. **Error Sanitization:** No se exponen detalles internos de DB en errores al cliente
4. **CORS:** Configurado con headers permisivos para integracion con Laburen Platform
5. **Aislamiento:** Cada conversacion tiene su propio carrito via `conversation_id` UNIQUE

---

## Referencias

- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Cloudflare D1](https://developers.cloudflare.com/d1/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Laburen Platform](https://dashboard.laburen.com/)
