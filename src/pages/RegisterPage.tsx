import React from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { ROUTE_PATHS } from '../constants/routes';
import { register, setStoredToken } from '../services/auth';

const buildUsername = (email: string, phone: string): string => {
  const emailPart = email.trim().split('@')[0];
  if (emailPart) return emailPart;
  const digits = phone.replace(/\s+/g, '');
  return digits || `user${Math.floor(Math.random() * 10000)}`;
};

const InscriptionPage: React.FC = () => {
  const navigate = useNavigate();

  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [region, setRégion] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Email requis.');
      return;
    }
    if (!password.trim()) {
      setError('Mot de passe requis.');
      return;
    }

    try {
      setLoading(true);
      const response = await register({
        username: buildUsername(email, phone),
        email: email.trim(),
        password,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        phone: phone.trim() || undefined,
      });

      setStoredToken(response.token, true);

      localStorage.setItem(
        'nqms_technician_profile_v1',
        JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
          zone: region.trim(),
        })
      );

      navigate(ROUTE_PATHS.dashboard, { replace: true });
    } catch (registerError: any) {
      const message =
        registerError?.response?.data?.error ||
        registerError?.message ||
        "Impossible de créer le compte. Vérifie que le backend tourne sur localhost:5000.";
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
      <Card sx={{ width: '100%', maxWidth: 520 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="h4" sx={{ mb: 0.5 }}>
                Inscription
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Crée un compte technicien.
              </Typography>
            </Box>

            {error && <Alert severity="error">{error}</Alert>}

            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Nom"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    fullWidth
                    autoComplete="family-name"
                  />
                  <TextField
                    label="Prénom"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    fullWidth
                    autoComplete="given-name"
                  />
                </Stack>

                <TextField
                  label="Région"
                  value={region}
                  onChange={(e) => setRégion(e.target.value)}
                  fullWidth
                  placeholder="Sousse, Monastir..."
                />

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    fullWidth
                    autoComplete="email"
                  />
                  <TextField
                    label="Numéro de téléphone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    fullWidth
                    autoComplete="tel"
                  />
                </Stack>

                <TextField
                  label="Mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  fullWidth
                  autoComplete="new-password"
                />

                <Button type="submit" variant="contained" disabled={loading}>
                  {loading ? 'Création...' : 'Inscription'}
                </Button>
              </Stack>
            </Box>

            <Typography variant="body2" color="text.secondary">
              Déjà un compte ?{' '}
              <Button component={RouterLink} to={ROUTE_PATHS.login} variant="text" sx={{ p: 0, minWidth: 'auto' }}>
                Connexion
              </Button>
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default InscriptionPage;

