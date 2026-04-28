import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';

interface WidgetCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  color?: string; // Hex color for the accent
  gradient?: string; // Optional full background gradient
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const WidgetCard: React.FC<WidgetCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  color = '#007bff',
  gradient,
  trend,
}) => {
  const isFullColor = Boolean(gradient); // If gradient provided, we use full color style
  
  return (
    <Card
      sx={{
        height: '100%',
        position: 'relative',
        borderRadius: 1,
        border: 'none',
        borderTop: isFullColor ? 'none' : `3px solid ${color}`,
        background: gradient || '#ffffff',
        color: isFullColor ? '#ffffff' : '#343a40',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)',
        },
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography
              variant="h4"
              component="div"
              sx={{ 
                fontWeight: 700, 
                mb: 0.5,
                fontSize: '1.75rem',
                color: isFullColor ? '#ffffff' : '#343a40'
              }}
            >
              {value}
            </Typography>
            <Typography
              variant="body2"
              sx={{ 
                fontWeight: 500, 
                color: isFullColor ? 'rgba(255, 255, 255, 0.85)' : '#6c757d',
                textTransform: 'uppercase',
                fontSize: '0.75rem',
                letterSpacing: 0.5
              }}
            >
              {title}
            </Typography>
          </Box>
          
          {icon && (
            <Box
              sx={{
                opacity: isFullColor ? 0.3 : 1,
                color: isFullColor ? '#000000' : color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                '& .MuiSvgIcon-root': {
                  fontSize: 40,
                },
              }}
            >
              {icon}
            </Box>
          )}
        </Box>

        {(subtitle || trend) && (
          <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            {trend && (
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  px: 0.8,
                  py: 0.2,
                  borderRadius: 1,
                  bgcolor: trend.isPositive ? 'rgba(40, 167, 69, 0.15)' : 'rgba(220, 53, 69, 0.15)',
                  color: trend.isPositive ? '#28a745' : '#dc3545',
                }}
              >
                {trend.isPositive ? '↑' : '↓'} {trend.value}%
              </Typography>
            )}
            {subtitle && (
              <Typography
                variant="caption"
                sx={{ 
                  color: isFullColor ? 'rgba(255, 255, 255, 0.75)' : '#6c757d',
                  fontSize: '0.75rem'
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
        )}
      </CardContent>
      
      {isFullColor && (
        <Box
          sx={{
            py: 0.5,
            px: 2,
            bgcolor: 'rgba(0, 0, 0, 0.1)',
            textAlign: 'center',
            cursor: 'pointer',
            '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.15)' }
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 600 }}> Plus d'infos →</Typography>
        </Box>
      )}
    </Card>
  );
};

export default WidgetCard;