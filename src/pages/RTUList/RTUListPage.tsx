import React, { useMemo, useState } from 'react';
import {
  Box,
  InputAdornment,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Search } from '@mui/icons-material';
import StatusBadge from '../../components/common/StatusBadge';

interface RTU {
  id: number;
  name: string;
  location: string;
  ipAddress: string;
  status: 'online' | 'offline' | 'warning';
  temperature: number;
}

const RTUListPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<'all' | RTU['status']>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const rtus = useMemo<RTU[]>(
    () => [
      {
        id: 1,
        name: 'RTU-Paris-001',
        location: 'Paris 5th',
        ipAddress: '192.168.1.10',
        status: 'online',
        temperature: 28,
      },
      {
        id: 2,
        name: 'RTU-Lyon-005',
        location: 'Lyon Center',
        ipAddress: '192.168.1.23',
        status: 'online',
        temperature: 25,
      },
      {
        id: 3,
        name: 'RTU-Marseille-003',
        location: 'Marseille West',
        ipAddress: '192.168.1.45',
        status: 'warning',
        temperature: 38,
      },
      {
        id: 4,
        name: 'RTU-Nice-002',
        location: 'Nice East',
        ipAddress: '192.168.1.67',
        status: 'offline',
        temperature: 42,
      },
    ],
    []
  );

  const filteredRTUs = rtus.filter((rtu) => {
    const matchesStatus = statusFilter === 'all' || rtu.status === statusFilter;
    const matchesSearch =
      rtu.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rtu.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom color="white">
        RTU Inventory
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Full list of RTU network equipment.
      </Typography>

      <Box className="glass-card" sx={{ p: 2, mb: 3 }}>
        <Box display="flex" gap={2}>
          <TextField
            placeholder="Search RTU..."
            variant="outlined"
            size="small"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            sx={{
              flex: 1,
              '& .MuiOutlinedInput-root': { color: 'white' },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: 'rgba(255,255,255,0.5)' }} />
                </InputAdornment>
              ),
            }}
          />
          <Select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'all' | RTU['status'])}
            size="small"
            sx={{ minWidth: 150, color: 'white' }}
          >
            <MenuItem value="all">All statuses</MenuItem>
            <MenuItem value="online">Online</MenuItem>
            <MenuItem value="offline">Offline</MenuItem>
            <MenuItem value="warning">Warning</MenuItem>
          </Select>
        </Box>
      </Box>

      <Box className="glass-card" sx={{ p: 3 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 'bold' }}>NAME</TableCell>
                <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 'bold' }}>LOCATION</TableCell>
                <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 'bold' }}>IP</TableCell>
                <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 'bold' }}>STATUS</TableCell>
                <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 'bold' }}>TEMPERATURE</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRTUs.map((rtu) => (
                <TableRow key={rtu.id} sx={{ '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)' } }}>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>{rtu.name}</TableCell>
                  <TableCell sx={{ color: 'rgba(255,255,255,0.7)' }}>{rtu.location}</TableCell>
                  <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace' }}>
                    {rtu.ipAddress}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={rtu.status} />
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ color: rtu.temperature > 40 ? '#FF3366' : 'white', fontWeight: 'bold' }}>
                      {rtu.temperature}C
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', mt: 2, display: 'block' }}>
          Total: {filteredRTUs.length} RTUs displayed
        </Typography>
      </Box>
    </Box>
  );
};

export default RTUListPage;
