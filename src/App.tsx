import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import MainLayout from './components/layout/MainLayout';
import DashboardPage from './pages/DashboardPage';
import RTUInventoryPage from './pages/RTUInventoryPage';
import MonitoringPage from './pages/MonitoringPage';
import AlarmsPage from './pages/AlarmsPage';
import ReportsPage from './pages/ReportsPage';
import AIDashboardPage from './pages/AIDashboardPage';
import { ROUTE_PATHS, ROUTE_SEGMENTS } from './constants/routes';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#2196f3',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path={ROUTE_PATHS.dashboard} element={<MainLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path={ROUTE_SEGMENTS.rtu} element={<RTUInventoryPage />} />
            <Route path={ROUTE_SEGMENTS.monitoring} element={<MonitoringPage />} />
            <Route path={ROUTE_SEGMENTS.alarms} element={<AlarmsPage />} />
            <Route path={ROUTE_SEGMENTS.reports} element={<ReportsPage />} />
            <Route path={ROUTE_SEGMENTS.aiDashboard} element={<AIDashboardPage />} />
            <Route path="*" element={<Navigate to={ROUTE_PATHS.dashboard} replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;