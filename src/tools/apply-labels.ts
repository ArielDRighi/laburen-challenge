/**
 * Tool: apply_labels
 * Aplica etiquetas a una conversación en Chatwoot CRM.
 * Las etiquetas se acumulan — las nuevas se agregan sin eliminar las existentes.
 */

import { Env, ApplyLabelsArgs, APIResponse } from "../types";
import { successResponse, errorResponse } from "../utils/response";

const VALID_LABELS = [
  "busqueda-productos",
  "carrito-creado",
  "carrito-editado",
  "derivado-a-humano",
  "motivo-consulta-envio",
  "motivo-consulta-pago",
  "motivo-solicitud-cliente",
  "producto-camiseta",
  "producto-chaqueta",
  "producto-falda",
  "producto-pantalon",
  "producto-sudadera",
] as const;

interface ApplyLabelsData {
  applied_labels: string[];
  message: string;
}

/**
 * Extrae el conversation_id numérico de Chatwoot del formato compuesto de Laburen.
 * Formato esperado: "chatwoot_{agent_id}_{bot_id}_{account_id}_{conv_id}"
 * El último segmento numérico es el conversation_id de Chatwoot.
 */
function extractChatwootConversationId(conversationId: string): string | null {
  const parts = conversationId.split("_");
  const lastPart = parts[parts.length - 1];
  if (/^\d+$/.test(lastPart)) {
    return lastPart;
  }
  const match = conversationId.match(/(\d+)$/);
  return match ? match[1] : null;
}

export async function applyLabels(args: ApplyLabelsArgs, env: Env): Promise<APIResponse<ApplyLabelsData>> {
  // 1. Validar parámetros
  if (!args.conversation_id || !args.labels || args.labels.length === 0) {
    return errorResponse("validation_error", "conversation_id y labels son requeridos.");
  }

  // 2. Validar que las etiquetas sean válidas
  const invalidLabels = args.labels.filter((l) => !(VALID_LABELS as readonly string[]).includes(l));
  if (invalidLabels.length > 0) {
    return errorResponse("validation_error", `Etiquetas inválidas: ${invalidLabels.join(", ")}`);
  }

  // 3. Extraer el conversation_id numérico de Chatwoot
  const chatwootConversationId = extractChatwootConversationId(args.conversation_id);
  if (!chatwootConversationId) {
    return errorResponse("validation_error", "No se pudo extraer el ID de conversación de Chatwoot.");
  }

  const chatwootBaseUrl = env.CHATWOOT_BASE_URL;
  const chatwootToken = env.CHATWOOT_API_TOKEN;
  const accountId = env.CHATWOOT_ACCOUNT_ID;

  if (!chatwootBaseUrl || !chatwootToken || !accountId) {
    return errorResponse("validation_error", "Faltan variables de entorno de Chatwoot (CHATWOOT_BASE_URL, CHATWOOT_API_TOKEN, CHATWOOT_ACCOUNT_ID).");
  }

  const labelsUrl = `${chatwootBaseUrl}/api/v1/accounts/${accountId}/conversations/${chatwootConversationId}/labels`;

  try {
    // 4. GET etiquetas actuales
    const getResponse = await fetch(labelsUrl, {
      headers: { api_access_token: chatwootToken },
    });

    let existingLabels: string[] = [];
    if (getResponse.ok) {
      const getData = (await getResponse.json()) as { payload?: string[] };
      existingLabels = getData.payload || [];
    }

    // 5. Mergear: agregar nuevas sin duplicar
    const mergedLabels = [...new Set([...existingLabels, ...args.labels])];

    // 6. POST etiquetas mergeadas
    const postResponse = await fetch(labelsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        api_access_token: chatwootToken,
      },
      body: JSON.stringify({ labels: mergedLabels }),
    });

    if (!postResponse.ok) {
      return errorResponse("chatwoot_api_error", `Error de Chatwoot API: ${postResponse.status}`);
    }

    const result = (await postResponse.json()) as { payload?: string[] };

    return successResponse<ApplyLabelsData>({
      applied_labels: result.payload || mergedLabels,
      message: "Etiquetas aplicadas correctamente.",
    });
  } catch (error) {
    return errorResponse("chatwoot_api_error", "Error al comunicarse con Chatwoot API.");
  }
}
