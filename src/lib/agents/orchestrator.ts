import { prisma } from "../prisma";
import { routeMessage } from "./router";
import { runQualifier } from "./qualifier";
import { runBooking } from "./booking";
import { sendInstagramMessage } from "../instagram";

/**
 * Orquestador principal: recibe un DM, lo procesa con el agente correcto,
 * y responde vía Instagram API.
 */
export async function processIncomingMessage(
  userId: string,
  senderInstagramId: string,
  messageText: string
) {
  // 1. Obtener usuario y config
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { config: true, documents: true },
  });

  if (!user || !user.config || !user.config.isActive) {
    return { status: "inactive", messages: [] };
  }

  if (!user.pageId || !user.pageAccessToken) {
    return { status: "no_page", messages: [] };
  }

  // 2. Obtener o crear conversación
  let conversation = await prisma.conversation.findUnique({
    where: {
      userId_instagramUserId: {
        userId: user.id,
        instagramUserId: senderInstagramId,
      },
    },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        userId: user.id,
        instagramUserId: senderInstagramId,
        status: "active",
        currentAgent: "qualifier",
      },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });
  }

  // 3. Guardar mensaje del usuario
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: "user",
      content: messageText,
    },
  });

  // 4. Formatear historial para los agentes
  const chatHistory = [...conversation.messages].reverse().map((msg) => ({
    role: msg.role as "user" | "assistant",
    content: msg.content,
  }));

  const formattedHistory =
    chatHistory.length === 0
      ? "No hay historial previo. Este es el primer mensaje del lead."
      : chatHistory.map((m) => `[${m.role}]: ${m.content}`).join("\n");

  // 5. Knowledge base
  const knowledgeBase = user.documents
    .map((doc) => `## ${doc.name}\n${doc.content}`)
    .join("\n\n");

  // 6. Router decide qué agente usar
  const routeResult = await routeMessage(messageText, formattedHistory);

  let agentMessages: string[] = [];
  let agentAction = "NONE";
  let newStatus = conversation.status;
  let newAgent = conversation.currentAgent;

  // 7. Ejecutar agente según ruta
  switch (routeResult.route) {
    case "qualifier": {
      const result = await runQualifier(
        messageText,
        chatHistory,
        user.config,
        knowledgeBase
      );
      agentMessages = result.messages;
      agentAction = result.action;

      if (result.action === "QUALIFIED") {
        newStatus = "qualified";
        newAgent = "booking";
      } else if (result.action === "DISQUALIFY") {
        newStatus = "disqualified";
      } else if (result.action === "HANDOVER_HUMAN") {
        newStatus = "handover";
      }
      break;
    }

    case "content_booking": {
      const result = await runBooking(
        messageText,
        chatHistory,
        user.config,
        knowledgeBase
      );
      agentMessages = result.messages;
      agentAction = result.action;

      if (result.action === "CALL_BOOKED") {
        newStatus = "booked";
      } else if (result.action === "RETURN_TO_QUALIFIER") {
        newAgent = "qualifier";
      } else if (result.action === "HANDOVER_HUMAN") {
        newStatus = "handover";
      }
      break;
    }

    case "human": {
      agentMessages = [
        "un momento tio q te paso con alguien del equipo",
      ];
      agentAction = "HANDOVER_HUMAN";
      newStatus = "handover";
      break;
    }

    case "disqualify": {
      agentMessages = [
        "oye mira ahora mismo creo q no es el mejor momento para trabajar juntos",
        "pero cuando tengas algo mas montado escribeme y vemos como te puedo ayudar",
      ];
      agentAction = "DISQUALIFY";
      newStatus = "disqualified";
      break;
    }
  }

  // 8. Guardar respuesta del agente
  const fullResponse = agentMessages.join("\n");
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: "assistant",
      content: fullResponse,
      agentAction,
    },
  });

  // 9. Actualizar estado conversación
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      status: newStatus,
      currentAgent: newAgent,
    },
  });

  // 10. Enviar mensajes por Instagram con delay simulado
  for (let i = 0; i < agentMessages.length; i++) {
    const msg = agentMessages[i];

    // Delay entre mensajes (simula escritura humana)
    if (i > 0) {
      const delayMs = Math.max(
        2000,
        Math.min(10000, msg.length * 40 + Math.random() * 2000)
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    await sendInstagramMessage(
      user.pageId,
      user.pageAccessToken,
      senderInstagramId,
      msg
    );
  }

  return {
    status: "sent",
    messages: agentMessages,
    action: agentAction,
    route: routeResult.route,
  };
}
