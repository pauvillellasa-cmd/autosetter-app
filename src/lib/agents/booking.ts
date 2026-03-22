import Anthropic from "@anthropic-ai/sdk";
import type { AgentConfig } from "@prisma/client";

const client = new Anthropic();

export type BookingAction =
  | "NONE"
  | "SEND_VIDEO_1"
  | "SEND_VIDEO_2"
  | "CALENDLY_SENT"
  | "CALL_BOOKED"
  | "RETURN_TO_QUALIFIER"
  | "HANDOVER_HUMAN";

interface BookingResult {
  messages: string[];
  action: BookingAction;
}

function buildBookingSystemPrompt(config: AgentConfig): string {
  const agentName = config.agentName || "el agente";
  const brandName = config.brandName || "la marca";
  const video1 = config.video1Url || process.env.DEFAULT_VIDEO_1_URL || "";
  const video2 = config.video2Url || process.env.DEFAULT_VIDEO_2_URL || "";
  const calendly =
    config.calendlyUrl || process.env.DEFAULT_CALENDLY_URL || "";
  const customPrompt = config.bookingPrompt || "";

  return `# IDENTIDAD

Eres ${agentName}. El lead que te escribe ya ha sido cualificado por ti (o alguien de tu equipo) en la conversacion anterior. Tu trabajo ahora es que vea 2 videos y agende una llamada.

# TONO Y ESTILO

Igual que siempre: chaval de 20 anos, espanol casual, minusculas, abreviaciones (q, xq, tb, tio, bro). Sin emojis NUNCA. Mensajes cortos.

# FORMATO DE RESPUESTA

SIEMPRE JSON valido:
{
  "messages": ["msg1", "msg2"],
  "action": "NONE"
}

Mismas reglas: 1-4 mensajes, maximo 2 lineas cada uno.

# FLUJO (sigue este orden)

PASO 1 - Transicion natural:
Si es tu primer mensaje en esta fase, haz referencia a lo que hablasteis antes. Algo como:
"oye mira con lo q me has contado creo q te puede molar mucho una cosa"
"tio la verdad es q tu caso es justo el tipo de gente con la q trabajamos"

PASO 2 - Video 1:
Comparte el primer video de forma natural:
"mira antes de nada echale un ojo a este video q te va a dar bastante contexto"
"${video1}"
Cambia action a "SEND_VIDEO_1"

PASO 3 - Esperar confirmacion Video 1:
Pregunta si lo ha visto. Si dice que no o no responde sobre el video, insiste suavemente.
NO pases al video 2 sin confirmacion.

PASO 4 - Video 2:
"genial y ahora este otro q es mas cortito pero igual de importante"
"${video2}"
Cambia action a "SEND_VIDEO_2"

PASO 5 - Esperar confirmacion Video 2:
Pregunta que le han parecido los videos.

PASO 6 - Proponer llamada:
"mira si te ha molado lo q has visto creo q podemos ayudarte bastante"
"te paso un link para q reserves un hueco y hablamos tranquilamente"
"${calendly}"
Cambia action a "CALENDLY_SENT"

PASO 7 - Confirmar booking:
Si dice que ha reservado, celebra y despidete.
Cambia action a "CALL_BOOKED"

# ACCIONES DISPONIBLES

- "NONE" - respuesta normal, sin accion especial
- "SEND_VIDEO_1" - cuando envias el primer video
- "SEND_VIDEO_2" - cuando envias el segundo video
- "CALENDLY_SENT" - cuando envias el link de calendly
- "CALL_BOOKED" - cuando el lead confirma que ha reservado
- "RETURN_TO_QUALIFIER" - si te das cuenta de que el lead realmente no esta cualificado
- "HANDOVER_HUMAN" - si pide hablar con una persona real

# REGLAS

- NUNCA envies Calendly sin que haya confirmado ver los 2 videos
- No seas insistente. Si dice que no tiene tiempo, respetalo
- Si dice que no le interesan los videos, no fuerces
- Si hace preguntas sobre precio: "eso lo vemos en la llamada tranquilamente, depende de cada caso"
- Si parece que no esta realmente cualificado, usa RETURN_TO_QUALIFIER
- Lee el historial para entender el contexto de la cualificacion previa

${customPrompt ? `# INSTRUCCIONES ADICIONALES\n\n${customPrompt}` : ""}`;
}

export async function runBooking(
  userMessage: string,
  chatHistory: Array<{ role: "user" | "assistant"; content: string }>,
  config: AgentConfig,
  knowledgeBase: string
): Promise<BookingResult> {
  try {
    let systemPrompt = buildBookingSystemPrompt(config);

    if (knowledgeBase) {
      systemPrompt += `\n\n# KNOWLEDGE BASE\n\n${knowledgeBase}`;
    }

    const messages: Anthropic.MessageParam[] = [
      ...chatHistory.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      { role: "user", content: userMessage },
    ];

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      system: systemPrompt,
      messages,
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    return parseBookingResponse(text);
  } catch {
    return { messages: ["perdona puedes repetir?"], action: "NONE" };
  }
}

function parseBookingResponse(raw: string): BookingResult {
  try {
    const parsed = JSON.parse(raw);
    return validateResult(parsed);
  } catch {
    try {
      const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        return validateResult(JSON.parse(match[1].trim()));
      }
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return validateResult(JSON.parse(jsonMatch[0]));
      }
    } catch {
      // fallthrough
    }
    return { messages: ["perdona puedes repetir?"], action: "NONE" };
  }
}

function validateResult(parsed: Record<string, unknown>): BookingResult {
  const messages = Array.isArray(parsed.messages)
    ? (parsed.messages as string[])
    : ["perdona puedes repetir?"];
  const validActions: BookingAction[] = [
    "NONE",
    "SEND_VIDEO_1",
    "SEND_VIDEO_2",
    "CALENDLY_SENT",
    "CALL_BOOKED",
    "RETURN_TO_QUALIFIER",
    "HANDOVER_HUMAN",
  ];
  const action = validActions.includes(parsed.action as BookingAction)
    ? (parsed.action as BookingAction)
    : "NONE";
  return { messages, action };
}
