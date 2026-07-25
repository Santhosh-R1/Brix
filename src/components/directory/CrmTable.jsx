import React from 'react';
import { Box, Typography, Avatar, TableRow, TableCell, Chip, Link, IconButton } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';

export default function CrmTable({ crmContacts, hasClearance, handleOpenDialog, handleDelete }) {
    return (
        <>
            {crmContacts.map((item) => (
                <TableRow key={item.id} hover sx={{ '&:hover': { bgcolor: 'rgba(59, 130, 246, 0.05)' } }}>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <Box display="flex" alignItems="center" gap={2}>
                            <Avatar sx={{ width: 28, height: 28, fontSize: '11px', bgcolor: 'primary.dark', fontFamily: "'JetBrains Mono', monospace" }}>{item.name?.charAt(0)}</Avatar>
                            <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: 'bold' }}>{item.name}</Typography>
                        </Box>
                    </TableCell>
                    <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: 'text.secondary', whiteSpace: 'nowrap' }}>{item.company}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}><Chip label={item.type} size="small" variant="outlined" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', borderRadius: 1 }} /></TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {item.phone || item.email ? (
                            <Box display="flex" flexDirection="column" gap={0.5}>
                                {item.phone && <Link href={`tel:${item.phone}`} underline="hover" color="info.main" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}><PhoneIcon sx={{ fontSize: 12 }} /> {item.phone}</Link>}
                                {item.email && <Link href={`mailto:${item.email}`} underline="hover" color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}><EmailIcon sx={{ fontSize: 12 }} /> {item.email}</Link>}
                            </Box>
                        ) : <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>-</Typography>}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        {hasClearance(3) && <IconButton size="small" color="primary" onClick={() => handleOpenDialog(item)}><EditIcon sx={{ fontSize: 18 }} /></IconButton>}
                        {hasClearance(4) && <IconButton size="small" color="error" onClick={() => handleDelete(item.id)}><DeleteIcon sx={{ fontSize: 18 }} /></IconButton>}
                    </TableCell>
                </TableRow>
            ))}
        </>
    );
}