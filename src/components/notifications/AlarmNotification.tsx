import React, { useEffect, useState } from 'react';
import { Snackbar, Alert, AlertTitle } from '@mui/material';

interface AlarmNotificationProps {
  alarm: any;
  onClose: () => void;
}

const AlarmNotification: React.FC<AlarmNotificationProps> = ({ alarm, onClose }) => {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (alarm.severity === 'critical') {
      // Uncomment to play a sound: new Audio('/alert.mp3').play();
    }
  }, [alarm]);

  const getSeverityColor = () => {
    switch (alarm.severity) {
      case 'critical': return 'error';
      case 'major': return 'warning';
      default: return 'info';
    }
  };

  return (
    <Snackbar
      open={open}
      autoHideDuration={10000}
      onClose={() => { setOpen(false); onClose(); }}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <Alert severity={getSeverityColor()} onClose={() => setOpen(false)}>
        <AlertTitle>🚨 Nouvelle Alarme {alarm.severity?.toUpperCase()}</AlertTitle>
        <strong>{alarm.rtuName || alarm.rtuId}</strong>: {alarm.message}
      </Alert>
    </Snackbar>
  );
};

export default AlarmNotification;
