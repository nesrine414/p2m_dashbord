import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';

interface WidgetCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  color?: string;
  gradient?: string;
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
  color = '#2196f3',
  gradient,
  trend,
}) => {
  const hasGradient = Boolean(gradient);
  const trendValue = trend ? trend.value : 0;
  const trendPrefix = trendValue >= 0 ? '+' : '';
  const trendLabel = trend ? `${trendPrefix}${trendValue}%` : '';

  return (
    <Card
      sx={{
        height: '100%',
        position: 'relative',
        borderRadius: 3,
        overflow: 'hidden',
        background: gradient ?? undefined,
        color: hasGradient ? 'white' : 'inherit',
        border: hasGradient ? '1px solid rgba(255, 255, 255, 0.18)' : undefined,
        '&::after': {
          content: '""',
          position: 'absolute',
          width: 180,
          height: 180,
          borderRadius: '50%',
          background: `${color}22`,
          top: -90,
          right: -70,
          zIndex: 0,
          pointerEvents: 'none',
        },
      }}
    >
      <CardContent sx={{ position: 'relative', zIndex: 1, p: 2.4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box sx={{ pr: 1.6 }}>
            <Typography
              variant="body2"
              color={hasGradient ? 'rgba(255, 255, 255, 0.75)' : 'text.secondary'}
              gutterBottom
              sx={{ fontWeight: 600 }}
            >
              {title}
            </Typography>
            <Typography
              variant="h3"
              component="div"
              fontWeight={700}
              sx={{ lineHeight: 1.1, color: hasGradient ? 'white' : 'inherit' }}
            >
              {value}
            </Typography>
            {subtitle && (
              <Typography
                variant="caption"
                color={hasGradient ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary'}
                mt={1.2}
                display="block"
              >
                {subtitle}
              </Typography>
            )}
            {trend && (
              <Typography
                variant="caption"
                mt={0.8}
                display="block"
                sx={{
                  fontWeight: 600,
                  color: trend.isPositive ? '#8deab4' : '#ffb3be',
                }}
              >
                Tendance : {trendLabel}
              </Typography>
            )}
          </Box>

          {icon && (
            <Box
              sx={{
                background: `linear-gradient(140deg, ${color}, rgba(255, 255, 255, 0.35))`,
                borderRadius: '16px',
                p: 1.6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 12px 24px ${color}55`,
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