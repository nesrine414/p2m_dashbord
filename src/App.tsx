import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import MainLayout from './components/layout/MainLayout';
import DashboardPage from './pages/DashboardPage';
import MonitoringPage from './pages/MonitoringPage';
import AlarmsPage from './pages/AlarmsPage';
import ReportsPage from './pages/Reports/ReportsPage';
import RTUInventoryPage from './pages/RTUInventoryPage';
import AIDashboardPage from './pages/DashboardIA/DashboardIAPage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { ROUTE_PATHS, ROUTE_SEGMENTS } from './constants/routes';
import RequireAuth from './components/auth/RequireAuth';

const lightTheme = createTheme({
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: '"Inter", "Sora", "Plus Jakarta Sans", "Segoe UI", sans-serif',
    h4: {
      fontWeight: 700,
      letterSpacing: -0.5,
      fontSize: '1.75rem',
      color: '#343a40',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
    },
    body2: {
      fontSize: '0.875rem',
      color: '#6c757d',
    },
  },
  palette: {
    mode: 'light',
    primary: {
      main: '#007bff',
      light: '#3395ff',
      dark: '#0056b3',
    },
    secondary: {
      main: '#6c757d',
    },
    success: {
      main: '#28a745',
    },
    warning: {
      main: '#ffc107',
    },
    error: {
      main: '#dc3545',
    },
    info: {
      main: '#17a2b8',
    },
    background: {
      default: '#f4f6f9',
      paper: '#ffffff',
    },
    text: {
      primary: '#343a40',
      secondary: '#6c757d',
    },
    divider: '#dee2e6',
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          backgroundImage: 'none',
          border: '1px solid #dee2e6',
          boxShadow: '0 0 1px rgba(0,0,0,.125), 0 1px 3px rgba(0,0,0,.2)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          backgroundImage: 'none',
          border: '1px solid #dee2e6',
          boxShadow: '0 0 1px rgba(0,0,0,.125), 0 1px 3px rgba(0,0,0,.2)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          color: '#343a40',
          borderBottom: '1px solid #dee2e6',
          boxShadow: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 600,
          boxShadow: 'none',
        },
        containedPrimary: {
          backgroundColor: '#007bff',
          '&:hover': {
            backgroundColor: '#0069d9',
            boxShadow: 'none',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: '#dee2e6',
          padding: '12px 16px',
        },
        head: {
          color: '#495057',
          fontWeight: 700,
          backgroundColor: '#f8f9fa',
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: '#dee2e6',
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={lightTheme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path={ROUTE_PATHS.login} element={<LoginPage />} />
          <Route path={ROUTE_PATHS.register} element={<RegisterPage />} />
          <Route
            path={ROUTE_PATHS.dashboard}
            element={
              <RequireAuth>
                <MainLayout />
              </RequireAuth>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path={ROUTE_SEGMENTS.rtu} element={<RTUInventoryPage />} />
            <Route path={ROUTE_SEGMENTS.monitoring} element={<MonitoringPage />} />
            <Route path={ROUTE_SEGMENTS.alarms} element={<AlarmsPage />} />
            <Route path={`${ROUTE_SEGMENTS.alarms}/:alarmId`} element={<AlarmsPage />} />
            <Route path={ROUTE_SEGMENTS.reports} element={<ReportsPage />} />
            <Route path={ROUTE_SEGMENTS.aiDashboard} element={<AIDashboardPage />} />
            <Route path={ROUTE_SEGMENTS.profile} element={<ProfilePage />} />
            <Route path="*" element={<Navigate to={ROUTE_PATHS.dashboard} replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
