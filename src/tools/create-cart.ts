/**
 * Tool: create_cart
 * Crea un nuevo carrito o actualiza uno existente agregando productos
 */

import {
  Env,
  CreateCartArgs,
  CartData,
  APIResponse,
  DBProduct,
  DBCart,
  DBCartItemWithProduct,
  CartItemData,
} from "../types";
import { successResponse, errorResponse } from "../utils/response";
import { calculateUnitPrice, calculateSubtotal } from "../utils/pricing";

export async function createCart(args: CreateCartArgs, env: Env): Promise<APIResponse<CartData>> {
  try {
    // Validar parámetros requeridos
    const conversationId = args.conversation_id;
    const items = args.items;

    if (!conversationId || typeof conversationId !== "string") {
      return errorResponse("validation_error", "Se requiere un conversation_id válido (string).");
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return errorResponse("validation_error", "Se requiere un array de items con al menos un producto.");
    }

    console.log(`[create_cart] Conversation: ${conversationId}, Items: ${items.length}`);

    // Validar cada item
    for (const item of items) {
      if (!item.product_id || typeof item.product_id !== "number") {
        return errorResponse("validation_error", "Cada item debe tener un product_id válido (número).");
      }
      if (!item.qty || typeof item.qty !== "number" || item.qty < 1) {
        return errorResponse("validation_error", "Cada item debe tener una qty válida (número >= 1).");
      }
    }

    // Paso 1: Verificar stock y disponibilidad de todos los productos
    const productIds = items.map((item) => item.product_id);
    const placeholders = productIds.map(() => "?").join(",");
    const checkProductsSql = `
      SELECT id, tipo_prenda, talla, color, cantidad_disponible, precio_50_u, disponible
      FROM products
      WHERE id IN (${placeholders})
    `;

    const productsResult = await env.DB.prepare(checkProductsSql)
      .bind(...productIds)
      .all();
    const products = (productsResult.results as unknown as DBProduct[]) || [];

    // Verificar que todos los productos existan
    if (products.length !== productIds.length) {
      const foundIds = products.map((p: DBProduct) => p.id);
      const missingIds = productIds.filter((id) => !foundIds.includes(id));
      return errorResponse("product_not_found", `No existen los productos con IDs: ${missingIds.join(", ")}.`, {
        missing_ids: missingIds,
      });
    }

    // Crear mapa de productos para acceso rápido
    const productMap = new Map<number, DBProduct>();
    for (const product of products) {
      productMap.set(product.id, product);
    }

    // Validar disponibilidad y stock
    for (const item of items) {
      const product = productMap.get(item.product_id);

      if (!product) {
        return errorResponse("product_not_found", `No se encontró el producto con ID ${item.product_id}.`, {
          product_id: item.product_id,
        });
      }

      if (product.disponible !== "Sí") {
        return errorResponse(
          "product_unavailable",
          `El producto '${product.tipo_prenda} ${product.talla} ${product.color}' no está disponible actualmente.`,
          { product_id: item.product_id }
        );
      }

      if (item.qty > product.cantidad_disponible) {
        return errorResponse(
          "insufficient_stock",
          `El producto '${product.tipo_prenda} ${product.talla} ${product.color}' solo tiene ${product.cantidad_disponible} unidades disponibles. Solicitaste ${item.qty}.`,
          { product_id: item.product_id, available: product.cantidad_disponible, requested: item.qty }
        );
      }
    }

    console.log(`[create_cart] Validaciones exitosas`);

    // Paso 2: Crear o recuperar carrito (UPSERT)
    const upsertCartSql = `
      INSERT INTO carts (conversation_id, created_at, updated_at)
      VALUES (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (conversation_id)
      DO UPDATE SET updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `;

    const cartResult = await env.DB.prepare(upsertCartSql).bind(conversationId).first<{ id: number }>();
    const cartId = cartResult?.id;

    if (!cartId) {
      return errorResponse("database_error", "Error al crear o recuperar el carrito.");
    }

    console.log(`[create_cart] Cart ID: ${cartId}`);

    // Paso 3: Insertar items (UPSERT - sumar cantidades)
    for (const item of items) {
      const upsertItemSql = `
        INSERT INTO cart_items (cart_id, product_id, qty)
        VALUES (?, ?, ?)
        ON CONFLICT (cart_id, product_id)
        DO UPDATE SET qty = cart_items.qty + excluded.qty
      `;

      await env.DB.prepare(upsertItemSql).bind(cartId, item.product_id, item.qty).run();
    }

    console.log(`[create_cart] Items agregados`);

    // Paso 4: Obtener carrito completo con totales
    const getCartSql = `
      SELECT
        ci.product_id,
        p.tipo_prenda,
        p.talla,
        p.color,
        p.precio_50_u,
        p.precio_100_u,
        p.precio_200_u,
        ci.qty,
        0 as subtotal
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.cart_id = ?
      ORDER BY ci.id
    `;

    const cartItemsResult = await env.DB.prepare(getCartSql).bind(cartId).all();
    const cartItems = (cartItemsResult.results as unknown as DBCartItemWithProduct[]) || [];

    // Calcular total con precios escalonados según volumen
    let total = 0;
    const formattedItems: CartItemData[] = cartItems.map((item: DBCartItemWithProduct) => {
      const unitPrice = calculateUnitPrice(item.qty, item.precio_50_u, item.precio_100_u, item.precio_200_u);
      const subtotal = calculateSubtotal(item.qty, item.precio_50_u, item.precio_100_u, item.precio_200_u);
      total += subtotal;
      return {
        product_id: item.product_id,
        tipo_prenda: item.tipo_prenda,
        talla: item.talla,
        color: item.color,
        precio_unitario: unitPrice,
        qty: item.qty,
        subtotal: subtotal,
      };
    });

    console.log(`[create_cart] Total: ${total}`);

    return successResponse({
      cart_id: cartId,
      items: formattedItems,
      total,
      message: `Carrito actualizado. Se agregaron ${items.length} producto(s).`,
    });
  } catch (error) {
    console.error("[create_cart] Error:", error);
    return errorResponse("database_error", "Error al crear el carrito.", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
