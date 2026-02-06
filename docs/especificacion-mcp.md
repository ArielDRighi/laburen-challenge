# 📖 Documento Conceptual - MCP Server Endpoints

## Resumen de Arquitectura

Este proyecto implementa un **agente de ventas conversacional** que opera sobre WhatsApp mediante el **Model Context Protocol (MCP)**. El agente está orquestado por Laburen Platform, que ejecuta un LLM (Large Language Model) con capacidad de invocar herramientas (tools) expuestas por nuestro MCP Server. El servidor MCP está implementado como un **Cloudflare Worker** que se comunica con una base de datos **Cloudflare D1** (SQLite en el edge). La arquitectura sigue el patrón request-response: el usuario envía un mensaje por WhatsApp → Chatwoot CRM lo captura → Laburen analiza el intent con el LLM → el LLM decide invocar una herramienta MCP → nuestro Worker ejecuta la lógica de negocio consultando D1 → retorna datos estructurados → el LLM genera una respuesta en lenguaje natural → se envía al usuario. Cada conversación está aislada por `conversation_id`, garantizando que cada cliente tenga su propio carrito de compra independiente.

---

## 🛠️ Herramientas MCP (Tools)

El MCP Server expone 5 herramientas principales que el agente puede invocar según el contexto de la conversación:

### 1. `list_products` - Buscar Productos

**Propósito:** Buscar y filtrar productos disponibles en el catálogo.

**Parámetros:**
```typescript
{
  filters?: {
    name?: string;          // Búsqueda por nombre (LIKE %term%)
    description?: string;   // Búsqueda por descripción (LIKE %term%)
    min_price?: number;     // Filtro precio mínimo
    max_price?: number;     // Filtro precio máximo
  }
}
```

**Respuesta:**
```json
{
  "success": true,
  "products": [
    {
      "id": 1,
      "name": "Remera Negra",
      "description": "Remera 100% algodón",
      "price": 5000,
      "stock": 10
    }
  ],
  "count": 1
}
```

**Lógica:**
- Si no hay filtros, retorna todos los productos
- Aplica filtros con operador AND (todos deben cumplirse)
- Solo retorna productos con stock > 0
- Ordenados por nombre alfabéticamente

**Query SQL:**
```sql
SELECT * FROM products 
WHERE stock > 0
  AND (name LIKE ? OR ? IS NULL)
  AND (description LIKE ? OR ? IS NULL)
  AND (price >= ? OR ? IS NULL)
  AND (price <= ? OR ? IS NULL)
ORDER BY name ASC
```

---

### 2. `get_product` - Detalle de Producto

**Propósito:** Obtener información completa de un producto específico.

**Parámetros:**
```typescript
{
  id: number;  // ID del producto (requerido)
}
```

**Respuesta:**
```json
{
  "success": true,
  "product": {
    "id": 1,
    "name": "Remera Negra",
    "description": "Remera 100% algodón, talle universal",
    "price": 5000,
    "stock": 10
  }
}
```

**Errores:**
```json
{
  "success": false,
  "error": "Producto no encontrado"
}
```

**Query SQL:**
```sql
SELECT * FROM products WHERE id = ?
```

---

### 3. `create_cart` - Crear Carrito

**Propósito:** Crear un nuevo carrito asociado a una conversación y agregar items iniciales.

**Parámetros:**
```typescript
{
  conversation_id: string;  // ID único de la conversación (requerido)
  items: Array<{
    product_id: number;
    qty: number;            // Cantidad >= 1
  }>;                       // Mínimo 1 item (requerido)
}
```

**Respuesta:**
```json
{
  "success": true,
  "cart_id": 42,
  "items": [
    {
      "product_id": 1,
      "product_name": "Remera Negra",
      "qty": 2,
      "unit_price": 5000,
      "subtotal": 10000
    }
  ],
  "total": 10000
}
```

**Validaciones:**
1. Verificar que no exista carrito para ese `conversation_id` (unicidad)
2. Validar stock disponible para cada producto
3. Rechazar si algún producto no existe o no tiene stock suficiente

**Errores:**
```json
{
  "success": false,
  "error": "Stock insuficiente para Remera Negra (disponible: 5, solicitado: 10)"
}
```

**Transacción SQL:**
```sql
BEGIN TRANSACTION;
  -- Verificar stock
  SELECT stock FROM products WHERE id = ?;
  
  -- Crear carrito
  INSERT INTO carts (conversation_id) VALUES (?);
  
  -- Agregar items
  INSERT INTO cart_items (cart_id, product_id, qty) VALUES (?, ?, ?);
COMMIT;
```

---

### 4. `update_cart` - Actualizar Carrito

**Propósito:** Modificar la cantidad de un producto en el carrito o eliminarlo.

**Parámetros:**
```typescript
{
  conversation_id: string;  // ID de la conversación (requerido)
  product_id: number;       // ID del producto a modificar (requerido)
  qty: number;              // Nueva cantidad (0 = eliminar item)
}
```

**Respuesta:**
```json
{
  "success": true,
  "cart_id": 42,
  "items": [
    {
      "product_id": 1,
      "product_name": "Remera Negra",
      "qty": 3,
      "unit_price": 5000,
      "subtotal": 15000
    }
  ],
  "total": 15000
}
```

