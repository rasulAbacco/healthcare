// client/src/App.jsx
// Replace your existing App.jsx with this file
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { opdPatients as initOPD, ipdPatients as initIPD } from "./data/dummyData";
import { pharmacyMedicines as initPharmacy } from "./data/pharmacyData";

import Login from "./pages/login/Login";
import Layout from "./components/Layout";
import ProtectedRoute from "./routes/ProtectedRoute";

import OPDDashboard from "./pages/opd/OPDDashboard";
import OPDPatientList from "./pages/opd/OPDPatientList";
import OPDPatientForm from "./pages/opd/OPDPatientForm";
import OPDFollowUps from "./pages/opd/OPDFollowUps";

import IPDDashboard from "./pages/ipd/IPDDashboard";
import IPDPatientList from "./pages/ipd/IPDPatientList";
import IPDPatientForm from "./pages/ipd/IPDPatientForm";

import { DoctorOPDDashboard } from "./pages/doctor/DoctorOPDDashboard";
import { DoctorIPDDashboard } from "./pages/doctor/DoctorIPDDashboard";

import PharmacyDashboard from "./pages/pharmacy/PharmacyDashboard";
import PharmacyMedicineList from "./pages/pharmacy/PharmacyMedicineList";
import PharmacyMedicineForm from "./pages/pharmacy/PharmacyMedicineForm";
import PharmacyStockHistory from "./pages/pharmacy/PharmacyStockHistory";
import PharmacyExpiryAlerts from "./pages/pharmacy/PharmacyExpiryAlerts";

function AppRoutes() {
  const { user } = useAuth();
  const [opdPatients, setOpdPatients] = useState(initOPD);
  const [ipdPatients, setIpdPatients] = useState(initIPD);
  const [medicines, setMedicines]     = useState(initPharmacy);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Receptionist OPD */}
      <Route element={
        <ProtectedRoute role="receptionist" module="OPD">
          <Layout />
        </ProtectedRoute>
      }>
        <Route path="/opd-dashboard" element={<OPDDashboard />} />
        <Route path="/opd/register"  element={<OPDPatientForm patients={opdPatients} setPatients={setOpdPatients} />} />
        <Route path="/opd/patients"  element={<OPDPatientList patients={opdPatients} setPatients={setOpdPatients} />} />
        <Route path="/opd/followups" element={<OPDFollowUps patients={opdPatients} />} />
      </Route>

      {/* Receptionist IPD */}
      <Route element={
        <ProtectedRoute role="receptionist" module="IPD">
          <Layout />
        </ProtectedRoute>
      }>
        <Route path="/ipd-dashboard" element={<IPDDashboard />} />
        <Route path="/ipd/admit"     element={<IPDPatientForm patients={ipdPatients} setPatients={setIpdPatients} />} />
        <Route path="/ipd/patients"  element={<IPDPatientList patients={ipdPatients} setPatients={setIpdPatients} />} />
      </Route>

      {/* Doctor OPD */}
      <Route element={
        <ProtectedRoute role="doctor" module="OPD">
          <Layout />
        </ProtectedRoute>
      }>
        <Route path="/doctor/opd"          element={<DoctorOPDDashboard patients={opdPatients} />} />
        <Route path="/doctor/opd/followups" element={<OPDFollowUps patients={opdPatients} />} />
      </Route>

      {/* Doctor IPD */}
      <Route element={
        <ProtectedRoute role="doctor" module="IPD">
          <Layout />
        </ProtectedRoute>
      }>
        <Route path="/doctor/ipd" element={<DoctorIPDDashboard patients={ipdPatients} />} />
      </Route>

      {/* Pharmacy */}
      <Route element={
        <ProtectedRoute role="pharmacy" module="Pharmacy">
          <Layout />
        </ProtectedRoute>
      }>
        <Route path="/pharmacy-dashboard" element={<PharmacyDashboard medicines={medicines} />} />
        <Route path="/pharmacy/add"       element={<PharmacyMedicineForm medicines={medicines} setMedicines={setMedicines} />} />
        <Route path="/pharmacy/medicines" element={<PharmacyMedicineList medicines={medicines} setMedicines={setMedicines} />} />
        <Route path="/pharmacy/stock"     element={<PharmacyStockHistory medicines={medicines} />} />
        <Route path="/pharmacy/expiry"    element={<PharmacyExpiryAlerts medicines={medicines} />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}