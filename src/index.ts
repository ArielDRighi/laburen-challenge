/**
 * MCP Server - Laburen Challenge
 * Cloudflare Worker que expone herramientas MCP para el agente de IA
 */

import { Env, MCPRequest, MCPTool } from "./types";
import { jsonResponse, toMCPResponse, errorResponse, handleError, executeTool, ERROR_CODES } from "./utils/response";
import { listProducts } from "./tools/list-products";
import { getProduct } from "./tools/get-product";
import { createCart } from "./tools/create-cart";
import { updateCart } from "./tools/update-cart";

/**
 * Definición de todas las herramientas MCP disponibles
 */
const MCP_TOOLS: MCPTool[] = [
  {
    name: "list_products",
    description:
      "Busca y lista productos disponibles en el catálogo. Puede filtrar por texto, categoría, talla y color.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Texto para buscar en tipo de prenda, color o descripción (búsqueda case-insensitive)",
        },
        categoria: {
          type: "string",
          enum: ["Deportivo", "Casual", "Formal"],
          description: "Filtrar por categoría específica",
        },
        talla: {
          type: "string",
          enum: ["S", "M", "L", "XL", "XXL"],
          description: "Filtrar por talla específica",
        },
        color: {
          type: "string",
          description: "Filtrar por color específico",
        },
        limit: {
          type: "number",
          description: "Cantidad máxima de resultados (default: 10, max: 50)",
        },
      },
    },
  },
  {
    name: "get_product",
    description: "Obtiene los detalles completos de un producto específico por su ID.",
    inputSchema: {
      type: "object",
      properties: {
        product_id: {
          type: "number",
          description: "ID único del producto a consultar",
        },
      },
      required: ["product_id"],
    },
  },
  {
    name: "create_cart",
    description:
      "Crea un nuevo carrito de compra asociado a una conversación o actualiza uno existente agregando productos.",
    inputSchema: {
      type: "object",
      properties: {
        conversation_id: {
          type: "string",
          description: "ID único de la conversación de Chatwoot/Laburen",
        },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              product_id: {
                type: "number",
                description: "ID del producto a agregar",
              },
              qty: {
                type: "number",
                description: "Cantidad de unidades a agregar (mínimo 1)",
              },
            },
            required: ["product_id", "qty"],
          },
          description: "Lista de productos a agregar al carrito",
        },
      },
      required: ["conversation_id", "items"],
    },
  },
  {
    name: "update_cart",
    description: "Modifica la cantidad de productos en un carrito existente o elimina items (qty = 0).",
    inputSchema: {
      type: "object",
      properties: {
        conversation_id: {
          type: "string",
          description: "ID único de la conversación",
        },
        updates: {
          type: "array",
          items: {
            type: "object",
            properties: {
              product_id: {
                type: "number",
                description: "ID del producto a actualizar",
              },
              qty: {
                type: "number",
                description: "Nueva cantidad. Si es 0, elimina el producto del carrito.",
              },
            },
            required: ["product_id", "qty"],
          },
          description: "Lista de actualizaciones a aplicar",
        },
      },
      required: ["conversation_id", "updates"],
    },
  },
];

/**
 * Entry point del Worker
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Manejar CORS preflight
    if (request.method === "OPTIONS") {
      return jsonResponse({ ok: true }, 200);
    }

    // Ruta raíz - Health check
    if (url.pathname === "/" && request.method === "GET") {
      return jsonResponse({
        service: "Laburen MCP Server",
        status: "online",
        version: "1.0.0",
        tools_available: MCP_TOOLS.length,
        database: env.DB ? "connected" : "disconnected",
      });
    }

    // Ruta /tools - Listar herramientas disponibles
    if (url.pathname === "/tools" && request.method === "GET") {
      return jsonResponse({
        tools: MCP_TOOLS,
      });
    }

    // Ruta /mcp - Procesar llamadas MCP
    if (url.pathname === "/mcp" && request.method === "POST") {
      try {
        const mcpRequest: MCPRequest = await request.json();

        // Validar request MCP
        if (!mcpRequest.params || !mcpRequest.params.name) {
          return jsonResponse(
            toMCPResponse(errorResponse(ERROR_CODES.INVALID_REQUEST, "Request MCP inválido. Se requiere params.name")),
            400,
          );
        }

        const toolName = mcpRequest.params.name;
        const args = mcpRequest.params.arguments || {};

        // Ejecutar el tool correspondiente con manejo de errores robusto
        let result;

        switch (toolName) {
          case "list_products":
            result = await executeTool(toolName, listProducts, args, env);
            break;

          case "get_product":
            result = await executeTool(toolName, getProduct, args, env);
            break;

          case "create_cart":
            result = await executeTool(toolName, createCart, args, env);
            break;

          case "update_cart":
            result = await executeTool(toolName, updateCart, args, env);
            break;

          default:
            result = errorResponse(ERROR_CODES.TOOL_NOT_FOUND, `La herramienta '${toolName}' no existe.`, {
              available_tools: MCP_TOOLS.map((t) => t.name),
            });
        }

        // Determinar código de estado HTTP según el tipo de error
        const statusCode = result.success ? 200 : getStatusCodeFromError(result.error);

        return jsonResponse(toMCPResponse(result), statusCode);
      } catch (error) {
        console.error("[MCP] Error procesando request:", error);
        return jsonResponse(toMCPResponse(handleError(error)), 500);
      }
    }

    // Ruta no encontrada
    return jsonResponse(
      {
        error: "not_found",
        message: "Endpoint no encontrado",
        available_endpoints: ["/", "/tools", "/mcp"],
      },
      404,
    );
  },
};

/**
 * Mapear códigos de error a status HTTP apropiados
 */
function getStatusCodeFromError(errorCode?: string): number {
  if (!errorCode) return 500;

  // Errores de validación y parámetros inválidos
  if (
    errorCode === ERROR_CODES.VALIDATION_ERROR ||
    errorCode === ERROR_CODES.INVALID_REQUEST ||
    errorCode === ERROR_CODES.INSUFFICIENT_STOCK ||
    errorCode === ERROR_CODES.PRODUCT_UNAVAILABLE
  ) {
    return 400;
  }

  // Errores de recursos no encontrados
  if (
    errorCode === ERROR_CODES.NOT_FOUND ||
    errorCode === ERROR_CODES.PRODUCT_NOT_FOUND ||
    errorCode === ERROR_CODES.CART_NOT_FOUND ||
    errorCode === ERROR_CODES.ITEM_NOT_FOUND ||
    errorCode === ERROR_CODES.TOOL_NOT_FOUND
  ) {
    return 404;
  }

  // Errores no implementados
  if (errorCode === ERROR_CODES.NOT_IMPLEMENTED) {
    return 501;
  }

  // Errores de servidor (database, internal, unknown)
  return 500;
}
