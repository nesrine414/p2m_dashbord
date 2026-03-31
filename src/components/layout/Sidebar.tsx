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
    <>
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography
          variant="h4"
          fontWeight={800}
          sx={{
            letterSpacing: 0.6,
            background: 'linear-gradient(120deg, #9de8ff 0%, #d9d0ff 46%, #ffd8e9 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          NQMS
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Poste de supervision fibre
        </Typography>
      </Box>

      <Divider sx={{ borderColor: 'rgba(175, 194, 232, 0.24)' }} />

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
                  borderRadius: 3,
                  backgroundColor: isActive ? 'rgba(118, 178, 243, 0.28)' : 'transparent',
                  border: isActive ? '1px solid rgba(170, 210, 255, 0.4)' : '1px solid transparent',
                  '&:hover': {
                    backgroundColor: isActive ? 'rgba(118, 178, 243, 0.36)' : 'rgba(255, 255, 255, 0.08)',
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: isActive ? '#dff2ff' : '#a5b5d2',
                    minWidth: 40,
                    '& .MuiSvgIcon-root': {
                      backgroundColor: isActive ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.06)',
                      borderRadius: '10px',
                      p: 0.4,
                    },
                  }}
                >
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
                      background: 'linear-gradient(120deg, #f29aaa, #cf6f87)',
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
            backgroundColor: 'rgba(26, 35, 56, 0.62)',
            color: 'white',
            borderRight: '1px solid rgba(175, 194, 232, 0.22)',
            backdropFilter: 'blur(16px)',
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
            backgroundColor: 'rgba(26, 35, 56, 0.62)',
            color: 'white',
            borderRight: '1px solid rgba(175, 194, 232, 0.22)',
            backdropFilter: 'blur(16px)',
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
