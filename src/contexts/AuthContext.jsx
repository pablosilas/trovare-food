import { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api.js";
import socket from "../services/socket.js";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  function logout() {
    localStorage.removeItem("trovare-food-token");
    delete api.defaults.headers.common["Authorization"];
    socket.disconnect();
    setUser(null);
  }

  useEffect(() => {
    const token = localStorage.getItem("trovare-food-token");
    if (!token) {
      setLoading(false);
      return;
    }

    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    api.get("/auth/me")
      .then(({ data }) => {
        setUser(data);
        socket.connect();
        socket.emit("join-tenant", data.tenant.id);
      })
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const { data } = await api.post("/auth/login", { email, password, product: "food" });
    localStorage.setItem("trovare-food-token", data.token);
    api.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;
    setUser(data.user);
    socket.connect();
    socket.emit("join-tenant", data.user.tenant.id);
    return data;
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}