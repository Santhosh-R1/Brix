import React, { useState } from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, 
    Button, Typography, Box, TextField, Alert 
} from '@mui/material';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';

export default function AddCategoryModal({ open, onClose, onAddCategory, existingCategories }) {
    const [catNumber, setCatNumber] = useState('');
    const [catName, setCatName] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        const trimmedNumber = catNumber.trim();
        const trimmedName = catName.trim();

        if (!trimmedNumber || !trimmedName) {
            setError('Both Category Number and Name are required.');
            return;
        }

        // Validate number is integer or dot-separated (e.g. 9 or 9.6.9)
        if (!/^\d+(\.\d+)*$/.test(trimmedNumber)) {
            setError('Category Number must contain only digits and single dots.');
            return;
        }

        const newCategoryString = `${trimmedNumber}. ${trimmedName}`;

        // Check if category number already exists in the dropdown list
        const exists = existingCategories.some(cat => {
            const match = cat.match(/^([\d.]+)\./);
            return match && match[1] === trimmedNumber;
        });

        if (exists) {
            setError(`Category Number "${trimmedNumber}" is already in use.`);
            return;
        }

        onAddCategory(newCategoryString);
        setCatNumber('');
        setCatName('');
        onClose();
    };

    const handleClose = () => {
        setCatNumber('');
        setCatName('');
        setError('');
        onClose();
    };

    return (
        <Dialog 
            open={open} 
            onClose={handleClose}
            PaperProps={{
                sx: {
                    bgcolor: '#1e293b', 
                    backgroundImage: 'none',
                    color: 'white',
                    borderRadius: 2,
                    border: '1px solid rgba(255,255,255,0.1)',
                    minWidth: '400px'
                }
            }}
        >
            <form onSubmit={handleSubmit}>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
                    <PlaylistAddIcon sx={{ color: '#8b5cf6' }} />
                    <Typography variant="h6" sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 'bold' }}>
                        ADD_NEW_CATEGORY
                    </Typography>
                </DialogTitle>
                
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Enter the category details below. The category will be formatted as "Number. Name" (e.g. "27. Mechanical Work").
                    </Typography>

                    {error && (
                        <Alert severity="error" sx={{ bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                            {error}
                        </Alert>
                    )}

                    <TextField
                        label="Category Number (e.g. 27)"
                        variant="outlined"
                        fullWidth
                        value={catNumber}
                        onChange={(e) => setCatNumber(e.target.value)}
                        InputLabelProps={{ sx: { color: 'text.secondary', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' } }}
                        InputProps={{
                            sx: {
                                color: 'white',
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: '14px',
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.4)' },
                            }
                        }}
                    />

                    <TextField
                        label="Category Name (e.g. Mechanical Work)"
                        variant="outlined"
                        fullWidth
                        value={catName}
                        onChange={(e) => setCatName(e.target.value)}
                        InputLabelProps={{ sx: { color: 'text.secondary', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' } }}
                        InputProps={{
                            sx: {
                                color: 'white',
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: '14px',
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.4)' },
                            }
                        }}
                    />
                </DialogContent>

                <DialogActions sx={{ p: 2, pt: 1 }}>
                    <Button 
                        onClick={handleClose} 
                        sx={{ color: 'text.secondary', fontFamily: "'JetBrains Mono', monospace" }}
                    >
                        Cancel
                    </Button>
                    <Button 
                        type="submit"
                        variant="contained" 
                        sx={{ 
                            background: 'linear-gradient(90deg, #8b5cf6 0%, #7c3aed 100%)',
                            '&:hover': { background: 'linear-gradient(90deg, #7c3aed 0%, #6d28d9 100%)' },
                            fontFamily: "'JetBrains Mono', monospace",
                            fontWeight: 'bold'
                        }}
                    >
                        ADD_CATEGORY
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
