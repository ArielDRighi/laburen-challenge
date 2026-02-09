# ⚙️ Especificaciones Técnicas - MCP Tools

Este documento define las especificaciones técnicas completas de cada herramienta (tool) expuesta por el MCP Server. Está diseñado para ser usado directamente como prompt para AI coding assistants.

---

## 🛠️ Tool 1: `list_products`

### Propósito

Buscar y listar productos disponibles en el catálogo, con filtros opcionales por texto, categoría, talla y límite de resultados.

### Input Schema

```typescript
interface ListProductsInput {
  query?: string; // Texto libre para buscar en tipo_prenda, color o descripción
  categoria?: string; // Filtro exacto: 'Deportivo', 'Casual', 'Formal'
  talla?: string; // Filtro exacto: 'S', 'M', 'L', 'XL', 'XXL'
  color?: string; // Filtro exacto de color
  limit?: number; // Default: 10, Max: 50
}
```

**JSON Schema (para MCP):**

```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "Texto para buscar en tipo de prenda, color o descripción (búsqueda case-insensitive)"
    },
    "categoria": {
      "type": "string",
      "enum": ["Deportivo", "Casual", "Formal"],
      "description": "Filtrar por categoría específica"
    },
    "talla": {
      "type": "string",
      "enum": ["S", "M", "L", "XL", "XXL"],
      "description": "Filtrar por talla específica"
    },
    "color": {
      "type": "string",
      "description": "Filtrar por color específico"
    },
    "limit": {
      "type": "number",
      "minimum": 1,
      "maximum": 50,
      "default": 10,
      "description": "Cantidad máxima de resultados a devolver"
    }
  }
}
```

### SQL Query

```sql
SELECT
  id,
  tipo_prenda,
  talla,
  color,
  cantidad_disponible,
  precio_50_u,
  precio_100_u,
  precio_200_u,
  disponible,
  categoria,
  descripcion
FROM products
WHERE disponible = 'Sí'
  AND (
    ? IS NULL
    OR LOWER(tipo_prenda) LIKE LOWER('%' || ? || '%')
    OR LOWER(color) LIKE LOWER('%' || ? || '%')
    OR LOWER(descripcion) LIKE LOWER('%' || ? || '%')
  )
  AND (? IS NULL OR categoria = ?)
  AND (? IS NULL OR talla = ?)
  AND (? IS NULL OR LOWER(color) = LOWER(?))
ORDER BY tipo_prenda ASC, talla ASC
LIMIT ?;
```

**Prepared Statement Parameters:**

```typescript
[
  query || null,
  query || null,
  query || null,
  query || null, // búsqueda texto (4x)
  categoria || null,
  categoria || null, // categoría (2x)
  talla || null,
  talla || null, // talla (2x)
  color || null,
  color || null, // color (2x)
  limit || 10, // límite
];
```

### Output Schema

**Caso de éxito:**

```typescript
interface ListProductsOutput {
  products: Array<{
    id: number;
    tipo_prenda: string;
    talla: string;
    color: string;
    cantidad_disponible: number;
    precio_50_u: number;
    precio_100_u: number;
    precio_200_u: number;
    categoria: string;
    descripcion: string;
  }>;
  total: number; // Cantidad de productos encontrados
  showing: number; // Cantidad de productos mostrados (respeta limit)
}
```

**Ejemplo de respuesta exitosa:**

```json
{
  "products": [
    {
      "id": 1,
      "tipo_prenda": "Pantalón",
      "talla": "XXL",
      "color": "Verde",
      "cantidad_disponible": 177,
      "precio_50_u": 1058,
      "precio_100_u": 1182,
      "precio_200_u": 462,
      "categoria": "Deportivo",
      "descripcion": "Ideal para uso diario."
    },
    {
      "id": 5,
      "tipo_prenda": "Sudadera",
      "talla": "XL",
      "color": "Verde",
      "cantidad_disponible": 151,
      "precio_50_u": 603,
      "precio_100_u": 975,
      "precio_200_u": 739,
      "categoria": "Formal",
      "descripcion": "Comodidad y estilo en cada prenda."
    }
  ],
  "total": 2,
  "showing": 2
}
```

