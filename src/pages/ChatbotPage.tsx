import React from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  InsightsOutlined,
  SendRounded,
  SmartToyOutlined,
  SupportAgentOutlined,
} from '@mui/icons-material';
import { sendAiChatMessage } from '../services/api';

type Sender = 'assistant' | 'technician';

interface ChatMessage {
  id: string;
  sender: Sender;
  text: string;
  timestamp: string;
  provider?: 'groq' | 'fallback';
}

interface PromptItem {
  id: string;
  prompt: string;
}

const defaultPrompts: PromptItem[] = [
  { id: 'alarm', prompt: 'Explique cette alarme critique pour un technicien terrain.' },
  { id: 'rtu', prompt: 'Donne-moi une checklist pour une RTU injoignable.' },
  { id: 'route', prompt: 'Analyse la route ELG-CABLE-06 et donne la priorite.' },
  { id: 'otdr', prompt: 'Explique un resultat OTDR avec perte anormale en termes simples.' },
];

const initialMessages: ChatMessage[] = [
  {
    id: 'assistant-welcome',
    sender: 'assistant',
    timestamp: 'Maintenant',
    text: 'Assistant NQMS pret. Posez une question courte sur une RTU, une alarme, une route ou un test OTDR.',
  },
];

const ChatbotPage: React.FC = () => {
  const [messages, setMessages] = React.useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [suggestions, setSuggestions] = React.useState<string[]>(defaultPrompts.map((item) => item.prompt));
  const [contextSummary, setContextSummary] = React.useState<{
    matchedRtu?: string;
    matchedAlarm?: string;
    matchedRoute?: string;
    counts?: {
      rtus: number;
      activeAlarms: number;
      brokenRoutes: number;
      failedOtdrTests: number;
    };
  } | null>(null);
  const [lastProvider, setLastProvider] = React.useState<'groq' | 'fallback' | null>(null);

  const sendMessage = async (prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      return;
    }

    const technicianMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'technician',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((current) => [...current, technicianMessage]);
    setInput('');
    setError(null);
    setLoading(true);

    try {
      const response = await sendAiChatMessage(trimmed);
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now() + 1}`,
        sender: 'assistant',
        text: response.reply,
        timestamp: new Date(response.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider: response.provider,
      };

      setMessages((current) => [...current, assistantMessage]);
      setSuggestions(response.suggestions.length > 0 ? response.suggestions : defaultPrompts.map((item) => item.prompt));
      setContextSummary(response.context);
      setLastProvider(response.provider);
    } catch (chatError: any) {
      setError(
        chatError?.response?.data?.error ||
          chatError?.message ||
          'Chatbot indisponible. Verifiez le backend.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void sendMessage(input);
  };

  return (
    <Box>
      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} justifyContent="space-between" mb={3}>
        <Box>
          <Stack direction="row" spacing={1.2} alignItems="center" mb={1}>
            <SmartToyOutlined sx={{ color: '#9de8ff', fontSize: 34 }} />
            <Typography variant="h4" color="white" fontWeight={800}>
              Chatbot Technicien
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" maxWidth={720}>
            Assistant de diagnostic pour RTU, alarmes, routes fibre et OTDR, avec reponses claires pour le terrain.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <Chip label="Connecte au backend" sx={{ backgroundColor: 'rgba(124, 203, 255, 0.14)', color: 'white' }} />
          <Chip label="Diagnostic assiste" sx={{ backgroundColor: 'rgba(132, 216, 163, 0.14)', color: 'white' }} />
          {lastProvider && (
            <Chip
              label={lastProvider === 'groq' ? 'Provider: Groq' : 'Provider: Fallback'}
              sx={{
                backgroundColor:
                  lastProvider === 'groq'
                    ? 'rgba(243, 169, 201, 0.18)'
                    : 'rgba(240, 139, 161, 0.18)',
                color: 'white',
              }}
            />
          )}
        </Stack>
      </Stack>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, xl: 8 }}>
          <Paper sx={{ p: 0, overflow: 'hidden' }}>
            <Box
              sx={{
                px: 2.5,
                py: 2,
                borderBottom: '1px solid rgba(156, 176, 217, 0.22)',
                background: 'linear-gradient(135deg, rgba(66, 100, 156, 0.28), rgba(30, 40, 68, 0.12))',
              }}
            >
              <Typography variant="h6" color="white" fontWeight={700}>
                Conversation
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Questions courtes. Reponses pratiques.
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ m: 2, mb: 0 }}>
                {error}
              </Alert>
            )}

            <Stack spacing={1.5} sx={{ p: 2.5, minHeight: 460, maxHeight: 560, overflowY: 'auto' }}>
              {messages.map((message) => {
                const isAssistant = message.sender === 'assistant';

                return (
                  <Stack
                    key={message.id}
                    direction="row"
                    spacing={1.4}
                    justifyContent={isAssistant ? 'flex-start' : 'flex-end'}
                    className="animate-fadeInUp"
                  >
                    {isAssistant && (
                      <Avatar sx={{ bgcolor: 'rgba(106, 217, 255, 0.18)', color: '#9de8ff' }}>
                        <SmartToyOutlined />
                      </Avatar>
                    )}

                    <Box
                      sx={{
                        maxWidth: { xs: '100%', sm: '82%' },
                        px: 2,
                        py: 1.6,
                        borderRadius: 3,
                        background: isAssistant
                          ? 'linear-gradient(160deg, rgba(87, 118, 176, 0.28), rgba(255, 255, 255, 0.04))'
                          : 'linear-gradient(160deg, rgba(106, 217, 255, 0.24), rgba(111, 143, 209, 0.16))',
                        border: isAssistant
                          ? '1px solid rgba(156, 176, 217, 0.24)'
                          : '1px solid rgba(135, 212, 255, 0.34)',
                      }}
                    >
                      <Typography variant="body2" color="white" sx={{ whiteSpace: 'pre-wrap' }}>
                        {message.text}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.8 }}>
                        {isAssistant ? 'Assistant NQMS' : 'Technicien'} - {message.timestamp}
                      </Typography>
                      {isAssistant && message.provider && (
                        <Typography variant="caption" sx={{ display: 'block', mt: 0.3, color: '#9de8ff' }}>
                          {message.provider === 'groq' ? 'Reponse via Groq' : 'Reponse via fallback'}
                        </Typography>
                      )}
                    </Box>

                    {!isAssistant && (
                      <Avatar sx={{ bgcolor: 'rgba(243, 169, 201, 0.18)', color: '#ffd8e9' }}>
                        <SupportAgentOutlined />
                      </Avatar>
                    )}
                  </Stack>
                );
              })}

              {loading && (
                <Stack direction="row" spacing={1.2} alignItems="center" className="animate-fadeInUp">
                  <Avatar sx={{ bgcolor: 'rgba(106, 217, 255, 0.18)', color: '#9de8ff' }}>
                    <SmartToyOutlined />
                  </Avatar>
                  <Box
                    sx={{
                      px: 2,
                      py: 1.4,
                      borderRadius: 3,
                      border: '1px solid rgba(156, 176, 217, 0.24)',
                      background: 'linear-gradient(160deg, rgba(87, 118, 176, 0.28), rgba(255, 255, 255, 0.04))',
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CircularProgress size={16} />
                      <Typography variant="body2" color="white">
                        Analyse en cours...
                      </Typography>
                    </Stack>
                  </Box>
                </Stack>
              )}
            </Stack>

            <Divider sx={{ borderColor: 'rgba(156, 176, 217, 0.22)' }} />

            <Box component="form" onSubmit={handleSubmit} sx={{ p: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2}>
                <TextField
                  fullWidth
                  placeholder="Exemple: Explique cette alarme et dis-moi quoi verifier"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  disabled={loading}
                />
                <Button type="submit" variant="contained" endIcon={<SendRounded />} sx={{ minWidth: 146 }} disabled={loading}>
                  Envoyer
                </Button>
              </Stack>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, xl: 4 }}>
          <Stack spacing={2.4}>
            <Paper sx={{ p: 2.4 }}>
              <Stack direction="row" spacing={1.1} alignItems="center" mb={1.6}>
                <InsightsOutlined sx={{ color: '#7ccBff' }} />
                <Typography variant="h6" color="white" fontWeight={700}>
                  Suggestions
                </Typography>
              </Stack>
              <Stack spacing={1}>
                {suggestions.map((item, index) => (
                  <Button
                    key={`${item}-${index}`}
                    variant="outlined"
                    onClick={() => void sendMessage(item)}
                    disabled={loading}
                    sx={{
                      justifyContent: 'flex-start',
                      textAlign: 'left',
                      borderColor: 'rgba(156, 176, 217, 0.24)',
                      color: 'white',
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    }}
                  >
                    {item}
                  </Button>
                ))}
              </Stack>
            </Paper>

            <Paper sx={{ p: 2.4 }}>
              <Typography variant="h6" color="white" fontWeight={700} mb={1.4}>
                Contexte
              </Typography>
              <Stack spacing={1.1}>
                <Typography variant="body2" color="text.secondary">
                  RTU: {contextSummary?.counts?.rtus ?? '-'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Alarmes actives: {contextSummary?.counts?.activeAlarms ?? '-'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Routes cassees: {contextSummary?.counts?.brokenRoutes ?? '-'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Echecs OTDR: {contextSummary?.counts?.failedOtdrTests ?? '-'}
                </Typography>
                {contextSummary?.matchedRtu && (
                  <Typography variant="body2" color="text.secondary">
                    RTU ciblee: {contextSummary.matchedRtu}
                  </Typography>
                )}
                {contextSummary?.matchedAlarm && (
                  <Typography variant="body2" color="text.secondary">
                    Alarme ciblee: {contextSummary.matchedAlarm}
                  </Typography>
                )}
                {contextSummary?.matchedRoute && (
                  <Typography variant="body2" color="text.secondary">
                    Route ciblee: {contextSummary.matchedRoute}
                  </Typography>
                )}
              </Stack>
            </Paper>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ChatbotPage;
