# Flujo de Interaccion del Agente de Ventas

## Arquitectura General

```mermaid
graph LR
    A[Usuario] -->|WhatsApp| B[Meta Cloud API]
    B -->|Webhook| C[Chatwoot CRM]
    C -->|Mensaje| D[Laburen Platform]
    D -->|MCP SSE/HTTP| E[MCP Server Workers]
    E -->|SQL| F[Cloudflare D1]
    F -->|Datos| E
    E -->|Respuesta| D
    D -->|IA Response| C
    C -->|WhatsApp API| B
    B -->|Mensaje| A
```

## Flujo 1: Explorar Productos

El usuario busca productos. El LLM invoca `list_products` (con filtros opcionales) o `get_product` (por ID) segun corresponda.

```mermaid
sequenceDiagram
    participant U as Usuario
    participant L as Laburen (LLM)
    participant M as MCP Server
    participant D as D1 Database

    U->>L: "Quiero ver camisetas deportivas"
    Note over L: Analiza intent → buscar productos
    L->>M: list_products({ query: "camisetas", categoria: "Deportivo" })
    M->>D: SELECT ... FROM products WHERE disponible='Si' AND filtros
    D-->>M: Productos encontrados
    M-->>L: { products: [...], total: 3 }
    L-->>U: "Encontre 3 camisetas deportivas: ..."

    U->>L: "Dame mas info de la primera"
    Note over L: Identifica producto → ID 5
    L->>M: get_product({ product_id: 5 })
    M->>D: SELECT * FROM products WHERE id = 5
    D-->>M: Detalle con precios por volumen
    M-->>L: { id: 5, precios: { 50u: $5000, 100u: $4500, 200u: $4000 }, ... }
    L-->>U: "Camiseta Negra M - Precios: 50u $5000, 100u $4500, 200u $4000"
```

## Flujo 2: Crear Carrito

El usuario expresa intencion de compra. El MCP valida stock, crea/reutiliza el carrito (UPSERT por `conversation_id`) y aplica precios por volumen.

```mermaid
sequenceDiagram
    participant U as Usuario
    participant L as Laburen (LLM)
    participant M as MCP Server
    participant D as D1 Database

    U->>L: "Quiero 50 camisetas negras"
    Note over L: Intent → agregar al carrito
    L->>M: create_cart({ conversation_id: "conv_123", items: [{ product_id: 5, qty: 50 }] })

    M->>D: Validar stock y disponibilidad
    D-->>M: disponible: Si, stock: 150 ✅
    M->>D: INSERT/UPSERT carrito + items
    M->>D: Obtener carrito completo con precios
    D-->>M: Items con subtotales

    Note over M: qty=50 → precio_50_u<br/>50 x $5000 = $250.000

    M-->>L: { cart_id: 42, items: [...], total: 250000 }
    L-->>U: "Agregue 50 Camisetas Negras. Total: $250.000"
```

## Flujo 3: Editar Carrito (Extra)

El usuario modifica cantidades (`qty > 0`) o elimina items (`qty = 0`).

```mermaid
sequenceDiagram
    participant U as Usuario
    participant L as Laburen (LLM)
    participant M as MCP Server
    participant D as D1 Database

    U->>L: "Cambia a 100 camisetas"
    L->>M: update_cart({ conversation_id: "conv_123", updates: [{ product_id: 5, qty: 100 }] })
    M->>D: Validar stock (solo si qty sube)
    D-->>M: stock: 150 >= 100 ✅
    M->>D: UPDATE cart_items SET qty = 100
    Note over M: qty=100 → precio_100_u<br/>100 x $4500 = $450.000
    M-->>L: { cart_id: 42, items: [...], total: 450000 }
    L-->>U: "Actualizado a 100 camisetas. Precio baja a $4.500 c/u. Total: $450.000"

    U->>L: "Quita las camisetas"
    L->>M: update_cart({ ..., updates: [{ product_id: 5, qty: 0 }] })
    M->>D: DELETE FROM cart_items WHERE product_id = 5
    M-->>L: { cart_id: 42, items: [], total: 0 }
    L-->>U: "Listo, tu carrito esta vacio."
```

## Endpoints MCP

| Herramienta     | Proposito                | Input Principal                                                    | Output                                 |
| --------------- | ------------------------ | ------------------------------------------------------------------ | -------------------------------------- |
| `list_products` | Buscar productos         | `query`, `categoria`, `talla`, `color`, `limit` (todos opcionales) | Array de productos con stock y precios |
| `get_product`   | Detalle de producto      | `product_id` (requerido)                                           | Producto con precios escalonados       |
| `create_cart`   | Crear/agregar al carrito | `conversation_id`, `items[]` (requeridos)                          | Carrito con items, precios y total     |
| `update_cart`   | Modificar carrito        | `conversation_id`, `updates[]` (requeridos)                        | Carrito actualizado con total          |
| `apply_labels`  | Etiquetar conversacion   | `conversation_id`, `labels[]` (requeridos)                         | Labels aplicadas en Chatwoot           |

**URL de produccion:** `https://laburen-challenge-mcp.laburen-challenge.workers.dev/mcp`
**Transporte:** Streamable HTTP + SSE (MCP SDK)