**Caso sin resultados:**

```json
{
  "products": [],
  "total": 0,
  "showing": 0,
  "message": "No se encontraron productos con ese criterio."
}
```

### Validaciones

1. ✅ `limit` debe estar entre 1 y 50. Si excede, usar 50. Si es menor, usar 1.
2. ✅ Solo retornar productos con `disponible = 'Sí'`
3. ✅ Búsqueda en `query` debe ser case-insensitive
4. ✅ Si no se pasa ningún filtro, retornar todos los productos disponibles (respetando limit)

### Edge Cases

- **Query vacío o solo espacios:** Tratarlo como `null` (sin filtro)
- **Categoría/talla/color inválidos:** Ignorar el filtro (no retornar error)
- **Todos los filtros nulos:** Retornar primeros N productos disponibles

---

## 🔍 Tool 2: `get_product`

### Propósito

Obtener información detallada de un producto específico por su ID.

### Input Schema

```typescript
interface GetProductInput {
  product_id: number; // ID del producto (requerido)
}
```

**JSON Schema (para MCP):**

```json
{
  "type": "object",
  "properties": {
    "product_id": {
      "type": "number",
      "description": "ID único del producto a consultar"
    }
  },
  "required": ["product_id"]
}
```

### SQL Query

```sql
SELECT
  id,
  tipo_prenda,
  talla,
  color,
  cantidad_disponible,
  precio_50_u,
  precio_100_u,
  precio_200_u,
  disponible,
  categoria,
  descripcion
FROM products
WHERE id = ?;
```

**Prepared Statement Parameters:**

```typescript
[product_id];
```

### Output Schema

**Caso de éxito:**

```typescript
interface GetProductOutput {
  id: number;
  tipo_prenda: string;
  talla: string;
  color: string;
  cantidad_disponible: number;
  precios: {
    "50_unidades": number;
    "100_unidades": number;
    "200_unidades": number;
  };
  disponible: boolean; // Convertir "Sí"/"No" a true/false
  categoria: string;
  descripcion: string;
}
```

**Ejemplo de respuesta exitosa:**

```json
{
  "id": 1,
  "tipo_prenda": "Pantalón",
  "talla": "XXL",
  "color": "Verde",
  "cantidad_disponible": 177,
  "precios": {
    "50_unidades": 1058,
    "100_unidades": 1182,
    "200_unidades": 462
  },
  "disponible": true,
  "categoria": "Deportivo",
  "descripcion": "Ideal para uso diario."
}
```

**Caso de error (producto no encontrado):**

```json
{
  "error": "not_found",
  "message": "No existe un producto con ID 99."
}
```

**Caso de error (producto no disponible):**

```json
{
  "id": 42,
  "tipo_prenda": "Chaqueta",
  "talla": "M",
  "color": "Rojo",
  "cantidad_disponible": 0,
  "precios": {
    "50_unidades": 1500,
    "100_unidades": 1300,
    "200_unidades": 1100
  },
  "disponible": false,
  "categoria": "Casual",
  "descripcion": "Temporalmente sin stock",
  "message": "Este producto no está disponible actualmente."
}
```

### Validaciones

1. ✅ `product_id` debe ser un número entero positivo
2. ✅ Si el producto no existe, retornar error `not_found`
3. ✅ Convertir el campo `disponible` de "Sí"/"No" a booleano true/false
4. ✅ Incluir mensaje adicional si el producto existe pero no está disponible

### Edge Cases

- **ID negativo o cero:** Retornar error `not_found`
- **ID no numérico:** Retornar error de validación
- **Producto existe pero disponible='No':** Retornar datos completos + mensaje de advertencia

---

## 🛒 Tool 3: `create_cart`

### Propósito

