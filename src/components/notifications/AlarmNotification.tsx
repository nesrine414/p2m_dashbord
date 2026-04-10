import React, { useEffect, useState } from 'react';
import { Alert, AlertTitle, Snackbar } from '@mui/material';
import { BackendAlarm } from '../../services/api';

interface AlarmNotificationProps {
  alarm: BackendAlarm;
  onClose: () => void;
}

const AlarmNotification: React.FC<AlarmNotificationProps> = ({ alarm, onClose }) => {
  const [open, setOpen] = useState(true);

  const occurredAtLabel = (() => {
    const date = new Date(alarm.occurredAt);
    if (Number.isNaN(date.getTime())) {
      return 'maintenant';
    }
    return date.toLocaleTimeString();
  })();

  useEffect(() => {
    if (alarm.severity === 'critical') {
      // Uncomment to play a sound: new Audio('/alert.mp3').play();
    }
  }, [alarm]);

  useEffect(() => {
    setOpen(true);
  }, [alarm.id]);

  const handleClose = () => {
    setOpen(false);
    onClose();
  };

  const getSeverityColor = () => {
    switch (alarm.severity) {
      case 'critical':
        return 'error';
      case 'major':
        return 'warning';
      default:
        return 'info';
    }
  };

  const severityLabel =
    alarm.severity === 'critical' ? 'CRITIQUE' : alarm.severity === 'major' ? 'MAJEURE' : 'MINEURE';

  return (
    <Snackbar
      open={open}
      autoHideDuration={10000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <Alert severity={getSeverityColor()} onClose={handleClose}>
        <AlertTitle>Nouvelle alarme {severityLabel}</AlertTitle>
        <strong>{alarm.rtuName || alarm.rtuId}</strong>: {alarm.message} ({occurredAtLabel})
      </Alert>
    </Snackbar>
  );
};

export default AlarmNotification;
