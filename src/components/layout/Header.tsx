import React, { useMemo, useState } from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Box,
  Badge,
  Avatar,
  Divider,
  Popover,
  Stack,
  TextField,
  InputAdornment,
  Typography,
  Tooltip,
} from '@mui/material';
import {
  MenuOutlined,
  Search,
  NotificationsOutlined,
  NotificationsActiveOutlined,
  PsychologyOutlined,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ROUTE_PATHS } from '../../constants/routes';

interface HeaderProps {
  drawerWidth: number;
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ drawerWidth, onMenuClick }) => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const notifications = useMemo(
    () => [
      {
        id: 'n-1',
        type: 'alarm',
        title: 'New critical alarm',
        message: 'RTU-PAR-014 - Fiber Cut',
        time: '5 min ago',
      },
      {
        id: 'n-2',
        type: 'ai',
        title: 'AI prediction',
        message: 'RTU-LYO-005 at 78% risk in 48h',
        time: '12 min ago',
      },
      {
        id: 'n-3',
        type: 'alarm',
        title: 'Major attenuation drift',
        message: 'BDX-HUB-SPUR +2.4 dB',
        time: '24 min ago',
      },
    ],
    []
  );

  const notificationCount = notifications.length;
  const popoverOpen = Boolean(anchorEl);

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

        <IconButton
          color="inherit"
          sx={{ mr: 1 }}
          onClick={(event) => setAnchorEl(event.currentTarget)}
          aria-haspopup="true"
          aria-expanded={popoverOpen ? 'true' : undefined}
        >
          <Badge badgeContent={notificationCount} color="error">
            <NotificationsOutlined />
          </Badge>
        </IconButton>

        <Popover
          open={popoverOpen}
          anchorEl={anchorEl}
          onClose={() => setAnchorEl(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          PaperProps={{
            sx: {
              mt: 1,
              width: 320,
              borderRadius: 3,
              backgroundColor: 'rgba(24, 33, 53, 0.92)',
              border: '1px solid rgba(175, 194, 232, 0.22)',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 18px 40px rgba(5, 10, 22, 0.28)',
              color: 'white',
            },
          }}
        >
          <Box sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="subtitle1" fontWeight={700}>
                Notifications ({notificationCount})
              </Typography>
              <Badge badgeContent={notificationCount} color="error">
                <NotificationsOutlined fontSize="small" />
              </Badge>
            </Stack>
            <Divider sx={{ borderColor: 'rgba(175, 194, 232, 0.18)', mb: 1.5 }} />

            <Stack spacing={1.2}>
              {notifications.map((item) => (
                <Box
                  key={item.id}
                  sx={{
                    p: 1.4,
                    borderRadius: 2,
                    backgroundColor: 'rgba(41, 50, 71, 0.7)',
                    border: '1px solid rgba(156, 176, 217, 0.2)',
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center" mb={0.4}>
                    {item.type === 'alarm' ? (
                      <NotificationsActiveOutlined sx={{ color: '#ff7a94', fontSize: 18 }} />
                    ) : (
                      <PsychologyOutlined sx={{ color: '#b7a6ff', fontSize: 18 }} />
                    )}
                    <Typography variant="body2" fontWeight={700} color="white">
                      {item.title}
                    </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {item.message}
                  </Typography>
                  <Typography variant="caption" color="#8fb3d1">
                    {item.time}
                  </Typography>
                </Box>
              ))}
            </Stack>

            <Divider sx={{ borderColor: 'rgba(175, 194, 232, 0.18)', my: 1.5 }} />
            <Typography variant="caption" color="#7cdfff" sx={{ cursor: 'pointer' }}>
              View all notifications
            </Typography>
          </Box>
        </Popover>

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
