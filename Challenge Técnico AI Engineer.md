# 🏗️ Backlog — Challenge Técnico AI Engineer · Laburen.com

> **Objetivo:** Construir un agente de IA que venda productos por WhatsApp, usando un MCP propio, una base de datos, y conectado a un CRM (Chatwoot).
>
> **Plazo:** 5 días desde la entrega del challenge.
>
> **Criterios de peso:** Integración del Agente (55%) · Backend & MCP (40%) · Documentación (5%)

---

## 📌 Glosario rápido de tecnologías

| Tecnología                       | ¿Qué es? (Para Dummies)                                                                                                                                                                                                                                                                              |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **MCP (Model Context Protocol)** | Es un "puente" que le da superpoderes a un modelo de IA. En vez de solo chatear, el agente puede ejecutar acciones reales (buscar productos, crear carritos) gracias a funciones que vos definís en ese puente. Pensalo como un menú de acciones que el agente puede elegir usar cuando lo necesita. |
| **Cloudflare Workers**           | Es un servicio donde subís código y se ejecuta en la nube sin que vos tengas que administrar servidores. Es como un hosting "invisible" — subís tu código y ya funciona. Cloudflare tiene un plan gratuito.                                                                                          |
| **Chatwoot**                     | Es un CRM (sistema de gestión de clientes) open-source. Pensalo como un panel donde un equipo humano puede ver todas las conversaciones con clientes, ponerles etiquetas, y tomar el control si el bot necesita ayuda.                                                                               |
| **Laburen**                      | Es la plataforma donde configurás el agente de IA. Ahí conectás el MCP, elegís qué modelo de IA usar, y lo conectás a WhatsApp y Chatwoot. Es el "cerebro" que orquesta todo.                                                                                                                        |
| **Twilio**                       | ~~Descartado por costo ($20 USD mínimo).~~ Se usa un **chip prepago** + **Meta WhatsApp Cloud API** (gratis) como alternativa.                                                                                                                                                                       |
| **D1 (Cloudflare D1)**           | Es una base de datos SQLite que vive dentro de Cloudflare. Gratis, fácil de usar, y se despliega junto con tu Worker.                                                                                                                                                                                |

---

## 🗓️ Plan por días sugerido

| Día       | Foco principal                          | Tareas                                 |
| --------- | --------------------------------------- | -------------------------------------- |
| **Día 1** | Configuración inicial + Fase conceptual | 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2 |
| **Día 2** | Base de datos + Specs + MCP core        | 3.0, 3.1, 3.2, 3.3, 4.1, 4.2           |
| **Día 3** | MCP completo + Testing local            | 4.3, 4.4, 4.5, 4.6, 5.1                |
| **Día 4** | Deploy + Integración Agente + WhatsApp  | 5.2, 6.1, 6.2, 6.3, 6.4                |
| **Día 5** | Testing E2E + Fixes + Entrega           | 7.1, 7.2, 8.1                          |

---

## 📋 ÉPICA 1 — Configuración Inicial

### Tarea 1.1 · Crear cuenta en Laburen y activar créditos

**🟢 Para Dummies:** Entrás a la web de Laburen, te registrás como en cualquier plataforma, y usás un código de descuento especial (`challengexagents`) para obtener $20 USD de crédito. Esos créditos son para usar los modelos de IA durante el challenge.

**🔵 Justificación Técnica:** La plataforma Laburen actúa como orquestador del agente de IA. Provee la capa de integración entre el LLM, el MCP server, y los canales de comunicación (WhatsApp/Chatwoot). Sin esta cuenta activa, no es posible desplegar ni testear el agente en el entorno requerido por el challenge.

**Pasos:**

1. Ir a `https://dashboard.laburen.com/` y crear cuenta
2. Ingresar a la pasarela de pago y usar el código `challengexagents`
3. Verificar que se reciban las credenciales de Chatwoot por email
4. Guardar credenciales en lugar seguro

**Criterio de aceptación:** Cuenta activa con $20 USD y credenciales de Chatwoot recibidas.

---

### Tarea 1.2 · Configurar conexión con Chatwoot en Laburen

**🟢 Para Dummies:** Chatwoot es como un "centro de control" donde un humano puede ver todas las conversaciones que tiene el agente con los clientes. Acá lo que hacés es conectar tu agente de Laburen con ese centro de control, copiando y pegando unas credenciales en un formulario.

**🔵 Justificación Técnica:** Chatwoot funciona como el CRM del flujo. La integración permite que el agente registre conversaciones, aplique etiquetas (labels) para categorizar interacciones, y habilite la derivación a agentes humanos (human handoff). El Platform App Token autentica la comunicación server-to-server entre Laburen y la instancia de Chatwoot.

**Pasos:**

1. En Laburen, ir al formulario de configuración de Chatwoot
2. Completar:
   - Integration Name: `Ariel`
   - Chatwoot Server URL: `https://chatwootchallenge.laburen.com/`
   - Platform App Token: `7YRVVb8JzvDG8yfaVkZAQ48j`
3. Guardar y verificar conexión

**Criterio de aceptación:** Integración de Chatwoot configurada y verificada desde Laburen.

---

### Tarea 1.3 · Obtener número de WhatsApp y conectar a Chatwoot

**🟢 Para Dummies:** El agente necesita un número de teléfono real para hablar por WhatsApp. La forma más barata es comprar un chip prepago en un kiosco, ponerlo en un celular viejo (o dual SIM), y usar ese número para registrarte en la API de WhatsApp de Meta (Facebook), que es gratis. Después conectás Meta con Chatwoot para que los mensajes lleguen al CRM.

**🔵 Justificación Técnica:** El canal de interfaz requerido es WhatsApp, no un widget web. Se usa un número de celular real (chip prepago) porque Meta WhatsApp Cloud API lo acepta sin fricción, a diferencia de números virtuales que pueden ser rechazados. La arquitectura es: Chip prepago (número real) → Meta WhatsApp Cloud API (verificación por SMS) → Chatwoot (inbox con proveedor WhatsApp Cloud). Costo total: solo el chip (~$1000-2000 ARS). No se necesita Twilio.

> ⚠️ **TRAMPA CONOCIDA:** No intentes configurar WhatsApp vía Twilio. Te pedirán documentos de empresa, verificación de Facebook Business Manager, y $20 USD mínimo. Un chip prepago resuelve todo por una fracción del costo.

**Paso 1 — Comprar chip prepago y activar WhatsApp:**

1. Comprar un chip prepago en cualquier kiosco (Claro, Movistar, Personal — cualquiera sirve)
2. Poner el chip en un celular viejo o en tu celular dual SIM
3. Activar el chip (puede requerir una recarga mínima)
4. **NO** instalar WhatsApp personal en ese número — lo vamos a usar solo para la API