**Reglas:**
- Si `qty = 0` → Eliminar el item del carrito
- Si `qty > 0` → Validar stock y actualizar cantidad
- Si el carrito queda vacío, mantenerlo (no eliminarlo automáticamente)

**Validaciones:**
1. Verificar que exista el carrito para ese `conversation_id`
2. Verificar que el producto esté en el carrito
3. Validar stock si qty > 0

**Errores:**
```json
{
  "success": false,
  "error": "No existe un carrito para esta conversación"
}
```

**Query SQL:**
```sql
-- Si qty = 0
DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?;

-- Si qty > 0
UPDATE cart_items SET qty = ? WHERE cart_id = ? AND product_id = ?;
```

---

### 5. `handoff_to_human` - Derivar a Humano

**Propósito:** Marcar conversación para derivación a agente humano (opcional - manejo por Laburen/Chatwoot).

**Parámetros:**
```typescript
{
  conversation_id: string;  // ID de la conversación (requerido)
  reason?: string;          // Motivo de la derivación (opcional)
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Conversación marcada para atención humana"
}
```

**Nota:** Esta herramienta puede ser manejada directamente por Laburen Platform a través de su integración con Chatwoot. El MCP Server solo necesita confirmar la acción. Alternativamente, puede almacenar el estado en DB o simplemente retornar success para que Laburen aplique las etiquetas y notificaciones en Chatwoot.

---

## 🏗️ Decisiones de Diseño

### ¿Por qué Cloudflare D1?

1. **Co-localización:** El Worker y la DB están en el mismo edge de Cloudflare → latencia mínima (~1-5ms)
2. **Costo cero:** Plan gratuito suficiente para el scope del challenge (5GB storage, 5M reads/day)
3. **Simplicidad:** SQLite familiar, sin necesidad de gestionar conexiones o pools
4. **Zero-ops:** No hay servidores que administrar, escala automáticamente

### ¿Por qué 3 tablas separadas?

El diseño sigue **Tercera Forma Normal (3NF)** para evitar redundancia y permitir actualizaciones atómicas:

- **products** → Tabla maestra de catálogo (single source of truth)
- **carts** → Un carrito por conversación (1:1 con user session)
- **cart_items** → Many-to-many entre carts y products con cantidad

**Ventajas:**
- Cambios en precio/stock de productos no afectan carritos históricos
- Integridad referencial con `FOREIGN KEY` previene inconsistencias
- `ON DELETE CASCADE` limpia items automáticamente al borrar carrito
- Extensible: fácil agregar estados (`cart_status`), usuarios, historial

### ¿Por qué transacciones atómicas?

Las operaciones de carrito usan `BEGIN TRANSACTION` / `COMMIT` para garantizar atomicidad:

```typescript
// Ejemplo: create_cart debe ser atómico
// O se crean el carrito + todos los items, o no se crea nada
await env.DB.batch([
  env.DB.prepare("INSERT INTO carts..."),
  env.DB.prepare("INSERT INTO cart_items..."),
]);
```

Esto previene estados inconsistentes como "carrito sin items" o "items sin carrito".

### ¿Por qué validar stock antes de escribir?

**Regla de negocio crítica:** Un carrito no puede contener más unidades de las disponibles en stock.

```sql
-- Validación en cada operación
SELECT stock FROM products WHERE id = ?;
-- Si stock < qty_solicitada → retornar error
```

Sin esto, el sistema podría "vender" productos que no existen, generando conflictos de inventario.

---

## 📊 Diagrama de Arquitectura

Para una visualización detallada de los flujos de interacción, consultar:
- **[docs/flujo-agente.md](./flujo-agente.md)** - Diagramas de secuencia completos para cada herramienta

### Vista simplificada:

```
Usuario (WhatsApp)
       ↓
Meta Cloud API
       ↓
Chatwoot CRM ←→ Laburen Platform (LLM)
                      ↓
                 MCP Server (Cloudflare Worker)
                      ↓
                 Cloudflare D1 (SQLite)
```

---

## 🔐 Consideraciones de Seguridad

1. **Input Validation:** Sanitizar todos los parámetros antes de construir queries SQL
2. **Prepared Statements:** Usar siempre placeholders (`?`) para prevenir SQL injection
3. **Error Messages:** No exponer detalles de DB en errores (ej: "Error de sistema" en vez de "SQLITE_ERROR: table not found")
4. **Rate Limiting:** (Futuro) Implementar límites por `conversation_id` para prevenir abuso
5. **CORS:** El Worker solo debe aceptar requests del dominio de Laburen

---

## 🚀 API Response Format (Estándar)

Todas las herramientas retornan un formato consistente:

**Success:**
```json
{
  "success": true,
  "data": { /* resultado específico */ }
}
```

**Error:**
```json
{
  "success": false,
  "error": "Descripción del error en lenguaje claro"
}
```

Esto facilita que el LLM interprete respuestas y genere mensajes apropiados al usuario.

---

## 📚 Referencias

- **Cloudflare Workers:** https://developers.cloudflare.com/workers/
- **Cloudflare D1:** https://developers.cloudflare.com/d1/
- **Model Context Protocol:** https://modelcontextprotocol.io/
- **Laburen Platform:** https://dashboard.laburen.com/

---

**Documento versión 1.0** - Challenge Técnico AI Engineer · Laburen.com
