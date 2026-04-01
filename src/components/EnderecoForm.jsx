import { useCep } from "../hooks/useCep.js";

const estados = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

export default function EnderecoForm({ value, onChange, inputClass = "", inputStyle = {} }) {
  const { buscarCep, formatCep, loading, error } = useCep();

  async function handleCep(raw) {
    const formatted = formatCep(raw);
    onChange({ ...value, cep: formatted });

    if (formatted.replace(/\D/g, "").length === 8) {
      const data = await buscarCep(formatted);
      if (data) {
        onChange({
          ...value,
          cep: formatted,
          logradouro: data.logradouro,
          bairro: data.bairro,
          cidade: data.cidade,
          estado: data.estado,
        });
      }
    }
  }

  const labelStyle = {
    fontFamily: "'Space Mono', monospace",
    fontSize: "10px",
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    color: "var(--text-muted, #888)",
    display: "block",
    marginBottom: "6px",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

      {/* CEP */}
      <div>
        <label style={labelStyle}>CEP</label>
        <div style={{ position: "relative" }}>
          <input
            type="text"
            placeholder="00000-000"
            value={value.cep || ""}
            onChange={e => handleCep(e.target.value)}
            maxLength={9}
            className={inputClass}
            style={{
              ...inputStyle, paddingRight: loading ? "40px" : undefined,
              fontFamily: "'Space Mono', monospace"
            }}
          />
          {loading && (
            <div style={{
              position: "absolute", right: "12px", top: "50%",
              transform: "translateY(-50%)",
              fontSize: "12px", color: "var(--text-muted, #888)",
            }}>
              ⏳
            </div>
          )}
        </div>
        {error && (
          <div style={{ fontSize: "11px", color: "#FF3D6E", marginTop: "4px" }}>
            {error}
          </div>
        )}
      </div>

      {/* Logradouro + Número */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: "10px" }}>
        <div>
          <label style={labelStyle}>Logradouro</label>
          <input
            type="text"
            placeholder="Rua, Av, Alameda..."
            value={value.logradouro || ""}
            onChange={e => onChange({ ...value, logradouro: e.target.value })}
            className={inputClass}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Número</label>
          <input
            type="text"
            placeholder="123"
            value={value.numero || ""}
            onChange={e => onChange({ ...value, numero: e.target.value })}
            className={inputClass}
            style={inputStyle}
          />
        </div>
      </div>

      {/* Complemento */}
      <div>
        <label style={labelStyle}>Complemento</label>
        <input
          type="text"
          placeholder="Apto, Bloco, Casa..."
          value={value.complemento || ""}
          onChange={e => onChange({ ...value, complemento: e.target.value })}
          className={inputClass}
          style={inputStyle}
        />
      </div>

      {/* Bairro */}
      <div>
        <label style={labelStyle}>Bairro</label>
        <input
          type="text"
          placeholder="Bairro"
          value={value.bairro || ""}
          onChange={e => onChange({ ...value, bairro: e.target.value })}
          className={inputClass}
          style={inputStyle}
        />
      </div>

      {/* Cidade + Estado */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 80px", gap: "10px" }}>
        <div>
          <label style={labelStyle}>Cidade</label>
          <input
            type="text"
            placeholder="Cidade"
            value={value.cidade || ""}
            onChange={e => onChange({ ...value, cidade: e.target.value })}
            className={inputClass}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Estado</label>
          <select
            value={value.estado || ""}
            onChange={e => onChange({ ...value, estado: e.target.value })}
            className={inputClass}
            style={{ ...inputStyle, cursor: "pointer" }}>
            <option value="">UF</option>
            {estados.map(uf => (
              <option key={uf} value={uf}>{uf}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}