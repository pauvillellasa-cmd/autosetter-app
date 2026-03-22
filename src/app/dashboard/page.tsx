import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [totalConversations, activeConversations, qualifiedLeads, bookedCalls] =
    await Promise.all([
      prisma.conversation.count({ where: { userId: user.id } }),
      prisma.conversation.count({ where: { userId: user.id, status: "active" } }),
      prisma.conversation.count({ where: { userId: user.id, status: "qualified" } }),
      prisma.conversation.count({ where: { userId: user.id, status: "booked" } }),
    ]);

  const stats = [
    { label: "Total conversaciones", value: totalConversations, color: "from-blue-500 to-cyan-500" },
    { label: "Activas", value: activeConversations, color: "from-green-500 to-emerald-500" },
    { label: "Cualificados", value: qualifiedLeads, color: "from-purple-500 to-pink-500" },
    { label: "Llamadas agendadas", value: bookedCalls, color: "from-orange-500 to-yellow-500" },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Panel</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-sm text-gray-400 mb-1">{stat.label}</p>
            <p className={`text-3xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-3">Estado del agente</h3>
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${user.config?.isActive ? "bg-green-500 animate-pulse" : "bg-gray-500"}`} />
          <span className="text-gray-300">
            {user.config?.isActive
              ? "Agente activo — respondiendo DMs automaticamente"
              : "Agente inactivo — ve a Configuracion para activarlo"}
          </span>
        </div>
        {!user.config?.isActive && (
          <a
            href="/dashboard/config"
            className="inline-block mt-4 text-sm text-purple-400 hover:text-purple-300"
          >
            Ir a configuracion
          </a>
        )}
      </div>
    </div>
  );
}
