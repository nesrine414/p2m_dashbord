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
  {
    title: 'Global View',
    path: ROUTE_PATHS.dashboard,
    icon: <Dashboard />,
  },
  {
    title: 'RTU Inventory',
    path: ROUTE_PATHS.rtu,
    icon: <Inventory />,
  },
  {
    title: 'Monitoring',
    path: ROUTE_PATHS.monitoring,
    icon: <RouterOutlined />,
  },
  {
    title: 'Alarms',
    path: ROUTE_PATHS.alarms,
    icon: <Notifications />,
    badge: 3,
  },
  {
    title: 'Reports',
    path: ROUTE_PATHS.reports,
    icon: <Assessment />,
  },
  {
    title: 'AI Dashboard',
    path: ROUTE_PATHS.aiDashboard,
    icon: <Psychology />,
  },
];

const Sidebar: React.FC<SidebarProps> = ({ drawerWidth, mobileOpen, onMobileClose }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const drawerContent = (
    <>
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h5" fontWeight={800} color="#61b3ff" letterSpacing={0.5}>
          P2M
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Fiber supervision cockpit
        </Typography>
      </Box>

      <Divider sx={{ borderColor: '#2b3445' }} />

      <List sx={{ px: 1.2, py: 2 }}>
        {menuItems.map((item) => {
          const isActive =
            item.path === ROUTE_PATHS.dashboard
              ? location.pathname === ROUTE_PATHS.dashboard
              : location.pathname.startsWith(item.path);

          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.7 }}>
              <ListItemButton
                onClick={() => {
                  navigate(item.path);
                  onMobileClose();
                }}
                sx={{
                  borderRadius: 2,
                  backgroundColor: isActive ? '#2f6fb0' : 'transparent',
                  '&:hover': {
                    backgroundColor: isActive ? '#2b639d' : 'rgba(255, 255, 255, 0.05)',
                  },
                }}
              >
                <ListItemIcon sx={{ color: isActive ? 'white' : '#96a7bd', minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.title}
                  primaryTypographyProps={{
                    fontSize: 14,
                    fontWeight: isActive ? 700 : 500,
                  }}
                />
                {item.badge && item.badge > 0 && (
                  <Box
                    sx={{
                      backgroundColor: '#e14646',
                      color: 'white',
                      borderRadius: '12px',
                      px: 1,
                      py: 0.2,
                      fontSize: 11,
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
    </>
  );

  return (
    <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            backgroundColor: '#171d28',
            color: 'white',
            borderRight: '1px solid #2b3445',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            backgroundColor: '#171d28',
            color: 'white',
            borderRight: '1px solid #2b3445',
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
};

export default Sidebar;