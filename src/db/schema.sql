-- ============================================
-- Schema de Base de Datos - Laburen Challenge
-- ============================================
-- Base de datos: laburen-challenge-db
-- Tipo: Cloudflare D1 (SQLite)
-- Versión: 1.0

-- ============================================
-- Tabla: products
-- ============================================
-- Almacena el catálogo completo de productos de indumentaria
-- Estructura basada en products.xlsx (100 productos, 11 columnas)

CREATE TABLE products (
  id INTEGER PRIMARY KEY,                      -- ID del producto (del XLSX)
  tipo_prenda TEXT NOT NULL,                   -- Tipo de prenda (Pantalón, Camiseta, Falda, etc.)
  talla TEXT NOT NULL,                         -- Talla (S, M, L, XL, XXL)
  color TEXT NOT NULL,                         -- Color (Verde, Blanco, Negro, etc.)
  cantidad_disponible INTEGER NOT NULL DEFAULT 0, -- Stock actual
  precio_50_u INTEGER NOT NULL,                -- Precio unitario para pedido de 50 unidades
  precio_100_u INTEGER NOT NULL,               -- Precio unitario para pedido de 100 unidades
  precio_200_u INTEGER NOT NULL,               -- Precio unitario para pedido de 200 unidades
  disponible TEXT NOT NULL DEFAULT 'Sí',       -- Flag de disponibilidad ('Sí' / 'No')
  categoria TEXT NOT NULL,                     -- Categoría (Deportivo, Casual, Formal)
  descripcion TEXT                             -- Descripción del producto
);

-- ============================================
-- Tabla: carts
-- ============================================
-- Almacena los carritos de compra
-- Un carrito por conversación (1:1 con conversation_id)

CREATE TABLE carts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,        -- ID interno del carrito
  conversation_id TEXT UNIQUE NOT NULL,        -- ID de la conversación en Chatwoot/Laburen
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- Fecha de creación
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP  -- Última actualización
);

-- ============================================
-- Tabla: cart_items
-- ============================================
-- Almacena los items dentro de cada carrito
-- Relación many-to-many entre carts y products

CREATE TABLE cart_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,        -- ID interno del item
  cart_id INTEGER NOT NULL,                    -- FK a carts.id
  product_id INTEGER NOT NULL,                 -- FK a products.id
  qty INTEGER NOT NULL DEFAULT 1,              -- Cantidad de unidades
  
  -- Constraints
  FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id),
  UNIQUE(cart_id, product_id)                  -- Un producto solo puede estar una vez por carrito
);

-- ============================================
-- Índices para optimización de queries
-- ============================================
-- Aceleran búsquedas por atributos comunes

CREATE INDEX idx_products_tipo ON products(tipo_prenda);
CREATE INDEX idx_products_categoria ON products(categoria);
CREATE INDEX idx_products_talla ON products(talla);
CREATE INDEX idx_products_color ON products(color);
CREATE INDEX idx_products_disponible ON products(disponible);

-- Índice para búsquedas de carritos por conversation_id (ya UNIQUE lo cubre implícitamente)
-- CREATE INDEX idx_carts_conversation ON carts(conversation_id);

-- ============================================
-- Notas de diseño
-- ============================================
-- 1. products.id es INTEGER (no AUTOINCREMENT) porque viene del XLSX
-- 2. Los precios están en centavos o unidades enteras (INTEGER)
-- 3. disponible usa TEXT ('Sí'/'No') para match exacto con XLSX
-- 4. UNIQUE(cart_id, product_id) previene duplicados en carrito
-- 5. ON DELETE CASCADE en cart_items limpia automáticamente al borrar carrito
-- 6. Índices en columnas más consultadas (tipo, categoría, talla, color)
