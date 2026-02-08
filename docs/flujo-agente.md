# Flujo de Interaccion del Agente - Laburen Challenge

Este documento describe los flujos de interaccion entre el usuario y el agente de ventas por WhatsApp, detallando como los diferentes componentes del sistema se comunican entre si.

## Arquitectura General

El sistema esta compuesto por 6 componentes principales que se comunican en secuencia:

```mermaid
graph LR
    A[Usuario] -->|WhatsApp| B[Meta Cloud API]
    B -->|Webhook| C[Chatwoot CRM]
    C -->|Mensaje| D[Laburen Platform]
    D -->|MCP SSE/HTTP| E[MCP Server Workers]
    E -->|SQL Query| F[Cloudflare D1]
    F -->|Datos| E
    E -->|Respuesta| D
    D -->|IA Response| C
    C -->|WhatsApp API| B
    B -->|Mensaje| A

    style A fill:#e1f5ff
    style D fill:#fff4e1
    style E fill:#f0e1ff
    style F fill:#e1ffe1
```

### Componentes:

1. **Usuario** - Cliente final que interactua por WhatsApp
2. **Meta Cloud API** - API oficial de WhatsApp para envio/recepcion de mensajes
3. **Chatwoot CRM** - Centro de control para gestion de conversaciones y etiquetado
4. **Laburen Platform** - Orquestador que ejecuta el LLM y decide que herramientas usar
5. **MCP Server** - Cloudflare Worker con Durable Objects (`McpAgent`), transporte Streamable HTTP + SSE
6. **Cloudflare D1** - Base de datos SQLite edge con catalogo de indumentaria y carritos

---

## Flujo 1: Explorar Productos (`list_products`)

El usuario solicita ver productos disponibles. El agente busca en el catalogo con filtros opcionales.

```mermaid
sequenceDiagram
    participant U as Usuario
    participant W as WhatsApp
    participant C as Chatwoot
    participant L as Laburen (LLM)
    participant M as MCP Server
    participant D as D1 Database

    U->>W: "Quiero ver camisetas deportivas"
    W->>C: Mensaje recibido
    C->>L: Texto + conversation_id

    Note over L: LLM analiza intent:<br/>Buscar productos con filtros

    L->>M: MCP Call: list_products({<br/>  query: "camisetas",<br/>  categoria: "Deportivo"<br/>})
    M->>D: SELECT * FROM products<br/>WHERE disponible='Si'<br/>AND LOWER(tipo_prenda) LIKE '%camisetas%'<br/>AND categoria='Deportivo'<br/>ORDER BY tipo_prenda, talla<br/>LIMIT 10
    D-->>M: [{ id: 5, tipo_prenda: "Camiseta", talla: "M", color: "Negro", ... }]
    M-->>L: { success: true, data: { products: [...], total: 3, showing: 3 } }

    Note over L: LLM formatea respuesta<br/>en lenguaje natural

    L-->>C: "Encontre 3 camisetas deportivas: 1) Camiseta Negra M $5000..."
    C-->>W: Envia respuesta
    W-->>U: Mensaje en WhatsApp
```

**Parametros disponibles:**

| Parametro   | Tipo              | Descripcion                                 |
| ----------- | ----------------- | ------------------------------------------- |
| `query`     | string (opcional) | Busqueda en tipo_prenda, color, descripcion |
| `categoria` | enum (opcional)   | "Deportivo", "Casual", "Formal"             |
| `talla`     | enum (opcional)   | "S", "M", "L", "XL", "XXL"                  |
| `color`     | string (opcional) | Color exacto (case-insensitive)             |
| `limit`     | number (opcional) | Max resultados (default 10, max 50)         |

---

## Flujo 2: Ver Detalle de Producto (`get_product`)

El usuario solicita informacion detallada de un producto especifico. La respuesta incluye precios escalonados por volumen.

