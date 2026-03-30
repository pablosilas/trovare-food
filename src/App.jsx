import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout/Layout.jsx";
import PrivateRoute from "./components/PrivateRoute.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Mesas from "./pages/Mesas.jsx";
import Cardapio from "./pages/Cardapio.jsx";
import Pedidos from "./pages/Pedidos.jsx";
import Garcons from "./pages/Garcons.jsx";
import Caixa from "./pages/Caixa.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="mesas" element={<Mesas />} />
          <Route path="cardapio" element={<Cardapio />} />
          <Route path="pedidos" element={<Pedidos />} />
          <Route path="garcons" element={<Garcons />} />
          <Route path="caixa" element={<Caixa />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}