import { useState, useEffect, useCallback } from "react";
import api from "../services/api.js";

const formaConfig = {
  pix: { label: "PIX", color: "#00F5A0" },
  dinheiro: { label: "Dinheiro", color: "#F59E0B" },
  credito: { label: "Crédito", color: "#B8A8FF" },
  debito: { label: "Débito", color: "#7C6AF5" },
  vr: { label: "VR", color: "#FF6B35" },
  va: { label: "VA", color: "#00D9F5" },
  ticket: { label: "Ticket", color: "#F472B6" },
  transferencia: { label: "Transferência", color: "#4ade80" },
};

export default function Caixa() {
  const [resumo, setResumo] = useState(null);
  const [pagamentos, setPagamentos] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [r, p] = await Promise.all([
        api.get("/food/caixa/resumo"),
        api.get("/food/caixa/pagamentos"),
      ]);
      setResumo(r.data);
      setPagamentos(p.data);
    } catch (e) {
      console.error("Erro ao buscar caixa:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="t-muted text-sm">Carregando caixa...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div>
        <h1 className="t-text text-lg font-semibold">Caixa</h1>
        <p className="t-muted text-xs mt-0.5">Resumo financeiro do dia</p>
      </div>

      {/* Stats principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Faturamento hoje", value: `R$ ${Number(resumo?.totalHoje || 0).toFixed(2)}`, color: "var(--accent)" },
          { label: "Pedidos fechados", value: resumo?.pedidosHoje || 0, color: "#00F5A0" },
          { label: "Mesas ocupadas", value: resumo?.mesasAtivas || 0, color: "#B8A8FF" },
          {
            label: "Ticket médio", value: resumo?.pedidosHoje > 0
              ? `R$ ${(resumo.totalHoje / resumo.pedidosHoje).toFixed(2)}`
              : "R$ 0,00", color: "#F59E0B"
          },
        ].map((s, i) => (
          <div key={i} className="t-card rounded-xl p-5">
            <div className="t-faint text-[11px] uppercase tracking-wider mb-2"
              style={{ fontFamily: "'Space Mono', monospace" }}>{s.label}</div>
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Formas de pagamento */}
      {/* Formas de pagamento */}
      <div className="t-card rounded-xl p-5">
        <div className="t-faint text-[11px] uppercase tracking-wider mb-4"
          style={{ fontFamily: "'Space Mono', monospace" }}>
          Receita por forma de pagamento — hoje
        </div>
        {resumo?.porForma && Object.keys(resumo.porForma).length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(resumo.porForma).map(([forma, total]) => {
              const cfg = formaConfig[forma] || { label: forma, color: "#888" };
              return (
                <div key={forma} className="t-inner rounded-lg p-3">
                  <div className="text-[11px] mb-2" style={{ color: cfg.color, fontFamily: "'Space Mono', monospace" }}>
                    {cfg.label}
                  </div>
                  <div className="t-text text-lg font-bold">
                    R$ {Number(total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </div>
                  <div className="h-1 rounded-full mt-2" style={{ background: "var(--bg-card)" }}>
                    <div className="h-full rounded-full" style={{
                      width: resumo.totalHoje > 0 ? `${(total / resumo.totalHoje) * 100}%` : "0%",
                      background: cfg.color,
                    }} />
                  </div>
                  <div className="t-faint text-[10px] mt-1">
                    {resumo.totalHoje > 0 ? `${((total / resumo.totalHoje) * 100).toFixed(0)}%` : "0%"}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="t-muted text-sm text-center py-4">Nenhum pagamento hoje</div>
        )}
      </div>

      {/* Histórico de pagamentos */}
      <div className="t-card rounded-xl overflow-hidden">
        <div className="flex justify-between items-center px-5 py-4"
          style={{ borderBottom: "0.5px solid var(--border)" }}>
          <span className="t-text text-sm font-medium">Histórico de pagamentos</span>
          <span className="t-muted text-xs">{pagamentos.length} registros</span>
        </div>

        {pagamentos.length === 0 ? (
          <div className="px-5 py-10 text-center t-faint text-sm">
            Nenhum pagamento registrado ainda
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[560px]">
              <thead>
                <tr className="t-row">
                  {["Horário", "Pedido", "Mesa", "Garçom", "Forma", "Total"].map(h => (
                    <th key={h} className="t-th px-5 py-3 text-left text-[11px] uppercase tracking-wider font-medium"
                      style={{ fontFamily: "'Space Mono', monospace" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagamentos.map((p, i) => {
                  const fc = formaConfig[p.forma] || { label: p.forma, color: "#888" };
                  return (
                    <tr key={p.id} className={i < pagamentos.length - 1 ? "t-row" : ""}>
                      <td className="px-5 py-3 t-muted text-sm"
                        style={{ fontFamily: "'Space Mono', monospace", fontSize: "11px" }}>
                        {new Date(p.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-5 py-3 t-muted text-sm">#{p.pedido?.id}</td>
                      <td className="px-5 py-3 t-muted text-sm">
                        {p.pedido?.mesa ? `Mesa ${p.pedido.mesa.numero}` : "Balcão"}
                      </td>
                      <td className="px-5 py-3 t-muted text-sm">
                        {p.pedido?.garcom?.nome || "—"}
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-xs px-2 py-1 rounded t-inner"
                          style={{ color: fc.color }}>
                          {fc.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm font-semibold"
                        style={{ color: "var(--accent)" }}>
                        R$ {Number(p.total).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}