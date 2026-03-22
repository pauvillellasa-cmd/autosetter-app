import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processIncomingMessage } from "@/lib/agents/orchestrator";

/**
 * GET — Meta envía esto para verificar el webhook
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

/**
 * POST — Meta envía los mensajes aquí
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Verificar que es un evento de Instagram messaging
    if (body.object !== "instagram") {
      return NextResponse.json({ status: "ignored" });
    }

    // Procesar cada entrada
    for (const entry of body.entry || []) {
      for (const messaging of entry.messaging || []) {
        // Solo procesar mensajes de texto (no echoes, no read receipts)
        if (!messaging.message || messaging.message.is_echo) {
          continue;
        }

        const senderInstagramId = messaging.sender.id;
        const recipientInstagramId = messaging.recipient.id;
        const messageText = messaging.message.text;

        if (!messageText) continue;

        // Encontrar el usuario que recibió el mensaje (por su Instagram ID)
        const user = await prisma.user.findUnique({
          where: { instagramId: recipientInstagramId },
        });

        if (!user) continue;

        // Procesar en background (no bloquear la respuesta a Meta)
        processIncomingMessage(user.id, senderInstagramId, messageText).catch(
          (err) => console.error("Error processing message:", err)
        );
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ status: "ok" }); // Siempre 200 a Meta
  }
}