**Paso 2 — Configurar WhatsApp Cloud API en Meta:**

1. Ir a `developers.facebook.com` y loguearse con cuenta de Facebook
2. Crear nueva app: "Mis Apps" > "Crear App" > Tipo "Negocios"
3. Nombre: "Agente Laburen Challenge"
4. En el panel de la app, buscar el producto "WhatsApp" y darle "Configurar"

**Paso 3 — Registrar el número del chip en Meta:**

1. En Meta, ir a WhatsApp > "Configuración" > "Agregar número de teléfono"
2. Ignorar el número de prueba que ofrece Meta
3. Ingresar el número del chip prepago (con código de país +54)
4. Elegir recibir código por **SMS**
5. El SMS llega al celular con el chip → ingresar el código en Meta
6. Número verificado ✅

**Paso 4 — Conectar Chatwoot a Meta (WhatsApp Cloud):**

1. En Chatwoot > Configuración > Bandejas de entrada > Añadir Bandeja
2. Elegir "WhatsApp"
3. **IMPORTANTE:** En "Proveedor de API" seleccionar **"WhatsApp Cloud"** (NO seleccionar Twilio)
4. Completar con datos del panel de Meta (WhatsApp > API Setup):
   - **Phone Number ID** (identificador del número)
   - **Access Token** (token de acceso — usar el temporal para empezar)
5. Guardar y verificar

> 💡 **Sobre el Access Token temporal:** Dura 24hs. Para los 5 días del challenge, conviene configurar un "System User" en Meta Business Suite que genere un token permanente. Si complica mucho, se puede renovar el temporal cada día.

> 💡 **Sobre el celular:** Solo necesitás el celular con el chip encendido para recibir el SMS de verificación inicial. Después de eso, toda la comunicación pasa por la API de Meta y el celular no se usa más.

**Criterio de aceptación:** Enviar "Hola" desde tu WhatsApp personal al número del chip y que el mensaje aparezca en Chatwoot.

---

### Tarea 1.4 · Crear repositorio GitHub

**🟢 Para Dummies:** Creás un repositorio (una carpeta online para tu código) en GitHub con la estructura de carpetas que piden: una carpeta para el código del MCP y otra `/docs` para los documentos y diagramas.

**🔵 Justificación Técnica:** Es un entregable explícito del challenge. La estructura del repositorio refleja la separación de concerns entre el backend (MCP server) y la documentación conceptual. Un repo bien organizado facilita la evaluación y demuestra buenas prácticas de ingeniería.

**Estructura sugerida:**

```
laburen-challenge/
├── src/                  # Código del MCP Server (Cloudflare Worker)
│   ├── index.ts          # Entry point del Worker
│   ├── db/
│   │   └── schema.sql    # Esquema de la DB
│   ├── tools/            # Funciones/herramientas del MCP
│   │   ├── list-products.ts
│   │   ├── get-product.ts
│   │   ├── create-cart.ts
│   │   └── update-cart.ts
│   └── utils/
├── docs/                 # Fase conceptual
│   ├── flujo-agente.md   # Documento conceptual
│   └── diagrama.png      # Diagrama de flujo/secuencia
├── wrangler.toml         # Config de Cloudflare Worker
├── package.json
└── README.md
```

**Criterio de aceptación:** Repositorio creado con estructura base y README inicial.

---

### Tarea 1.5 · Crear archivo de contexto para AI Coding Assistant (CLAUDE.md)

**🟢 Para Dummies:** Cuando trabajás con herramientas como Claude Code o GitHub Copilot, ellas "leen" archivos especiales para entender tu proyecto. El archivo `CLAUDE.md` (o `.cursorrules`, dependiendo la herramienta) es como un briefing que le dice a tu asistente de IA: "este proyecto usa estas tecnologías, esta es la estructura de carpetas, estos son los comandos importantes". Así cuando le pedís que genere código, ya sabe el contexto sin que se lo repitas.

**🔵 Justificación Técnica:** Un archivo de contexto de proyecto estandarizado maximiza la calidad del output de cualquier AI coding assistant. Define el stack tecnológico, convenciones de código, arquitectura del proyecto, y reglas de negocio como contexto persistente. Esto reduce el prompt engineering repetitivo en cada interacción y asegura consistencia en el código generado. Es una práctica estándar en el workflow de AI-assisted development.

**Contenido del CLAUDE.md:**

```markdown
# Laburen AI Sales Agent — MCP Server

## Stack

- Runtime: Cloudflare Workers (TypeScript)
- Database: Cloudflare D1 (SQLite)
- Protocol: MCP (Model Context Protocol)
- Deployment: Wrangler CLI

## Estructura del proyecto

src/
├── index.ts → Entry point del Worker, handler MCP
├── db/schema.sql → Esquema de la base de datos
├── tools/ → Cada tool MCP en su propio archivo
└── utils/ → Helpers compartidos (error handling, types)

## Comandos clave

- `wrangler dev` → Dev server local
- `wrangler deploy` → Deploy a Cloudflare
- `wrangler d1 execute laburen-challenge-db --command "SQL"` → Query a D1

## Reglas de negocio

- Un carrito por conversación (conversation_id único)
- Validar stock antes de agregar items al carrito
- qty = 0 en update_cart elimina el item
- Los tools deben retornar errores descriptivos, nunca explotar

## Convenciones

- TypeScript estricto
- Funciones async/await (no callbacks)
- Error handling con try/catch en cada tool
- Respuestas MCP con estructura consistente
```

**Criterio de aceptación:** Archivo en la raíz del repo que cualquier AI coding assistant pueda consumir.

---

### Tarea 1.6 · Configurar variables de entorno y secrets

**🟢 Para Dummies:** Las "variables de entorno" son datos sensibles o de configuración que no querés poner directo en el código (como contraseñas o IDs). Se guardan en un archivo especial (`.env`) que nunca se sube a GitHub. También se configuran en Cloudflare para que el Worker las pueda usar en producción. Es como tener una caja fuerte para datos sensibles.

**🔵 Justificación Técnica:** Separar configuración de código es una best practice de seguridad (12-factor app). Cloudflare Workers usa `wrangler secret put` para secrets y `wrangler.toml` para bindings de D1. Se crea un `.env.example` documentando las variables necesarias sin valores reales para que cualquier evaluador pueda replicar el setup. El `.gitignore` debe excluir `.env` y `.dev.vars`.

**Variables necesarias:**