```mermaid
sequenceDiagram
    participant U as Usuario
    participant W as WhatsApp
    participant C as Chatwoot
    participant L as Laburen (LLM)
    participant M as MCP Server
    participant D as D1 Database

    U->>W: "Dame mas info de la camiseta negra"
    W->>C: Mensaje recibido
    C->>L: Texto + conversation_id

    Note over L: LLM identifica referencia<br/>a producto ID 5

    L->>M: MCP Call: get_product({ product_id: 5 })
    M->>D: SELECT * FROM products WHERE id = 5
    D-->>M: { id: 5, tipo_prenda: "Camiseta", talla: "M",<br/>color: "Negro", precio_50_u: 5000,<br/>precio_100_u: 4500, precio_200_u: 4000, ... }
    M-->>L: { success: true, data: {<br/>  id: 5, tipo_prenda: "Camiseta",<br/>  precios: { 50_unidades: 5000, 100_unidades: 4500, 200_unidades: 4000 },<br/>  disponible: true, ... } }

    Note over L: LLM genera respuesta<br/>descriptiva con precios

    L-->>C: "La Camiseta Negra talla M esta disponible.<br/>Precios: 50u $5000, 100u $4500, 200u $4000 c/u"
    C-->>W: Envia respuesta
    W-->>U: Mensaje en WhatsApp
```

**Nota:** `get_product` convierte `disponible` de "Si"/"No" a booleano y agrupa los 3 precios en un objeto `precios` para que el LLM los presente claramente.

---

## Flujo 3: Crear Carrito (`create_cart`)

El usuario expresa intencion de compra. El agente crea un carrito o agrega productos a uno existente (UPSERT).

```mermaid
sequenceDiagram
    participant U as Usuario
    participant W as WhatsApp
    participant C as Chatwoot
    participant L as Laburen (LLM)
    participant M as MCP Server
    participant D as D1 Database

    U->>W: "Quiero 50 camisetas negras"
    W->>C: Mensaje recibido
    C->>L: Texto + conversation_id

    Note over L: Intent: agregar al carrito<br/>product_id: 5, qty: 50

    L->>M: MCP Call: create_cart({<br/>  conversation_id: "conv_123",<br/>  items: [{ product_id: 5, qty: 50 }]<br/>})

    Note over M: Paso 1a: Validar productos

    M->>D: SELECT id, tipo_prenda, cantidad_disponible, disponible<br/>FROM products WHERE id IN (5)
    D-->>M: { id: 5, cantidad_disponible: 150, disponible: "Si" }

    Note over M: Paso 1b: Crear/recuperar carrito

    M->>D: INSERT INTO carts (conversation_id)<br/>VALUES ('conv_123')<br/>ON CONFLICT (conversation_id)<br/>DO UPDATE SET updated_at = CURRENT_TIMESTAMP<br/>RETURNING id
    D-->>M: cart_id: 42

    Note over M: Paso 1c: Verificar cantidad actual<br/>en carrito (para stock acumulado)

    M->>D: SELECT product_id, qty<br/>FROM cart_items<br/>WHERE cart_id = 42 AND product_id = 5
    D-->>M: No existe (primera vez) → qty_actual = 0

    Note over M: Validar stock acumulado:<br/>0 + 50 = 50 <= 150 ✅ OK

    Note over M: Paso 2: UPSERT items<br/>(suma qty si ya existe)

    M->>D: INSERT INTO cart_items (cart_id, product_id, qty)<br/>VALUES (42, 5, 50)<br/>ON CONFLICT (cart_id, product_id)<br/>DO UPDATE SET qty = qty + 50

    Note over M: Paso 3: Obtener carrito completo<br/>con precios escalonados

    M->>D: SELECT ci.*, p.* FROM cart_items ci<br/>JOIN products p ON ci.product_id = p.id<br/>WHERE ci.cart_id = 42
    D-->>M: Items con precios

    Note over M: qty=50 → precio_50_u ($5000)<br/>subtotal = 50 * 5000 = $250.000

    M-->>L: { success: true, data: {<br/>  cart_id: 42,<br/>  items: [{ product_id: 5, precio_unitario: 5000, qty: 50, subtotal: 250000 }],<br/>  total: 250000 } }

    L-->>C: "Agregue 50 Camisetas Negras M a tu carrito.<br/>Precio: $5.000 c/u. Total: $250.000"
    C-->>W: Envia respuesta
    W-->>U: Mensaje en WhatsApp
```

**Comportamiento UPSERT:**

