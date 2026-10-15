import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

export default function DefaultLayout() {
  return (
    <div className="app-container">
      <Header /> 
      <div className="layout-wrapper">
        <Sidebar />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}