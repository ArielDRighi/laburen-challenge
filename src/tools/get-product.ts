/**
 * Tool: get_product
 * Obtiene los detalles completos de un producto específico por su ID
 */

import { Env, GetProductArgs, GetProductData, APIResponse, DBProduct } from "../types";
import { successResponse, errorResponse } from "../utils/response";

export async function getProduct(args: GetProductArgs, env: Env): Promise<APIResponse<GetProductData>> {
  try {
    // Validar parámetro requerido
    const productId = args.product_id;

    if (!productId || typeof productId !== "number") {
      return errorResponse("validation_error", "Se requiere un product_id válido (número).");
    }

    // Validar que sea un ID válido
    if (productId <= 0) {
      return errorResponse("validation_error", "El product_id debe ser un número positivo.");
    }

    console.log(`[get_product] Buscando producto ID: ${productId}`);

    // Consultar producto por ID
    const sql = `
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
      WHERE id = ?
    `;

    const result = await env.DB.prepare(sql).bind(productId).first<DBProduct>();

    // Si no existe el producto
    if (!result) {
      console.log(`[get_product] Producto ${productId} no encontrado`);
      return errorResponse("not_found", `No existe un producto con ID ${productId}.`);
    }

    console.log(`[get_product] Producto encontrado: ${result.tipo_prenda}`);

    // Convertir disponible de "Sí"/"No" a boolean
    const disponible = result.disponible === "Sí";

    // Construir respuesta con formato especificado
    const productData: GetProductData = {
      id: result.id,
      tipo_prenda: result.tipo_prenda,
      talla: result.talla,
      color: result.color,
      cantidad_disponible: result.cantidad_disponible,
      precios: {
        "50_unidades": result.precio_50_u,
        "100_unidades": result.precio_100_u,
        "200_unidades": result.precio_200_u,
      },
      disponible,
      categoria: result.categoria,
      descripcion: result.descripcion,
    };

    // Si el producto no está disponible, agregar mensaje de advertencia
    if (!disponible) {
      productData.message = "Este producto no está disponible actualmente.";
    }

    return successResponse<GetProductData>(productData);
  } catch (error) {
    console.error("[get_product] Error:", error);
    return errorResponse("database_error", "Error al consultar el producto en la base de datos.", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