- Si no existe carrito para ese `conversation_id` → crea uno nuevo
- Si ya existe → reutiliza el carrito existente
- **Si el producto ya está en el carrito → SUMA las cantidades** (ej: 50 + 50 = 100)
- **Validación de stock:** Considera la cantidad **acumulada** (actual en carrito + nueva solicitada), no solo la nueva
- Si el producto ya esta en el carrito → **suma** las cantidades

**Precios escalonados aplicados:**

| Cantidad en carrito | Precio unitario aplicado |
| ------------------- | ------------------------ |
| qty < 100           | `precio_50_u`            |
| 100 <= qty < 200    | `precio_100_u`           |
| qty >= 200          | `precio_200_u`           |

---

## Flujo 4: Actualizar Carrito (`update_cart`)

El usuario modifica cantidades o elimina productos del carrito.

### Caso A: Modificar cantidad

```mermaid
sequenceDiagram
    participant U as Usuario
    participant W as WhatsApp
    participant C as Chatwoot
    participant L as Laburen (LLM)
    participant M as MCP Server
    participant D as D1 Database

    U->>W: "Cambia a 100 camisetas"
    W->>C: Mensaje recibido
    C->>L: Texto + conversation_id

    Note over L: Intent: actualizar qty<br/>product_id: 5, nueva qty: 100

    L->>M: MCP Call: update_cart({<br/>  conversation_id: "conv_123",<br/>  updates: [{ product_id: 5, qty: 100 }]<br/>})

    M->>D: SELECT id FROM carts WHERE conversation_id = 'conv_123'
    D-->>M: cart_id: 42

    M->>D: SELECT product_id, qty FROM cart_items WHERE cart_id = 42
    D-->>M: [{ product_id: 5, qty: 50 }]

    Note over M: qty sube de 50 a 100<br/>→ Validar stock

    M->>D: SELECT id, cantidad_disponible, disponible<br/>FROM products WHERE id IN (5)
    D-->>M: { cantidad_disponible: 150, disponible: "Si" }

    M->>D: UPDATE cart_items SET qty = 100<br/>WHERE cart_id = 42 AND product_id = 5

    M->>D: UPDATE carts SET updated_at = CURRENT_TIMESTAMP WHERE id = 42

    Note over M: qty=100 → precio_100_u ($4500)<br/>subtotal = 100 * 4500 = $450.000

    M-->>L: { success: true, data: {<br/>  cart_id: 42, items: [...], total: 450000,<br/>  message: "1 producto(s) actualizado(s)" } }

    L-->>C: "Actualizado a 100 camisetas. Precio baja a $4.500 c/u.<br/>Nuevo total: $450.000"
    C-->>W: Envia respuesta
    W-->>U: Mensaje en WhatsApp
```

### Caso B: Eliminar item (qty = 0)

```mermaid
sequenceDiagram
    participant U as Usuario
    participant L as Laburen (LLM)
    participant M as MCP Server
    participant D as D1 Database

    U->>L: "Quita las camisetas del carrito"

    L->>M: MCP Call: update_cart({<br/>  conversation_id: "conv_123",<br/>  updates: [{ product_id: 5, qty: 0 }]<br/>})

    M->>D: SELECT id FROM carts WHERE conversation_id = 'conv_123'
    D-->>M: cart_id: 42

    Note over M: qty = 0 → DELETE<br/>(no valida stock)

    M->>D: DELETE FROM cart_items<br/>WHERE cart_id = 42 AND product_id = 5

    M-->>L: { success: true, data: {<br/>  cart_id: 42, items: [], total: 0,<br/>  message: "El carrito esta vacio." } }

    L-->>U: "Listo, quite las camisetas. Tu carrito esta vacio."
```

**Reglas de validacion:**

- Solo valida stock cuando se **incrementa** qty (optimizacion)
- `qty = 0` elimina el item sin validacion
- Si el producto no esta en el carrito, retorna error `item_not_found`
- El carrito se mantiene aunque quede vacio

---

## Flujo 5: Derivacion a Humano

El agente detecta que no puede resolver la consulta y la derivacion es manejada por Laburen Platform a traves de Chatwoot.

