import React, { useState } from 'react';
import { Box, Toolbar } from '@mui/material';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import FloatingChatbot from '../chatbot/FloatingChatbot';

const DRAWER_WIDTH = 240;

const MainLayout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleToggleMobile = () => {
    setMobileOpen((previous) => !previous);
  };

  const handleCloseMobile = () => {
    setMobileOpen(false);
  };

  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        minHeight: '100vh',
        background:
          'radial-gradient(circle at 8% -5%, rgba(106, 217, 255, 0.25), transparent 30%), radial-gradient(circle at 92% 8%, rgba(243, 169, 201, 0.18), transparent 26%), linear-gradient(145deg, #10182d 0%, #151f39 45%, #1a2643 100%)',
        '&::before': {
          content: '""',
          position: 'absolute',
          width: 360,
          height: 360,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(154, 185, 164, 0.24), rgba(154, 185, 164, 0))',
          top: -120,
          right: -120,
          pointerEvents: 'none',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          width: 420,
          height: 420,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(126, 165, 232, 0.22), rgba(126, 165, 232, 0))',
          left: -150,
          bottom: -180,
          pointerEvents: 'none',
        },
      }}
    >
      <Sidebar drawerWidth={DRAWER_WIDTH} mobileOpen={mobileOpen} onMobileClose={handleCloseMobile} />

      <Box
        component="main"
        sx={{
          position: 'relative',
          zIndex: 1,
          flexGrow: 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
        }}
      >
        <Header drawerWidth={DRAWER_WIDTH} onMenuClick={handleToggleMobile} />
        <Toolbar />
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          <Outlet />
        </Box>
        <FloatingChatbot />
      </Box>
    </Box>
  );
};

export default MainLayout;
