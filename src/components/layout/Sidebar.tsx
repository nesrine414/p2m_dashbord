import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Divider,
} from '@mui/material';
import {
  Dashboard,
  Inventory,
  RouterOutlined,
  Notifications,
  Assessment,
  Psychology,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { ROUTE_PATHS } from '../../constants/routes';

interface MenuItem {
  title: string;
  path: string;
  icon: React.ReactNode;
  badge?: number;
}

interface SidebarProps {
  drawerWidth: number;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const menuItems: MenuItem[] = [
  { title: 'Vue globale', path: ROUTE_PATHS.dashboard, icon: <Dashboard /> },
  { title: 'Inventaire RTU', path: ROUTE_PATHS.rtu, icon: <Inventory /> },
  { title: 'Supervision', path: ROUTE_PATHS.monitoring, icon: <RouterOutlined /> },
  { title: 'Alarmes', path: ROUTE_PATHS.alarms, icon: <Notifications />, badge: 3 },
  { title: 'Rapports', path: ROUTE_PATHS.reports, icon: <Assessment /> },
  { title: 'Tableau IA', path: ROUTE_PATHS.aiDashboard, icon: <Psychology /> },
];

const Sidebar: React.FC<SidebarProps> = ({ drawerWidth, mobileOpen, onMobileClose }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#ffffff' }}>
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 32,
            height: 32,
            bgcolor: 'primary.main',
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 800,
            fontSize: 18,
          }}
        >
          N
        </Box>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 800,
            color: '#343a40',
            letterSpacing: -0.5,
          }}
        >
          NQMS Super
        </Typography>
      </Box>

      <Divider sx={{ mx: 2, borderColor: '#dee2e6' }} />

      <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 1.5, py: 2 }}>
        <List disablePadding>
          {menuItems.map((item) => {
            const isActive =
              item.path === ROUTE_PATHS.dashboard
                ? location.pathname === ROUTE_PATHS.dashboard
                : location.pathname.startsWith(item.path);

            return (
              <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={() => {
                    navigate(item.path);
                    onMobileClose();
                  }}
                  sx={{
                    borderRadius: 1.5,
                    py: 1.2,
                    px: 2,
                    backgroundColor: isActive ? 'primary.main' : 'transparent',
                    color: isActive ? '#ffffff' : '#495057',
                    '&:hover': {
                      backgroundColor: isActive ? 'primary.dark' : '#f8f9fa',
                      color: isActive ? '#ffffff' : '#007bff',
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: isActive ? '#ffffff' : 'inherit',
                      minWidth: 36,
                      '& .MuiSvgIcon-root': {
                        fontSize: 20,
                      },
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.title}
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      fontWeight: isActive ? 600 : 500,
                    }}
                  />
                  {item.badge && item.badge > 0 && !isActive && (
                    <Box
                      sx={{
                        bgcolor: 'error.main',
                        color: 'white',
                        borderRadius: '10px',
                        px: 0.8,
                        py: 0.2,
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    >
                      {item.badge}
                    </Box>
                  )}
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>

      <Divider sx={{ borderColor: '#dee2e6' }} />
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="caption" sx={{ color: '#adb5bd', fontWeight: 500 }}>
          v1.2.0 - SUP'COM
        </Typography>
      </Box>
    </Box>
  );

  const drawerStyles = {
    width: drawerWidth,
    boxSizing: 'border-box',
    borderRight: '1px solid #dee2e6',
    boxShadow: 'none',
  };

  return (
    <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': drawerStyles,
        }}
      >
        {drawerContent}
      </Drawer>

      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': drawerStyles,
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
};

export default Sidebar;
