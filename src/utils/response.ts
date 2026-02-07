/**
 * Response Utilities
 * Helpers para crear respuestas consistentes
 */

import { APIResponse, MCPResponse, Env } from "../types";

/**
 * Tipos de errores estándar del MCP Server
 */
export const ERROR_CODES = {
  // Errores de validación (400)
  VALIDATION_ERROR: "validation_error",
  INVALID_REQUEST: "invalid_request",

  // Errores de recursos no encontrados (404)
  NOT_FOUND: "not_found",
  PRODUCT_NOT_FOUND: "product_not_found",
  CART_NOT_FOUND: "cart_not_found",
  ITEM_NOT_FOUND: "item_not_found",
  TOOL_NOT_FOUND: "tool_not_found",

  // Errores de lógica de negocio (400)
  INSUFFICIENT_STOCK: "insufficient_stock",
  PRODUCT_UNAVAILABLE: "product_unavailable",

  // Errores de servidor (500)
  DATABASE_ERROR: "database_error",
  INTERNAL_ERROR: "internal_error",
  UNKNOWN_ERROR: "unknown_error",
  NOT_IMPLEMENTED: "not_implemented",
} as const;

/**
 * Crear respuesta de éxito
 */
export function successResponse(data: any): APIResponse {
  return {
    success: true,
    data,
  };
}

/**
 * Crear respuesta de error
 */
export function errorResponse(error: string, message: string, details?: any): APIResponse {
  return {
    success: false,
    error,
    message,
    ...(details && { details }),
  };
}

/**
 * Convertir APIResponse a formato MCP
 */
export function toMCPResponse(response: APIResponse): MCPResponse {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(response),
      },
    ],
    isError: !response.success,
  };
}

/**
 * Crear respuesta JSON HTTP
 */
export function jsonResponse(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

/**
 * Manejar errores globales
 */
export function handleError(error: unknown): APIResponse {
  console.error("[Global Error Handler]", error);

  if (error instanceof Error) {
    // Errores conocidos de TypeScript
    return errorResponse(ERROR_CODES.INTERNAL_ERROR, "Ocurrió un error interno. Por favor, intenta nuevamente.", {
      originalError: error.message,
      stack: error.stack?.split("\n").slice(0, 3).join("\n"), // Primeras 3 líneas del stack
    });
  }

  return errorResponse(ERROR_CODES.UNKNOWN_ERROR, "Ocurrió un error desconocido.", { error: String(error) });
}

/**
 * Wrapper para ejecutar tools con manejo de errores consistente
 * Captura cualquier error no manejado y lo convierte en una respuesta estructurada
 */
export async function executeTool(
  toolName: string,
  toolFn: (args: any, env: Env) => Promise<APIResponse>,
  args: any,
  env: Env,
): Promise<APIResponse> {
  const startTime = Date.now();

  try {
    console.log(`[Tool Execution] Starting: ${toolName}`, { args });

    const result = await toolFn(args, env);
    const duration = Date.now() - startTime;

    console.log(`[Tool Execution] Completed: ${toolName}`, {
      success: result.success,
      duration: `${duration}ms`,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    console.error(`[Tool Execution] Failed: ${toolName}`, {
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : String(error),
    });

    // Si el error ya es una APIResponse formateada, retornarla
    if (typeof error === "object" && error !== null && "success" in error) {
      return error as APIResponse;
    }

    // Categorizar el error según el tipo
    if (error instanceof Error) {
      // Errores de base de datos D1
      if (error.message.includes("D1_ERROR") || error.message.includes("SQL")) {
        return errorResponse(
          ERROR_CODES.DATABASE_ERROR,
          "Error al acceder a la base de datos. Por favor, intenta nuevamente.",
          { error: error.message },
        );
      }

      // Errores de validación
      if (error.message.includes("validation") || error.message.includes("invalid")) {
        return errorResponse(ERROR_CODES.VALIDATION_ERROR, error.message);
      }
    }

    // Error genérico
    return handleError(error);
  }
}
