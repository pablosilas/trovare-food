import { useState, useEffect, useCallback } from "react";
import { TrendingUp, Clock, TableProperties, BookOpen, Banknote } from "lucide-react";
import api from "../services/api.js";

const statusConfig = {
  aberto: { label: "Aberto", className: "tag-aberto" },
  preparando: { label: "Preparando", className: "tag-preparando" },
  pronto: { label: "Pronto", className: "tag-pronto" },
  fechado: { label: "Fechado", className: "tag-fechado" },
};

const mesaStatusConfig = {
  livre: { label: "Livre", className: "tag-livre" },
  ocupada: { label: "Ocupada", className: "tag-ocupada" },
  reservada: { label: "Reservada", className: "tag-reservada" },
};

export default function Dashboard() {
  const [resumo, setResumo] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [mesas, setMesas] = useState([]);
  const [cardapio, setCardapio] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [r, p, m, c] = await Promise.all([
        api.get("/food/caixa/resumo"),
        api.get("/food/pedidos"),
        api.get("/food/mesas"),
        api.get("/food/cardapio/categorias"),
      ]);
      setResumo(r.data);
      setPedidos(p.data);
      setMesas(m.data);
      setCardapio(c.data);
    } catch (e) {
      console.error("Erro ao buscar dados:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const pedidosAtivos = pedidos.filter(p => p.status !== "fechado");
  const totalItens = cardapio.reduce((s, c) => s + c.itens.length, 0);
  const mesasLivres = mesas.filter(m => m.status === "livre").length;
  const mesasOcupadas = mesas.filter(m => m.status === "ocupada").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="t-muted text-sm">Carregando dashboard...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Faturamento hoje", value: `R$ ${Number(resumo?.totalHoje || 0).toFixed(2)}`, color: "var(--accent)", Icon: TrendingUp },
          { label: "Pedidos ativos", value: pedidosAtivos.length, color: "#00F5A0", Icon: Clock },
          { label: "Mesas ocupadas", value: `${mesasOcupadas}/${mesas.length}`, color: "#B8A8FF", Icon: TableProperties },
          { label: "Itens no cardápio", value: totalItens, color: "#F59E0B", Icon: BookOpen },
        ].map((s, i) => (
          <div key={i} className="t-card rounded-xl p-5">
            <div className="flex justify-between items-start mb-3">
              <span className="t-faint text-[11px] uppercase tracking-wider"
                style={{ fontFamily: "'Space Mono', monospace" }}>{s.label}</span>
              <s.Icon className="w-4 h-4" style={{ color: s.color }} />
            </div>
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {pedidos.filter(p => p.status === "aguardando_pagamento").length > 0 && (
        <div className="t-card rounded-xl p-4 flex items-center gap-4"
          style={{ borderColor: "var(--accent)", background: "var(--accent-bg)" }}>
          <Banknote className="w-6 h-6 shrink-0" style={{ color: "var(--accent)" }} />
          <div>
            <div className="text-sm font-bold" style={{ color: "var(--accent)" }}>
              {pedidos.filter(p => p.status === "aguardando_pagamento").length} pedido(s) aguardando pagamento!
            </div>
            <div className="t-muted text-xs mt-1">
              {[...new Set(
                pedidos
                  .filter(p => p.status === "aguardando_pagamento")
                  .map(p => p.mesa ? `Mesa ${p.mesa.numero}` : "Balcão")
              )].join(", ")}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Pedidos ativos */}
        <div className="col-span-1 lg:col-span-3 t-card rounded-xl overflow-hidden">
          <div className="flex justify-between items-center px-5 py-4"
            style={{ borderBottom: "0.5px solid var(--border)" }}>
            <span className="t-text text-sm font-medium">Pedidos em andamento</span>
            <span className="t-muted text-xs">{pedidosAtivos.length} ativos</span>
          </div>
          {pedidosAtivos.length === 0 ? (
            <div className="px-5 py-8 text-center t-faint text-sm">
              Nenhum pedido ativo no momento
            </div>
          ) : (
            pedidosAtivos.slice(0, 6).map((p, i) => {
              const cfg = statusConfig[p.status] || statusConfig.aberto;
              return (
                <div key={p.id}
                  className={`flex items-center gap-3 px-5 py-3 ${i < pedidosAtivos.length - 1 ? "t-row" : ""}`}>
                  <div className="t-faint text-[10px] w-16 shrink-0"
                    style={{ fontFamily: "'Space Mono', monospace" }}>
                    #{p.id}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="t-text text-sm font-medium">
                      {p.mesa ? `Mesa ${p.mesa.numero}` : "Balcão"}
                    </div>
                    <div className="t-muted text-xs">
                      {p.itens?.length || 0} itens
                      {p.garcom ? ` · ${p.garcom.nome}` : ""}
                    </div>
                  </div>
                  <div className="text-sm font-semibold shrink-0" style={{ color: "var(--accent)" }}>
                    R$ {Number(p.total).toFixed(2)}
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded shrink-0 ${cfg.className}`}>
                    {cfg.label}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Mapa de mesas */}
        <div className="col-span-1 lg:col-span-2 t-card rounded-xl overflow-hidden">
          <div className="px-5 py-4" style={{ borderBottom: "0.5px solid var(--border)" }}>
            <span className="t-text text-sm font-medium">Mesas</span>
          </div>
          <div className="p-4">

            {/* Legenda */}
            <div className="flex gap-3 mb-4 flex-wrap">
              {[
                { label: "Livre", color: "#00F5A0" },
                { label: "Ocupada", color: "var(--accent)" },
                { label: "Reservada", color: "#B8A8FF" },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: l.color }} />
                  <span className="t-faint text-[10px]">{l.label}</span>
                </div>
              ))}
            </div>

            {mesas.length === 0 ? (
              <div className="t-muted text-sm text-center py-6">
                Nenhuma mesa cadastrada
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {mesas.map(mesa => {
                  const cfg = mesaStatusConfig[mesa.status] || mesaStatusConfig.livre;
                  const pedidoAtivo = mesa.pedidos?.find(p => p.status !== "fechado");
                  const color = mesa.status === "livre" ? "#00F5A0"
                    : mesa.status === "ocupada" ? "var(--accent)"
                      : "#B8A8FF";
                  return (
                    <div key={mesa.id} className="t-inner rounded-lg p-2.5 text-center"
                      style={{ borderColor: color + "40" }}>
                      <div className="text-lg font-bold mb-0.5" style={{ color }}>
                        {String(mesa.numero).padStart(2, "0")}
                      </div>
                      <div className="t-faint text-[9px] mb-1">{mesa.capacidade}p</div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${cfg.className}`}>
                        {cfg.label}
                      </span>
                      {pedidoAtivo && (
                        <div className="t-faint text-[9px] mt-1"
                          style={{ fontFamily: "'Space Mono', monospace" }}>
                          R$ {Number(pedidoAtivo.total).toFixed(0)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Resumo */}
            <div className="flex justify-between mt-4 pt-3"
              style={{ borderTop: "0.5px solid var(--border-soft)" }}>
              <div className="text-center">
                <div className="text-sm font-bold" style={{ color: "#00F5A0" }}>{mesasLivres}</div>
                <div className="t-faint text-[10px]">Livres</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-bold" style={{ color: "var(--accent)" }}>{mesasOcupadas}</div>
                <div className="t-faint text-[10px]">Ocupadas</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-bold" style={{ color: "#B8A8FF" }}>
                  {mesas.filter(m => m.status === "reservada").length}
                </div>
                <div className="t-faint text-[10px]">Reservadas</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Formas de pagamento hoje */}
      {resumo?.totalHoje > 0 && (
        <div className="t-card rounded-xl p-5">
          <div className="t-faint text-[11px] uppercase tracking-wider mb-4"
            style={{ fontFamily: "'Space Mono', monospace" }}>
            Pagamentos de hoje
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "PIX", value: resumo?.totalPix || 0, color: "#00F5A0" },
              { label: "Cartão", value: resumo?.totalCartao || 0, color: "#B8A8FF" },
              { label: "Dinheiro", value: resumo?.totalDinheiro || 0, color: "#F59E0B" },
            ].map((f, i) => (
              <div key={i} className="t-inner rounded-lg p-3">
                <div className="text-[11px] mb-1" style={{ color: f.color, fontFamily: "'Space Mono', monospace" }}>
                  {f.label}
                </div>
                <div className="t-text text-lg font-bold">R$ {Number(f.value).toFixed(2)}</div>
                <div className="h-1 rounded-full mt-2" style={{ background: "var(--bg-card)" }}>
                  <div className="h-full rounded-full" style={{
                    width: resumo.totalHoje > 0 ? `${(f.value / resumo.totalHoje) * 100}%` : "0%",
                    background: f.color,
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}