```
# .env.example / .dev.vars
CLOUDFLARE_D1_DATABASE_ID=<id-de-tu-base-d1>

# Estos se configuran en wrangler.toml como bindings, no como env vars:
# [[d1_databases]]
# binding = "DB"
# database_name = "laburen-challenge-db"
# database_id = "<id>"
```

**Pasos:**

1. Crear `.env.example` con todas las variables documentadas
2. Crear `.dev.vars` local con valores reales (para desarrollo)
3. Agregar `.env`, `.dev.vars` al `.gitignore`
4. Configurar bindings de D1 en `wrangler.toml`
5. Si hay secrets adicionales, configurar con `wrangler secret put`

**Criterio de aceptación:** Variables de entorno documentadas, secrets configurados, nada sensible en el repo.

---

## 📋 ÉPICA 2 — Fase Conceptual (Documentación)

### Tarea 2.1 · Crear diagrama de flujo de interacción del agente

**🟢 Para Dummies:** Tenés que hacer un dibujo (diagrama) que muestre paso a paso qué pasa cuando un cliente le escribe al agente. Por ejemplo: "el cliente dice 'quiero ver remeras' → el agente busca en la base de datos → le muestra las remeras → el cliente dice 'quiero 2 de la roja' → el agente crea un carrito", etc. Es como un mapa de la conversación.

**🔵 Justificación Técnica:** El diagrama de secuencia documenta la arquitectura de comunicación entre los componentes del sistema: Usuario ↔ WhatsApp ↔ Chatwoot ↔ Laburen (LLM) ↔ MCP Server ↔ Base de Datos. Demuestra comprensión del flujo request/response, el rol de cada componente, y los puntos de decisión del agente (cuándo usar qué herramienta, cuándo derivar a humano).

**Contenido del diagrama:**

- Flujo 1: Explorar productos (usuario pregunta → agente llama `list_products` → muestra resultados)
- Flujo 2: Ver detalle de producto (usuario pide más info → agente llama `get_product`)
- Flujo 3: Crear carrito (usuario expresa intención de compra → agente llama `create_cart` → agrega etiquetas en CRM)
- Flujo 4: Editar carrito (usuario pide cambio → agente llama `update_cart`)
- Flujo 5: Derivar a humano (agente detecta necesidad → abre conversación en Chatwoot con etiquetas de contexto)

**Herramienta sugerida:** Mermaid (se puede escribir como código y renderiza diagramas), draw.io, o Excalidraw.

**Criterio de aceptación:** Diagrama que cubra los 5 flujos principales, guardado en `/docs`.

---

### Tarea 2.2 · Escribir documento conceptual con endpoints

**🟢 Para Dummies:** Es un documento corto (máximo 2 páginas) donde explicás en palabras qué hace tu agente, qué funciones tiene disponibles (como "buscar productos", "crear carrito"), y cómo interactúa con el cliente. Es como el "manual de instrucciones" del agente.

**🔵 Justificación Técnica:** Este documento mapea las capacidades del agente a las herramientas (tools) expuestas por el MCP server. Define el contrato de cada endpoint: nombre de la función, parámetros de entrada, respuesta esperada, y el contexto en el que el LLM debe invocarla. Es esencialmente la especificación funcional del MCP.

**Contenido sugerido:**

1. Resumen de arquitectura (1 párrafo)
2. Tabla de herramientas MCP:
   - `list_products` — Buscar productos con filtros opcionales (name, description)
   - `get_product` — Obtener detalle de un producto por ID
   - `create_cart` — Crear carrito y agregar items
   - `update_cart` — Modificar cantidades o eliminar items del carrito
   - `handoff_to_human` — Derivar conversación a agente humano
3. Diagrama incluido o referenciado
4. Decisiones de diseño relevantes (por qué D1, por qué esa estructura de tools)

**Criterio de aceptación:** Documento ≤ 2 páginas en `/docs` con endpoints y diagrama.

---

## 📋 ÉPICA 3 — Cloudflare + Base de Datos

### Tarea 3.0 · Crear cuenta en Cloudflare e instalar Wrangler CLI

**🟢 Para Dummies:** Antes de poder crear la base de datos o subir código, necesitás una cuenta en Cloudflare (gratis) y instalar su herramienta de línea de comandos llamada Wrangler. Wrangler es como un control remoto para Cloudflare: desde tu terminal podés crear bases de datos, subir código, y administrar todo sin entrar a la web.

**🔵 Justificación Técnica:** Cloudflare es un requisito explícito del challenge para el deploy del MCP server. Wrangler CLI es la herramienta oficial para interactuar con Cloudflare Workers y D1. Se necesita autenticación previa (`wrangler login`) antes de poder crear recursos como bases de datos D1. El plan gratuito de Cloudflare es suficiente para este challenge.

**Pasos:**

1. Crear cuenta en `https://dash.cloudflare.com/` (plan gratuito)
2. Instalar Wrangler CLI: `npm install -g wrangler`
3. Autenticarse: `wrangler login` (abre el navegador para OAuth)
4. Verificar: `wrangler whoami` (debe mostrar tu cuenta)

**Criterio de aceptación:** `wrangler whoami` muestra tu cuenta de Cloudflare correctamente.

---

### Tarea 3.1 · Diseñar e implementar esquema de base de datos en Cloudflare D1

**🟢 Para Dummies:** Necesitás crear las "tablas" donde se va a guardar la información. Pensá en tablas como hojas de Excel: una hoja para productos (tipo de prenda, talla, color, precios por volumen), otra para carritos de compra, y otra para los items dentro de cada carrito. Cloudflare D1 es una base de datos gratuita que vive en la nube de Cloudflare.

**🔵 Justificación Técnica:** Se utiliza Cloudflare D1 (SQLite edge database) por co-localización con el Worker, latencia mínima, y zero-cost para el tier gratuito. El esquema fue diseñado a partir del análisis del archivo `products.xlsx` provisto, que contiene 100 productos de indumentaria con precios escalonados por volumen (50, 100 y 200 unidades), tallas, colores, y categorías. El esquema normalizado respeta la 3NF y soporta extensibilidad futura.

**Datos reales del products.xlsx (100 filas, 11 columnas):**
| Columna | Tipo | Ejemplo | Notas |
|---|---|---|---|
| ID | int | 1, 2, 3... | PK secuencial |
| TIPO_PRENDA | text | Pantalón, Camiseta, Falda, Sudadera, Chaqueta | Nombre del producto |
| TALLA | text | S, M, L, XL, XXL | 5 tallas |
| COLOR | text | Verde, Blanco, Negro, Amarillo, Gris | Varios colores |
| CANTIDAD_DISPONIBLE | int | 177, 33, 457... | Stock real |
| PRECIO_50_U | int | 1058, 510... | Precio unitario para pedido de 50 unidades |
| PRECIO_100_U | int | 1182, 975... | Precio unitario para pedido de 100 unidades |
| PRECIO_200_U | int | 462, 739... | Precio unitario para pedido de 200 unidades |
| DISPONIBLE | text | Sí / No | Flag de disponibilidad |
| CATEGORÍA | text | Deportivo, Casual, Formal | 3 categorías |
| DESCRIPCIÓN | text | "Ideal para uso diario." | Descripción corta |

