import { useState } from "react";

export function useCep() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function buscarCep(cep) {
    const nums = cep.replace(/\D/g, "");
    if (nums.length !== 8) return null;

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`https://viacep.com.br/ws/${nums}/json/`);
      const data = await res.json();

      if (data.erro) {
        setError("CEP não encontrado");
        return null;
      }

      return {
        logradouro: data.logradouro,
        bairro: data.bairro,
        cidade: data.localidade,
        estado: data.uf,
      };
    } catch {
      setError("Erro ao buscar CEP");
      return null;
    } finally {
      setLoading(false);
    }
  }

  function formatCep(value) {
    const nums = value.replace(/\D/g, "").slice(0, 8);
    if (nums.length <= 5) return nums;
    return `${nums.slice(0, 5)}-${nums.slice(5)}`;
  }

  return { buscarCep, formatCep, loading, error };
}