import { useState, useEffect, useCallback } from "react";
import { X, OctagonX, AlertTriangle } from "lucide-react";
import api from "../services/api.js";
import socket from "../services/socket.js";

const emptyCategoria = { nome: "", ordem: 0 };
const emptyItem = {
  categoriaId: "", nome: "", descricao: "", preco: "", precoDisplay: "",
  temEstoque: false, estoque: "", estoqueMin: "",
};

export default function Cardapio() {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(null);
  const [selectedCat, setSelectedCat] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formCat, setFormCat] = useState(emptyCategoria);
  const [formItem, setFormItem] = useState(emptyItem);
  const [activeCat, setActiveCat] = useState(null);
  const [alertas, setAlertas] = useState([]); // ← novo
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState("");

  async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);
    setImportError("");

    try {
      const formData = new FormData();
      formData.append("arquivo", file);

      const { data } = await api.post("/food/importacao/cardapio", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setImportResult(data);
      await fetchCardapio();
    } catch (e) {
      setImportError(e.response?.data?.error || "Erro ao importar arquivo");
    } finally {
      setImporting(false);
      e.target.value = ""; // reseta o input
    }
  }

  async function handleDownloadModelo() {
    try {
      const response = await api.get("/food/importacao/modelo", {
        responseType: "blob",
      });
      const url = URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = "modelo-cardapio.xlsx";
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Erro ao baixar modelo:", e);
    }
  }

  const fetchCardapio = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/food/cardapio/categorias");
      setCategorias(data);
      if (data.length > 0 && !activeCat) setActiveCat(data[0].id);
    } catch (e) {
      console.error("Erro ao buscar cardápio:", e);
    } finally {
      setLoading(false);
    }
  }, [activeCat]);

  useEffect(() => { fetchCardapio(); }, [fetchCardapio]);

  // ← Socket.io — alertas de estoque
  useEffect(() => {
    socket.on("estoque:zerado", ({ nome }) => {
      setAlertas(prev => {
        const exists = prev.find(a => a.nome === nome && a.tipo === "zerado");
        if (exists) return prev;
        return [...prev, { nome, tipo: "zerado", msg: `"${nome}" zerou o estoque e foi marcado como indisponível` }];
      });
      fetchCardapio(); // atualiza a listagem
    });

    socket.on("estoque:baixo", ({ nome, estoque, minimo }) => {
      setAlertas(prev => {
        const exists = prev.find(a => a.nome === nome && a.tipo === "baixo");
        if (exists) return prev;
        return [...prev, { nome, tipo: "baixo", msg: `"${nome}" está com estoque baixo: ${estoque} un. (mín: ${minimo})` }];
      });
    });

    return () => {
      socket.off("estoque:zerado");
      socket.off("estoque:baixo");
    };
  }, [fetchCardapio]);

  // Categoria
  function openNewCategoria() {
    setSelectedCat(null);
    setFormCat(emptyCategoria);
    setShowModal("categoria");
  }

  function openEditCategoria(cat) {
    setSelectedCat(cat);
    setFormCat({ nome: cat.nome, ordem: cat.ordem });
    setShowModal("categoria");
  }

  async function handleSubmitCategoria() {
    if (!formCat.nome) return;
    try {
      if (selectedCat) {
        await api.put(`/food/cardapio/categorias/${selectedCat.id}`, formCat);
      } else {
        await api.post("/food/cardapio/categorias", formCat);
      }
      await fetchCardapio();
      setShowModal(null);
    } catch (e) {
      console.error("Erro ao salvar categoria:", e);
    }
  }

  async function handleDeleteCategoria(id) {
    try {
      await api.delete(`/food/cardapio/categorias/${id}`);
      await fetchCardapio();
    } catch (e) {
      console.error("Erro ao deletar categoria:", e);
    }
  }

  // Item
  function openNewItem(categoriaId) {
    setSelectedItem(null);
    setFormItem({ ...emptyItem, categoriaId });
    setShowModal("item");
  }

  function openEditItem(item) {
    setSelectedItem(item);
    setFormItem({
      categoriaId: item.categoriaId,
      nome: item.nome,
      descricao: item.descricao,
      preco: item.preco,
      precoDisplay: Number(item.preco).toLocaleString("pt-BR", {
        minimumFractionDigits: 2, maximumFractionDigits: 2,
      }),
      temEstoque: item.temEstoque || false,
      estoque: item.estoque || "",
      estoqueMin: item.estoqueMin || "",
    });
    setShowModal("item");
  }

  function formatPrice(value) {
    const nums = value.replace(/\D/g, "");
    if (!nums) return "";
    return (parseInt(nums, 10) / 100).toLocaleString("pt-BR", {
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    });
  }

  function parsePrice(formatted) {
    return parseFloat(formatted.replace(/\./g, "").replace(",", ".")) || 0;
  }

  async function handleSubmitItem() {
    if (!formItem.nome || !formItem.preco) return;
    try {
      const payload = {
        ...formItem,
        preco: parsePrice(formItem.precoDisplay),
        estoque: formItem.temEstoque ? Number(formItem.estoque) || 0 : 0,
        estoqueMin: formItem.temEstoque ? Number(formItem.estoqueMin) || 0 : 0,
      };
      if (selectedItem) {
        await api.put(`/food/cardapio/itens/${selectedItem.id}`, payload);
      } else {
        await api.post("/food/cardapio/itens", payload);
      }
      await fetchCardapio();
      setShowModal(null);
    } catch (e) {
      console.error("Erro ao salvar item:", e);
    }
  }

  async function handleDeleteItem(id) {
    try {
      await api.delete(`/food/cardapio/itens/${id}`);
      await fetchCardapio();
    } catch (e) {
      console.error("Erro ao deletar item:", e);
    }
  }

  async function toggleDisponivel(item) {
    try {
      await api.put(`/food/cardapio/itens/${item.id}`, {
        ...item,
        categoriaId: item.categoriaId,
        disponivel: !item.disponivel,
      });
      await fetchCardapio();
    } catch (e) {
      console.error("Erro ao atualizar disponibilidade:", e);
    }
  }

  const totalItens = categorias.reduce((s, c) => s + c.itens.length, 0);
  const catAtiva = categorias.find(c => c.id === activeCat);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="t-muted text-sm">Carregando cardápio...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="t-text text-lg font-semibold">Cardápio</h1>
          <p className="t-muted text-xs mt-0.5">{categorias.length} categorias · {totalItens} itens</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowImport(true)}
            className="text-sm px-4 py-2 rounded-lg transition-colors cursor-pointer t-inner t-muted t-hover border"
            style={{ borderColor: "var(--border)" }}>
            ↑ Importar
          </button>
          <button onClick={openNewCategoria}
            className="text-sm px-4 py-2 rounded-lg transition-colors cursor-pointer t-inner t-muted t-hover border"
            style={{ borderColor: "var(--border)" }}>
            + Categoria
          </button>
          <button onClick={() => openNewItem(activeCat)}
            disabled={!activeCat}
            className="t-btn-primary text-sm px-4 py-2 rounded-lg transition-colors cursor-pointer"
            style={{ opacity: !activeCat ? 0.5 : 1 }}>
            + Item
          </button>
        </div>
      </div>

      {/* ← Alertas de estoque */}
      {alertas.length > 0 && (
        <div className="flex flex-col gap-2">
          {alertas.map((a, i) => (
            <div key={i}
              className="flex items-center justify-between px-4 py-3 rounded-xl text-sm"
              style={{
                background: a.tipo === "zerado" ? "#FF3D6E15" : "#F59E0B15",
                border: `0.5px solid ${a.tipo === "zerado" ? "#FF3D6E30" : "#F59E0B30"}`,
                color: a.tipo === "zerado" ? "#FF3D6E" : "#F59E0B",
              }}>
              <span className="flex items-center gap-1.5">
                {a.tipo === "zerado" ? <OctagonX className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                {a.msg}
              </span>
              <button onClick={() => setAlertas(prev => prev.filter((_, j) => j !== i))}
                className="cursor-pointer hover:opacity-75 ml-4 shrink-0"
                style={{ background: "none", border: "none", color: "inherit" }}>
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {categorias.length === 0 ? (
        <div className="t-card rounded-xl p-12 text-center">
          <div className="t-muted text-sm mb-3">Nenhuma categoria cadastrada</div>
          <button onClick={openNewCategoria}
            className="text-sm cursor-pointer hover:opacity-75"
            style={{ color: "var(--accent)" }}>
            + Criar primeira categoria
          </button>
        </div>
      ) : (
        <div className="flex gap-6">

          {/* Sidebar de categorias */}
          <div className="w-48 shrink-0 flex flex-col gap-2">
            <div className="t-faint text-[10px] uppercase tracking-wider mb-1 px-1"
              style={{ fontFamily: "'Space Mono', monospace" }}>
              Categorias
            </div>
            {categorias.map(cat => (
              <div key={cat.id}
                onClick={() => setActiveCat(cat.id)}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all"
                style={{
                  background: activeCat === cat.id ? "var(--accent-bg)" : "transparent",
                  color: activeCat === cat.id ? "var(--accent)" : "var(--text-muted)",
                  borderLeft: activeCat === cat.id ? "2px solid var(--accent)" : "2px solid transparent",
                  border: activeCat === cat.id ? undefined : "0.5px solid var(--border)",
                  borderRadius: "8px",
                }}>
                <span className="text-sm font-medium truncate">{cat.nome}</span>
                <span className="t-faint text-[10px] shrink-0 ml-1">{cat.itens.length}</span>
              </div>
            ))}
          </div>

          {/* Itens da categoria ativa */}
          <div className="flex-1 min-w-0">
            {catAtiva && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h2 className="t-text text-sm font-semibold">{catAtiva.nome}</h2>
                    <span className="t-faint text-xs">{catAtiva.itens.length} itens</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEditCategoria(catAtiva)}
                      className="text-xs px-3 py-1.5 rounded-lg cursor-pointer t-inner t-muted t-hover transition-colors">
                      Editar categoria
                    </button>
                    <button onClick={() => handleDeleteCategoria(catAtiva.id)}
                      className="text-xs px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                      style={{ background: "#FF3D6E15", color: "#FF3D6E" }}>
                      Remover
                    </button>
                  </div>
                </div>

                {catAtiva.itens.length === 0 ? (
                  <div className="t-card rounded-xl p-8 text-center">
                    <div className="t-muted text-sm mb-3">Nenhum item nessa categoria</div>
                    <button onClick={() => openNewItem(catAtiva.id)}
                      className="text-sm cursor-pointer hover:opacity-75"
                      style={{ color: "var(--accent)" }}>
                      + Adicionar item
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {catAtiva.itens.map(item => (
                      <div key={item.id} className="t-card rounded-xl p-4 flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="t-text text-sm font-medium">{item.nome}</span>
                            {!item.disponivel && (
                              <span className="text-[10px] px-2 py-0.5 rounded"
                                style={{ background: "#FF3D6E15", color: "#FF3D6E" }}>
                                Indisponível
                              </span>
                            )}
                            {/* ← Badge de estoque */}
                            {item.temEstoque && (
                              <span className="text-[10px] px-2 py-0.5 rounded"
                                style={{
                                  background: item.estoque <= 0 ? "#FF3D6E15"
                                    : item.estoque <= item.estoqueMin ? "#F59E0B15"
                                      : "#00F5A015",
                                  color: item.estoque <= 0 ? "#FF3D6E"
                                    : item.estoque <= item.estoqueMin ? "#F59E0B"
                                      : "#00F5A0",
                                }}>
                                {item.estoque <= 0 ? "Sem estoque" : `${item.estoque} un.`}
                              </span>
                            )}
                          </div>
                          {item.descricao && (
                            <div className="t-muted text-xs mb-1">{item.descricao}</div>
                          )}
                          <div className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
                            R$ {Number(item.preco).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => toggleDisponivel(item)}
                            className="text-[10px] px-2 py-1 rounded cursor-pointer transition-colors"
                            style={{
                              background: item.disponivel ? "#00F5A015" : "#FF3D6E15",
                              color: item.disponivel ? "#00F5A0" : "#FF3D6E",
                            }}>
                            {item.disponivel ? "Disponível" : "Indisponível"}
                          </button>
                          <button onClick={() => openEditItem(item)}
                            className="text-[10px] px-2 py-1 rounded cursor-pointer t-inner t-muted t-hover transition-colors">
                            Editar
                          </button>
                          <button onClick={() => handleDeleteItem(item.id)}
                            className="text-[10px] px-2 py-1 rounded cursor-pointer transition-colors"
                            style={{ background: "#FF3D6E15", color: "#FF3D6E" }}>
                            Remover
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal — Importar Cardápio */}
      {showImport && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="t-modal rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-5">
              <h2 className="t-text text-sm font-semibold">Importar Cardápio</h2>
              <button onClick={() => { setShowImport(false); setImportResult(null); setImportError(""); }}
                className="t-muted hover:opacity-75 cursor-pointer text-lg">✕</button>
            </div>

            <div className="flex flex-col gap-4">

              {/* Resultado */}
              {importResult && (
                <div className="t-inner rounded-lg p-4"
                  style={{ borderColor: "#00F5A030", background: "#00F5A008" }}>
                  <div className="text-sm font-semibold mb-2" style={{ color: "#00F5A0" }}>
                    ✅ Importação concluída!
                  </div>
                  <div className="flex flex-col gap-1 text-xs t-muted">
                    <div>✓ {importResult.criados} itens criados</div>
                    <div>— {importResult.ignorados} ignorados (duplicados ou inválidos)</div>
                    <div>Total: {importResult.total} linhas processadas</div>
                  </div>
                  {importResult.erros?.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs font-medium mb-1" style={{ color: "#F59E0B" }}>
                        ⚠️ Avisos:
                      </div>
                      {importResult.erros.map((e, i) => (
                        <div key={i} className="text-xs t-muted">{e}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {importError && (
                <div className="t-inner rounded-lg p-3 text-sm"
                  style={{ color: "#FF3D6E", background: "#FF3D6E15", borderColor: "#FF3D6E30" }}>
                  ⛔ {importError}
                </div>
              )}

              {/* Instruções */}
              <div className="t-inner rounded-lg p-4">
                <div className="t-text text-xs font-semibold mb-2">📋 Como importar</div>
                <div className="t-muted text-xs flex flex-col gap-1">
                  <div>1. Baixe a planilha modelo abaixo</div>
                  <div>2. Preencha com os itens do seu cardápio</div>
                  <div>3. Salve e faça o upload</div>
                </div>
                <div className="t-faint text-xs mt-2">
                  Colunas: <span style={{ fontFamily: "'Space Mono', monospace" }}>categoria, nome, descricao, preco, disponivel</span>
                </div>
              </div>

              {/* Download modelo */}
              <button onClick={handleDownloadModelo}
                className="w-full text-sm py-2.5 rounded-lg cursor-pointer transition-colors"
                style={{
                  background: "var(--accent-bg)",
                  color: "var(--accent)",
                  border: "0.5px solid var(--accent-border)",
                }}>
                ↓ Baixar planilha modelo (.xlsx)
              </button>

              {/* Upload */}
              <div>
                <label className="t-muted block mb-1"
                  style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                  Selecione o arquivo
                </label>
                <label className="flex items-center justify-center gap-2 w-full py-3 rounded-lg cursor-pointer transition-colors"
                  style={{
                    background: "var(--bg-card)",
                    border: "1.5px dashed var(--border)",
                    color: "var(--text-muted)",
                    fontSize: "13px",
                    opacity: importing ? 0.7 : 1,
                  }}>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleImport}
                    disabled={importing}
                    className="hidden"
                  />
                  {importing ? "⏳ Importando..." : "📂 Clique para selecionar (.xlsx ou .csv)"}
                </label>
              </div>

              <button
                onClick={() => { setShowImport(false); setImportResult(null); setImportError(""); }}
                className="w-full t-inner t-muted text-sm py-2 rounded-lg cursor-pointer t-hover">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Categoria */}
      {showModal === "categoria" && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="t-modal rounded-xl p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-5">
              <h2 className="t-text text-sm font-semibold">
                {selectedCat ? "Editar Categoria" : "Nova Categoria"}
              </h2>
              <button onClick={() => setShowModal(null)}
                className="t-muted hover:opacity-75 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="t-muted block mb-1"
                  style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                  Nome
                </label>
                <input type="text" placeholder="Ex: Entradas, Bebidas..." value={formCat.nome}
                  onChange={e => setFormCat(f => ({ ...f, nome: e.target.value }))}
                  className="t-input w-full text-sm px-3 py-2 rounded-lg"
                />
              </div>
              <div>
                <label className="t-muted block mb-1"
                  style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                  Ordem de exibição
                </label>
                <input type="number" placeholder="0" value={formCat.ordem}
                  onChange={e => setFormCat(f => ({ ...f, ordem: Number(e.target.value) }))}
                  className="t-input w-full text-sm px-3 py-2 rounded-lg"
                />
              </div>
              <div className="flex gap-3 mt-2">
                <button onClick={() => setShowModal(null)}
                  className="flex-1 t-inner t-muted text-sm py-2 rounded-lg cursor-pointer t-hover">
                  Cancelar
                </button>
                <button onClick={handleSubmitCategoria}
                  className="flex-1 t-btn-primary text-sm py-2 rounded-lg cursor-pointer">
                  {selectedCat ? "Salvar" : "Criar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Item */}
      {showModal === "item" && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="t-modal rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="t-text text-sm font-semibold">
                {selectedItem ? "Editar Item" : "Novo Item"}
              </h2>
              <button onClick={() => setShowModal(null)}
                className="t-muted hover:opacity-75 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="t-muted block mb-1"
                  style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                  Categoria
                </label>
                <select value={formItem.categoriaId}
                  onChange={e => setFormItem(f => ({ ...f, categoriaId: Number(e.target.value) }))}
                  className="t-select w-full text-sm px-3 py-2 rounded-lg cursor-pointer">
                  <option value="">Selecione</option>
                  {categorias.map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="t-muted block mb-1"
                  style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                  Nome do item
                </label>
                <input type="text" placeholder="Ex: Frango Grelhado" value={formItem.nome}
                  onChange={e => setFormItem(f => ({ ...f, nome: e.target.value }))}
                  className="t-input w-full text-sm px-3 py-2 rounded-lg"
                />
              </div>
              <div>
                <label className="t-muted block mb-1"
                  style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                  Descrição
                </label>
                <textarea placeholder="Ingredientes, detalhes..." value={formItem.descricao}
                  onChange={e => setFormItem(f => ({ ...f, descricao: e.target.value }))}
                  rows={2}
                  className="t-input w-full text-sm px-3 py-2 rounded-lg resize-none"
                />
              </div>
              <div>
                <label className="t-muted block mb-1"
                  style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                  Preço (R$)
                </label>
                <div className="flex items-center gap-2 t-input rounded-lg px-3 py-2">
                  <span className="t-muted text-sm shrink-0">R$</span>
                  <input type="text" placeholder="0,00" value={formItem.precoDisplay}
                    onChange={e => {
                      const display = formatPrice(e.target.value);
                      const value = parsePrice(display);
                      setFormItem(f => ({ ...f, precoDisplay: display, preco: value }));
                    }}
                    style={{ background: "transparent", border: "none", outline: "none", color: "var(--text-primary)", fontSize: "14px", width: "100%" }}
                  />
                </div>
              </div>

              {/* ← Toggle estoque */}
              <div className="flex items-center justify-between t-inner rounded-lg px-3 py-3">
                <div>
                  <div className="t-text text-sm font-medium">Controle de estoque</div>
                  <div className="t-muted text-xs mt-0.5">Limitar quantidade disponível</div>
                </div>
                <button
                  type="button"
                  onClick={() => setFormItem(f => ({ ...f, temEstoque: !f.temEstoque }))}
                  className="cursor-pointer transition-all"
                  style={{
                    width: "44px", height: "24px", borderRadius: "12px",
                    background: formItem.temEstoque ? "var(--accent)" : "var(--border)",
                    position: "relative", border: "none", flexShrink: 0,
                  }}>
                  <div style={{
                    width: "18px", height: "18px", borderRadius: "50%",
                    background: "#fff", position: "absolute", top: "3px",
                    left: formItem.temEstoque ? "23px" : "3px",
                    transition: "left 0.2s ease",
                  }} />
                </button>
              </div>

              {/* ← Campos de estoque */}
              {formItem.temEstoque && (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="t-muted block mb-1"
                      style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                      Quantidade atual
                    </label>
                    <input type="number" min={0} placeholder="0"
                      value={formItem.estoque}
                      onChange={e => setFormItem(f => ({ ...f, estoque: e.target.value }))}
                      className="t-input w-full text-sm px-3 py-2 rounded-lg"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="t-muted block mb-1"
                      style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                      Mínimo (alerta)
                    </label>
                    <input type="number" min={0} placeholder="0"
                      value={formItem.estoqueMin}
                      onChange={e => setFormItem(f => ({ ...f, estoqueMin: e.target.value }))}
                      className="t-input w-full text-sm px-3 py-2 rounded-lg"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-2">
                <button onClick={() => setShowModal(null)}
                  className="flex-1 t-inner t-muted text-sm py-2 rounded-lg cursor-pointer t-hover">
                  Cancelar
                </button>
                <button onClick={handleSubmitItem}
                  className="flex-1 t-btn-primary text-sm py-2 rounded-lg cursor-pointer">
                  {selectedItem ? "Salvar" : "Adicionar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}