**Esquema SQL:**

```sql
-- Tabla de productos (refleja la estructura real del XLSX)
CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  tipo_prenda TEXT NOT NULL,
  talla TEXT NOT NULL,
  color TEXT NOT NULL,
  cantidad_disponible INTEGER NOT NULL DEFAULT 0,
  precio_50_u INTEGER NOT NULL,
  precio_100_u INTEGER NOT NULL,
  precio_200_u INTEGER NOT NULL,
  disponible TEXT NOT NULL DEFAULT 'Sí',
  categoria TEXT NOT NULL,
  descripcion TEXT
);

-- Tabla de carritos (uno por conversación)
CREATE TABLE carts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Items del carrito
CREATE TABLE cart_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cart_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id),
  UNIQUE(cart_id, product_id)
);

-- Índices para búsqueda de productos
CREATE INDEX idx_products_tipo ON products(tipo_prenda);
CREATE INDEX idx_products_categoria ON products(categoria);
CREATE INDEX idx_products_talla ON products(talla);
CREATE INDEX idx_products_color ON products(color);
```

**Pasos:**

1. Crear la base D1: `wrangler d1 create laburen-challenge-db`
2. Anotar el `database_id` que devuelve el comando
3. Crear archivo `src/db/schema.sql` con las tablas
4. Ejecutar migración: `wrangler d1 execute laburen-challenge-db --file=./src/db/schema.sql`
5. Verificar: `wrangler d1 execute laburen-challenge-db --command "SELECT name FROM sqlite_master WHERE type='table'"`

**Criterio de aceptación:** Base de datos creada en D1 con las 3 tablas, índices, y constraint UNIQUE en cart_items.

---

### Tarea 3.2 · Importar productos desde el archivo XLSX a la base de datos

**🟢 Para Dummies:** Te dan un archivo Excel con 100 productos de ropa. Tenés que escribir un script que lea ese Excel y meta cada fila como un producto en tu base de datos. Es como copiar datos de una planilla a otra, pero automatizado.

**🔵 Justificación Técnica:** El challenge provee `products.xlsx` como fuente de datos canónica. Se necesita un script de seed (población inicial) que parsee el archivo XLSX, transforme los datos al formato del esquema, y los inserte en D1. Esto se puede hacer con un script Node.js local usando la librería `xlsx` y la CLI de Wrangler para ejecutar los INSERTs contra D1 remotamente.

**Mapeo de columnas XLSX → DB:**
| XLSX | DB |
|---|---|
| ID | id |
| TIPO_PRENDA | tipo_prenda |
| TALLA | talla |
| COLOR | color |
| CANTIDAD_DISPONIBLE | cantidad_disponible |
| PRECIO_50_U | precio_50_u |
| PRECIO_100_U | precio_100_u |
| PRECIO_200_U | precio_200_u |
| DISPONIBLE | disponible |
| CATEGORÍA | categoria |
| DESCRIPCIÓN | descripcion |

**Pasos:**

1. Crear script `scripts/seed.ts` que:
   - Lee el archivo XLSX con la librería `xlsx`
   - Mapea columnas del Excel a campos de la tabla
   - Genera sentencias INSERT escapando strings correctamente
   - Produce un archivo `seed.sql`
2. Ejecutar seed contra D1: `wrangler d1 execute laburen-challenge-db --file=./scripts/seed.sql`
3. Verificar con query: `wrangler d1 execute laburen-challenge-db --command "SELECT COUNT(*) FROM products"`
4. Verificar datos: `wrangler d1 execute laburen-challenge-db --command "SELECT * FROM products LIMIT 3"`

**Criterio de aceptación:** 100 productos del XLSX cargados en la tabla `products` de D1 con todos los campos correctos.

---

### Tarea 3.3 · Crear specs técnicas detalladas por cada tool MCP

**🟢 Para Dummies:** Antes de ponerte a programar, escribís una "hoja de especificaciones" para cada función del agente. Es como una receta de cocina: "esta función recibe tal cosa, hace tal consulta a la base de datos, y devuelve tal resultado". Esto es clave si trabajás con Claude Code o Copilot, porque le das esta spec y el AI te genera el código mucho mejor.

**🔵 Justificación Técnica:** Las especificaciones técnicas actúan como contrato entre el diseño y la implementación. Definen input schema (JSON Schema con tipos, validaciones, y descripciones), output schema, query SQL exacta, manejo de errores, y edge cases. Este documento se puede usar directamente como prompt para un AI coding assistant, garantizando implementación precisa. Es la pieza central del workflow AI-assisted development.

**Formato por tool:**

---

#### `list_products`

**Input:**

```json
{
  "query": "string | optional — texto libre para buscar en tipo_prenda, color, categoría o descripción",
  "categoria": "string | optional — filtro exacto: 'Deportivo', 'Casual', 'Formal'",
  "talla": "string | optional — filtro exacto: 'S', 'M', 'L', 'XL', 'XXL'",
  "limit": "number | optional — default 10, max 50"
}
```

**SQL:**

```sql
-- Construcción dinámica de WHERE según filtros presentes
SELECT id, tipo_prenda, talla, color, cantidad_disponible,
       precio_50_u, precio_100_u, precio_200_u,
       disponible, categoria, descripcion
FROM products
WHERE disponible = 'Sí'
  AND (? IS NULL OR LOWER(tipo_prenda) LIKE LOWER('%' || ? || '%')
       OR LOWER(color) LIKE LOWER('%' || ? || '%')
       OR LOWER(descripcion) LIKE LOWER('%' || ? || '%'))
  AND (? IS NULL OR categoria = ?)
  AND (? IS NULL OR talla = ?)
LIMIT ?;
```

**Output (éxito):**

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
    }
  ],
  "total": 15,
  "showing": 10
}
```

**Output (sin resultados):**

```json
{ "products": [], "total": 0, "showing": 0, "message": "No se encontraron productos con ese criterio." }
```

---

#### `get_product`

**Input:**

```json
{ "product_id": "number — requerido" }
```

**SQL:**

```sql
SELECT id, tipo_prenda, talla, color, cantidad_disponible,
       precio_50_u, precio_100_u, precio_200_u,
       disponible, categoria, descripcion
