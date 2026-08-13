import { Navigate, Route, Routes } from "react-router-dom";
import { XpInvoicePage } from "@/pages/XpInvoicePage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/xp-invoice" replace />} />
      <Route path="/xp-invoice" element={<XpInvoicePage />} />
    </Routes>
  );
}
