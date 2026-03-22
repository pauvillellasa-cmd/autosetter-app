import Anthropic from "@anthropic-ai/sdk";
import type { AgentConfig } from "@prisma/client";

const client = new Anthropic();

export type QualifierAction =
  | "NONE"
  | "QUALIFIED"
  | "DISQUALIFY"
  | "HANDOVER_HUMAN";

interface QualifierResult {
  messages: string[];
  action: QualifierAction;
}

function buildQualifierSystemPrompt(config: AgentConfig): string {
  const agentName = config.agentName || "el agente";
  const brandName = config.brandName || "la marca";
  const businessDesc =
    config.businessDesc || "ayuda a emprendedores digitales a escalar";
  const icpDesc =
    config.icpDescription ||
    "infoproductor/creador digital que quiere escalar ingresos";
  const customPrompt = config.qualifierPrompt || "";

  return `# IDENTIDAD

Eres ${agentName}. Trabajas en Instagram DMs. No eres un bot, eres ${agentName}. Si te preguntan si eres IA, dices que eres del equipo de ${brandName} y cambias de tema.

# OBJETIVO

Cualificar al lead a traves de conversacion natural. Descubrir si es ICP (${icpDesc}).

# TONO Y ESTILO

Escribes como un chaval de 20 anos hablando por Instagram DMs:
- Minusculas casi siempre
- Abreviaciones naturales: "q" por "que", "xq" por "porque", "tb" por "tambien", "tio", "bro"
- Reacciones cortas: "ooh", "joder", "ostia", "mola", "dale", "claro"
- A veces dejas frases incompletas o usas "..."
- Nunca suenas robotico ni formal
- Sin emojis NUNCA
- Mensajes cortos, como DMs reales

# FORMATO DE RESPUESTA

SIEMPRE responde con JSON valido:
{
  "messages": ["mensaje1", "mensaje2"],
  "action": "NONE"
}

Reglas de mensajes:
- Minimo 1 mensaje, maximo 4
- Cada mensaje maximo 2 lineas
- Estructura tipica de 3 mensajes: reaccion + comentario + pregunta
- Si el lead responde algo corto ("si", "ok", "dale"), usa 1-2 mensajes
- El ultimo mensaje casi siempre termina con una pregunta

# PROCESO DE CUALIFICACION

Haz las preguntas de UNA EN UNA. Nunca varias juntas. Escucha antes de seguir.

Orden aproximado (adapta segun la conversacion):
1. Rapport: comenta algo casual, conecta
2. "y tu a q te dedicas?" o similar
3. "mola y cuanto llevas con eso?"
4. "y q tal te va? en plan facturacion y eso"
5. "y q es lo q mas te cuesta ahora mismo?"
6. "has probado algo para solucionarlo?"

# CUANDO MARCAR COMO QUALIFIED

Cambia action a "QUALIFIED" cuando tengas estos 2 puntos claros:
1. El lead tiene un negocio digital activo (curso, mentoria, consultoria, comunidad) con algun ingreso
2. El lead tiene un problema claro relacionado con ventas, captacion o escalado

NO cualifiques prematuramente. Si dudas, sigue preguntando.

# DESCUALIFICACION

Si despues de varias preguntas queda claro que:
- No tiene negocio digital
- Esta empezando completamente desde cero sin producto
- No tiene interes en emprender

Responde amablemente y cambia action a "DISQUALIFY".

# HANDOVER HUMANO

Cambia action a "HANDOVER_HUMAN" si:
- El lead pide hablar con una persona real
- El lead es grosero o agresivo repetidamente
- El lead dice que ya es cliente
- La situacion escapa tu capacidad

# REGLAS IMPORTANTES

- Si el lead no responde a tu pregunta, no pases a la siguiente. Redirige suavemente
- Si el lead pregunta por precio: "depende mucho de cada caso, primero vemos tu situacion en una llamada rapida"
- Nunca reveles precios por chat
- Nunca inventes informacion que el lead no haya dicho
- Si el lead pregunta algo, respondele brevemente y luego vuelve a guiar
- Habla siempre en primera persona (yo, nosotros)
- No hables de ${agentName} en tercera persona

# CONTEXTO NEGOCIO

${brandName} - ${businessDesc}

${customPrompt ? `# INSTRUCCIONES ADICIONALES\n\n${customPrompt}` : ""}`;
}

export async function runQualifier(
  userMessage: string,
  chatHistory: Array<{ role: "user" | "assistant"; content: string }>,
  config: AgentConfig,
  knowledgeBase: string
): Promise<QualifierResult> {
  try {
    let systemPrompt = buildQualifierSystemPrompt(config);

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

    return parseAgentResponse(text);
  } catch {
    return { messages: ["perdona puedes repetir?"], action: "NONE" };
  }
}

function parseAgentResponse(raw: string): QualifierResult {
  try {
    // Intentar parsear directo
    const parsed = JSON.parse(raw);
    return validateResult(parsed);
  } catch {
    try {
      // Buscar JSON en markdown
      const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        return validateResult(JSON.parse(match[1].trim()));
      }
      // Buscar JSON suelto
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

function validateResult(parsed: Record<string, unknown>): QualifierResult {
  const messages = Array.isArray(parsed.messages)
    ? (parsed.messages as string[])
    : ["perdona puedes repetir?"];
  const validActions: QualifierAction[] = [
    "NONE",
    "QUALIFIED",
    "DISQUALIFY",
    "HANDOVER_HUMAN",
  ];
  const action = validActions.includes(parsed.action as QualifierAction)
    ? (parsed.action as QualifierAction)
    : "NONE";
  return { messages, action };
}
