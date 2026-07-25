import React from 'react';
import { Box, Typography } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';

export default function AccessDenied() {
    return (
        <Box display="flex" justifyContent="center" alignItems="center" height="80vh" flexDirection="column" gap={2}>
            <LockIcon sx={{ fontSize: 80, color: 'error.main', filter: 'drop-shadow(0 0 10px rgba(255,82,82,0.4))' }} />
            <Typography variant="h4" sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800 }}>ACCESS_DENIED</Typography>
            <Typography variant="body1" color="text.secondary">Insufficient clearance for this sector.</Typography>
        </Box>
    );
}