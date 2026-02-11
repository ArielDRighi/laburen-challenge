/**
 * Tool: list_products
 * Busca y lista productos disponibles en el catálogo
 */

import { Env, ListProductsArgs, ListProductsData, APIResponse, DBProduct } from "../types";
import { successResponse, errorResponse } from "../utils/response";

/**
 * Normaliza texto para búsqueda: quita tildes, convierte a minúsculas,
 * y convierte plurales comunes del español a singular.
 */
function normalizeSearchText(text: string): string {
  let normalized = text
    .toLowerCase()
    .replace(/á/g, "a")
    .replace(/é/g, "e")
    .replace(/í/g, "i")
    .replace(/ó/g, "o")
    .replace(/ú/g, "u")
    .replace(/ü/g, "u")
    .replace(/ñ/g, "n")
    .trim();

  // Plurales español: "pantalones" → "pantalon", "camisetas" → "camiseta"
  if (normalized.endsWith("es") && normalized.length > 3) {
    normalized = normalized.slice(0, -2);
  } else if (normalized.endsWith("s") && normalized.length > 2) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}

export async function listProducts(args: ListProductsArgs, env: Env): Promise<APIResponse<ListProductsData>> {
  try {
    // Extraer y validar parámetros
    const rawQuery = args.query || null;
    const query = rawQuery ? normalizeSearchText(rawQuery) : null;
    const categoria = args.categoria || null;
    const talla = args.talla || null;
    const color = args.color || null;
    let limit = args.limit || 10;

    // Validar límite
    if (limit < 1) limit = 1;
    if (limit > 50) limit = 50;

    console.log(
      `[list_products] Filtros: query=${query}, categoria=${categoria}, talla=${talla}, color=${color}, limit=${limit}`
    );

    // Helper SQL para quitar tildes de un campo (SQLite no tiene Unicode-aware LIKE)
    const stripAccents = (col: string): string =>
      `REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LOWER(${col}), 'á', 'a'), 'é', 'e'), 'í', 'i'), 'ó', 'o'), 'ú', 'u')`;

    // Construir query SQL dinámica con prepared statement
    // Se normalizan los campos de la DB para comparación accent-insensitive
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
          OR ${stripAccents("tipo_prenda")} LIKE '%' || ? || '%'
          OR ${stripAccents("color")} LIKE '%' || ? || '%'
          OR ${stripAccents("descripcion")} LIKE '%' || ? || '%'
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
        limit // límite
      )
      .all();

    const products = (result.results as unknown as DBProduct[]) || [];
    const total = products.length;

    console.log(`[list_products] Encontrados: ${total} productos`);

    // Si no hay resultados
    if (total === 0) {
      return successResponse<ListProductsData>({
        products: [],
        total: 0,
        showing: 0,
        message: "No se encontraron productos con ese criterio.",
      });
    }

    // Retornar productos encontrados
    return successResponse<ListProductsData>({
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
