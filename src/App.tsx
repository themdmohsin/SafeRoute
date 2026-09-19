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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public landing page — entry point before login */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/splash" element={<SplashScreen />} />
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/register" element={<RegisterScreen />} />
        <Route path="/home" element={<HomeScreen />} />
        <Route path="/profile" element={<ProfileScreen />} />
        <Route path="/ride/start" element={<StartRideScreen />} />
        <Route path="/ride/active" element={<ActiveRideScreen />} />
        <Route path="/report" element={<ManualReportScreen />} />
        <Route path="/ride/summary" element={<RideSummaryScreen />} />
        <Route path="/dashboard" element={<DashboardScreen />} />
        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
