"use client";

import { useEffect, useState } from "react";

interface Config {
  agentName: string;
  brandName: string;
  businessDesc: string;
  qualifierPrompt: string;
  icpDescription: string;
  video1Url: string;
  video2Url: string;
  calendlyUrl: string;
  bookingPrompt: string;
  toneStyle: string;
  language: string;
  isActive: boolean;
}

const defaultConfig: Config = {
  agentName: "",
  brandName: "",
  businessDesc: "",
  qualifierPrompt: "",
  icpDescription: "",
  video1Url: "",
  video2Url: "",
  calendlyUrl: "",
  bookingPrompt: "",
  toneStyle: "casual",
  language: "es",
  isActive: false,
};

export default function ConfigPage() {
  const [config, setConfig] = useState<Config>(defaultConfig);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) setConfig({ ...defaultConfig, ...data });
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    await fetch("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const update = (field: keyof Config, value: string | boolean) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Configuracion</h2>
        <div className="flex items-center gap-3">
          {saved && <span className="text-green-400 text-sm">Guardado</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>

      {/* Activar/Desactivar */}
      <Section title="Estado del agente">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={config.isActive}
            onChange={(e) => update("isActive", e.target.checked)}
            className="w-5 h-5 rounded accent-purple-600"
          />
          <span className="text-gray-300">Agente activo (responde DMs automaticamente)</span>
        </label>
      </Section>

      {/* Identidad */}
      <Section title="Identidad">
        <Field label="Nombre del agente" sublabel="Como se presenta en DMs">
          <input
            value={config.agentName}
            onChange={(e) => update("agentName", e.target.value)}
            placeholder="Ej: Ashe Micolau"
            className="input"
          />
        </Field>
        <Field label="Nombre de marca">
          <input
            value={config.brandName}
            onChange={(e) => update("brandName", e.target.value)}
            placeholder="Ej: AutoSetter"
            className="input"
          />
        </Field>
        <Field label="Descripcion del negocio">
          <textarea
            value={config.businessDesc}
            onChange={(e) => update("businessDesc", e.target.value)}
            placeholder="Ej: Ayudamos a infoproductores a escalar sus ventas..."
            rows={3}
            className="input"
          />
        </Field>
      </Section>

      {/* Qualifier */}
      <Section title="Agente Qualifier">
        <Field label="Perfil de cliente ideal (ICP)">
          <textarea
            value={config.icpDescription}
            onChange={(e) => update("icpDescription", e.target.value)}
            placeholder="Ej: Creador digital con curso o mentoria que genera ingresos y quiere escalar"
            rows={3}
            className="input"
          />
        </Field>
        <Field label="Instrucciones adicionales del qualifier" sublabel="Opcional">
          <textarea
            value={config.qualifierPrompt}
            onChange={(e) => update("qualifierPrompt", e.target.value)}
            placeholder="Instrucciones extra para el agente qualifier..."
            rows={4}
            className="input"
          />
        </Field>
      </Section>

      {/* Booking */}
      <Section title="Agente Booking">
        <Field label="URL Video 1">
          <input
            value={config.video1Url}
            onChange={(e) => update("video1Url", e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="input"
          />
        </Field>
        <Field label="URL Video 2">
          <input
            value={config.video2Url}
            onChange={(e) => update("video2Url", e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="input"
          />
        </Field>
        <Field label="URL Calendly">
          <input
            value={config.calendlyUrl}
            onChange={(e) => update("calendlyUrl", e.target.value)}
            placeholder="https://calendly.com/tu-usuario/30min"
            className="input"
          />
        </Field>
        <Field label="Instrucciones adicionales del booking" sublabel="Opcional">
          <textarea
            value={config.bookingPrompt}
            onChange={(e) => update("bookingPrompt", e.target.value)}
            placeholder="Instrucciones extra para el agente booking..."
            rows={4}
            className="input"
          />
        </Field>
      </Section>

      <style jsx>{`
        :global(.input) {
          width: 100%;
          background: rgb(17 24 39);
          border: 1px solid rgb(55 65 81);
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          color: white;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.2s;
        }
        :global(.input:focus) {
          border-color: rgb(147 51 234);
        }
      `}</style>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-4">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  sublabel,
  children,
}: {
  label: string;
  sublabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">
        {label}
        {sublabel && <span className="text-gray-500 font-normal ml-1">({sublabel})</span>}
      </label>
      {children}
    </div>
  );
}
