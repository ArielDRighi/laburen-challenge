/**
 * Cloudflare Worker Types
 * Define bindings y tipos de entorno
 */

export interface Env {
  // D1 Database binding
  DB: D1Database;

  // Durable Object para MCP Agent (SSE/Streamable HTTP)
  MCP_OBJECT: DurableObjectNamespace;

  // Environment variables (opcional)
  ENVIRONMENT?: string;
}

/**
 * MCP Tool Definition
 * Estructura de una herramienta MCP
 */
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * MCP Request
 * Formato de request que envía Laburen al MCP Server
 */
export interface MCPRequest {
  method: string;
  params: {
    name: string; // Nombre del tool a invocar
    arguments: unknown; // Parámetros del tool
  };
}

/**
 * MCP Response
 * Formato de respuesta del MCP Server
 */
export interface MCPResponse {
  content: Array<{
    type: "text";
    text: string; // JSON stringified con el resultado
  }>;
  isError?: boolean;
}

/**
 * Success Response Helper
 */
export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
}

/**
 * Error Response Helper
 */
export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Generic API Response
 */
export type APIResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;

// ===================================
// DATABASE TYPES
// ===================================

/**
 * Product from database
 */
export interface DBProduct {
  id: number;
  tipo_prenda: string;
  talla: string;
  color: string;
  cantidad_disponible: number;
  precio_50_u: number;
  precio_100_u: number;
  precio_200_u: number;
  disponible: "Sí" | "No";
  categoria: "Deportivo" | "Casual" | "Formal";
  descripcion: string;
}

/**
 * Cart from database
 */
export interface DBCart {
  id: number;
  conversation_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Cart item from database
 */
export interface DBCartItem {
  id: number;
  cart_id: number;
  product_id: number;
  qty: number;
}

/**
 * Minimal cart item (for qty checks)
 */
export interface DBCartItemMinimal {
  product_id: number;
  qty: number;
}

/**
 * Cart item with product details from JOIN query
 */
export interface DBCartItemWithProduct {
  product_id: number;
  tipo_prenda: string;
  talla: string;
  color: string;
  precio_50_u: number;
  qty: number;
  subtotal: number;
}

// ===================================
// TOOL ARGUMENTS TYPES
// ===================================

/**
 * Arguments for list_products tool
 */
export interface ListProductsArgs {
  query?: string;
  categoria?: "Deportivo" | "Casual" | "Formal";
  talla?: "S" | "M" | "L" | "XL" | "XXL";
  color?: string;
  limit?: number;
}

/**
 * Arguments for get_product tool
 */
export interface GetProductArgs {
  product_id: number;
}

/**
 * Arguments for create_cart tool
 */
export interface CreateCartArgs {
  conversation_id: string;
  items: Array<{
    product_id: number;
    qty: number;
  }>;
}

/**
 * Arguments for update_cart tool
 */
export interface UpdateCartArgs {
  conversation_id: string;
  updates: Array<{
    product_id: number;
    qty: number;
  }>;
}

// ===================================
// TOOL RESPONSE DATA TYPES
// ===================================

/**
 * Response data for list_products
 */
export interface ListProductsData {
  products: DBProduct[];
  total: number;
  showing: number;
  message?: string;
}

/**
 * Response data for get_product
 */
export interface GetProductData {
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
  disponible: boolean;
  categoria: string;
  descripcion: string;
  message?: string;
}

/**
 * Cart item in response
 */
export interface CartItemData {
  product_id: number;
  tipo_prenda: string;
  talla: string;
  color: string;
  precio_unitario: number;
  qty: number;
  subtotal: number;
}

/**
 * Response data for create_cart and update_cart
 */
export interface CartData {
  cart_id: number;
  items: CartItemData[];
  total: number;
  message: string;
}
