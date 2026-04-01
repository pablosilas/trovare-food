import { useState, useEffect, useCallback } from "react";
import { BarChart2, Ban, AlertTriangle } from "lucide-react";
import api from "../services/api.js";

const periodos = [
  { value: "dia", label: "Hoje" },
  { value: "semana", label: "7 dias" },
  { value: "mes", label: "Este mês" },
  { value: "ano", label: "Este ano" },
];

export default function Relatorios() {
  const [periodo, setPeriodo] = useState("dia");
  const [saidas, setSaidas] = useState(null);
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aba, setAba] = useState("saidas"); // "saidas" | "cancelamentos"
  const [logs, setLogs] = useState([]);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [s, a, l] = await Promise.all([
        api.get(`/food/relatorios/saidas?periodo=${periodo}`),
        api.get("/food/relatorios/alertas"),
        api.get(`/food/relatorios/cancelamentos?periodo=${periodo}`),
      ]);
      setSaidas(s.data);
      setAlertas(a.data);
      setLogs(l.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [periodo]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="t-muted text-sm">Carregando relatórios...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div>
        <h1 className="t-text text-lg font-semibold">Relatórios</h1>
        <p className="t-muted text-xs mt-0.5">Saídas do cardápio e controle de estoque</p>
      </div>

      <div className="flex gap-2 mb-2">
        {[
          { value: "saidas", icon: BarChart2, label: "Saídas do cardápio" },
          { value: "cancelamentos", icon: Ban, label: "Cancelamentos" },
        ].map(a => (
          <button key={a.value} onClick={() => setAba(a.value)}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg border transition-all cursor-pointer"
            style={{
              background: aba === a.value ? "var(--accent-bg)" : "transparent",
              color: aba === a.value ? "var(--accent)" : "var(--text-muted)",
              borderColor: aba === a.value ? "var(--accent-border)" : "var(--border)",
              fontWeight: aba === a.value ? 600 : 400,
            }}>
            <a.icon className="w-3.5 h-3.5" />
            {a.label}
          </button>
        ))}
      </div>

      {aba === "cancelamentos" && (
        <div className="t-card rounded-xl overflow-hidden">
          <div className="flex justify-between items-center px-5 py-4"
            style={{ borderBottom: "0.5px solid var(--border)" }}>
            <span className="t-text text-sm font-medium">Log de cancelamentos</span>
            <span className="t-muted text-xs">{logs.length} registros</span>
          </div>

          {logs.length === 0 ? (
            <div className="px-5 py-10 text-center t-muted text-sm">
              Nenhum cancelamento no período
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[600px]">
                <thead>
                  <tr className="t-row">
                    {["Horário", "Pedido", "Mesa/Cliente", "Cancelado por", "Itens", "Total", "Motivo"].map(h => (
                      <th key={h} className="t-th px-5 py-3 text-left text-[11px] uppercase tracking-wider font-medium"
                        style={{ fontFamily: "'Space Mono', monospace" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, i) => (
                    <tr key={log.id} className={i < logs.length - 1 ? "t-row" : ""}>
                      <td className="px-5 py-3 t-muted text-xs"
                        style={{ fontFamily: "'Space Mono', monospace" }}>
                        {new Date(log.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-5 py-3 t-muted text-sm">#{log.pedidoId}</td>
                      <td className="px-5 py-3 t-text text-sm">{log.mesa}</td>
                      <td className="px-5 py-3">
                        <span className="text-xs px-2 py-1 rounded"
                          style={{
                            background: log.canceladoPor === "gerente" ? "#7C6AF515" : "#F59E0B15",
                            color: log.canceladoPor === "gerente" ? "#7C6AF5" : "#F59E0B",
                          }}>
                          {log.nomeUsuario}
                        </span>
                      </td>
                      <td className="px-5 py-3 t-muted text-xs">
                        {Array.isArray(log.itens)
                          ? log.itens.map(i => `${i.quantidade}x ${i.nome}`).join(", ")
                          : "—"}
                      </td>
                      <td className="px-5 py-3 text-sm font-semibold" style={{ color: "#FF3D6E" }}>
                        R$ {Number(log.total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3 t-muted text-xs italic">
                        {log.motivo || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {/* Alertas de estoque */}
      {aba === "saidas" && alertas.length > 0 && (
        <div className="t-card rounded-xl overflow-hidden"
          style={{ borderColor: "#FF3D6E40" }}>
          <div className="px-5 py-4 flex items-center gap-3"
            style={{ borderBottom: "0.5px solid var(--border)", background: "#FF3D6E08" }}>
            <AlertTriangle className="w-5 h-5 shrink-0" style={{ color: "#FF3D6E" }} />
            <div>
              <div className="text-sm font-semibold" style={{ color: "#FF3D6E" }}>
                {alertas.length} alerta{alertas.length > 1 ? "s" : ""} de estoque
              </div>
              <div className="t-muted text-xs">Itens com estoque baixo ou zerado</div>
            </div>
          </div>
          <div className="p-4 flex flex-col gap-2">
            {alertas.map(a => (
              <div key={a.id} className="t-inner rounded-lg px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="t-text text-sm font-medium">{a.nome}</div>
                  <div className="t-muted text-xs">{a.categoria}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold"
                    style={{ color: a.zerado ? "#FF3D6E" : "#F59E0B" }}>
                    {a.zerado ? "Sem estoque" : `${a.estoque} un.`}
                  </div>
                  <div className="t-faint text-xs">mín: {a.estoqueMin}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtro de período */}
      {aba === "saidas" && (
        <>
          <div className="flex gap-2">
            {periodos.map(p => (
              <button key={p.value} onClick={() => setPeriodo(p.value)}
                className="flex-1 text-xs py-2 rounded-lg border transition-all cursor-pointer"
                style={{
                  background: periodo === p.value ? "var(--accent-bg)" : "transparent",
                  color: periodo === p.value ? "var(--accent)" : "var(--text-muted)",
                  borderColor: periodo === p.value ? "var(--accent-border)" : "var(--border)",
                  fontWeight: periodo === p.value ? 600 : 400,
                }}>
                {p.label}
              </button>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Itens vendidos", value: saidas?.totalItens || 0, color: "var(--accent)" },
              { label: "Receita", value: `R$ ${Number(saidas?.totalReceita || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, color: "#00F5A0" },
            ].map((s, i) => (
              <div key={i} className="t-card rounded-xl p-5">
                <div className="t-faint text-[11px] uppercase tracking-wider mb-2"
                  style={{ fontFamily: "'Space Mono', monospace" }}>{s.label}</div>
                <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Tabela de saídas */}
          <div className="t-card rounded-xl overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between"
              style={{ borderBottom: "0.5px solid var(--border)" }}>
              <span className="t-text text-sm font-medium">Itens mais vendidos</span>
              <span className="t-muted text-xs">
                {periodos.find(p => p.value === periodo)?.label}
              </span>
            </div>

            {saidas?.itens?.length === 0 ? (
              <div className="px-5 py-10 text-center t-muted text-sm">
                Nenhuma venda no período
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[500px]">
                  <thead>
                    <tr className="t-row">
                      {["#", "Item", "Categoria", "Qtd vendida", "Receita", "Estoque"].map(h => (
                        <th key={h} className="t-th px-5 py-3 text-left text-[11px] uppercase tracking-wider font-medium"
                          style={{ fontFamily: "'Space Mono', monospace" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {saidas?.itens?.map((item, i) => (
                      <tr key={item.id} className={i < saidas.itens.length - 1 ? "t-row" : ""}>
                        <td className="px-5 py-3 t-faint text-sm"
                          style={{ fontFamily: "'Space Mono', monospace" }}>
                          {i + 1}
                        </td>
                        <td className="px-5 py-3 t-text text-sm font-medium">{item.nome}</td>
                        <td className="px-5 py-3 t-muted text-sm">{item.categoria}</td>
                        <td className="px-5 py-3">
                          <span className="text-sm font-bold" style={{ color: "var(--accent)" }}>
                            {item.quantidade}
                          </span>
                          <span className="t-muted text-xs ml-1">un.</span>
                        </td>
                        <td className="px-5 py-3 text-sm font-semibold" style={{ color: "#00F5A0" }}>
                          R$ {Number(item.total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-5 py-3">
                          {item.temEstoque ? (
                            <span className="text-xs px-2 py-1 rounded"
                              style={{
                                background: item.estoque <= 0 ? "#FF3D6E15"
                                  : item.estoque <= item.estoqueMin ? "#F59E0B15"
                                    : "#00F5A015",
                                color: item.estoque <= 0 ? "#FF3D6E"
                                  : item.estoque <= item.estoqueMin ? "#F59E0B"
                                    : "#00F5A0",
                              }}>
                              {item.estoque <= 0 ? "Zerado" : `${item.estoque} un.`}
                            </span>
                          ) : (
                            <span className="t-faint text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}