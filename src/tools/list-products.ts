/**
 * Tool: list_products
 * Busca y lista productos disponibles en el catálogo
 */

import { Env } from "../types";
import { successResponse, errorResponse } from "../utils/response";

export async function listProducts(args: any, env: Env) {
  try {
    // Extraer y validar parámetros
    const query = args.query || null;
    const categoria = args.categoria || null;
    const talla = args.talla || null;
    const color = args.color || null;
    let limit = args.limit || 10;

    // Validar límite
    if (limit < 1) limit = 1;
    if (limit > 50) limit = 50;

    console.log(
      `[list_products] Filtros: query=${query}, categoria=${categoria}, talla=${talla}, color=${color}, limit=${limit}`,
    );

    // Construir query SQL dinámica con prepared statement
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
      WHERE disponible = 'Sí'
        AND (
          ? IS NULL
          OR LOWER(tipo_prenda) LIKE LOWER('%' || ? || '%')
          OR LOWER(color) LIKE LOWER('%' || ? || '%')
          OR LOWER(descripcion) LIKE LOWER('%' || ? || '%')
        )
        AND (? IS NULL OR categoria = ?)
        AND (? IS NULL OR talla = ?)
        AND (? IS NULL OR LOWER(color) = LOWER(?))
      ORDER BY tipo_prenda ASC, talla ASC
      LIMIT ?
    `;

    // Ejecutar query con parámetros
    const result = await env.DB.prepare(sql)
      .bind(
        query,
        query,
        query,
        query, // 4x para búsqueda texto
        categoria,
        categoria, // 2x para categoría
        talla,
        talla, // 2x para talla
        color,
        color, // 2x para color exacto
        limit, // límite
      )
      .all();

    const products = result.results || [];
    const total = products.length;

    console.log(`[list_products] Encontrados: ${total} productos`);

    // Si no hay resultados
    if (total === 0) {
      return successResponse({
        products: [],
        total: 0,
        showing: 0,
        message: "No se encontraron productos con ese criterio.",
      });
    }

    // Retornar productos encontrados
    return successResponse({
      products,
      total,
      showing: total,
    });
  } catch (error) {
    console.error("[list_products] Error:", error);
    return errorResponse("database_error", "Error al buscar productos en la base de datos.", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
