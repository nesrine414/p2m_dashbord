import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import MainLayout from './components/layout/MainLayout';
import DashboardPage from './pages/DashboardPage';
import MonitoringPage from './pages/MonitoringPage';
import AlarmsPage from './pages/AlarmsPage';
import ReportsPage from './pages/Reports/ReportsPage';
import RTUListPage from './pages/RTUList/RTUListPage';
import AIDashboardPage from './pages/DashboardIA/DashboardIAPage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { ROUTE_PATHS, ROUTE_SEGMENTS } from './constants/routes';
import RequireAuth from './components/auth/RequireAuth';

const darkTheme = createTheme({
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: '"Sora", "Plus Jakarta Sans", "Segoe UI", sans-serif',
    h4: {
      fontWeight: 700,
      letterSpacing: -0.4,
      fontSize: '1.95rem',
    },
    h6: {
      fontWeight: 600,
      letterSpacing: 0.1,
    },
    body2: {
      letterSpacing: 0.12,
    },
  },
  palette: {
    mode: 'dark',
    primary: {
      main: '#6ad9ff',
      light: '#9de8ff',
      dark: '#3eb8e0',
    },
    secondary: {
      main: '#f3a9c9',
    },
    success: {
      main: '#84d8a3',
    },
    warning: {
      main: '#f1c07f',
    },
    error: {
      main: '#f08ba1',
    },
    info: {
      main: '#9bbef4',
    },
    background: {
      default: '#0e1324',
      paper: 'rgba(25, 35, 58, 0.68)',
    },
    text: {
      primary: '#eef4ff',
      secondary: '#b7c3e0',
    },
    divider: 'rgba(156, 176, 217, 0.28)',
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(25, 35, 58, 0.68)',
          backgroundImage: 'linear-gradient(160deg, rgba(132, 164, 224, 0.14), rgba(255, 255, 255, 0.03))',
          border: '1px solid rgba(156, 176, 217, 0.28)',
          backdropFilter: 'blur(14px)',
          boxShadow: '0 16px 36px rgba(5, 10, 22, 0.24)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(25, 35, 58, 0.68)',
          backgroundImage: 'linear-gradient(160deg, rgba(132, 164, 224, 0.14), rgba(255, 255, 255, 0.03))',
          border: '1px solid rgba(156, 176, 217, 0.28)',
          backdropFilter: 'blur(14px)',
          boxShadow: '0 16px 36px rgba(5, 10, 22, 0.24)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(20, 30, 50, 0.72)',
          backdropFilter: 'blur(12px)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          textTransform: 'none',
          fontWeight: 600,
          letterSpacing: 0.1,
          boxShadow: 'none',
        },
        contained: {
          backgroundImage: 'linear-gradient(120deg, rgba(106, 217, 255, 0.95), rgba(126, 165, 232, 0.95))',
          color: '#0d1730',
          '&:hover': {
            boxShadow: '0 10px 22px rgba(74, 136, 198, 0.34)',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: '#3f4a63',
        },
        head: {
          color: '#d4def2',
          fontWeight: 700,
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },
    MuiBadge: {
      styleOverrides: {
        badge: {
          boxShadow: '0 0 0 2px rgba(20, 30, 50, 0.8)',
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={darkTheme}>
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
            <Route path={ROUTE_SEGMENTS.rtu} element={<RTUListPage />} />
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
