import React, { useState } from 'react';
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

export interface NotificationItem {
  id: string;
  backendId?: number;
  alarmId?: number | null;
  type: 'alarm' | 'system';
  title: string;
  message: string;
  time: string;
  read?: boolean;
}

interface HeaderProps {
  drawerWidth: number;
  onMenuClick: () => void;
  notifications?: NotificationItem[];
  onMarkAllRead?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  drawerWidth,
  onMenuClick,
  notifications = [],
  onMarkAllRead,
}) => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const unreadCount = notifications.filter((item) => !item.read).length;
  const notificationCount = unreadCount;
  const popoverOpen = Boolean(anchorEl);

  return (
    <AppBar
      position="fixed"
      sx={{
        width: { md: `calc(100% - ${drawerWidth}px)` },
        ml: { md: `${drawerWidth}px` },
        backgroundColor: '#ffffff',
        boxShadow: 'none',
        borderBottom: '1px solid #dee2e6',
        color: '#343a40',
      }}
    >
      <Toolbar sx={{ gap: 1.2 }}>
        <IconButton color="inherit" onClick={onMenuClick} sx={{ display: { md: 'none' } }}>
          <MenuOutlined />
        </IconButton>

        <TextField
          placeholder="Rechercher RTU, alarmes..."
          variant="outlined"
          size="small"
          sx={{
            width: { xs: '100%', sm: 300, md: 350 },
            backgroundColor: '#f4f6f9',
            borderRadius: 1.5,
            '& .MuiOutlinedInput-root': {
              color: '#343a40',
              '& fieldset': {
                borderColor: '#dee2e6',
              },
              '&:hover fieldset': {
                borderColor: '#adb5bd',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#007bff',
              },
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: '#adb5bd', fontSize: 20 }} />
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
              mt: 1.5,
              width: 350,
              borderRadius: 2,
              backgroundColor: '#ffffff',
              border: '1px solid #dee2e6',
              boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)',
              color: '#343a40',
            },
          }}
        >
          <Box sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
              <Typography variant="subtitle1" fontWeight={700}>
                Notifications ({notificationCount})
              </Typography>
              <Badge badgeContent={notificationCount} color="error">
                <NotificationsOutlined fontSize="small" />
              </Badge>
            </Stack>
            <Divider sx={{ mb: 1.5 }} />

            <Stack spacing={1}>
              {notifications.length > 0 ? (
                notifications.map((item) => (
                  <Box
                    key={item.id}
                    sx={{
                      p: 1.5,
                      borderRadius: 1.5,
                      backgroundColor: item.read ? '#f8f9fa' : 'rgba(0, 123, 255, 0.04)',
                      border: '1px solid',
                      borderColor: item.read ? '#e9ecef' : 'rgba(0, 123, 255, 0.12)',
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="flex-start" mb={0.5}>
                      {item.type === 'alarm' ? (
                        <NotificationsActiveOutlined sx={{ color: '#dc3545', fontSize: 18, mt: 0.2 }} />
                      ) : (
                        <PsychologyOutlined sx={{ color: '#6610f2', fontSize: 18, mt: 0.2 }} />
                      )}
                      <Box>
                        <Typography variant="body2" fontWeight={700} color="#343a40">
                          {item.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ lineBreak: 'anywhere' }}>
                          {item.message}
                        </Typography>
                        <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>
                          {item.time}
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>
                ))
              ) : (
                <Box sx={{ py: 3, textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    Aucune nouvelle notification.
                  </Typography>
                </Box>
              )}
            </Stack>

            <Divider sx={{ my: 1.5 }} />
            <Box
              sx={{
                textAlign: 'center',
                cursor: unreadCount > 0 ? 'pointer' : 'default',
                '&:hover': { opacity: unreadCount > 0 ? 0.8 : 1 }
              }}
              onClick={() => {
                if (unreadCount > 0 && onMarkAllRead) {
                  onMarkAllRead();
                }
              }}
            >
              <Typography
                variant="caption"
                color="primary"
                fontWeight={600}
              >
                {unreadCount > 0 ? 'Tout marquer comme lu' : 'Toutes les notifications lues'}
              </Typography>
            </Box>
          </Box>
        </Popover>

        <Box
          sx={{
            bgcolor: '#e1f5fe',
            color: '#01579b',
            px: 1.5,
            py: 0.5,
            borderRadius: 1,
            mr: 1.5,
            fontSize: 11,
            fontWeight: 700,
            display: { xs: 'none', sm: 'block' },
            border: '1px solid #b3e5fc'
          }}
        >
          CONNECTÉ
        </Box>

        <Tooltip title="Profil" arrow>
          <IconButton sx={{ p: 0.5 }} aria-label="Ouvrir le profil" onClick={() => navigate(ROUTE_PATHS.profile)}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 13, fontWeight: 700 }}>
              AD
            </Avatar>
          </IconButton>
        </Tooltip>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
