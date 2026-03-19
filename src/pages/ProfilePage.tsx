import React from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ROUTE_PATHS } from '../constants/routes';
import { clearStoredToken } from '../services/auth';

type TechnicianProfile = {
  firstName: string;
  lastName: string;
  phone: string;
  zone: string;
};

const STORAGE_KEY = 'nqms_technician_profile_v1';

const emptyProfile: TechnicianProfile = {
  firstName: '',
  lastName: '',
  phone: '',
  zone: '',
};

const safeParseProfile = (raw: string | null): TechnicianProfile | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<TechnicianProfile>;
    return {
      firstName: parsed.firstName ?? '',
      lastName: parsed.lastName ?? '',
      phone: parsed.phone ?? '',
      zone: parsed.zone ?? '',
    };
  } catch {
    return null;
  }
};

const getInitial = (profile: TechnicianProfile): string => {
  const candidate = (profile.firstName || profile.lastName || 'A').trim();
  return candidate ? candidate[0].toUpperCase() : 'A';
};

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [editing, setEditing] = React.useState(false);
  const [logoutOpen, setLogoutOpen] = React.useState(false);
  const [profile, setProfile] = React.useState<TechnicianProfile>(() => {
    return safeParseProfile(localStorage.getItem(STORAGE_KEY)) ?? emptyProfile;
  });

  const handleChange =
    (key: keyof TechnicianProfile) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setProfile((current) => ({ ...current, [key]: event.target.value }));
    };

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    setEditing(false);
  };

  const handleCancel = () => {
    setProfile(safeParseProfile(localStorage.getItem(STORAGE_KEY)) ?? emptyProfile);
    setEditing(false);
  };

  const handleLogout = () => {
    clearStoredToken();

    setLogoutOpen(false);
    setEditing(false);
    navigate(ROUTE_PATHS.login, { replace: true });
  };

  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim();

  return (
    <Box sx={{ maxWidth: 920, mx: 'auto' }}>
      <Typography variant="h4" sx={{ mb: 2 }}>
        Profile
      </Typography>

      <Card>
        <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} alignItems="stretch">
            <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: { sm: 280 } }}>
              <Avatar sx={{ width: 56, height: 56, backgroundColor: '#7ea5e8', fontSize: 18 }}>
                {getInitial(profile)}
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
                  {fullName || 'Technician'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {profile.zone || 'Zone: e.g. Sousse or Monastir'}
                </Typography>
              </Box>
            </Stack>

            <Box flexGrow={1} />

            <Stack direction="row" spacing={1} justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}>
              <Button variant="outlined" color="error" onClick={() => setLogoutOpen(true)}>
                Logout
              </Button>
              {!editing ? (
                <Button variant="contained" onClick={() => setEditing(true)}>
                  Edit
                </Button>
              ) : (
                <>
                  <Button variant="contained" onClick={handleSave}>
                    Save
                  </Button>
                  <Button variant="outlined" onClick={handleCancel}>
                    Cancel
                  </Button>
                </>
              )}
            </Stack>
          </Stack>

          <Divider sx={{ my: 2.5 }} />

          <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
            <TextField
              label="Last name"
              value={profile.lastName}
              onChange={handleChange('lastName')}
              fullWidth
              disabled={!editing}
              placeholder="Ben Ameur"
            />
            <TextField
              label="First name"
              value={profile.firstName}
              onChange={handleChange('firstName')}
              fullWidth
              disabled={!editing}
              placeholder="Eslem"
            />
          </Stack>

          <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }} sx={{ mt: 2 }}>
            <TextField
              label="Phone number"
              value={profile.phone}
              onChange={handleChange('phone')}
              fullWidth
              disabled={!editing}
              placeholder="+216 12 345 678"
            />
            <TextField
              label="Zone"
              value={profile.zone}
              onChange={handleChange('zone')}
              fullWidth
              disabled={!editing}
              placeholder="Sousse, Monastir"
            />
          </Stack>
        </CardContent>
      </Card>

      <Dialog open={logoutOpen} onClose={() => setLogoutOpen(false)}>
        <DialogTitle>Logout</DialogTitle>
        <DialogContent>
          <DialogContentText>Are you sure you want to log out?</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setLogoutOpen(false)} variant="outlined">
            Cancel
          </Button>
          <Button onClick={handleLogout} variant="contained" color="error">
            Logout
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProfilePage;

