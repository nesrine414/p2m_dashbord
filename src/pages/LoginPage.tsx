import React from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { ROUTE_PATHS } from '../constants/routes';
import { login, me, setStoredToken } from '../services/auth';

type LocationState = {
  from?: { pathname?: string };
};

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as LocationState | null)?.from?.pathname || ROUTE_PATHS.dashboard;

  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [remember, setRemember] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!password.trim()) {
      setError('Mot de passe requis.');
      return;
    }

    if (!email.trim() && !phone.trim()) {
      setError('Entrer email ou numéro téléphone.');
      return;
    }

    try {
      setLoading(true);
      const response = await login({
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        password,
      });

      setStoredToken(response.token, remember);

      try {
        const profile = await me();
        if (profile) {
          localStorage.setItem(
            'nqms_technician_profile_v1',
            JSON.stringify({
              firstName: profile.firstName || '',
              lastName: profile.lastName || '',
              phone: profile.phone || phone.trim() || '',
              zone: '',
            })
          );
        }
      } catch {
        // Ignore profile fetch errors; token is enough to proceed.
      }

      navigate(redirectTo, { replace: true });
    } catch (loginError: any) {
      const message =
        loginError?.response?.data?.error ||
        loginError?.message ||
        "Impossible de se connecter. Vérifie que le backend tourne sur localhost:5000.";
      setError(String(message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        background:
          'radial-gradient(circle at 15% 10%, rgba(106, 217, 255, 0.20), transparent 35%), radial-gradient(circle at 90% 20%, rgba(243, 169, 201, 0.14), transparent 35%), linear-gradient(145deg, #10182d 0%, #151f39 45%, #1a2643 100%)',
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 440 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="h4" sx={{ mb: 0.5 }}>
                Login
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Connecte-toi avec email ou numéro téléphone.
              </Typography>
            </Box>

            {error && <Alert severity="error">{error}</Alert>}

            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField
                  label="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  fullWidth
                  autoComplete="email"
                />
                <TextField
                  label="Numéro téléphone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  fullWidth
                  autoComplete="tel"
                />
                <TextField
                  label="Mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  fullWidth
                  autoComplete="current-password"
                />

                <FormControlLabel
                  control={<Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)} />}
                  label="Rester connecté"
                />

                <Button type="submit" variant="contained" disabled={loading}>
                  {loading ? 'Connexion...' : 'Login'}
                </Button>
              </Stack>
            </Box>

            <Typography variant="body2" color="text.secondary">
              Pas de compte ?{' '}
              <Button component={RouterLink} to={ROUTE_PATHS.register} variant="text" sx={{ p: 0, minWidth: 'auto' }}>
                Register
              </Button>
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default LoginPage;

