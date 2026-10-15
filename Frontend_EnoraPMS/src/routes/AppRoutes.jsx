import { BrowserRouter, Routes, Route } from "react-router-dom";

import PrivateRoute from "./PrivateRoute";
import DefaultLayout from "../layouts/DefaultLayout";

import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import ReservationMap from "../pages/ReservationMap";
import Rooms from "../pages/Rooms";
import Reservations from "../pages/Reservations";
import CheckinCheckout from "../pages/CheckinCheckout";
import Financial from "../pages/Financial";
import Housekeeping from "../pages/Housekeeping";
import Reports from "@/modules/reports/Reports";
export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ROTA PÚBLICA */}
        <Route path="/login" element={<Login />} />

        {/* PROTEÇÃO DE ROTA (O segurança) */}
        <Route element={<PrivateRoute />}>
          
          {/* LAYOUT PRIVADO (O que aparece depois de passar pelo segurança) */}
          <Route element={<DefaultLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/reservation-map" element={<ReservationMap />} />
            <Route path="/rooms" element={<Rooms />} />
            <Route path="/reservations" element={<Reservations />} />
            <Route path="/checkin-checkout" element={<CheckinCheckout />} />
            <Route path="/financial" element={<Financial />} />
            <Route path="/housekeeping" element={<Housekeeping />} />
            <Route path="/company" element={<Company />} />
            <Route path="/reports" element={<Reports />} />
          </Route>

        </Route>
      </Routes>
    </BrowserRouter>
  );
}