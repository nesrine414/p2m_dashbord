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
  id: string;
  name: string;
  location: string;
  ipAddress: string;
  status: 'online' | 'offline' | 'warning';
  temperature: number;
}

const RTUListPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | RTU['status']>('all');

  // Demo data removed. This page is now a placeholder.
  const rtus: RTU[] = [];

  const filteredRTUs = useMemo(
    () =>
      rtus.filter(
        (rtu) =>
          (statusFilter === 'all' || rtu.status === statusFilter) &&
          (rtu.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            rtu.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
            rtu.ipAddress.toLowerCase().includes(searchQuery.toLowerCase()))
      ),
    [rtus, searchQuery, statusFilter]
  );

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
