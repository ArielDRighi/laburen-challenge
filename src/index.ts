/**
 * MCP Server - Laburen Challenge
 * Cloudflare Worker que expone herramientas MCP para el agente de IA
 */

import { Env, MCPRequest, MCPTool } from "./types";
import { jsonResponse, toMCPResponse, errorResponse, successResponse, handleError } from "./utils/response";
import { listProducts } from "./tools/list-products";
import { getProduct } from "./tools/get-product";
import { createCart } from "./tools/create-cart";

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
            toMCPResponse(errorResponse("invalid_request", "Request MCP inválido. Se requiere params.name")),
            400,
          );
        }

        const toolName = mcpRequest.params.name;
        const args = mcpRequest.params.arguments || {};

        console.log(`[MCP] Invocando tool: ${toolName}`, JSON.stringify(args));

        // Ejecutar el tool correspondiente
        let result;

        switch (toolName) {
          case "list_products":
            result = await listProducts(args, env);
            break;

          case "get_product":
            result = await getProduct(args, env);
            break;

          case "create_cart":
            result = await createCart(args, env);
            break;

          case "update_cart":
            result = await updateCart(args, env);
            break;

          default:
            result = errorResponse("tool_not_found", `La herramienta '${toolName}' no existe.`, {
              available_tools: MCP_TOOLS.map((t) => t.name),
            });
        }

        console.log(`[MCP] Result: ${result.success ? "SUCCESS" : "ERROR"}`);

        return jsonResponse(toMCPResponse(result));
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
 * ========================================
 * IMPLEMENTACIÓN DE HERRAMIENTAS MCP
 * ========================================
 */

/**
 * Tool: update_cart
 * Actualiza cantidades o elimina items del carrito
 */
async function updateCart(args: any, env: Env) {
  // TODO: Implementar en Tarea 4.5
  return errorResponse("not_implemented", "La herramienta update_cart aún no está implementada.");
}
