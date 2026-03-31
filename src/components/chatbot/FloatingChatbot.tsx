import React from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  CloseRounded,
  SendRounded,
  SmartToyOutlined,
  SupportAgentOutlined,
} from '@mui/icons-material';
import { sendAiChatMessage } from '../../services/api';

type Sender = 'assistant' | 'technician';

interface ChatMessage {
  id: string;
  sender: Sender;
  text: string;
  timestamp: string;
  provider?: 'groq' | 'fallback';
}

const defaultSuggestions = [
  'Explique cette alarme critique pour un technicien terrain.',
  'Donne-moi une checklist pour une RTU injoignable.',
  'Analyse la route ELG-CABLE-06 et donne la priorite.',
];

const initialMessages: ChatMessage[] = [
  {
    id: 'assistant-welcome',
    sender: 'assistant',
    timestamp: 'Maintenant',
    text: 'Assistant NQMS pret. Posez une question courte et je reponds avec des verifications terrain claires.',
  },
];

const FloatingChatbot: React.FC = () => {
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [suggestions, setSuggestions] = React.useState<string[]>(defaultSuggestions);
  const [lastProvider, setLastProvider] = React.useState<'groq' | 'fallback' | null>(null);
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, open]);

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
    setOpen(true);

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
      setSuggestions(response.suggestions.length > 0 ? response.suggestions : defaultSuggestions);
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
    <Box
      sx={{
        position: 'fixed',
        right: { xs: 12, sm: 20, md: 28 },
        bottom: { xs: 12, sm: 20, md: 28 },
        zIndex: 1600,
      }}
    >
      {open && (
        <Paper
          sx={{
            width: { xs: 'calc(100vw - 24px)', sm: 390 },
            maxWidth: '100%',
            height: { xs: 'min(72vh, 620px)', sm: 600 },
            mb: 1.5,
            overflow: 'hidden',
            borderRadius: 4,
          }}
        >
          <Box
            sx={{
              px: 2,
              py: 1.7,
              borderBottom: '1px solid rgba(156, 176, 217, 0.22)',
              background:
                'linear-gradient(135deg, rgba(70, 104, 162, 0.42), rgba(29, 41, 70, 0.42))',
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
              <Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <SmartToyOutlined sx={{ color: '#9de8ff' }} />
                  <Typography variant="h6" color="white" fontWeight={800}>
                    Assistant Technicien
                  </Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  Reponses pratiques pour le terrain
                </Typography>
              </Box>

              <Stack direction="row" spacing={0.8} alignItems="center">
                {lastProvider && (
                  <Chip
                    size="small"
                    label={lastProvider === 'groq' ? 'Groq' : 'Fallback'}
                    sx={{
                      backgroundColor:
                        lastProvider === 'groq'
                          ? 'rgba(132, 216, 163, 0.18)'
                          : 'rgba(240, 139, 161, 0.18)',
                      color: 'white',
                    }}
                  />
                )}
                <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: '#d8e5ff' }}>
                  <CloseRounded fontSize="small" />
                </IconButton>
              </Stack>
            </Stack>
          </Box>

          {error && (
            <Alert severity="error" sx={{ m: 1.5, mb: 0 }}>
              {error}
            </Alert>
          )}

          <Stack sx={{ height: 'calc(100% - 74px)' }}>
            <Stack spacing={1.3} sx={{ flex: 1, p: 1.8, overflowY: 'auto' }}>
              {messages.map((message) => {
                const isAssistant = message.sender === 'assistant';

                return (
                  <Stack
                    key={message.id}
                    direction="row"
                    spacing={1}
                    justifyContent={isAssistant ? 'flex-start' : 'flex-end'}
                  >
                    {isAssistant && (
                      <Avatar sx={{ bgcolor: 'rgba(106, 217, 255, 0.18)', color: '#9de8ff', width: 36, height: 36 }}>
                        <SmartToyOutlined fontSize="small" />
                      </Avatar>
                    )}

                    <Box
                      sx={{
                        maxWidth: '82%',
                        px: 1.7,
                        py: 1.3,
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
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.6 }}>
                        {isAssistant ? 'Assistant NQMS' : 'Technicien'} - {message.timestamp}
                      </Typography>
                      {isAssistant && message.provider && (
                        <Typography variant="caption" sx={{ display: 'block', mt: 0.25, color: '#9de8ff' }}>
                          {message.provider === 'groq' ? 'Reponse via Groq' : 'Reponse via fallback'}
                        </Typography>
                      )}
                    </Box>

                    {!isAssistant && (
                      <Avatar sx={{ bgcolor: 'rgba(243, 169, 201, 0.18)', color: '#ffd8e9', width: 36, height: 36 }}>
                        <SupportAgentOutlined fontSize="small" />
                      </Avatar>
                    )}
                  </Stack>
                );
              })}

              {loading && (
                <Stack direction="row" spacing={1} alignItems="center">
                  <Avatar sx={{ bgcolor: 'rgba(106, 217, 255, 0.18)', color: '#9de8ff', width: 36, height: 36 }}>
                    <SmartToyOutlined fontSize="small" />
                  </Avatar>
                  <Box
                    sx={{
                      px: 1.6,
                      py: 1.2,
                      borderRadius: 3,
                      border: '1px solid rgba(156, 176, 217, 0.24)',
                      background:
                        'linear-gradient(160deg, rgba(87, 118, 176, 0.28), rgba(255, 255, 255, 0.04))',
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CircularProgress size={15} />
                      <Typography variant="body2" color="white">
                        Analyse en cours...
                      </Typography>
                    </Stack>
                  </Box>
                </Stack>
              )}

              <div ref={messagesEndRef} />
            </Stack>

            <Box sx={{ px: 1.6, pb: 1.2 }}>
              <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap" mb={1.2}>
                {suggestions.slice(0, 3).map((item, index) => (
                  <Chip
                    key={`${item}-${index}`}
                    label={item}
                    onClick={() => void sendMessage(item)}
                    disabled={loading}
                    sx={{
                      maxWidth: '100%',
                      height: 'auto',
                      '& .MuiChip-label': {
                        display: 'block',
                        whiteSpace: 'normal',
                        py: 0.8,
                      },
                    }}
                  />
                ))}
              </Stack>

              <Box component="form" onSubmit={handleSubmit}>
                <Stack direction="row" spacing={1}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Posez votre question..."
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    disabled={loading}
                  />
                  <Button type="submit" variant="contained" disabled={loading} sx={{ minWidth: 52, px: 1.6 }}>
                    <SendRounded />
                  </Button>
                </Stack>
              </Box>
            </Box>
          </Stack>
        </Paper>
      )}

      <Tooltip title={open ? 'Fermer le chat' : 'Ouvrir le chat technicien'} placement="left">
        <Button
          variant="contained"
          onClick={() => setOpen((current) => !current)}
          sx={{
            minWidth: 0,
            width: { xs: 58, sm: open ? 68 : 62 },
            height: { xs: 58, sm: open ? 68 : 62 },
            borderRadius: '50%',
            boxShadow: '0 18px 36px rgba(38, 85, 145, 0.42)',
          }}
        >
          <SmartToyOutlined sx={{ fontSize: 30 }} />
        </Button>
      </Tooltip>
    </Box>
  );
};

export default FloatingChatbot;
