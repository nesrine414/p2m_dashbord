import React, { useState } from 'react';
import { Box, Toolbar } from '@mui/material';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

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
        display: 'flex',
        minHeight: '100vh',
        background: 'radial-gradient(circle at top right, #162036 0%, #111826 40%, #0f141f 100%)',
      }}
    >
      <Sidebar drawerWidth={DRAWER_WIDTH} mobileOpen={mobileOpen} onMobileClose={handleCloseMobile} />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
        }}
      >
        <Header drawerWidth={DRAWER_WIDTH} onMenuClick={handleToggleMobile} />
        <Toolbar />
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default MainLayout;