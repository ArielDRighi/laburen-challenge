/**
 * MCP Server - Laburen Challenge
 * Cloudflare Worker con transporte SSE/Streamable HTTP via Agents SDK
 *
 * Basado en el template remote-mcp-authless de Cloudflare
 * https://github.com/cloudflare/ai/tree/main/demos/remote-mcp-authless
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { z } from "zod";

import { Env, ListProductsArgs, GetProductArgs, CreateCartArgs, UpdateCartArgs } from "./types";
import { listProducts } from "./tools/list-products";
import { getProduct } from "./tools/get-product";
import { createCart } from "./tools/create-cart";
import { updateCart } from "./tools/update-cart";

/**
 * MCP Agent con las herramientas de venta
 * Usa Durable Objects como backend para el transporte SSE/Streamable HTTP
 */
export class LaburenMCP extends McpAgent<Env> {
  server = new McpServer({
    name: "Laburen Sales Agent MCP",
    version: "1.0.0",
  });

  async init() {
    // ─── Tool: list_products ───────────────────────────────────
    this.server.tool(
      "list_products",
      "Busca y lista productos disponibles en el catálogo. Puede filtrar por texto, categoría, talla y color.",
      {
        query: z
          .string()
          .optional()
          .describe("Texto para buscar en tipo de prenda, color o descripción (búsqueda case-insensitive)"),
        categoria: z.enum(["Deportivo", "Casual", "Formal"]).optional().describe("Filtrar por categoría específica"),
        talla: z.enum(["S", "M", "L", "XL", "XXL"]).optional().describe("Filtrar por talla específica"),
        color: z.string().optional().describe("Filtrar por color específico"),
        limit: z.number().optional().describe("Cantidad máxima de resultados (default: 10, max: 50)"),
      },
      async (args) => {
        try {
          const result = await listProducts(args as ListProductsArgs, this.env);
          return {
            content: [{ type: "text" as const, text: JSON.stringify(result) }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  success: false,
                  error: "internal_error",
                  message: error instanceof Error ? error.message : "Error desconocido",
                }),
              },
            ],
            isError: true,
          };
        }
      }
    );

    // ─── Tool: get_product ─────────────────────────────────────
    this.server.tool(
      "get_product",
      "Obtiene los detalles completos de un producto específico por su ID.",
      {
        product_id: z.number().describe("ID único del producto a consultar"),
      },
      async (args) => {
        try {
          const result = await getProduct(args as GetProductArgs, this.env);
          return {
            content: [{ type: "text" as const, text: JSON.stringify(result) }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  success: false,
                  error: "internal_error",
                  message: error instanceof Error ? error.message : "Error desconocido",
                }),
              },
            ],
            isError: true,
          };
        }
      }
    );

    // ─── Tool: create_cart ─────────────────────────────────────
    this.server.tool(
      "create_cart",
      "Crea un nuevo carrito de compra asociado a una conversación o actualiza uno existente agregando productos.",
      {
        conversation_id: z.string().describe("ID único de la conversación de Chatwoot/Laburen"),
        items: z
          .array(
            z.object({
              product_id: z.number().describe("ID del producto a agregar"),
              qty: z.number().describe("Cantidad de unidades a agregar (mínimo 1)"),
            })
          )
          .describe("Lista de productos a agregar al carrito"),
      },
      async (args) => {
        try {
          const result = await createCart(args as CreateCartArgs, this.env);
          return {
            content: [{ type: "text" as const, text: JSON.stringify(result) }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  success: false,
                  error: "internal_error",
                  message: error instanceof Error ? error.message : "Error desconocido",
                }),
              },
            ],
            isError: true,
          };
        }
      }
    );

    // ─── Tool: update_cart ─────────────────────────────────────
    this.server.tool(
      "update_cart",
      "Modifica la cantidad de productos en un carrito existente o elimina items (qty = 0).",
      {
        conversation_id: z.string().describe("ID único de la conversación"),
        updates: z
          .array(
            z.object({
              product_id: z.number().describe("ID del producto a actualizar"),
              qty: z.number().describe("Nueva cantidad. Si es 0, elimina el producto del carrito."),
            })
          )
          .describe("Lista de actualizaciones a aplicar"),
      },
      async (args) => {
        try {
          const result = await updateCart(args as UpdateCartArgs, this.env);
          return {
            content: [{ type: "text" as const, text: JSON.stringify(result) }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  success: false,
                  error: "internal_error",
                  message: error instanceof Error ? error.message : "Error desconocido",
                }),
              },
            ],
            isError: true,
          };
        }
      }
    );
  }
}

/**
 * Entry point del Worker
 * Enruta /mcp al McpAgent (Streamable HTTP transport)
 * También soporta /sse para legacy SSE transport
 */
export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === "/" && request.method === "GET") {
      return new Response(
        JSON.stringify({
          service: "Laburen MCP Server",
          status: "online",
          version: "1.0.0",
          transport: "Streamable HTTP + SSE (MCP SDK)",
          endpoints: {
            mcp: "/mcp",
            sse: "/sse",
            health: "/",
          },
          database: env.DB ? "connected" : "disconnected",
        }),
        {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Accept, Mcp-Session-Id",
        },
      });
    }

    // MCP Streamable HTTP transport at /mcp
    if (url.pathname === "/mcp") {
      return LaburenMCP.serve("/mcp").fetch(request, env, ctx);
    }

    // Legacy SSE transport at /sse (and /message for posting messages)
    if (url.pathname === "/sse" || url.pathname === "/message" || url.pathname === "/messages") {
      return LaburenMCP.serve("/sse").fetch(request, env, ctx);
    }

    return new Response("Not found", { status: 404 });
  },
};
