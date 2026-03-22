import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export type Route = "qualifier" | "content_booking" | "human" | "disqualify";

interface RouterResult {
  route: Route;
  reason: string;
}

const ROUTER_SYSTEM_PROMPT = `Eres un router de conversaciones. Tu UNICA funcion es clasificar mensajes y decidir que agente debe responder.

Analiza el historial de la conversacion y el mensaje actual del lead.

RUTAS DISPONIBLES:

"qualifier" - Usa esta ruta cuando:
- Es el primer mensaje del lead
- El lead aun no ha sido cualificado (no se sabe si tiene negocio digital, ingresos, etc.)
- La conversacion esta en fase de preguntas exploratorias
- El lead ha sido devuelto desde content_booking porque necesita mas cualificacion

"content_booking" - Usa esta ruta cuando:
- En el historial se ve claramente que el lead YA esta cualificado (tiene negocio digital, genera ingresos, tiene un problema claro)
- El asistente ya ha mencionado videos o links de YouTube en mensajes anteriores
- La conversacion esta en fase de enviar contenido o agendar llamada
- El lead esta hablando sobre los videos o sobre agendar

"human" - Usa esta ruta cuando:
- El lead pide explicitamente hablar con una persona real
- El lead esta frustrado, enfadado o es grosero
- El lead dice que ya es cliente
- La situacion escapa la capacidad de un bot

"disqualify" - Usa esta ruta cuando:
- Queda claro que el lead NO tiene negocio digital ni interes en tenerlo
- El lead es estudiante sin proyecto emprendedor
- El lead solo tiene cuenta personal sin indicadores de negocio
- Despues de varias preguntas, no hay senales de ICP

REGLAS:
- Si dudas entre qualifier y content_booking, elige qualifier (es mas seguro seguir cualificando)
- Si es el primer mensaje, SIEMPRE "qualifier"
- Analiza TODO el historial, no solo el ultimo mensaje

Responde UNICAMENTE con JSON valido, sin texto adicional:
{"route": "qualifier|content_booking|human|disqualify", "reason": "explicacion breve de 1 linea"}`;

export async function routeMessage(
  userMessage: string,
  chatHistory: string
): Promise<RouterResult> {
  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 150,
      system: ROUTER_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `HISTORIAL DE CONVERSACION:\n${chatHistory}\n\nMENSAJE ACTUAL DEL LEAD:\n${userMessage}`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Limpiar y parsear JSON
    const cleaned = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const parsed = JSON.parse(cleaned);

    const validRoutes: Route[] = [
      "qualifier",
      "content_booking",
      "human",
      "disqualify",
    ];
    const route = validRoutes.includes(parsed.route)
      ? parsed.route
      : "qualifier";

    return {
      route,
      reason: parsed.reason || "sin razon",
    };
  } catch {
    return { route: "qualifier", reason: "error en router, default qualifier" };
  }
}