Crear un nuevo carrito asociado a una conversación o actualizar uno existente, agregando productos.

### Input Schema

```typescript
interface CreateCartInput {
  conversation_id: string; // ID único de la conversación (requerido)
  items: Array<{
    product_id: number; // ID del producto a agregar
    qty: number; // Cantidad (mínimo 1)
  }>;
}
```

**JSON Schema (para MCP):**

```json
{
  "type": "object",
  "properties": {
    "conversation_id": {
      "type": "string",
      "description": "ID único de la conversación de Chatwoot/Laburen"
    },
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "product_id": {
            "type": "number",
            "description": "ID del producto a agregar"
          },
          "qty": {
            "type": "number",
            "minimum": 1,
            "description": "Cantidad de unidades a agregar"
          }
        },
        "required": ["product_id", "qty"]
      },
      "minItems": 1,
      "description": "Lista de productos a agregar al carrito"
    }
  },
  "required": ["conversation_id", "items"]
}
```

### SQL Queries (Transaccional)

**Paso 1: Verificar stock y disponibilidad de productos**

```sql
SELECT
  id,
  tipo_prenda,
  talla,
  color,
  cantidad_disponible,
  precio_50_u,
  disponible
FROM products
WHERE id IN (?, ?, ...);  -- Lista de product_ids
```

**Validación:**

- Si algún producto no existe → Error `product_not_found`
- Si algún producto tiene `disponible = 'No'` → Error `product_unavailable`
- Si qty solicitada > cantidad_disponible → Error `insufficient_stock`

**Paso 2: Crear o recuperar carrito existente**

```sql
INSERT INTO carts (conversation_id, created_at, updated_at)
VALUES (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (conversation_id)
DO UPDATE SET updated_at = CURRENT_TIMESTAMP
RETURNING id;
```

**Paso 3: Insertar/actualizar items (upsert)**

```sql
INSERT INTO cart_items (cart_id, product_id, qty)
VALUES (?, ?, ?)
ON CONFLICT (cart_id, product_id)
DO UPDATE SET qty = cart_items.qty + excluded.qty;
```

**Paso 4: Obtener carrito completo con totales**

```sql
SELECT
  ci.product_id,
  p.tipo_prenda,
  p.talla,
  p.color,
  p.precio_50_u,
  ci.qty,
  (p.precio_50_u * ci.qty) as subtotal
FROM cart_items ci
JOIN products p ON ci.product_id = p.id
WHERE ci.cart_id = ?;
```

### Output Schema

**Caso de éxito:**

```typescript
interface CreateCartOutput {
  cart_id: number;
  items: Array<{
    product_id: number;
    tipo_prenda: string;
    talla: string;
    color: string;
    precio_unitario: number; // precio_50_u
    qty: number;
    subtotal: number; // precio_unitario * qty
  }>;
  total: number; // Suma de todos los subtotales
  message: string;
}
```

**Ejemplo de respuesta exitosa:**

```json
{
  "cart_id": 1,
  "items": [
    {
      "product_id": 1,
      "tipo_prenda": "Pantalón",
      "talla": "XXL",
      "color": "Verde",
      "precio_unitario": 1058,
      "qty": 2,
      "subtotal": 2116
    },
    {
      "product_id": 3,
      "tipo_prenda": "Camiseta",
      "talla": "S",
      "color": "Negro",
      "precio_unitario": 1292,
      "qty": 1,
      "subtotal": 1292
    }
  ],
  "total": 3408,
  "message": "Carrito actualizado. Se agregaron 2 productos."
}
```

**Caso de error (stock insuficiente):**

```json
{
  "error": "insufficient_stock",
  "product_id": 2,
  "message": "El producto 'Camiseta XXL Blanco' solo tiene 33 unidades disponibles. Solicitaste 50."
}
```

**Caso de error (producto no disponible):**

```json
{
  "error": "product_unavailable",
  "product_id": 42,
  "message": "El producto 'Chaqueta M Rojo' no está disponible actualmente."
}
```

