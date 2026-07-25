import { useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, CircularProgress, Box } from "@mui/material";
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

export default function NukeDatabaseModal({ open, onClose, onConfirm }) {
    const [step, setStep] = useState(1); // 1 = first warning, 2 = second warning, 3 = loading, 4 = success
    const [loadingMessage, setLoadingMessage] = useState("Purging Master Database...");
    const [successMessage, setSuccessMessage] = useState("Database has been completely purged.");

    const handleClose = () => {
        if (step !== 3) { // Prevent close during active nuke
            setStep(1);
            onClose();
        }
    };

    const handleNuke = async () => {
        setStep(3);
        try {
            await onConfirm();
            setStep(4);
        } catch (e) {
            setStep(1);
            alert("Error during nuke: " + e.message);
        }
    };

    return (
        <Dialog 
            open={open} 
            onClose={handleClose}
            PaperProps={{
                sx: {
                    bgcolor: '#0a1424',
                    border: '1px solid #ef4444',
                    borderRadius: 3,
                    minWidth: '420px',
                    boxShadow: '0 0 20px rgba(239, 68, 68, 0.25)',
                    p: 1
                }
            }}
        >
            {step === 1 && (
                <>
                    <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: '#ef4444', fontFamily: "'JetBrains Mono', monospace", fontWeight: 'bold', fontSize: '16px' }}>
                        <WarningAmberIcon color="error" />
                        CRITICAL DATABASE WARNING
                    </DialogTitle>
                    <DialogContent>
                        <Typography sx={{ fontFamily: "'Inter', sans-serif", color: '#a0aec0', fontSize: '13px', lineHeight: 1.6 }}>
                            This will permanently delete ALL Regions, Resources, and Databook items. Active project references may be corrupted or lost.
                        </Typography>
                    </DialogContent>
                    <DialogActions sx={{ p: 2, gap: 1 }}>
                        <Button onClick={handleClose} sx={{ color: '#718096', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>CANCEL</Button>
                        <Button 
                            variant="contained" 
                            color="error" 
                            onClick={() => setStep(2)}
                            sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', bgcolor: '#ef4444', '&:hover': { bgcolor: '#dc2626' } }}
                        >
                            PROCEED
                        </Button>
                    </DialogActions>
                </>
            )}

            {step === 2 && (
                <>
                    <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: '#ef4444', fontFamily: "'JetBrains Mono', monospace", fontWeight: 'bold', fontSize: '16px' }}>
                        <DeleteForeverIcon color="error" />
                        ARE YOU ABSOLUTELY SURE?
                    </DialogTitle>
                    <DialogContent>
                        <Typography sx={{ fontFamily: "'Inter', sans-serif", color: '#a0aec0', fontSize: '13px', lineHeight: 1.6 }}>
                            This action is completely irreversible. Type nuke confirmation to proceed. Click nuke database to completely wipe everything.
                        </Typography>
                    </DialogContent>
                    <DialogActions sx={{ p: 2, gap: 1 }}>
                        <Button onClick={() => setStep(1)} sx={{ color: '#718096', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>BACK</Button>
                        <Button 
                            variant="contained" 
                            color="error" 
                            onClick={handleNuke}
                            sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', bgcolor: '#ef4444', '&:hover': { bgcolor: '#dc2626' } }}
                        >
                            OK, NUKE IT
                        </Button>
                    </DialogActions>
                </>
            )}

            {step === 3 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6, gap: 3 }}>
                    <CircularProgress color="error" size={48} />
                    <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", color: '#ef4444', fontSize: '14px', fontWeight: 'bold' }}>
                        {loadingMessage}
                    </Typography>
                </Box>
            )}

            {step === 4 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6, gap: 2.5 }}>
                    <CheckCircleOutlineIcon sx={{ fontSize: 54, color: '#10b981' }} />
                    <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", color: '#10b981', fontSize: '15px', fontWeight: 'bold' }}>
                        {successMessage}
                    </Typography>
                    <Button 
                        variant="contained" 
                        color="success" 
                        onClick={handleClose} 
                        sx={{ mt: 1, px: 4, fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } }}
                    >
                        OK
                    </Button>
                </Box>
            )}
        </Dialog>
    );
}
