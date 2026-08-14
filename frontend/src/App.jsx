import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/common/ProtectedRoute.jsx';
import AppLayout from './components/layout/AppLayout.jsx';
import Login from './pages/auth/Login.jsx';
import Register from './pages/auth/Register.jsx';
import CommandCenter from './pages/CommandCenter.jsx';
import Analytics from './pages/Analytics.jsx';
import DataExplorer from './pages/DataExplorer.jsx';
import Backtesting from './pages/Backtesting.jsx';
import BacktestHistory from './pages/BacktestHistory.jsx';
import RetailAssistant from './pages/RetailAssistant.jsx';
import Products from './pages/Products.jsx';
import DataUpload from './pages/DataUpload.jsx';
import SystemHealth from './pages/SystemHealth.jsx';
import Settings from './pages/Settings.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<CommandCenter />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/data-explorer" element={<DataExplorer />} />
        <Route path="/backtesting" element={<Backtesting />} />
        <Route path="/backtest-history" element={<BacktestHistory />} />
        <Route path="/assistant" element={<RetailAssistant />} />
        <Route path="/products" element={<Products />} />
        <Route path="/upload" element={<DataUpload />} />
        <Route path="/system-health" element={<SystemHealth />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      <Route path="/404" element={<NotFound />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