**Caso de error (producto no existe):**

```json
{
  "error": "product_not_found",
  "product_id": 999,
  "message": "No existe un producto con ID 999."
}
```

### Validaciones

1. ✅ `conversation_id` no puede estar vacío
2. ✅ `items` debe tener al menos 1 elemento
3. ✅ Cada `qty` debe ser >= 1
4. ✅ Verificar que todos los productos existan antes de crear el carrito
5. ✅ Validar stock disponible para cada producto
6. ✅ Validar que cada producto tenga `disponible = 'Sí'`
7. ✅ Si el carrito ya existe, hacer upsert (sumar cantidades)

### Edge Cases

- **Carrito ya existe:** Sumar cantidades a las existentes (no reemplazar)
- **qty = 0:** Rechazar (usar `update_cart` con qty=0 para eliminar)
- **Múltiples items del mismo producto en la request:** Sumar todas las qty antes de procesar
- **Transacción fallida:** Rollback completo, ningún cambio aplicado

### Nota sobre Precios

Para el MVP, el carrito usa `precio_50_u` como precio base. El agente puede informar al usuario sobre descuentos por volumen (100u, 200u) pero el cálculo del carrito usa precio estándar de 50 unidades.

---

## ✏️ Tool 4: `update_cart`

### Propósito

Modificar la cantidad de productos en un carrito existente o eliminar items (qty = 0).

### Input Schema

```typescript
interface UpdateCartInput {
  conversation_id: string; // ID de la conversación (requerido)
  updates: Array<{
    product_id: number; // ID del producto a modificar
    qty: number; // Nueva cantidad (0 = eliminar)
  }>;
}
```

**JSON Schema (para MCP):**

```json
{
  "type": "object",
  "properties": {
    "conversation_id": {
      "type": "string",
      "description": "ID único de la conversación"
    },
    "updates": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "product_id": {
            "type": "number",
            "description": "ID del producto a actualizar"
          },
          "qty": {
            "type": "number",
            "minimum": 0,
            "description": "Nueva cantidad. Si es 0, elimina el producto del carrito."
          }
        },
        "required": ["product_id", "qty"]
      },
      "minItems": 1,
      "description": "Lista de actualizaciones a aplicar"
    }
  },
  "required": ["conversation_id", "updates"]
}
```

### SQL Queries (Transaccional)

**Paso 1: Verificar que existe el carrito**

```sql
SELECT id FROM carts WHERE conversation_id = ?;
```

**Validación:**

- Si no existe → Error `cart_not_found`

**Paso 2a: Eliminar item (si qty = 0)**

```sql
DELETE FROM cart_items
WHERE cart_id = ? AND product_id = ?;
```

**Paso 2b: Actualizar cantidad (si qty > 0)**

```sql
-- Verificar stock disponible primero
SELECT cantidad_disponible, disponible
FROM products
WHERE id = ?;

-- Si pasa validación, actualizar
UPDATE cart_items
SET qty = ?
WHERE cart_id = ? AND product_id = ?;
```

**Paso 3: Actualizar timestamp del carrito**

```sql
UPDATE carts
SET updated_at = CURRENT_TIMESTAMP
WHERE id = ?;
```

**Paso 4: Obtener carrito actualizado (misma query que create_cart paso 4)**

```sql
SELECT
  ci.product_id,
  p.tipo_prenda,
  p.talla,
  p.color,
  p.precio_50_u,
  ci.qty,
  (p.precio_50_u * ci.qty) as subtotal
FROM cart_items ci
JOIN products p ON ci.product_id = p.id
WHERE ci.cart_id = ?;
```

### Output Schema

**Mismo formato que `create_cart`:**

**Ejemplo de respuesta exitosa (después de eliminar un item):**

```json
{
  "cart_id": 1,
  "items": [
    {
      "product_id": 1,
      "tipo_prenda": "Pantalón",
      "talla": "XXL",
      "color": "Verde",
      "precio_unitario": 1058,
      "qty": 2,
      "subtotal": 2116
    }
  ],
  "total": 2116,
  "message": "Carrito actualizado. Se eliminó 1 producto."
}
```

