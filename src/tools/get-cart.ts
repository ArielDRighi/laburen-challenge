/**
 * Tool: get_cart
 * Consulta el carrito de compra actual de una conversación sin modificarlo.
 */

import { Env, APIResponse, GetCartArgs } from "../types";
import { successResponse, errorResponse, ERROR_CODES } from "../utils/response";
import { calculateUnitPrice } from "../utils/pricing";

interface CartItemRow {
  product_id: number;
  qty: number;
  tipo_prenda: string;
  talla: string;
  color: string;
  precio_50_u: number;
  precio_100_u: number;
  precio_200_u: number;
}

interface GetCartData {
  cart_id: number | null;
  items: Array<{
    product_id: number;
    tipo_prenda: string;
    talla: string;
    color: string;
    precio_unitario: number;
    qty: number;
    subtotal: number;
  }>;
  total: number;
  item_count: number;
  message: string;
}

export async function getCart(args: GetCartArgs, env: Env): Promise<APIResponse<GetCartData>> {
  // 1. Validar parámetros
  if (!args.conversation_id) {
    return errorResponse(ERROR_CODES.VALIDATION_ERROR, "conversation_id es requerido.");
  }

  const db = env.DB;

  try {
    // 2. Buscar carrito por conversation_id
    const cart = await db
      .prepare("SELECT id FROM carts WHERE conversation_id = ?")
      .bind(args.conversation_id)
      .first<{ id: number }>();

    if (!cart) {
      return successResponse({
        cart_id: null,
        items: [],
        total: 0,
        item_count: 0,
        message: "No hay carrito creado para esta conversación.",
      });
    }

    // 3. Obtener items con datos del producto
    const items = await db
      .prepare(
        `
        SELECT
          ci.product_id,
          ci.qty,
          p.tipo_prenda,
          p.talla,
          p.color,
          p.precio_50_u,
          p.precio_100_u,
          p.precio_200_u
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        WHERE ci.cart_id = ?
        `
      )
      .bind(cart.id)
      .all<CartItemRow>();

    if (!items.results || items.results.length === 0) {
      return successResponse({
        cart_id: cart.id,
        items: [],
        total: 0,
        item_count: 0,
        message: "El carrito está vacío.",
      });
    }

    // 4. Calcular precios escalonados
    let total = 0;
    const cartItems = items.results.map((item) => {
      const unitPrice = calculateUnitPrice(item.qty, item.precio_50_u, item.precio_100_u, item.precio_200_u);
      const subtotal = unitPrice * item.qty;
      total += subtotal;

      return {
        product_id: item.product_id,
        tipo_prenda: item.tipo_prenda,
        talla: item.talla,
        color: item.color,
        precio_unitario: unitPrice,
        qty: item.qty,
        subtotal,
      };
    });

    return successResponse({
      cart_id: cart.id,
      items: cartItems,
      total,
      item_count: cartItems.length,
      message: `Carrito con ${cartItems.length} producto(s).`,
    });
  } catch (error) {
    console.error("[get_cart] Database error:", error);
    return errorResponse(ERROR_CODES.DATABASE_ERROR, "Error al consultar el carrito.");
  }
}
