"use client";

import { useEffect, useState } from "react";

interface Document {
  id: string;
  name: string;
  content: string;
  type: string;
  createdAt: string;
}

export default function KnowledgePage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState("knowledge");
  const [saving, setSaving] = useState(false);

  const loadDocs = () => {
    fetch("/api/documents")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setDocs(data);
      });
  };

  useEffect(() => {
    loadDocs();
  }, []);

  const handleAdd = async () => {
    if (!name.trim() || !content.trim()) return;
    setSaving(true);
    await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, content, type }),
    });
    setName("");
    setContent("");
    setShowForm(false);
    setSaving(false);
    loadDocs();
  };

  const handleDelete = async (id: string) => {
    await fetch("/api/documents", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadDocs();
  };

  const typeLabels: Record<string, string> = {
    knowledge: "Conocimiento",
    faq: "FAQ",
    objections: "Objeciones",
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Knowledge Base</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {showForm ? "Cancelar" : "Agregar documento"}
        </button>
      </div>

      <p className="text-gray-400 text-sm mb-6">
        Sube documentos con informacion sobre tu negocio, productos, precios,
        objeciones comunes, etc. El agente usara esta informacion para responder.
      </p>

      {showForm && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-4">
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm text-gray-300 mb-1">Nombre</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Info de precios"
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-purple-600"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Tipo</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-purple-600"
                >
                  <option value="knowledge">Conocimiento</option>
                  <option value="faq">FAQ</option>
                  <option value="objections">Objeciones</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Contenido</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Pega aqui el contenido del documento..."
                rows={8}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-purple-600"
              />
            </div>
            <button
              onClick={handleAdd}
              disabled={saving || !name.trim() || !content.trim()}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {saving ? "Guardando..." : "Guardar documento"}
            </button>
          </div>
        </div>
      )}

      {docs.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500">
          No hay documentos todavia. Agrega tu primer documento para que el agente
          tenga contexto sobre tu negocio.
        </div>
      ) : (
        <div className="space-y-3">
          {docs.map((doc) => (
            <div key={doc.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{doc.name}</h3>
                  <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">
                    {typeLabels[doc.type] || doc.type}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="text-gray-500 hover:text-red-400 text-sm transition-colors"
                >
                  Eliminar
                </button>
              </div>
              <p className="text-sm text-gray-400 line-clamp-3">{doc.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
