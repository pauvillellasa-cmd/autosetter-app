"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Message {
  id: string;
  role: string;
  content: string;
  agentAction: string | null;
  createdAt: string;
}

interface ConversationDetail {
  id: string;
  instagramUserId: string;
  leadName: string | null;
  status: string;
  currentAgent: string;
  messages: Message[];
}

export default function ConversationDetailPage() {
  const params = useParams();
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);

  useEffect(() => {
    fetch(`/api/conversations/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) setConversation(data);
      });
  }, [params.id]);

  if (!conversation) {
    return <div className="text-gray-500">Cargando...</div>;
  }

  return (
    <div className="max-w-3xl">
      <Link
        href="/dashboard/conversations"
        className="text-sm text-gray-400 hover:text-white mb-4 inline-block"
      >
        ← Volver
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">
            {conversation.leadName || `Lead ${conversation.instagramUserId.slice(-6)}`}
          </h2>
          <p className="text-sm text-gray-400">
            Estado: {conversation.status} | Agente: {conversation.currentAgent}
          </p>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3 max-h-[70vh] overflow-y-auto">
        {conversation.messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.role === "user"
                  ? "bg-gray-800 text-gray-200"
                  : "bg-purple-600/30 text-purple-100"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-gray-500">
                  {new Date(msg.createdAt).toLocaleTimeString("es", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {msg.agentAction && msg.agentAction !== "NONE" && (
                  <span className="text-[10px] bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded">
                    {msg.agentAction}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
