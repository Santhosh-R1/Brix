import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Grid, Typography } from '@mui/material';

export default function ProfileDialog({ open, onClose, data, onChange }) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { border: '1px solid rgba(0,242,255,0.2)' } }}>
            <DialogTitle sx={{ fontFamily: "'JetBrains Mono', monospace", color: 'primary.main' }}>USER_IDENTITY_ENCLAVE</DialogTitle>
            <DialogContent dividers>
                <Grid container spacing={3} sx={{ mt: 1 }}>
                    <Grid item xs={12}>
                        <TextField fullWidth label="LEGAL NAME" value={data.name || ""} onChange={e => onChange({ ...data, name: e.target.value })} />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField fullWidth label="ACCESS IDENTIFIER" value={data.username || ""} disabled />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 3 }}>
                <Button onClick={onClose}>ABORT</Button>
                <Button variant="contained" onClick={onClose}>UPDATE_IDENTITY</Button>
            </DialogActions>
        </Dialog>
    );
}