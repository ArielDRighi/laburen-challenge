/**
 * Response Utilities
 * Helpers para crear respuestas consistentes
 */

import { APIResponse, MCPResponse } from "../types";

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
  console.error("[Error]", error);

  if (error instanceof Error) {
    return errorResponse("internal_error", "Ocurrió un error interno. Por favor, intenta nuevamente.", {
      originalError: error.message,
    });
  }

  return errorResponse("unknown_error", "Ocurrió un error desconocido.", { error: String(error) });
}
