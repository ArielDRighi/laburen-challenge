# 🔐 Gestión de Secrets y Variables de Entorno

Esta guía explica cómo configurar y gestionar variables de entorno y secrets para el proyecto.

## 📋 Variables de Entorno vs Bindings vs Secrets

### Variables de Entorno (.dev.vars)
Para desarrollo local con `wrangler dev`:

```bash
# Copiar el ejemplo
cp .env.example .dev.vars

# Editar con tus valores
# Wrangler carga .dev.vars automáticamente
```

### Bindings (wrangler.toml)
Los bindings conectan tu Worker con servicios de Cloudflare (D1, R2, KV, etc.):

```toml
[[d1_databases]]
binding = "DB"              # Nombre en el código: env.DB
database_name = "laburen-challenge-db"
database_id = "xxx"         # ID obtenido al crear la DB
```

**Uso en código:**
```typescript
export default {
  async fetch(request: Request, env: Env) {
    // env.DB está disponible automáticamente
    const result = await env.DB.prepare("SELECT * FROM products").all();
    return new Response(JSON.stringify(result));
  }
}
```

### Secrets (Producción)
Para datos sensibles que no deben estar en wrangler.toml:

```bash
# Configurar un secret en producción
wrangler secret put API_KEY

# El CLI te pedirá el valor de manera segura
# El secret estará disponible en env.API_KEY
```

## 🚀 Setup Inicial

### 1. Instalar dependencias
```bash
npm install
```

### 2. Crear base de datos D1
```bash
wrangler d1 create laburen-challenge-db
```

Esto retorna:
```
✅ Successfully created DB 'laburen-challenge-db'
binding = "DB"
database_name = "laburen-challenge-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### 3. Actualizar wrangler.toml
Copia el `database_id` generado al archivo [wrangler.toml](wrangler.toml):

```toml
[[d1_databases]]
binding = "DB"
database_name = "laburen-challenge-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # 👈 Pegar aquí
```

### 4. Copiar variables de desarrollo
```bash
cp .env.example .dev.vars
# Editar .dev.vars con valores reales si es necesario
```

### 5. Inicializar el esquema de la base de datos
```bash
npm run db:init
# O: wrangler d1 execute laburen-challenge-db --file=./src/db/schema.sql
```

## 🔍 Verificación

### Probar conexión a D1 local
```bash
wrangler dev

# En otro terminal:
curl http://localhost:8787/test
```

### Ejecutar queries manualmente
```bash
# Query directo
wrangler d1 execute laburen-challenge-db --command "SELECT * FROM products"

# O usar el script:
npm run db:query -- --command "SELECT * FROM products"
```

## 🔐 Secrets en Producción

Si necesitas agregar secrets adicionales (API keys, tokens, etc.):

```bash
# Configurar secret
wrangler secret put CHATWOOT_API_TOKEN

# Listar secrets (sin ver valores)
wrangler secret list

# Eliminar secret
wrangler secret delete CHATWOOT_API_TOKEN
```

**Acceder al secret en código:**
```typescript
export default {
  async fetch(request: Request, env: Env) {
    const apiToken = env.CHATWOOT_API_TOKEN; // Disponible automáticamente
    // ...
  }
}
```

## ⚠️ Seguridad

**NUNCA commitees:**
- `.env`
- `.dev.vars`
- `.env.local`
- Cualquier archivo con valores reales de secrets

**SÍ commitea:**
- `.env.example` (template sin valores reales)
- `wrangler.toml` (excepto si hay secrets - usar `wrangler secret` en su lugar)

## 📚 Referencias

- [Cloudflare Workers - Environment Variables](https://developers.cloudflare.com/workers/configuration/environment-variables/)
- [Cloudflare D1 - Get Started](https://developers.cloudflare.com/d1/get-started/)
- [Wrangler - Secrets](https://developers.cloudflare.com/workers/wrangler/commands/#secret)
