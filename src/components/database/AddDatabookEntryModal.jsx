import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Typography, Box, TextField, Alert
} from '@mui/material';
import LibraryAddIcon from '@mui/icons-material/LibraryAdd';

export default function AddDatabookEntryModal({ open, onClose, onSave, categoryPrefix, masterBoqs, regions }) {
    const [specCode, setSpecCode] = useState('');
    const [specification, setSpecification] = useState('');
    const [rate, setRate] = useState('');
    const [unit, setUnit] = useState('cum');
    const [error, setError] = useState('');

    useEffect(() => {
        if (open) {
            setSpecCode('');
        }
    }, [open]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const trimmedCode = specCode.trim();
        const trimmedSpec = specification.trim();
        const numericRate = Number(rate);

        if (!trimmedCode || !trimmedSpec || !rate) {
            setError('Spec Code, Specification, and Rate are required.');
            return;
        }

        if (isNaN(numericRate) || numericRate < 0) {
            setError('Rate must be a positive number.');
            return;
        }

        // Check uniqueness of code
        const codeExists = (masterBoqs || []).some(b =>
            String(b.itemCode).trim().toLowerCase() === trimmedCode.toLowerCase()
        );
        if (codeExists) {
            setError(`Spec Code "${trimmedCode}" is already in use. Please enter a unique Code.`);
            return;
        }

        // Validate Spec Code matches Category prefix
        let categoryNum = '';
        if (categoryPrefix) {
            const match = categoryPrefix.match(/^([\d.]+)\./);
            if (match) {
                categoryNum = match[1];
            }
        }

        if (categoryNum) {
            const startsWithPrefix = trimmedCode === categoryNum || trimmedCode.startsWith(categoryNum + '.');
            if (!startsWithPrefix) {
                setError(`Spec Code must start with "${categoryNum}." or be exactly "${categoryNum}" to belong to the selected category.`);
                return;
            }
        }

        const resourceId = window.crypto.randomUUID();
        const ratesObj = {};
        (regions || []).forEach(r => {
            ratesObj[r.name] = numericRate;
        });

        const newResource = {
            id: resourceId,
            code: trimmedCode,
            description: trimmedSpec,
            unit: unit,
            rates: JSON.stringify(ratesObj),
            rateHistory: JSON.stringify([])
        };

        const newBoq = {
            itemCode: trimmedCode,
            description: trimmedSpec,
            unit: unit,
            overhead: 0,
            profit: 0,
            components: JSON.stringify([
                {
                    itemType: "resource",
                    itemId: resourceId,
                    qty: 1,
                    formulaStr: "1"
                }
            ])
        };

        try {
            // 1. Bulk save resources
            await window.api.db.bulkSaveResources([newResource]);

            // 2. Save master BOQ
            await window.api.db.saveMasterBoq(newBoq, null, true);

            onSave();
            handleClose();
        } catch (err) {
            setError(err.message || 'Failed to save databook entry.');
        }
    };

    const handleClose = () => {
        setSpecCode('');
        setSpecification('');
        setRate('');
        setUnit('cum');
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
                    minWidth: '450px'
                }
            }}
        >
            <form onSubmit={handleSubmit}>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
                    <LibraryAddIcon sx={{ color: '#8b5cf6' }} />
                    <Typography variant="h6" sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 'bold' }}>
                        ADD_DATABOOK_ENTRY
                    </Typography>
                </DialogTitle>

                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
                    {error && (
                        <Alert severity="error" sx={{ bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                            {error}
                        </Alert>
                    )}

                    <TextField
                        label="Spec Code"
                        variant="outlined"
                        fullWidth
                        value={specCode}
                        style={{ marginTop: '2rem' }}
                        onChange={(e) => setSpecCode(e.target.value)}
                        sx={{
                            '& label': { color: 'rgba(255, 255, 255, 0.7)', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' },
                            '& label.Mui-focused': { color: '#8b5cf6' },
                        }}
                        InputProps={{
                            sx: {
                                color: 'white',
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: '13px',
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.4)' },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#8b5cf6' }
                            }
                        }}
                    />

                    <TextField
                        label="Specification"
                        variant="outlined"
                        fullWidth
                        multiline
                        rows={3}
                        value={specification}
                        onChange={(e) => setSpecification(e.target.value)}
                        sx={{
                            '& label': { color: 'rgba(255, 255, 255, 0.7)', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' },
                            '& label.Mui-focused': { color: '#8b5cf6' },
                        }}
                        InputProps={{
                            sx: {
                                color: 'white',
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: '13px',
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.4)' },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#8b5cf6' }
                            }
                        }}
                    />

                    <Box display="flex" gap={2}>
                        <TextField
                            label="Rate (₹)"
                            type="number"
                            variant="outlined"
                            value={rate}
                            onChange={(e) => setRate(e.target.value)}
                            sx={{
                                flex: 1,
                                '& label': { color: 'rgba(255, 255, 255, 0.7)', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' },
                                '& label.Mui-focused': { color: '#8b5cf6' },
                            }}
                            InputProps={{
                                sx: {
                                    color: 'white',
                                    fontFamily: "'JetBrains Mono', monospace",
                                    fontSize: '13px',
                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.4)' },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#8b5cf6' }
                                }
                            }}
                        />

                        <TextField
                            label="Unit"
                            variant="outlined"
                            value={unit}
                            onChange={(e) => setUnit(e.target.value)}
                            sx={{
                                flex: 1,
                                '& label': { color: 'rgba(255, 255, 255, 0.7)', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' },
                                '& label.Mui-focused': { color: '#8b5cf6' },
                            }}
                            InputProps={{
                                sx: {
                                    color: 'white',
                                    fontFamily: "'JetBrains Mono', monospace",
                                    fontSize: '13px',
                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.4)' },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#8b5cf6' }
                                }
                            }}
                        />
                    </Box>
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
                        ADD_ENTRY
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
