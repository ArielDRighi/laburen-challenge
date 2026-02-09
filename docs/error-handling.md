# Manejo de Errores - MCP Server

## Filosofía

El MCP Server implementa un sistema de manejo de errores robusto y consistente que garantiza:

1. **Nunca explotar**: Todos los errores son capturados y convertidos en respuestas estructuradas
2. **Mensajes descriptivos**: Los errores incluyen información clara para que el LLM pueda comunicarlos al usuario
3. **Categorización consistente**: Cada tipo de error tiene un código único que permite identificar la causa
4. **HTTP status apropiados**: Los códigos de estado HTTP reflejan correctamente el tipo de error

## Códigos de Error

### Errores de Validación (400 Bad Request)

#### `validation_error`

Datos de entrada inválidos o malformados.

**Ejemplos:**

- ID de producto no es un número
- Cantidad negativa o cero donde debe ser positiva
- Tipos de datos incorrectos

```json
{
  "success": false,
  "error": "validation_error",
  "message": "Se requiere un product_id válido (número)."
}
```

#### `invalid_request`

Request MCP malformado o incompleto.

**Ejemplos:**

- Falta `params.name` en el request
- JSON inválido

```json
{
  "success": false,
  "error": "invalid_request",
  "message": "Request MCP inválido. Se requiere params.name"
}
```

#### `insufficient_stock`

No hay suficiente stock del producto solicitado.

```json
{
  "success": false,
  "error": "insufficient_stock",
  "message": "El producto 'Camisa L Blanco' solo tiene 111 unidades disponibles. Solicitaste 200.",
  "details": {
    "product_id": 55,
    "available": 111,
    "requested": 200
  }
}
```

#### `product_unavailable`

El producto existe pero no está disponible para venta.

```json
{
  "success": false,
  "error": "product_unavailable",
  "message": "El producto 'Camisa M Rojo' no está disponible actualmente.",
  "details": {
    "product_id": 42
  }
}
```

---

### Errores de Recursos No Encontrados (404 Not Found)

#### `not_found`

Recurso genérico no encontrado.

```json
{
  "success": false,
  "error": "not_found",
  "message": "No existe un producto con ID 999."
}
```

#### `product_not_found`

Producto(s) específico(s) no existen en la base de datos.

```json
{
  "success": false,
  "error": "product_not_found",
  "message": "No existen los productos con IDs: 999, 1000.",
  "details": {
    "missing_ids": [999, 1000]
  }
}
```

#### `cart_not_found`

No existe un carrito para la conversación especificada.

```json
{
  "success": false,
  "error": "cart_not_found",
  "message": "No existe un carrito para la conversación 'conv-123'.",
  "details": {
    "conversation_id": "conv-123"
  }
}
```

#### `item_not_found`

El producto no está en el carrito especificado.

```json
{
  "success": false,
  "error": "item_not_found",
  "message": "El producto con ID 30 no está en el carrito.",
  "details": {
    "product_id": 30
  }
}
```

#### `tool_not_found`

La herramienta MCP solicitada no existe.

```json
{
  "success": false,
  "error": "tool_not_found",
  "message": "La herramienta 'tool_inexistente' no existe.",
  "details": {
    "available_tools": ["list_products", "get_product", "create_cart", "update_cart", "get_cart", "apply_labels"]
  }
}
```

---

### Errores de API Externa

#### `chatwoot_api_error`

Error al comunicarse con la API de Chatwoot (al aplicar etiquetas).

```json
{
  "success": false,
  "error": "chatwoot_api_error",
  "message": "Error de Chatwoot API: 401"
}
```

---

### Errores de Servidor (500 Internal Server Error)

#### `database_error`

Error al acceder o consultar la base de datos D1.

```json
{
  "success": false,
  "error": "database_error",
  "message": "Error al acceder a la base de datos. Por favor, intenta nuevamente.",
  "details": {
    "error": "D1_ERROR: Connection timeout"
  }
}
```

#### `internal_error`

Error interno no categorizado del servidor.

