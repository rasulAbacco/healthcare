// client/src/App.jsx
// all routes 
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { opdPatients as initOPD, ipdPatients as initIPD } from "./data/dummyData";

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
import IPDPaymentList from "./pages/ipd/payments/IPDPaymentList";

import DoctorOPDLayout from "./pages/doctor/DoctorOPDLayout";
import { DoctorOPDDashboard } from "./pages/doctor/DoctorOPDDashboard";
import { DoctorOPDRevenue } from "./pages/doctor/DoctorOPDRevenue";
import { DoctorIPDDashboard } from "./pages/doctor/DoctorIPDDashboard";
import {IPDDoctorDashboard} from "./pages/doctor/IPDDoctorDashboard"
import Profile from "./pages/profile/Profile";

import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminStaffAccounts from "./pages/admin/AdminStaffAccounts";
import AdminEmployeeDirectory from "./pages/admin/AdminEmployeeDirectory";
import AdminProfile from "./pages/admin/AdminProfile";

import PharmacyDashboard from "./pages/pharmacy/PharmacyDashboard";
import PharmacyMedicineList from "./pages/pharmacy/PharmacyMedicineList";
import PharmacyMedicineForm from "./pages/pharmacy/PharmacyMedicineForm";
import PharmacyStockHistory from "./pages/pharmacy/PharmacyStockHistory";
import PharmacyExpiryAlerts from "./pages/pharmacy/PharmacyExpiryAlerts";
import { Import } from "lucide-react";
 
function AppRoutes() {
  const { user, initializing } = useAuth();
  const [opdPatients, setOpdPatients] = useState(initOPD);
  const [ipdPatients, setIpdPatients] = useState(initIPD);

  // While we're verifying a stored token against the backend on first load,
  // hold off rendering routes — otherwise a valid session flashes a redirect
  // to /login before the check resolves.
  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500 text-sm font-medium">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Loading...
        </div>
      </div>
    );
  }

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
        <Route path="/opd/register"  element={<OPDPatientForm />} />
        <Route path="/opd/patients/:id/edit" element={<OPDPatientForm />} />
        <Route path="/opd/patients"  element={<OPDPatientList />} />
        <Route path="/opd/followups" element={<OPDFollowUps />} />
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
        <Route path="/ipd/payments"  element={<IPDPaymentList />} />
      </Route>

      {/* Doctor OPD — /doctor/opd itself just redirects to the dashboard;
          dashboard/patients/followups are real sibling routes sharing
          DoctorOPDLayout (banner + tab nav), so the URL always matches
          what's on screen and the sidebar highlights the right tab. */}
      <Route element={
        <ProtectedRoute role="doctor" module="OPD">
          <Layout />
        </ProtectedRoute>
      }>
        <Route element={<DoctorOPDLayout />}>
          <Route path="/doctor/opd" element={<Navigate to="/doctor/opd/dashboard" replace />} />
          <Route path="/doctor/opd/dashboard" element={<DoctorOPDDashboard />} />
          <Route path="/doctor/opd/patients"  element={<OPDPatientList readOnly />} />
          <Route path="/doctor/opd/followups" element={<OPDFollowUps patients={opdPatients} />} />
          <Route path="/doctor/opd/revenue"   element={<DoctorOPDRevenue />} />
        </Route>
      </Route>

      {/* Doctor IPD */}
      <Route element={
        <ProtectedRoute role="doctor" module="IPD">
          <Layout />
        </ProtectedRoute>
      }>
        
        <Route path="/doctor/ipd/dashboard" element={<IPDDoctorDashboard patients={ipdPatients} />} />
        <Route path="/doctor/ipd" element={<DoctorIPDDashboard patients={ipdPatients} />} />
      </Route>

         {/* profile */}
      <Route element={
        <ProtectedRoute role="admin">
          <Layout />
        </ProtectedRoute>
      }>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/staff"     element={<AdminStaffAccounts />} />
          <Route path="/admin/employees" element={<AdminEmployeeDirectory />} />
        </Route>
        {/* Own dedicated path/component (AdminProfile.jsx), not the shared
            /profile below — avoids re-creating the duplicate-path bug and
            matches the naming convention of the other Admin pages. */}
        <Route path="/admin/profile" element={<AdminProfile />} />
      </Route>

      {/* Profile — shared across Doctor/Receptionist/Pharmacy (Admin has its
          own dedicated AdminProfile.jsx at /admin/profile instead, see
          above). This used to ALSO include Admin at this same /profile path,
          duplicated per-role (once under the doctor block, once under the
          admin block) with the exact same path — React Router doesn't pick
          whichever guard would pass, it matches the FIRST declared route
          with that path and runs only that one's guard. So an admin hitting
          /profile was matching the doctor-guarded route, failing the
          role==="doctor" check, and bouncing to their own dashboard instead
          of ever reaching Profile. Fixed by giving Admin its own separate
          path entirely (/admin/profile, above) instead of sharing this one.
          NOTE: this still assumes ProtectedRoute renders children when
          called with neither `role` nor `module` (i.e. "just needs to be
          logged in"). If your ProtectedRoute.jsx requires at least a role,
          this needs adjusting — happy to fix precisely once you share that
          file. */}
      <Route element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route path="/profile" element={<Profile />} />
      </Route>

      {/* Pharmacy */}
      <Route element={
        <ProtectedRoute role="pharmacy" module="Pharmacy">
          <Layout />
        </ProtectedRoute>
      }>
        <Route path="/pharmacy-dashboard" element={<PharmacyDashboard />} />
        <Route path="/pharmacy/add"       element={<PharmacyMedicineForm />} />
        <Route path="/pharmacy/medicines/:id/edit" element={<PharmacyMedicineForm />} />
        <Route path="/pharmacy/medicines" element={<PharmacyMedicineList />} />
        <Route path="/pharmacy/stock"     element={<PharmacyStockHistory />} />
        <Route path="/pharmacy/expiry"    element={<PharmacyExpiryAlerts />} />
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