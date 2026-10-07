/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import LandingPage from './landing/LandingPage.tsx';
import SplashScreen from './pages/SplashScreen.tsx';
import LoginScreen from './pages/LoginScreen.tsx';
import RegisterScreen from './pages/RegisterScreen.tsx';
import HomeScreen from './pages/HomeScreen.tsx';
import ProfileScreen from './pages/ProfileScreen.tsx';
import StartRideScreen from './pages/StartRideScreen.tsx';
import ActiveRideScreen from './pages/ActiveRideScreen.tsx';
import ManualReportScreen from './pages/ManualReportScreen.tsx';
import RideSummaryScreen from './pages/RideSummaryScreen.tsx';
import DashboardScreen from './pages/DashboardScreen.tsx';
import { AuthProvider } from './auth/AuthContext';
import RequireAuth from './auth/RequireAuth';

const privatePage = (page: React.ReactNode) => <RequireAuth>{page}</RequireAuth>;

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
      <Routes>
        {/* Public landing page — entry point before login */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/splash" element={<SplashScreen />} />
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/register" element={<RegisterScreen />} />
        <Route path="/home" element={privatePage(<HomeScreen />)} />
        <Route path="/profile" element={privatePage(<ProfileScreen />)} />
        <Route path="/ride/start" element={privatePage(<StartRideScreen />)} />
        <Route path="/ride/active" element={privatePage(<ActiveRideScreen />)} />
        <Route path="/report" element={privatePage(<ManualReportScreen />)} />
        <Route path="/ride/summary" element={privatePage(<RideSummaryScreen />)} />
        <Route path="/dashboard" element={privatePage(<DashboardScreen />)} />
        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
