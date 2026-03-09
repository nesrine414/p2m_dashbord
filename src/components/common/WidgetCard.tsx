import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';

interface WidgetCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  color?: string;
}

const WidgetCard: React.FC<WidgetCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  color = '#2196f3',
}) => {
  return (
    <Card sx={{ height: '100%', position: 'relative' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h3" component="div" fontWeight="bold">
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary" mt={1}>
                {subtitle}
              </Typography>
            )}
          </Box>
          
          {icon && (
            <Box
              sx={{
                backgroundColor: color,
                borderRadius: '12px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {icon}
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default WidgetCard;