```mermaid
sequenceDiagram
    participant U as Usuario
    participant W as WhatsApp
    participant C as Chatwoot
    participant L as Laburen (LLM)
    participant H as Agente Humano

    U->>W: "Quiero cambiar una remera que compre ayer"
    W->>C: Mensaje recibido
    C->>L: Texto + conversation_id

    Note over L: LLM detecta:<br/>- Tema fuera de scope (devoluciones)<br/>- No hay herramientas MCP para esto

    L->>C: Aplicar etiquetas: "handoff", "returns"
    L->>C: Cambiar estado: "open" → "waiting_agent"
    L-->>C: "Entiendo que quieres hacer un cambio.<br/>Un agente humano te va a ayudar en breve."

    C->>H: Notificacion: Nueva conversacion requiere atencion
    Note over H: Agente humano ve el contexto<br/>completo en Chatwoot

    C-->>W: Mensaje de transicion
    W-->>U: Mensaje en WhatsApp

    Note over U,H: A partir de aqui, el agente<br/>humano continua la conversacion
```

**Nota:** La derivacion a humano es manejada directamente por Laburen Platform y Chatwoot, sin necesidad de un tool MCP dedicado. El LLM detecta cuando no puede resolver y aplica etiquetas/cambios de estado en Chatwoot.

**Triggers para derivacion:**

- Usuario solicita hablar con humano explicitamente
- Consultas sobre devoluciones, cambios, reclamos
- El agente no puede responder la consulta
- Usuario expresa frustracion o insatisfaccion
- Temas de facturacion o pagos especificos

---

## Resumen de Herramientas MCP

| Herramienta     | Proposito                | Input Principal                                                    | Output                                 |
| --------------- | ------------------------ | ------------------------------------------------------------------ | -------------------------------------- |
| `list_products` | Buscar productos         | `query`, `categoria`, `talla`, `color`, `limit` (todos opcionales) | Array de productos con stock y precios |
| `get_product`   | Detalle de producto      | `product_id` (requerido)                                           | Producto con precios escalonados       |
| `create_cart`   | Crear/agregar al carrito | `conversation_id`, `items[]` (requeridos)                          | Carrito con items, precios y total     |
| `update_cart`   | Modificar carrito        | `conversation_id`, `updates[]` (requeridos)                        | Carrito actualizado con total          |

---

## Precios Escalonados por Volumen

El sistema aplica descuentos automaticos por volumen en cada operacion de carrito:

```
qty < 100   → precio_50_u  (precio base)
qty >= 100  → precio_100_u (descuento mediano)
qty >= 200  → precio_200_u (mejor precio)
```

**Ejemplo practico:**

- 50 camisetas a $5.000 c/u = $250.000
- 100 camisetas a $4.500 c/u = $450.000 (10% descuento)
- 200 camisetas a $4.000 c/u = $800.000 (20% descuento)

El precio se recalcula cada vez que se modifica la cantidad en el carrito.

---

## Consideraciones de Seguridad

1. **Validacion de Stock**: Siempre verificar disponibilidad antes de agregar items (solo en incrementos para update)
2. **Aislamiento por Conversacion**: Cada `conversation_id` tiene su propio carrito (UNIQUE constraint)
3. **Prepared Statements**: Todos los queries usan placeholders (`?`) contra SQL injection
4. **UPSERT Atomico**: `INSERT...ON CONFLICT` evita race conditions en creacion de carritos
5. **Error Handling**: Respuestas descriptivas con codigos de error estandar, sin exponer detalles de DB
6. **Validacion Zod**: Tipos validados en la capa MCP SDK antes de llegar al tool

---

## Estructura del Proyecto

```
src/
├── index.ts                  → Entry point: McpAgent (Durable Object) + routing
├── types.ts                  → Interfaces TypeScript (Env, DB types, tool args, responses)
├── db/
│   └── schema.sql            → Esquema D1 (products, carts, cart_items + indices)
├── tools/
│   ├── list-products.ts      → Busqueda con filtros dinamicos
│   ├── get-product.ts        → Detalle con precios escalonados
│   ├── create-cart.ts        → UPSERT carrito + items + validacion stock
│   └── update-cart.ts        → Modificar/eliminar items + validacion selectiva
└── utils/
    ├── response.ts           → Helpers de respuesta (success/error/MCP format)
    └── pricing.ts            → Calculo de precios escalonados por volumen
```
