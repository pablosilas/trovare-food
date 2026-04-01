import { useState, useEffect } from "react";
import api from "../services/api.js";

export default function Configuracoes() {
  const [kitchen, setKitchen] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSenha, setShowSenha] = useState(false);
  const [novaSenha, setNovaSenha] = useState(null);
  const [resetting, setResetting] = useState(false);
  const [savingMode, setSavingMode] = useState(false);
  const [savedMode, setSavedMode] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get("/food/config/kitchen"),
      api.get("/food/config"),
    ])
      .then(([k, c]) => { setKitchen(k.data); setConfig(c.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleReset() {
    setResetting(true);
    try {
      const { data } = await api.patch("/food/config/kitchen/reset");
      setNovaSenha(data.plainPassword);
      setShowSenha(true);
    } catch (e) {
      console.error(e);
    } finally {
      setResetting(false);
    }
  }

  async function handleConfigChange(changes) {
    setConfig(c => ({ ...c, ...changes }));
    setSavingMode(true);
    try {
      await api.patch("/food/config", { ...config, ...changes });
      setSavedMode(true);
      setTimeout(() => setSavedMode(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingMode(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="t-muted text-sm">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div>
        <h1 className="t-text text-lg font-semibold">Configurações</h1>
        <p className="t-muted text-xs mt-0.5">
          {savedMode
            ? <span style={{ color: "#00F5A0" }}>✓ Configurações salvas</span>
            : "Gerencie os acessos e preferências do restaurante"
          }
        </p>
      </div>

      {/* Modo dos Garçons */}
      <div className="t-card rounded-xl overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: "0.5px solid var(--border)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                style={{ background: "#B8A8FF20", border: "0.5px solid #B8A8FF30" }}>
                👥
              </div>
              <div>
                <div className="t-text text-sm font-semibold">Modo dos Garçons</div>
                <div className="t-muted text-xs">Como os garçons visualizam os pedidos</div>
              </div>
            </div>
            {savedMode && (
              <span className="text-xs" style={{ color: "#00F5A0", fontFamily: "'Space Mono', monospace" }}>
                ✓ Salvo
              </span>
            )}
          </div>
        </div>

        <div className="p-5 flex flex-col gap-3">
          {[
            {
              value: "movel",
              label: "🚶 Garçom Móvel",
              desc: "Todos os garçons veem e podem atender qualquer mesa. Ideal para equipes pequenas ou restaurantes movimentados.",
            },
            {
              value: "fixo",
              label: "📌 Garçom Fixo",
              desc: "Cada garçom vê apenas os pedidos que ele mesmo criou. Ideal para controle individual de mesas e comissões.",
            },
          ].map(m => (
            <button key={m.value}
              onClick={() => handleConfigChange({ garcomModo: m.value })}
              disabled={savingMode}
              className="w-full text-left rounded-xl p-4 transition-all cursor-pointer"
              style={{
                background: config?.garcomModo === m.value ? "var(--accent-bg)" : "var(--bg-card)",
                border: `0.5px solid ${config?.garcomModo === m.value ? "var(--accent-border)" : "var(--border)"}`,
                opacity: savingMode ? 0.7 : 1,
              }}>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                  style={{
                    borderColor: config?.garcomModo === m.value ? "var(--accent)" : "var(--border)",
                  }}>
                  {config?.garcomModo === m.value && (
                    <div className="w-2.5 h-2.5 rounded-full"
                      style={{ background: "var(--accent)" }} />
                  )}
                </div>
                <div>
                  <div className="text-sm font-semibold"
                    style={{ color: config?.garcomModo === m.value ? "var(--accent)" : "var(--text-primary)" }}>
                    {m.label}
                  </div>
                  <div className="t-muted text-xs mt-0.5">{m.desc}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Acesso da Cozinha */}
      <div className="t-card rounded-xl overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: "0.5px solid var(--border)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: "#F59E0B20", border: "0.5px solid #F59E0B30" }}>
              🍳
            </div>
            <div>
              <div className="t-text text-sm font-semibold">Acesso da Cozinha</div>
              <div className="t-muted text-xs">Credenciais para o Trovare Kitchen</div>
            </div>
          </div>
        </div>

        <div className="p-5 flex flex-col gap-4">

          <div className="t-inner rounded-lg p-4">
            <div className="t-faint text-[10px] uppercase tracking-wider mb-1"
              style={{ fontFamily: "'Space Mono', monospace" }}>
              Email de acesso
            </div>
            <div className="t-text text-sm font-medium"
              style={{ fontFamily: "'Space Mono', monospace" }}>
              {kitchen?.email}
            </div>
          </div>

          <div className="t-inner rounded-lg p-4">
            <div className="t-faint text-[10px] uppercase tracking-wider mb-1"
              style={{ fontFamily: "'Space Mono', monospace" }}>
              Senha
            </div>
            {showSenha && novaSenha ? (
              <div>
                <div className="text-sm font-bold"
                  style={{ fontFamily: "'Space Mono', monospace", color: "var(--accent)" }}>
                  {novaSenha}
                </div>
                <div className="t-muted text-xs mt-1">
                  💡 Anote! Essa senha não será exibida novamente.
                </div>
              </div>
            ) : (
              <div className="t-muted text-sm">••••••••••</div>
            )}
          </div>

          <div className="t-inner rounded-lg p-4"
            style={{ background: "#F59E0B08", borderColor: "#F59E0B20" }}>
            <div className="text-xs" style={{ color: "#F59E0B" }}>📋 Como usar</div>
            <div className="t-muted text-xs mt-2 flex flex-col gap-1">
              <div>1. Abra o <strong className="t-text">Trovare Kitchen</strong> no dispositivo da cozinha</div>
              <div>2. Digite o email e a senha acima</div>
              <div>3. Os pedidos aparecerão em tempo real</div>
            </div>
          </div>

          <button onClick={handleReset} disabled={resetting}
            className="w-full text-sm py-3 rounded-xl cursor-pointer transition-colors"
            style={{
              background: "#FF3D6E15", color: "#FF3D6E",
              border: "0.5px solid #FF3D6E30",
              opacity: resetting ? 0.7 : 1,
            }}>
            {resetting ? "Gerando nova senha..." : "🔄 Resetar senha da cozinha"}
          </button>
        </div>
      </div>
      {/* Cancelamentos */}
      <div className="t-card rounded-xl overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: "0.5px solid var(--border)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: "#FF3D6E20", border: "0.5px solid #FF3D6E30" }}>
              🚫
            </div>
            <div>
              <div className="t-text text-sm font-semibold">Cancelamentos</div>
              <div className="t-muted text-xs">Quem pode cancelar pedidos e até qual status</div>
            </div>
          </div>
        </div>

        <div className="p-5 flex flex-col gap-4">

          {/* Quem pode cancelar */}
          <div>
            <label className="t-muted block mb-2"
              style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase" }}>
              Quem pode cancelar
            </label>
            <div className="flex flex-col gap-2">
              {[
                { value: "gerente", label: "🔒 Só o gerente", desc: "Garçom não pode cancelar pedidos" },
                { value: "garcom", label: "✅ Gerente e garçom", desc: "Garçom pode cancelar dentro do limite definido" },
              ].map(opt => (
                <button key={opt.value}
                  onClick={() => handleConfigChange({ cancelamentoPermitido: opt.value })}
                  className="w-full text-left rounded-xl p-3 transition-all cursor-pointer"
                  style={{
                    background: config?.cancelamentoPermitido === opt.value ? "var(--accent-bg)" : "var(--bg-card)",
                    border: `0.5px solid ${config?.cancelamentoPermitido === opt.value ? "var(--accent-border)" : "var(--border)"}`,
                  }}>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                      style={{ borderColor: config?.cancelamentoPermitido === opt.value ? "var(--accent)" : "var(--border)" }}>
                      {config?.cancelamentoPermitido === opt.value && (
                        <div className="w-2 h-2 rounded-full" style={{ background: "var(--accent)" }} />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-semibold"
                        style={{ color: config?.cancelamentoPermitido === opt.value ? "var(--accent)" : "var(--text-primary)" }}>
                        {opt.label}
                      </div>
                      <div className="t-muted text-xs mt-0.5">{opt.desc}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Até qual status — só aparece se garçom pode cancelar */}
          {config?.cancelamentoPermitido === "garcom" && (
            <div>
              <label className="t-muted block mb-2"
                style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                Garçom pode cancelar até o status
              </label>
              <div className="flex flex-col gap-2">
                {[
                  { value: "aberto", label: "🟠 Apenas aberto", desc: "Só antes da cozinha iniciar" },
                  { value: "preparando", label: "🟡 Aberto e preparando", desc: "Enquanto ainda está sendo preparado" },
                  { value: "qualquer", label: "🟢 Qualquer status ativo", desc: "Até aguardando pagamento" },
                ].map(opt => (
                  <button key={opt.value}
                    onClick={() => handleConfigChange({ cancelamentoAteStatus: opt.value })}
                    className="w-full text-left rounded-xl p-3 transition-all cursor-pointer"
                    style={{
                      background: config?.cancelamentoAteStatus === opt.value ? "var(--accent-bg)" : "var(--bg-card)",
                      border: `0.5px solid ${config?.cancelamentoAteStatus === opt.value ? "var(--accent-border)" : "var(--border)"}`,
                    }}>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                        style={{ borderColor: config?.cancelamentoAteStatus === opt.value ? "var(--accent)" : "var(--border)" }}>
                        {config?.cancelamentoAteStatus === opt.value && (
                          <div className="w-2 h-2 rounded-full" style={{ background: "var(--accent)" }} />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-semibold"
                          style={{ color: config?.cancelamentoAteStatus === opt.value ? "var(--accent)" : "var(--text-primary)" }}>
                          {opt.label}
                        </div>
                        <div className="t-muted text-xs mt-0.5">{opt.desc}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}