**Ejemplo de respuesta exitosa (carrito vacío después de eliminar todos):**

```json
{
  "cart_id": 1,
  "items": [],
  "total": 0,
  "message": "El carrito está vacío."
}
```

**Caso de error (carrito no existe):**

```json
{
  "error": "cart_not_found",
  "message": "No existe un carrito para esta conversación."
}
```

**Caso de error (producto no está en el carrito):**

```json
{
  "error": "item_not_in_cart",
  "product_id": 5,
  "message": "El producto con ID 5 no está en el carrito."
}
```

**Caso de error (stock insuficiente al actualizar):**

```json
{
  "error": "insufficient_stock",
  "product_id": 2,
  "message": "El producto 'Camiseta XXL Blanco' solo tiene 33 unidades disponibles."
}
```

### Validaciones

1. ✅ Verificar que el carrito existe para ese `conversation_id`
2. ✅ Para cada update con qty > 0, validar stock disponible
3. ✅ Si qty = 0, simplemente eliminar el item (no generar error si no existe)
4. ✅ Si el producto no está en el carrito y qty > 0, agregar error (no crearlo automáticamente)
5. ✅ Actualizar timestamp del carrito después de cualquier modificación

### Edge Cases

- **Carrito no existe:** Retornar error `cart_not_found`
- **Múltiples updates del mismo producto:** Aplicar en orden, el último prevalece
- **qty = 0 para producto que no está en carrito:** No generar error, simplemente continuar
- **Carrito queda vacío:** Mantener el carrito (no eliminarlo), retornar items = []
- **Producto ya no disponible:** Permitir disminuir qty, pero rechazar aumento

---

## 🏷️ Tool 5: `apply_labels`

### Propósito

Aplicar etiquetas CRM a una conversación en Chatwoot. Las etiquetas se acumulan — las nuevas se agregan sin eliminar las existentes.

### Input Schema

```typescript
interface ApplyLabelsInput {
  conversation_id: string; // ID de la conversación (requerido)
  labels: string[]; // Array de etiquetas a aplicar (mínimo 1)
}
```

**JSON Schema (para MCP):**

```json
{
  "type": "object",
  "properties": {
    "conversation_id": {
      "type": "string",
      "description": "ID de la conversación"
    },
    "labels": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 1,
      "description": "Array de etiquetas a aplicar"
    }
  },
  "required": ["conversation_id", "labels"]
}
```

### Etiquetas Válidas

```typescript
const VALID_LABELS = [
  "busqueda-productos",
  "carrito-creado",
  "carrito-editado",
  "derivado-a-humano",
  "motivo-consulta-envio",
  "motivo-consulta-pago",
  "motivo-solicitud-cliente",
  "producto-camiseta",
  "producto-chaqueta",
  "producto-falda",
  "producto-pantalon",
  "producto-sudadera",
];
```

### API Calls (Chatwoot)

**Paso 1: GET etiquetas actuales**

```
GET /api/v1/accounts/{account_id}/conversations/{conversation_id}/labels
Header: api_access_token: {token}
```

**Paso 2: Mergear etiquetas (sin duplicados)**

```typescript
const mergedLabels = [...new Set([...existingLabels, ...newLabels])];
```

**Paso 3: POST etiquetas mergeadas**

```
POST /api/v1/accounts/{account_id}/conversations/{conversation_id}/labels
Header: api_access_token: {token}, Content-Type: application/json
Body: { "labels": ["busqueda-productos", "carrito-creado", ...] }
```

> ⚠️ La API de Chatwoot **sobreescribe** todas las etiquetas con las enviadas. Por eso se hace GET + merge + POST.

### Parsing del conversation_id

El `conversation_id` de Laburen tiene formato compuesto: `chatwoot_{agent_id}_{bot_id}_{account_id}_{conv_id}`. Se extrae el último segmento numérico como el ID real de conversación de Chatwoot.

