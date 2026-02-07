/**
 * Tool: update_cart
 * Actualiza cantidades o elimina productos del carrito existente
 */

import {
  Env,
  UpdateCartArgs,
  CartData,
  APIResponse,
  DBProduct,
  DBCart,
  DBCartItemMinimal,
  DBCartItemWithProduct,
  CartItemData,
} from "../types";
import { successResponse, errorResponse } from "../utils/response";

export async function updateCart(args: UpdateCartArgs, env: Env): Promise<APIResponse<CartData>> {
  try {
    // Validar parámetros requeridos
    const conversationId = args.conversation_id;
    const updates = args.updates;

    if (!conversationId || typeof conversationId !== "string") {
      return errorResponse("validation_error", "Se requiere un conversation_id válido (string).");
    }

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return errorResponse("validation_error", "Se requiere un array de updates con al menos una actualización.");
    }

    console.log(`[update_cart] Conversation: ${conversationId}, Updates: ${updates.length}`);

    // Validar cada update
    for (const update of updates) {
      if (!update.product_id || typeof update.product_id !== "number") {
        return errorResponse("validation_error", "Cada update debe tener un product_id válido (número).");
      }
      if (update.qty === undefined || typeof update.qty !== "number" || update.qty < 0) {
        return errorResponse("validation_error", "Cada update debe tener una qty válida (número >= 0).");
      }
    }

    // Paso 1: Verificar que el carrito existe
    const getCartSql = `SELECT id FROM carts WHERE conversation_id = ?`;
    const cartResult = await env.DB.prepare(getCartSql).bind(conversationId).first<{ id: number }>();

    if (!cartResult) {
      return errorResponse("cart_not_found", `No existe un carrito para la conversación '${conversationId}'.`, {
        conversation_id: conversationId,
      });
    }

    const cartId = cartResult.id;
    console.log(`[update_cart] Cart ID: ${cartId}`);

    // Paso 2: Obtener items actuales del carrito para validar
    const getCurrentItemsSql = `SELECT product_id, qty FROM cart_items WHERE cart_id = ?`;
    const currentItemsResult = await env.DB.prepare(getCurrentItemsSql).bind(cartId).all();
    const currentItems = (currentItemsResult.results as unknown as DBCartItemMinimal[]) || [];
    const currentItemsMap = new Map<number, number>();

    for (const item of currentItems) {
      currentItemsMap.set(item.product_id, item.qty);
    }

    // Paso 3: Para incrementos de cantidad, validar stock disponible
    const productIdsToCheck = [];
    for (const update of updates) {
      const currentQty = currentItemsMap.get(update.product_id) || 0;

      // Solo validar stock si se está incrementando la cantidad
      if (update.qty > currentQty) {
        productIdsToCheck.push(update.product_id);
      }
    }

    // Validar stock si hay incrementos
    if (productIdsToCheck.length > 0) {
      const placeholders = productIdsToCheck.map(() => "?").join(",");
      const checkStockSql = `
        SELECT id, tipo_prenda, talla, color, cantidad_disponible, disponible
        FROM products
        WHERE id IN (${placeholders})
      `;

      const productsResult = await env.DB.prepare(checkStockSql)
        .bind(...productIdsToCheck)
        .all();
      const products = (productsResult.results as unknown as DBProduct[]) || [];
      const productsMap = new Map<number, DBProduct>();

      for (const product of products) {
        productsMap.set(product.id, product);
      }

      // Validar cada incremento
      for (const update of updates) {
        const currentQty = currentItemsMap.get(update.product_id) || 0;

        if (update.qty > currentQty) {
          const product = productsMap.get(update.product_id);

          if (!product) {
            return errorResponse("product_not_found", `No existe un producto con ID ${update.product_id}.`, {
              product_id: update.product_id,
            });
          }

          if (product.disponible !== "Sí") {
            return errorResponse(
              "product_unavailable",
              `El producto '${product.tipo_prenda} ${product.talla} ${product.color}' no está disponible actualmente.`,
              { product_id: update.product_id }
            );
          }

          if (update.qty > product.cantidad_disponible) {
            return errorResponse(
              "insufficient_stock",
              `El producto '${product.tipo_prenda} ${product.talla} ${product.color}' solo tiene ${product.cantidad_disponible} unidades disponibles. Solicitaste ${update.qty}.`,
              { product_id: update.product_id, available: product.cantidad_disponible, requested: update.qty }
            );
          }
        }
      }
    }

    console.log(`[update_cart] Validaciones exitosas`);

    // Paso 4: Aplicar actualizaciones
    let itemsRemoved = 0;
    let itemsUpdated = 0;

    for (const update of updates) {
      if (update.qty === 0) {
        // Eliminar item
        const deleteSql = `DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?`;
        await env.DB.prepare(deleteSql).bind(cartId, update.product_id).run();
        itemsRemoved++;
        console.log(`[update_cart] Eliminado product_id=${update.product_id}`);
      } else {
        // Actualizar cantidad
        const updateSql = `UPDATE cart_items SET qty = ? WHERE cart_id = ? AND product_id = ?`;
        const result = await env.DB.prepare(updateSql).bind(update.qty, cartId, update.product_id).run();

        // Si no se actualizó nada, el producto no estaba en el carrito
        if (result.meta?.changes === 0) {
          return errorResponse("item_not_found", `El producto con ID ${update.product_id} no está en el carrito.`, {
            product_id: update.product_id,
          });
        }

        itemsUpdated++;
        console.log(`[update_cart] Actualizado product_id=${update.product_id} qty=${update.qty}`);
      }
    }

    // Actualizar timestamp del carrito
    const updateCartTimestampSql = `UPDATE carts SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    await env.DB.prepare(updateCartTimestampSql).bind(cartId).run();

    // Paso 5: Obtener carrito actualizado con totales
    const getCartItemsSql = `
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
      WHERE ci.cart_id = ?
      ORDER BY ci.id
    `;

    const cartItemsResult = await env.DB.prepare(getCartItemsSql).bind(cartId).all();
    const cartItems = (cartItemsResult.results as unknown as DBCartItemWithProduct[]) || [];

    // Si el carrito quedó vacío
    if (cartItems.length === 0) {
      return successResponse({
        cart_id: cartId,
        items: [],
        total: 0,
        message: "El carrito está vacío.",
      });
    }

    // Calcular total
    let total = 0;
    const formattedItems: CartItemData[] = cartItems.map((item: DBCartItemWithProduct) => {
      total += item.subtotal;
      return {
        product_id: item.product_id,
        tipo_prenda: item.tipo_prenda,
        talla: item.talla,
        color: item.color,
        precio_unitario: item.precio_50_u,
        qty: item.qty,
        subtotal: item.subtotal,
      };
    });

    console.log(
      `[update_cart] Total: ${total}, Items actualizados: ${itemsUpdated}, Items eliminados: ${itemsRemoved}`
    );

    // Construir mensaje descriptivo
    const messages = [];
    if (itemsUpdated > 0) messages.push(`${itemsUpdated} producto(s) actualizado(s)`);
    if (itemsRemoved > 0) messages.push(`${itemsRemoved} producto(s) eliminado(s)`);
    const message = `Carrito actualizado: ${messages.join(", ")}.`;

    return successResponse({
      cart_id: cartId,
      items: formattedItems,
      total,
      message,
    });
  } catch (error) {
    console.error("[update_cart] Error:", error);
    return errorResponse("database_error", "Error al actualizar el carrito.", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
