import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LoginForm } from './components/auth/LoginForm';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { ChartOfAccounts } from './pages/ChartOfAccounts';
import { Transactions } from './pages/Transactions';
import { Companies } from './pages/Companies';
import { Standards } from './pages/Standards';
import { CompanyDashboard } from './pages/companies/CompanyDashboard';
import { useAuthStore } from './store/authStore';
import { MappingDebugView } from './components/debug/MappingDebugView';
import { TransactionMappingTest } from './components/test/TransactionMappingTest';

// Placeholder components for routes
const Dashboard = () => <div className="text-2xl">Dashboard Content (Coming Soon)</div>;
const Reports = () => <div className="text-2xl">Reports (Coming Soon)</div>;
const Users = () => <div className="text-2xl">Users Management (Coming Soon)</div>;
const Settings = () => <div className="text-2xl">Settings (Coming Soon)</div>;

function App() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginForm />} 
        />
        
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={
            isAuthenticated ? <Dashboard /> : <Navigate to="/login" />
          } />
          <Route path="/standards" element={
            isAuthenticated ? <Standards /> : <Navigate to="/login" />
          } />
          <Route path="/chart-of-accounts" element={
            isAuthenticated ? <ChartOfAccounts /> : <Navigate to="/login" />
          } />
          <Route path="/companies" element={
            isAuthenticated ? <Companies /> : <Navigate to="/login" />
          } />
          <Route path="/companies/:id" element={
            isAuthenticated ? <CompanyDashboard /> : <Navigate to="/login" />
          } />
          <Route path="/transactions" element={
            isAuthenticated ? (
              <>
                <Transactions />
                <TransactionMappingTest />
              </>
            ) : <Navigate to="/login" />
          } />
          <Route path="/reports" element={
            isAuthenticated ? <Reports /> : <Navigate to="/login" />
          } />
          <Route path="/users" element={
            isAuthenticated ? <Users /> : <Navigate to="/login" />
          } />
          <Route path="/settings" element={
            isAuthenticated ? <Settings /> : <Navigate to="/login" />
          } />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Route>
      </Routes>
      {isAuthenticated && <MappingDebugView />}
    </Router>
  );
}

export default App;