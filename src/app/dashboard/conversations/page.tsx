"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Conversation {
  id: string;
  instagramUserId: string;
  leadName: string | null;
  status: string;
  currentAgent: string;
  updatedAt: string;
  messages: Array<{ content: string; createdAt: string }>;
  _count: { messages: number };
}

const statusColors: Record<string, string> = {
  active: "bg-blue-500/20 text-blue-300",
  qualified: "bg-purple-500/20 text-purple-300",
  disqualified: "bg-gray-500/20 text-gray-400",
  booked: "bg-green-500/20 text-green-300",
  handover: "bg-orange-500/20 text-orange-300",
};

const statusLabels: Record<string, string> = {
  active: "Activa",
  qualified: "Cualificado",
  disqualified: "Descualificado",
  booked: "Llamada agendada",
  handover: "Handover humano",
};

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filter, setFilter] = useState<string>("");

  useEffect(() => {
    const url = filter ? `/api/conversations?status=${filter}` : "/api/conversations";
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setConversations(data);
      });
  }, [filter]);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Conversaciones</h2>

      <div className="flex gap-2 mb-6">
        {[
          { value: "", label: "Todas" },
          { value: "active", label: "Activas" },
          { value: "qualified", label: "Cualificados" },
          { value: "booked", label: "Agendados" },
          { value: "handover", label: "Handover" },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              filter === f.value
                ? "bg-purple-600 text-white"
                : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {conversations.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500">
          No hay conversaciones todavia. Cuando alguien te escriba por DM, aparecera aqui.
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => (
            <Link
              key={conv.id}
              href={`/dashboard/conversations/${conv.id}`}
              className="block bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-gray-400 text-sm font-medium">
                    {(conv.leadName || conv.instagramUserId).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {conv.leadName || `Lead ${conv.instagramUserId.slice(-6)}`}
                    </p>
                    <p className="text-xs text-gray-500">
                      {conv._count.messages} mensajes
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded ${statusColors[conv.status] || "bg-gray-800 text-gray-400"}`}>
                    {statusLabels[conv.status] || conv.status}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(conv.updatedAt).toLocaleDateString("es")}
                  </span>
                </div>
              </div>
              {conv.messages[0] && (
                <p className="text-sm text-gray-400 mt-2 truncate pl-13">
                  {conv.messages[0].content}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
