/**
 * Cloudflare Worker Types
 * Define bindings y tipos de entorno
 */

export interface Env {
  // D1 Database binding
  DB: D1Database;

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
    properties: Record<string, any>;
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
    arguments: any; // Parámetros del tool
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
export interface SuccessResponse {
  success: true;
  data: any;
}

/**
 * Error Response Helper
 */
export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  details?: any;
}

/**
 * Generic API Response
 */
export type APIResponse = SuccessResponse | ErrorResponse;
