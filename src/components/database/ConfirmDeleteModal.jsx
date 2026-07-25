import React from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, 
    Button, Typography, Box 
} from '@mui/material';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';

export default function ConfirmDeleteModal({ open, onClose, onConfirm, itemName }) {
    return (
        <Dialog 
            open={open} 
            onClose={onClose}
            PaperProps={{
                sx: {
                    bgcolor: '#1e293b', // Dark theme matching your sidebar
                    backgroundImage: 'none',
                    color: 'white',
                    borderRadius: 2,
                    border: '1px solid rgba(255,255,255,0.1)',
                    minWidth: '350px'
                }
            }}
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
                <WarningAmberRoundedIcon sx={{ color: '#ef4444' }} />
                <Typography variant="h6" sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 'bold' }}>
                    CONFIRM_DELETE
                </Typography>
            </DialogTitle>
            
            <DialogContent>
                <Typography variant="body1" sx={{ color: 'text.secondary', mb: 1 }}>
                    Are you sure you want to delete this item?
                </Typography>
                {itemName && (
                    <Typography variant="body2" sx={{ 
                        p: 1, 
                        bgcolor: 'rgba(239, 68, 68, 0.1)', 
                        color: '#ef4444', 
                        borderRadius: 1,
                        fontFamily: "'JetBrains Mono', monospace",
                        border: '1px solid rgba(239, 68, 68, 0.2)'
                    }}>
                        {itemName}
                    </Typography>
                )}
                <Typography variant="caption" sx={{ display: 'block', mt: 2, color: 'text.disabled' }}>
                    This action cannot be undone.
                </Typography>
            </DialogContent>

            <DialogActions sx={{ p: 2, pt: 0 }}>
                <Button 
                    onClick={onClose} 
                    sx={{ color: 'text.secondary', fontFamily: "'JetBrains Mono', monospace" }}
                >
                    Cancel
                </Button>
                <Button 
                    onClick={onConfirm} 
                    variant="contained" 
                    sx={{ 
                        bgcolor: '#ef4444', 
                        '&:hover': { bgcolor: '#dc2626' },
                        fontFamily: "'JetBrains Mono', monospace",
                        fontWeight: 'bold'
                    }}
                >
                    DELETE_PERMANENTLY
                </Button>
            </DialogActions>
        </Dialog>
    );
}