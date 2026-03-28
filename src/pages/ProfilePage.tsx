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

type TechnicienProfil = {
  firstName: string;
  lastName: string;
  phone: string;
  zone: string;
};

const STORAGE_KEY = 'nqms_technician_profile_v1';

const emptyProfil: TechnicienProfil = {
  firstName: '',
  lastName: '',
  phone: '',
  zone: '',
};

const safeParseProfil = (raw: string | null): TechnicienProfil | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<TechnicienProfil>;
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

const getInitial = (profile: TechnicienProfil): string => {
  const candidate = (profile.firstName || profile.lastName || 'A').trim();
  return candidate ? candidate[0].toUpperCase() : 'A';
};

const ProfilPage: React.FC = () => {
  const navigate = useNavigate();
  const [editing, setModifiering] = React.useState(false);
  const [logoutOpen, setDéconnexionOpen] = React.useState(false);
  const [profile, setProfil] = React.useState<TechnicienProfil>(() => {
    return safeParseProfil(localStorage.getItem(STORAGE_KEY)) ?? emptyProfil;
  });

  const handleChange =
    (key: keyof TechnicienProfil) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setProfil((current) => ({ ...current, [key]: event.target.value }));
    };

  const handleEnregistrer = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    setModifiering(false);
  };

  const handleAnnuler = () => {
    setProfil(safeParseProfil(localStorage.getItem(STORAGE_KEY)) ?? emptyProfil);
    setModifiering(false);
  };

  const handleDéconnexion = () => {
    clearStoredToken();

    setDéconnexionOpen(false);
    setModifiering(false);
    navigate(ROUTE_PATHS.login, { replace: true });
  };

  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim();

  return (
    <Box sx={{ maxWidth: 920, mx: 'auto' }}>
      <Typography variant="h4" sx={{ mb: 2 }}>
        Profil
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
                  {fullName || 'Technicien'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {profile.zone || 'Zone : par exemple Sousse ou Monastir'}
                </Typography>
              </Box>
            </Stack>

            <Box flexGrow={1} />

            <Stack direction="row" spacing={1} justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}>
              <Button variant="outlined" color="error" onClick={() => setDéconnexionOpen(true)}>
                Déconnexion
              </Button>
              {!editing ? (
                <Button variant="contained" onClick={() => setModifiering(true)}>
                  Modifier
                </Button>
              ) : (
                <>
                  <Button variant="contained" onClick={handleEnregistrer}>
                    Enregistrer
                  </Button>
                  <Button variant="outlined" onClick={handleAnnuler}>
                    Annuler
                  </Button>
                </>
              )}
            </Stack>
          </Stack>

          <Divider sx={{ my: 2.5 }} />

          <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
            <TextField
              label="Nom"
              value={profile.lastName}
              onChange={handleChange('lastName')}
              fullWidth
              disabled={!editing}
              placeholder="Ben Ameur"
            />
            <TextField
              label="Prénom"
              value={profile.firstName}
              onChange={handleChange('firstName')}
              fullWidth
              disabled={!editing}
              placeholder="Eslem"
            />
          </Stack>

          <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }} sx={{ mt: 2 }}>
            <TextField
              label="Numéro de téléphone"
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

      <Dialog open={logoutOpen} onClose={() => setDéconnexionOpen(false)}>
        <DialogTitle>Déconnexion</DialogTitle>
        <DialogContent>
          <DialogContentText>Êtes-vous sûr de vouloir vous déconnecter ?</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDéconnexionOpen(false)} variant="outlined">
            Annuler
          </Button>
          <Button onClick={handleDéconnexion} variant="contained" color="error">
            Déconnexion
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProfilPage;