FROM products WHERE id = ?;
```

**Output (éxito):**

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

**Output (error):**

```json
{ "error": "not_found", "message": "No existe un producto con ID 99." }
```

---

#### `create_cart`

**Input:**

```json
{
  "conversation_id": "string — requerido, ID de la conversación",
  "items": [{ "product_id": 1, "qty": 2 }]
}
```

**SQL (transaccional):**

```sql
-- 1. Verificar stock y disponibilidad de cada producto
SELECT id, tipo_prenda, talla, color, cantidad_disponible, precio_50_u, disponible
FROM products WHERE id IN (?);

-- 2. Crear o recuperar carrito
INSERT INTO carts (conversation_id) VALUES (?)
  ON CONFLICT (conversation_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
  RETURNING id;

-- 3. Insertar items (upsert)
INSERT INTO cart_items (cart_id, product_id, qty) VALUES (?, ?, ?)
  ON CONFLICT (cart_id, product_id) DO UPDATE SET qty = cart_items.qty + excluded.qty;

-- 4. Retornar carrito completo
SELECT ci.product_id, p.tipo_prenda, p.talla, p.color, p.precio_50_u, ci.qty,
       (p.precio_50_u * ci.qty) as subtotal
FROM cart_items ci JOIN products p ON ci.product_id = p.id
WHERE ci.cart_id = ?;
```

> **Nota sobre precios:** Para el MVP, el carrito usa `precio_50_u` como precio base. El agente puede informar al usuario sobre los descuentos por volumen (100u, 200u) pero el cálculo del carrito usa el precio estándar.

**Output (éxito):**

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
  "message": "Carrito actualizado."
}
```

**Output (error stock):**

```json
{ "error": "insufficient_stock", "message": "El producto 'Pantalón XXL Verde' solo tiene 3 unidades disponibles." }
```

**Output (error disponibilidad):**

```json
{ "error": "product_unavailable", "message": "El producto 'Camiseta M Blanco' no está disponible actualmente." }
```

---

#### `update_cart`

**Input:**

```json
{
  "conversation_id": "string — requerido",
  "updates": [{ "product_id": 1, "qty": 0 }]
}
```

**SQL:**

```sql
-- qty = 0 → eliminar
DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?;

-- qty > 0 → actualizar
UPDATE cart_items SET qty = ? WHERE cart_id = ? AND product_id = ?;

-- Retornar carrito actualizado (misma query que create_cart paso 4)
```

**Output:** Mismo formato que `create_cart`.

---

**Criterio de aceptación:** Documento de specs completo que pueda usarse directamente como prompt para implementación con AI coding assistant.

---

## 📋 ÉPICA 4 — MCP Server (Cloudflare Worker)

### Tarea 4.1 · Inicializar proyecto Cloudflare Worker con MCP

**🟢 Para Dummies:** Un "Worker" es un programita que vive en la nube de Cloudflare y responde cuando alguien le hace una petición. El MCP (Model Context Protocol) es un estándar que define cómo un agente de IA puede llamar a funciones externas. Acá creás el proyecto base que va a contener todas las funciones que el agente puede usar.

**🔵 Justificación Técnica:** Cloudflare Workers ejecutan código en el edge (V8 isolates), lo que garantiza baja latencia global. El MCP server expone herramientas (tools) que el LLM puede invocar mediante function calling. Se usa el SDK oficial de MCP para TypeScript, que maneja el protocolo de comunicación, serialización de parámetros, y respuestas estructuradas.

**Pasos:**

1. Crear proyecto: `npm create cloudflare@latest laburen-mcp-server`
2. Seleccionar template de Worker (TypeScript)
3. Instalar dependencia MCP: `npm install @modelcontextprotocol/sdk` (o la que Cloudflare recomiende)
4. Configurar `wrangler.toml` con el binding a D1
5. Crear estructura base del entry point con el handler MCP

**Criterio de aceptación:** Proyecto creado, configurado con D1 binding, y Worker ejecutándose localmente con `wrangler dev`.

---

### Tarea 4.2 · Implementar herramienta MCP: `list_products`

**🟢 Para Dummies:** Esta es la primera "habilidad" del agente. Cuando un cliente dice "quiero ver zapatillas" o "qué tienen de oferta", el agente usa esta función para buscar productos en la base de datos. Puede filtrar por nombre o descripción. Es como darle al agente acceso a buscar en el catálogo.

**🔵 Justificación Técnica:** `list_products` es un tool MCP que acepta parámetros opcionales de filtrado (`query`: string) y ejecuta una consulta SQL con `LIKE` sobre `name` y `description`. Retorna un array paginado de productos con campos relevantes. Se implementa búsqueda case-insensitive y se limita el resultado a un máximo razonable (ej: 10 items) para no saturar el contexto del LLM.

**Definición del tool:**

```typescript
{
  name: "list_products",
  description: "Busca productos en el catálogo. Puede filtrar por nombre o descripción.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Texto para buscar en nombre o descripción del producto (opcional)"
      },
      limit: {
        type: "number",
        description: "Cantidad máxima de resultados (default: 10)"
      }
    }
  }
}
```

**Criterio de aceptación:** Llamar a `list_products` desde el MCP retorna productos filtrados desde D1.

---

### Tarea 4.3 · Implementar herramienta MCP: `get_product`

**🟢 Para Dummies:** Cuando el cliente pregunta "¿cuánto cuesta ese producto?" o "dame más detalles de X", el agente usa esta función para traer toda la info de un producto específico: nombre, descripción, precio, y cuántos hay en stock.

**🔵 Justificación Técnica:** `get_product` recibe un `product_id` y retorna el registro completo del producto. Incluye validación de existencia (retorna error descriptivo si el ID no existe) y verifica disponibilidad de stock. Separar esta funcionalidad de `list_products` sigue el principio de responsabilidad única y permite al LLM ser más preciso en sus invocaciones.

**Definición del tool:**

```typescript
{
  name: "get_product",
  description: "Obtiene los detalles completos de un producto específico por su ID.",
  inputSchema: {
    type: "object",
    properties: {
      product_id: {
        type: "number",
        description: "ID del producto"
      }
    },
    required: ["product_id"]
  }
}
```

**Criterio de aceptación:** Llamar a `get_product` con un ID válido retorna el producto completo; con ID inválido retorna error claro.

---

### Tarea 4.4 · Implementar herramienta MCP: `create_cart`

**🟢 Para Dummies:** Cuando el cliente dice "quiero comprar esto" o "agregá eso al carrito", el agente usa esta función para crear un carrito de compras (si no existe) y meter productos adentro. Cada conversación tiene su propio carrito, así que si dos personas hablan a la vez, cada una tiene el suyo.

**🔵 Justificación Técnica:** `create_cart` implementa lógica de upsert: si ya existe un carrito para la `conversation_id`, agrega items; si no, crea uno nuevo. Valida stock disponible antes de agregar items, usa transacciones SQL para garantizar atomicidad (no se crea un carrito vacío si falla la inserción del item), y retorna el estado actualizado del carrito completo con items y totales.

**Definición del tool:**

```typescript
{
  name: "create_cart",
  description: "Crea un carrito de compras o agrega productos al carrito existente de la conversación actual.",
  inputSchema: {
    type: "object",
    properties: {
      conversation_id: {
        type: "string",
        description: "ID de la conversación actual"
      },
      items: {
        type: "array",
        description: "Productos a agregar",
        items: {
          type: "object",
          properties: {
            product_id: { type: "number" },
            qty: { type: "number", description: "Cantidad (default: 1)" }
          },
          required: ["product_id"]
        }
      }
    },
    required: ["conversation_id", "items"]
  }
}
```

**Criterio de aceptación:** Carrito creado con items, validación de stock, y retorno del resumen del carrito con total.

---

### Tarea 4.5 · Implementar herramienta MCP: `update_cart` (Extra)

**🟢 Para Dummies:** Si el cliente dice "sacame una remera" o "quiero 3 en vez de 2", el agente usa esta función para cambiar lo que hay en el carrito. Puede cambiar cantidades o eliminar productos. Si la cantidad queda en 0, el producto se saca del carrito.

**🔵 Justificación Técnica:** `update_cart` permite operaciones de modificación sobre cart_items existentes. Soporta actualización de cantidad (qty) y eliminación (qty = 0 o flag `remove`). Incluye validación de stock para incrementos, integridad referencial, y retorna el estado actualizado del carrito. Implementar esta funcionalidad demuestra capacidad de gestión CRUD completa.

**Definición del tool:**

```typescript
{
  name: "update_cart",
  description: "Actualiza cantidades o elimina productos del carrito existente.",
  inputSchema: {
    type: "object",
    properties: {
      conversation_id: {
        type: "string",
        description: "ID de la conversación actual"
      },
      updates: {
        type: "array",
        items: {
          type: "object",
          properties: {
            product_id: { type: "number" },
            qty: { type: "number", description: "Nueva cantidad. 0 para eliminar." }
          },
          required: ["product_id", "qty"]
        }
      }
    },
    required: ["conversation_id", "updates"]
  }
}
```

**Criterio de aceptación:** Actualización y eliminación de items funcional, con validaciones y retorno de carrito actualizado.

---

### Tarea 4.6 · Implementar manejo de errores global en el MCP

**🟢 Para Dummies:** Las cosas fallan: la base de datos puede no responder, el cliente puede pedir un producto que no existe, etc. Acá te asegurás de que cuando algo sale mal, el agente no se rompa sino que responda con un mensaje claro como "no encontré ese producto" en vez de explotar.

**🔵 Justificación Técnica:** Un MCP server robusto necesita error handling consistente. Se implementa un wrapper que captura excepciones en cada tool, las categoriza (not_found, validation_error, db_error, etc.), y retorna respuestas MCP con `isError: true` y mensajes descriptivos que el LLM pueda interpretar para comunicar al usuario. Esto impacta directamente en el 40% del peso de evaluación (Backend & MCP).

**Casos a cubrir:**

- Producto no encontrado (404)
- Stock insuficiente (400)
- Carrito no encontrado (404)
- Parámetros inválidos (400)
- Error de base de datos (500)

**Criterio de aceptación:** Todos los tools retornan errores descriptivos sin romper el flujo del agente.

---

## 📋 ÉPICA 5 — Testing Local + Deploy en Cloudflare

### Tarea 5.1 · Testing local de todos los tools con wrangler dev

**🟢 Para Dummies:** Antes de subir nada a internet, probás todo en tu propia computadora. El comando `wrangler dev` levanta un servidor local que simula Cloudflare. Podés mandarle peticiones (con una herramienta como Postman o curl) para verificar que cada función responde bien. Es como probar una receta antes de servírsela a alguien.

**🔵 Justificación Técnica:** El testing local contra `wrangler dev --local` usa Miniflare (emulador de Workers) con una instancia D1 local, lo que permite validar la lógica de negocio, queries SQL, y manejo de errores sin consumir recursos de producción ni créditos. Es esencial antes del deploy para detectar bugs en un entorno controlado. Los tests se ejecutan como requests HTTP al endpoint MCP local.

**Pasos:**

1. Ejecutar `wrangler dev --local`
2. Probar cada tool manualmente:
   - `list_products` sin filtro → debe retornar productos
   - `list_products` con query → debe filtrar correctamente
   - `get_product` con ID válido → debe retornar producto
   - `get_product` con ID inválido → debe retornar error descriptivo
   - `create_cart` → debe crear carrito y retornar resumen
   - `create_cart` con stock insuficiente → debe retornar error
   - `create_cart` misma conversación → debe agregar al carrito existente
   - `update_cart` cambiar cantidad → debe actualizar
   - `update_cart` qty=0 → debe eliminar item
3. Verificar que los errores tienen el formato correcto
4. Verificar que las respuestas son comprensibles para un LLM

**Script de testing sugerido (curl):**

```bash
# Listar productos
curl -X POST http://localhost:8787 \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/call", "params": {"name": "list_products", "arguments": {}}}'

# Buscar producto específico
curl -X POST http://localhost:8787 \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/call", "params": {"name": "list_products", "arguments": {"query": "zapatilla"}}}'

# Crear carrito
curl -X POST http://localhost:8787 \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/call", "params": {"name": "create_cart", "arguments": {"conversation_id": "test-1", "items": [{"product_id": 1, "qty": 2}]}}}'
```

**Criterio de aceptación:** Todos los tools funcionan correctamente en entorno local. Errores son descriptivos y no rompen el flujo.

---

### Tarea 5.2 · Configurar Cloudflare y hacer deploy del Worker

**🟢 Para Dummies:** Hasta ahora todo funciona en tu computadora. Ahora hay que "subirlo" a Cloudflare para que esté disponible en internet. Es como publicar una página web pero en vez de una página, publicás tu servidor MCP. El comando `wrangler deploy` hace todo por vos.

**🔵 Justificación Técnica:** El deploy en Cloudflare Workers es un requisito explícito del challenge. Se necesita una cuenta gratuita de Cloudflare, configurar el `wrangler.toml` con los bindings de D1, y ejecutar `wrangler deploy`. El Worker queda expuesto en una URL pública que se usará como endpoint del MCP en Laburen.

**Pasos:**

1. Crear cuenta en `https://dash.cloudflare.com/` (si no existe)
2. Autenticarse: `wrangler login`
3. Verificar configuración en `wrangler.toml` (nombre, D1 binding, compatibilidad)
4. Deploy: `wrangler deploy`
5. Verificar que la URL del Worker responde correctamente
6. Testear cada tool contra el Worker deployed

**Criterio de aceptación:** Worker desplegado en Cloudflare, URL pública funcional, todos los tools operativos.

---

## 📋 ÉPICA 6 — Integración del Agente en Laburen

### Tarea 6.1 · Conectar MCP al agente en Laburen

**🟢 Para Dummies:** Ahora que tu MCP está online en Cloudflare, tenés que decirle al agente de Laburen "acá están tus herramientas". Entrás al dashboard de Laburen, le das la URL de tu Worker, y el agente automáticamente puede empezar a usar las funciones que creaste.

**🔵 Justificación Técnica:** Se registra la URL del MCP server en la plataforma Laburen como tool provider. Laburen se encarga del function calling: cuando el LLM decide usar una herramienta, Laburen enruta la llamada al MCP server, recibe la respuesta, y la inyecta de vuelta en el contexto del LLM para que formule la respuesta al usuario.

**Pasos:**

1. En Laburen dashboard, ir a configuración del agente
2. Agregar MCP Server con la URL del Worker de Cloudflare
3. Verificar que Laburen detecte los tools disponibles
4. Probar desde el chat de Laburen que el agente llama correctamente a cada tool

**Criterio de aceptación:** Agente en Laburen invoca tools MCP correctamente desde el chat de prueba.

---

### Tarea 6.2 · Configurar el prompt del agente (System Prompt)

**🟢 Para Dummies:** El "system prompt" es como las instrucciones que le das al agente antes de que empiece a hablar. Le decís "sos un vendedor amable, vendés estos productos, cuando alguien quiere comprar creá un carrito, si no podés ayudar derivá a un humano". Es lo que le da personalidad y reglas de comportamiento.

**🔵 Justificación Técnica:** El system prompt define el comportamiento del agente y es el factor principal del 55% del peso de evaluación (coherencia de la charla). Debe incluir: rol del agente, cuándo y cómo usar cada tool, formato de respuesta deseado, reglas de negocio (un carrito por conversación, validar stock), criterios de derivación a humano, y policy de etiquetado en CRM.

**Elementos clave del prompt:**

- Rol: asistente de ventas amable y proactivo
- Cuándo usar `list_products`: cuando el usuario pregunta qué hay disponible
- Cuándo usar `get_product`: cuando pide detalles de un producto específico
- Cuándo usar `create_cart`: cuando expresa intención de compra
- Cuándo usar `update_cart`: cuando quiere modificar el carrito
- Cuándo derivar: cuando pide hablar con humano, tiene un problema que el agente no puede resolver, o pide algo fuera del alcance
- Etiquetas CRM: qué etiquetas poner según la acción (ej: `producto:zapatillas`, `accion:compra`, `derivacion:consulta-envio`)

**Criterio de aceptación:** Agente mantiene conversación coherente, usa tools apropiadamente, y sigue las reglas del prompt.

---

### Tarea 6.3 · Configurar etiquetas de CRM en Chatwoot

**🟢 Para Dummies:** Las etiquetas son como "stickers" que el agente le pone a cada conversación para que el equipo humano sepa de un vistazo qué pasó. Por ejemplo: "carrito-creado", "producto-agregado", "derivado-a-humano". Cuando alguien mira el panel de Chatwoot, puede filtrar y ver rápido qué conversaciones necesitan atención.

**🔵 Justificación Técnica:** El challenge pide explícitamente que el agente agregue etiquetas en el CRM para identificar productos agregados al carrito y para contextualizar derivaciones. Esto se logra mediante la API de Chatwoot (aplicar labels a conversaciones). Las etiquetas deben ser configuradas en Chatwoot y aplicadas programáticamente por el agente a través de Laburen o del MCP.

**Etiquetas sugeridas:**

- `carrito-creado` — cuando se crea un carrito
- `producto:[nombre]` — por cada producto agregado
- `carrito-editado` — cuando se modifica el carrito
- `derivado-a-humano` — cuando se deriva
- `motivo:[contexto]` — motivo de derivación

**Criterio de aceptación:** Etiquetas visibles en Chatwoot al realizar acciones desde el agente.

---

### Tarea 6.4 · Conectar WhatsApp al agente vía Chatwoot

**🟢 Para Dummies:** Este es el paso donde "encendés" el agente en WhatsApp. El número que obtuviste en la Tarea 1.3 ya está conectado a Chatwoot. Ahora configurás en Laburen para que cuando llegue un mensaje de WhatsApp a Chatwoot, el agente lo atienda automáticamente.

**🔵 Justificación Técnica:** El flujo completo es: WhatsApp → Twilio webhook → Chatwoot inbox → Laburen (intercepta vía Platform App) → LLM procesa con tools MCP → respuesta vía Chatwoot → Twilio → WhatsApp. La configuración debe asegurar que el agente sea el respondedor automático del inbox de WhatsApp, manteniendo el contexto de conversación.

**Pasos:**

1. Verificar que el inbox de WhatsApp está activo en Chatwoot
2. Configurar en Laburen que el agente atienda ese inbox
3. Seleccionar modelo de LLM (recomendado: empezar con Claude o GPT-4)
4. Enviar mensaje de prueba desde WhatsApp
5. Verificar respuesta del agente en WhatsApp y registro en Chatwoot

**Criterio de aceptación:** Mensaje de WhatsApp respondido por el agente, visible en Chatwoot.

---

## 📋 ÉPICA 7 — Testing End-to-End

### Tarea 7.1 · Test de flujo completo: Explorar → Comprar → Editar → Derivar

**🟢 Para Dummies:** Ahora hacés de "cliente misterioso". Le escribís al agente por WhatsApp y probás todo el recorrido: preguntás por productos, pedís detalles, comprás algo, cambiás el carrito, y finalmente pedís hablar con un humano. Verificás que todo funcione de punta a punta.

**🔵 Justificación Técnica:** El testing E2E es crítico porque el 55% de la evaluación es sobre la integración y coherencia del agente. Se deben probar los happy paths y edge cases: búsqueda sin resultados, producto sin stock, carrito vacío, doble creación de carrito, actualización con cantidad inválida, etc. Todo debe verificarse tanto en WhatsApp como en Chatwoot.

**Escenarios de prueba:**

| #   | Escenario                              | Resultado esperado                              |
| --- | -------------------------------------- | ----------------------------------------------- |
| 1   | "Hola, qué productos tienen?"          | Agente lista productos                          |
| 2   | "Contame más del producto X"           | Agente muestra detalle                          |
| 3   | "Quiero comprar 2 del producto X"      | Agente crea carrito, confirma, agrega etiquetas |
| 4   | "Agregá 1 del producto Y también"      | Agente agrega al carrito existente              |
| 5   | "Sacame el producto X"                 | Agente elimina item del carrito                 |
| 6   | "Cambiá la cantidad de Y a 5"          | Agente actualiza cantidad                       |
| 7   | "Quiero hablar con alguien"            | Agente deriva a humano con etiquetas            |
| 8   | "Tienen [producto inexistente]?"       | Agente responde que no encontró                 |
| 9   | "Quiero comprar 999 de X"              | Agente valida stock                             |
| 10  | Conversación larga con múltiples temas | Agente mantiene coherencia                      |

**Criterio de aceptación:** Todos los escenarios pasan. Etiquetas correctas en Chatwoot. Conversación coherente.

---

### Tarea 7.2 · Fix de bugs y ajustes de prompt

**🟢 Para Dummies:** Después de probar, seguro encontrás cosas que no funcionan del todo bien. Puede ser que el agente se confunda, que no use la herramienta correcta, o que las respuestas sean raras. Acá ajustás el prompt y el código para que todo fluya naturalmente.

**🔵 Justificación Técnica:** Iteración sobre el system prompt basada en resultados del testing E2E. Incluye ajustes de: tool selection (cuándo el LLM elige qué herramienta), formato de respuesta, manejo de ambigüedades, y edge cases descubiertos. También incluye fixes en el MCP server si se detectan bugs en la lógica de negocio.

**Criterio de aceptación:** Los 10 escenarios de la Tarea 7.1 pasan consistentemente.

---

## 📋 ÉPICA 8 — Entrega Final

### Tarea 8.1 · Preparar repositorio para entrega

**🟢 Para Dummies:** Dejás todo lindo para entregar: un README que explique cómo correr el proyecto, los docs en su carpeta, el código limpio, y un último commit con todo funcionando.

**🔵 Justificación Técnica:** El repositorio es un entregable evaluado (5% documentación). Un README completo con instrucciones de setup, variables de entorno, y comandos de deploy reduce la fricción de evaluación. Se incluye el documento conceptual y diagrama en `/docs`.

**Checklist de entrega:**

- [ ] README con instrucciones de instalación y deploy
- [ ] `/docs` con diagrama y documento conceptual
- [ ] Código limpio y comentado
- [ ] `.env.example` con variables necesarias
- [ ] Agente respondiendo en WhatsApp
- [ ] Agente visible y funcional en Chatwoot
- [ ] MCP deployado en Cloudflare
- [ ] Todos los escenarios de prueba verificados

**Criterio de aceptación:** Repositorio entregable, agente operativo en WhatsApp, visible en Chatwoot.

---

## 📊 Resumen de tareas

| #   | Tarea                                           | Épica          | Prioridad     | Estimación |
| --- | ----------------------------------------------- | -------------- | ------------- | ---------- |
| 1.1 | Crear cuenta Laburen + créditos                 | Setup          | 🔴 Bloqueante | 30 min     |
| 1.2 | Configurar Chatwoot en Laburen                  | Setup          | 🔴 Bloqueante | 15 min     |
| 1.3 | Obtener número WhatsApp + conectar              | Setup          | 🔴 Bloqueante | 1-2 hrs    |
| 1.4 | Crear repositorio GitHub                        | Setup          | 🟡 Alta       | 30 min     |
| 1.5 | **Crear CLAUDE.md (contexto AI assistant)**     | Setup          | 🟡 Alta       | 45 min     |
| 1.6 | **Configurar variables de entorno y secrets**   | Setup          | 🟡 Alta       | 30 min     |
| 2.1 | Diagrama de flujo del agente                    | Conceptual     | 🟡 Alta       | 2 hrs      |
| 2.2 | Documento conceptual con endpoints              | Conceptual     | 🟡 Alta       | 1.5 hrs    |
| 3.0 | **Crear cuenta Cloudflare + instalar Wrangler** | DB/Setup       | 🔴 Bloqueante | 30 min     |
| 3.1 | Esquema de DB en Cloudflare D1                  | DB             | 🔴 Bloqueante | 1 hr       |
| 3.2 | Importar productos XLSX a D1                    | DB             | 🔴 Bloqueante | 1.5 hrs    |
| 3.3 | **Crear specs técnicas detalladas por tool**    | DB/Specs       | 🔴 Bloqueante | 2 hrs      |
| 4.1 | Inicializar Worker + MCP                        | MCP Server     | 🔴 Bloqueante | 1.5 hrs    |
| 4.2 | Tool: `list_products`                           | MCP Server     | 🔴 Bloqueante | 2 hrs      |
| 4.3 | Tool: `get_product`                             | MCP Server     | 🔴 Bloqueante | 1 hr       |
| 4.4 | Tool: `create_cart`                             | MCP Server     | 🔴 Bloqueante | 2.5 hrs    |
| 4.5 | Tool: `update_cart` (Extra)                     | MCP Server     | 🟡 Alta       | 2 hrs      |
| 4.6 | Manejo de errores global                        | MCP Server     | 🟡 Alta       | 1.5 hrs    |
| 5.1 | **Testing local con wrangler dev**              | Testing/Deploy | 🔴 Bloqueante | 2 hrs      |
| 5.2 | Deploy Worker en Cloudflare                     | Deploy         | 🔴 Bloqueante | 1 hr       |
| 6.1 | Conectar MCP a Laburen                          | Integración    | 🔴 Bloqueante | 1 hr       |
| 6.2 | System prompt del agente                        | Integración    | 🔴 Bloqueante | 2 hrs      |
| 6.3 | Configurar etiquetas CRM                        | Integración    | 🟡 Alta       | 1 hr       |
| 6.4 | Conectar WhatsApp al agente                     | Integración    | 🔴 Bloqueante | 1.5 hrs    |
| 7.1 | Testing E2E completo                            | Testing        | 🔴 Bloqueante | 2 hrs      |
| 7.2 | Fixes y ajustes de prompt                       | Testing        | 🟡 Alta       | 2-4 hrs    |
| 8.1 | Preparar repo y entrega final                   | Entrega        | 🔴 Bloqueante | 1 hr       |

**Total estimado:** ~35-39 horas (5 días, ~7-8 hrs/día)

> **💡 Tareas nuevas** (marcadas en **negrita**): 1.5, 1.6, 3.3, y 5.1 son las que optimizan el flujo de trabajo con AI coding assistants y previenen bugs antes del deploy.
