import { useState, useEffect } from 'react';
import { Button, Select, MenuItem, FormControl, InputLabel, TextField, Box, Typography } from '@mui/material';

export default function RateImporter() {
    const [regions, setRegions] = useState([]);
    const [selectedRegion, setSelectedRegion] = useState('');
    const [newRegionName, setNewRegionName] = useState('');
    const [isImporting, setIsImporting] = useState(false);

    const loadRegions = async () => {
        const data = await window.api.db.getRegions();
        setRegions(data);
    };

    useEffect(() => {
        loadRegions();
    }, []);

    const handleCreateRegion = async () => {
        if (!newRegionName) return;
        const res = await window.api.db.createRegion(newRegionName);
        if (res.success) {
            setNewRegionName('');
            await loadRegions(); // Refresh dropdown
            setSelectedRegion(newRegionName); // Auto-select the new region
        }
    };

    const handleImport = async () => {
        if (!selectedRegion) {
            alert('Please select a region first!');
            return;
        }

        setIsImporting(true);
        const response = await window.api.db.importExcel(selectedRegion);
        setIsImporting(false);

        if (response.success) {
            alert(response.message);
        } else if (response.message !== 'User cancelled') {
            alert(`Import failed: ${response.error}`);
        }
    };

    return (
        <Box sx={{ p: 4, maxWidth: 500, background: 'var(--blueprint-bg-dark, #060e1a)', color: 'white', borderRadius: 2 }}>
            <Typography variant="h5" mb={3}>Market Rate Importer</Typography>

            {/* Create New Region Row */}
            <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
                <TextField
                    label="Create New Region"
                    variant="outlined"
                    size="small"
                    value={newRegionName}
                    onChange={(e) => setNewRegionName(e.target.value)}
                    fullWidth
                    sx={{ input: { color: 'white' }, label: { color: '#888' } }}
                />
                <Button variant="outlined" onClick={handleCreateRegion}>Add</Button>
            </Box>

            {/* Select Target Region */}
            <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel sx={{ color: '#888' }}>Target Region</InputLabel>
                <Select
                    value={selectedRegion}
                    label="Target Region"
                    onChange={(e) => setSelectedRegion(e.target.value)}
                    sx={{ color: 'white', '.MuiOutlinedInput-notchedOutline': { borderColor: '#555' } }}
                >
                    {regions.map((reg) => (
                        <MenuItem key={reg.id} value={reg.name}>
                            {reg.name}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            {/* Execute Import */}
            <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={handleImport}
                disabled={!selectedRegion || isImporting}
                sx={{ py: 1.5 }}
            >
                {isImporting ? 'Importing Data...' : `Import Excel to ${selectedRegion || '...'}`}
            </Button>
        </Box>
    );
}