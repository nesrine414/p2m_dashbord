import React from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Box,
  Badge,
  Avatar,
  TextField,
  InputAdornment,
} from '@mui/material';
import { MenuOutlined, Search, NotificationsOutlined } from '@mui/icons-material';

interface HeaderProps {
  drawerWidth: number;
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ drawerWidth, onMenuClick }) => {
  return (
    <AppBar
      position="fixed"
      sx={{
        width: { md: `calc(100% - ${drawerWidth}px)` },
        ml: { md: `${drawerWidth}px` },
        backgroundColor: '#171d28',
        boxShadow: 'none',
        borderBottom: '1px solid #2b3445',
      }}
    >
      <Toolbar sx={{ gap: 1.2 }}>
        <IconButton color="inherit" onClick={onMenuClick} sx={{ display: { md: 'none' } }}>
          <MenuOutlined />
        </IconButton>

        <TextField
          placeholder="Search RTU, alarms, or reports"
          variant="outlined"
          size="small"
          sx={{
            width: { xs: '100%', sm: 360, md: 420 },
            maxWidth: { xs: '100%', md: 460 },
            backgroundColor: '#111823',
            borderRadius: 2,
            '& .MuiOutlinedInput-root': {
              color: 'white',
              '& fieldset': {
                borderColor: '#304056',
              },
              '&:hover fieldset': {
                borderColor: '#3f5572',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#5f9eff',
              },
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: '#8ba2bf' }} />
              </InputAdornment>
            ),
          }}
        />

        <Box flexGrow={1} />

        <IconButton color="inherit" sx={{ mr: 1 }}>
          <Badge badgeContent={3} color="error">
            <NotificationsOutlined />
          </Badge>
        </IconButton>

        <Box
          sx={{
            backgroundColor: '#2f8f56',
            color: 'white',
            px: 1.8,
            py: 0.5,
            borderRadius: 4,
            mr: 1,
            fontSize: 12,
            fontWeight: 700,
            display: { xs: 'none', sm: 'block' },
          }}
        >
          Connected
        </Box>

        <IconButton sx={{ p: 0 }}>
          <Avatar sx={{ width: 34, height: 34, backgroundColor: '#3b82f6', fontSize: 14 }}>A</Avatar>
        </IconButton>
      </Toolbar>
    </AppBar>
  );
};

export default Header;