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
  Tooltip,
} from '@mui/material';
import { MenuOutlined, Search, NotificationsOutlined } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ROUTE_PATHS } from '../../constants/routes';

interface HeaderProps {
  drawerWidth: number;
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ drawerWidth, onMenuClick }) => {
  const navigate = useNavigate();

  return (
    <AppBar
      position="fixed"
      sx={{
        width: { md: `calc(100% - ${drawerWidth}px)` },
        ml: { md: `${drawerWidth}px` },
        backgroundColor: 'rgba(24, 33, 53, 0.56)',
        boxShadow: 'none',
        borderBottom: '1px solid rgba(175, 194, 232, 0.22)',
        backdropFilter: 'blur(14px)',
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
            backgroundColor: 'rgba(40, 54, 82, 0.72)',
            borderRadius: 2,
            '& .MuiOutlinedInput-root': {
              color: 'white',
              '& fieldset': {
                borderColor: 'rgba(175, 194, 232, 0.28)',
              },
              '&:hover fieldset': {
                borderColor: 'rgba(183, 206, 244, 0.45)',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#82d7ff',
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
            background: 'linear-gradient(120deg, rgba(136, 198, 168, 0.92), rgba(106, 168, 132, 0.92))',
            color: '#10271d',
            px: 1.8,
            py: 0.5,
            borderRadius: 4,
            mr: 1,
            fontSize: 12,
            fontWeight: 700,
            boxShadow: '0 8px 18px rgba(104, 168, 130, 0.35)',
            display: { xs: 'none', sm: 'block' },
          }}
        >
          Connected
        </Box>

        <Tooltip title="Profile" arrow>
          <IconButton sx={{ p: 0 }} aria-label="Open profile" onClick={() => navigate(ROUTE_PATHS.profile)}>
            <Avatar sx={{ width: 34, height: 34, backgroundColor: '#7ea5e8', fontSize: 14 }}>
              A
            </Avatar>
          </IconButton>
        </Tooltip>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