```json
{
  "success": false,
  "error": "internal_error",
  "message": "Ocurrió un error interno. Por favor, intenta nuevamente.",
  "details": {
    "originalError": "TypeError: Cannot read property 'x' of undefined",
    "stack": "at Function.executeTool (/src/utils/response.ts:120:15)"
  }
}
```

#### `unknown_error`

Error completamente inesperado.

```json
{
  "success": false,
  "error": "unknown_error",
  "message": "Ocurrió un error desconocido.",
  "details": {
    "error": "Something went wrong"
  }
}
```

---

### Errores No Implementados (501 Not Implemented)

#### `not_implemented`

Funcionalidad aún no implementada.

```json
{
  "success": false,
  "error": "not_implemented",
  "message": "La herramienta update_cart aún no está implementada."
}
```

---

## Arquitectura de Error Handling

### Niveles de Captura

1. **Nivel Tool**: Cada tool tiene try/catch que captura errores específicos del dominio
2. **Nivel Wrapper**: `executeTool()` captura errores no manejados y los categoriza
3. **Nivel Handler Global**: El handler del Worker captura errores de parsing o ejecución

### Flujo de Ejecución

```
Request → Validación MCP → executeTool → Tool Function → Response
            ↓                   ↓              ↓
         [Error]            [Error]        [Error]
            ↓                   ↓              ↓
      Error Response ← Categorización ← Try/Catch
```

### Código Clave

**Wrapper de Tool Execution** (`src/utils/response.ts`):

```typescript
export async function executeTool(
  toolName: string,
  toolFn: (args: any, env: Env) => Promise<APIResponse>,
  args: any,
  env: Env,
): Promise<APIResponse> {
  try {
    return await toolFn(args, env);
  } catch (error) {
    // Categorización automática de errores
    if (error.message.includes("D1_ERROR")) {
      return errorResponse(ERROR_CODES.DATABASE_ERROR, "...");
    }
    return handleError(error);
  }
}
```

**Mapeo de Status HTTP** (`src/index.ts`):

```typescript
function getStatusCodeFromError(errorCode?: string): number {
  // 400: validación, stock, parámetros inválidos
  // 404: recursos no encontrados
  // 500: errores de servidor
  // 501: no implementado
}
```

---

## Testing de Errores

Cada error debe ser testeado para verificar:

1. ✅ Código de error correcto
2. ✅ Mensaje descriptivo en español
3. ✅ Status HTTP apropiado
4. ✅ Detalles adicionales cuando aplique
5. ✅ `isError: true` en respuesta MCP

### Ejemplo de Test

```bash
# Error: producto no encontrado (404)
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{"params":{"name":"get_product","arguments":{"product_id":999}}}'

# Respuesta esperada:
{
  "content": [{"type": "text", "text": "{\"success\":false,\"error\":\"not_found\",\"message\":\"No existe un producto con ID 999.\"}"}],
  "isError": true
}
```

---

## Best Practices

1. **Siempre usar ERROR_CODES**: No hardcodear strings de error
2. **Mensajes en español**: Claros y accionables para el usuario final
3. **Incluir details**: Información adicional útil para debugging
4. **Logs estructurados**: Incluir contexto (toolName, args, duration)
5. **No exponer internals**: Limitar stack traces en producción

---

## Monitoreo

Los logs incluyen:

- `[Tool Execution] Starting`: Inicio de ejecución con argumentos
- `[Tool Execution] Completed`: Éxito con duración
- `[Tool Execution] Failed`: Error con duración y mensaje
- `[Global Error Handler]`: Errores no categorizados

Ejemplo de log exitoso:

```
[Tool Execution] Starting: list_products {"args":{"limit":10}}
[Tool Execution] Completed: list_products {"success":true,"duration":"85ms"}
```

Ejemplo de log con error:

```
[Tool Execution] Starting: get_product {"args":{"product_id":999}}
[Tool Execution] Failed: get_product {"duration":"42ms","error":"No existe un producto..."}
```