### Output Schema

**Caso de éxito:**

```json
{
  "success": true,
  "data": {
    "applied_labels": ["busqueda-productos", "carrito-creado", "producto-camiseta"],
    "message": "Etiquetas aplicadas correctamente."
  }
}
```

**Caso de error (etiquetas inválidas):**

```json
{
  "success": false,
  "error": "validation_error",
  "message": "Etiquetas inválidas: etiqueta-falsa"
}
```

**Caso de error (API Chatwoot):**

```json
{
  "success": false,
  "error": "chatwoot_api_error",
  "message": "Error de Chatwoot API: 401"
}
```

### Validaciones

1. ✅ `conversation_id` no puede estar vacío
2. ✅ `labels` debe tener al menos 1 elemento
3. ✅ Todas las etiquetas deben pertenecer al set de `VALID_LABELS`
4. ✅ Debe poder extraerse un ID numérico del `conversation_id`
5. ✅ Variables de entorno de Chatwoot deben estar configuradas

### Edge Cases

- **Etiqueta ya existe en la conversación:** Se incluye en el merge, no se duplica
- **API de Chatwoot caída:** Retorna error `chatwoot_api_error`
- **conversation_id sin formato esperado:** Retorna error de validación
- **GET falla pero POST podría funcionar:** Se procede con array vacío de existentes

### Variables de Entorno

| Variable             | Tipo   | Dónde se configura                  |
|----------------------|--------|-------------------------------------|
| `CHATWOOT_BASE_URL`  | string | `wrangler.toml` [vars]              |
| `CHATWOOT_ACCOUNT_ID`| string | `wrangler.toml` [vars]              |
| `CHATWOOT_API_TOKEN` | string | `wrangler secret put` (secreto)     |

---

## 🔐 Consideraciones de Implementación

### Error Handling Global

Todos los tools deben manejar errores de forma consistente:

```typescript
interface MCPError {
  error: string; // Código de error (snake_case)
  message: string; // Descripción legible para el usuario
  details?: any; // Información adicional (opcional)
}
```

**Códigos de error estándar:**

- `validation_error` - Parámetros inválidos
- `not_found` / `product_not_found` / `cart_not_found` - Recurso no encontrado
- `insufficient_stock` - Stock insuficiente
- `product_unavailable` - Producto no disponible
- `database_error` - Error de base de datos
- `internal_error` - Error interno del servidor

### Transacciones

Las operaciones que modifican datos (`create_cart`, `update_cart`) deben ejecutarse dentro de transacciones. `apply_labels` no usa transacciones de DB ya que se comunica con una API externa (Chatwoot).

```typescript
await env.DB.batch([statement1, statement2, statement3]);
```

Si alguna query falla, todo se revierte automáticamente.

### Logging

Registrar todas las operaciones para debugging:

```typescript
console.log(`[${tool_name}] Input:`, JSON.stringify(input));
console.log(`[${tool_name}] Result:`, JSON.stringify(output));
```

En caso de error:

```typescript
console.error(`[${tool_name}] Error:`, error.message);
```

### Performance

- Usar índices de DB para búsquedas frecuentes (ya creados en schema.sql)
- Limitar resultados de `list_products` (max 50)
- Cachear queries repetitivas si es necesario (futuro)

---

## ✅ Checklist de Implementación

Para cada tool:

- [ ] Definir JSON Schema completo con validaciones
- [ ] Implementar queries SQL con prepared statements
- [ ] Agregar validaciones de input
- [ ] Manejar todos los casos de error listados
- [ ] Implementar transacciones donde corresponda
- [ ] Registrar formato de output consistente
- [ ] Agregar logging para debugging
- [ ] Testear con datos reales de products.xlsx
- [ ] Documentar edge cases descubiertos

---

**Versión:** 1.0  
**Fecha:** 2026-02-06  
**Challenge:** Laburen AI Sales Agent
