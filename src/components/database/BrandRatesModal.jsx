import { useState, useEffect } from "react";
import {
    Box, Button, Typography, Paper, TextField, MenuItem, Table,
    TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton,
    InputAdornment, Dialog, DialogTitle, DialogContent, DialogActions, Chip,
    InputBase, alpha, useTheme, CircularProgress, Snackbar, Alert
} from "@mui/material";
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import HistoryIcon from '@mui/icons-material/History';
import EditIcon from '@mui/icons-material/Edit';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

const pythonApi = import.meta.env.VITE_PYTHON_API_URL || "http://localhost:8000";

const getCurrentMonthKey = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
};

export default function BrandRatesModal({ open, onClose, resource, regions, selectedRegion, updateResourceRate }) {
    const theme = useTheme();

    const [selectedMonthYear, setSelectedMonthYear] = useState("");
    const [tempBrandRates, setTempBrandRates] = useState([]);
    const [brandSearchTerm, setBrandSearchTerm] = useState("");
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiError, setAiError] = useState(null);

    const handleFetchAiSuggestions = async () => {
        setIsAiLoading(true);
        setAiError(null);
        try {
            const res = await fetch(`${pythonApi}/api/ml/ai-brand-suggestions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    resource: resource.description,
                    region: selectedRegion || "Trivandrum",
                    unit: resource.unit || "nos"
                })
            });
            const data = await res.json();
            if (data.success && data.suggestions && Array.isArray(data.suggestions)) {
                const newBrandRates = [...tempBrandRates];
                
                data.suggestions.forEach(suggestion => {
                    const existingIdx = newBrandRates.findIndex(br => br.brand && br.brand.toLowerCase() === suggestion.brand.toLowerCase());
                    if (existingIdx !== -1) {
                        newBrandRates[existingIdx][selectedRegion] = suggestion.price;
                    } else {
                        const newRow = { brand: suggestion.brand, [selectedRegion]: suggestion.price };
                        regions.forEach(r => { 
                            if (r.name !== selectedRegion) newRow[r.name] = ""; 
                        });
                        newBrandRates.push(newRow);
                    }
                });
                setTempBrandRates(newBrandRates);
            } else {
                setAiError(data.error || "Failed to fetch suggestions");
            }
        } catch (error) {
            console.error("AI Fetch Error:", error);
            setAiError(error.message);
        } finally {
            setIsAiLoading(false);
        }
    };

    useEffect(() => {
        if (open && resource) {
            const ratesObj = resource.rates || {};
            const history = (ratesObj.brandRatesHistory && typeof ratesObj.brandRatesHistory === 'object')
                ? ratesObj.brandRatesHistory
                : {};
            const currentKey = getCurrentMonthKey();
            const currentMonthData = Array.isArray(history[currentKey]) ? history[currentKey] : [];
            setSelectedMonthYear(currentKey);
            setTempBrandRates(JSON.parse(JSON.stringify(currentMonthData)));
            setBrandSearchTerm("");
        }
    }, [open, resource]);

    if (!resource) return null;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="lg"
            fullWidth
            PaperProps={{
                sx: {
                    bgcolor: 'background.default',
                    backgroundImage: 'none',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2
                }
            }}
        >
            {/* DIALOG HEADER */}
            <DialogTitle sx={{
                fontFamily: "'JetBrains Mono', monospace",
                borderBottom: '1px solid',
                borderColor: 'divider',
                pb: 2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 2
            }}>
                <Box display="flex" alignItems="center" gap={1.5}>
                    <EditIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                    <Typography variant="h6" component="span" sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 'bold', fontSize: '15px' }}>
                        BRAND_RATES_EDITOR
                    </Typography>
                    {selectedMonthYear !== getCurrentMonthKey() && (
                        <Chip
                            icon={<HistoryIcon sx={{ fontSize: '14px !important' }} />}
                            label="HISTORY VIEW · READ-ONLY"
                            size="small"
                            color="warning"
                            variant="outlined"
                            sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px' }}
                        />
                    )}
                </Box>
                <Box display="flex" alignItems="center" gap={1.5}>
                    {/* MONTH / YEAR SELECTORS */}
                    <Box display="flex" alignItems="center" gap={1} sx={{
                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                        border: '1px solid',
                        borderColor: alpha(theme.palette.primary.main, 0.25),
                        borderRadius: 1.5,
                        px: 1.5,
                        py: 0.5
                    }}>
                        <CalendarMonthIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                        <TextField
                            select
                            size="small"
                            variant="standard"
                            label=""
                            value={selectedMonthYear ? Number(selectedMonthYear.split('-')[1]) : new Date().getMonth() + 1}
                            onChange={(e) => {
                                const year = selectedMonthYear ? selectedMonthYear.split('-')[0] : String(new Date().getFullYear());
                                const newKey = `${year}-${String(e.target.value).padStart(2, '0')}`;
                                setSelectedMonthYear(newKey);
                                const history = resource.rates?.brandRatesHistory || {};
                                setTempBrandRates(JSON.parse(JSON.stringify(Array.isArray(history[newKey]) ? history[newKey] : [])));
                            }}
                            InputProps={{ disableUnderline: true, sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: 'text.primary', minWidth: 90 } }}
                            sx={{ '& .MuiSelect-select': { py: 0 } }}
                        >
                            {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m, i) => (
                                <MenuItem key={i + 1} value={i + 1} sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>{m}</MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            select
                            size="small"
                            variant="standard"
                            label=""
                            value={selectedMonthYear ? Number(selectedMonthYear.split('-')[0]) : new Date().getFullYear()}
                            onChange={(e) => {
                                const month = selectedMonthYear ? selectedMonthYear.split('-')[1] : String(new Date().getMonth() + 1).padStart(2, '0');
                                const newKey = `${e.target.value}-${month}`;
                                setSelectedMonthYear(newKey);
                                const history = resource.rates?.brandRatesHistory || {};
                                setTempBrandRates(JSON.parse(JSON.stringify(Array.isArray(history[newKey]) ? history[newKey] : [])));
                            }}
                            InputProps={{ disableUnderline: true, sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: 'text.primary', minWidth: 65 } }}
                            sx={{ '& .MuiSelect-select': { py: 0 } }}
                        >
                            {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).map(y => (
                                <MenuItem key={y} value={y} sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>{y}</MenuItem>
                            ))}
                        </TextField>
                    </Box>
                    <IconButton onClick={onClose} color="inherit" size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent sx={{ p: 3 }}>
                {/* RESOURCE INFO */}
                <Box sx={{ mb: 2.5, p: 2, bgcolor: alpha(theme.palette.primary.main, 0.06), borderRadius: 1.5, border: '1px solid', borderColor: alpha(theme.palette.primary.main, 0.15) }}>
                    <Typography variant="subtitle1" fontWeight="bold" color="primary.main" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px' }}>
                        {resource.description}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.6, fontFamily: "'JetBrains Mono', monospace" }}>
                        CODE: {resource.code || 'N/A'} &nbsp;|&nbsp; UNIT: {resource.unit || 'nos'}
                        &nbsp;|&nbsp; PERIOD: {selectedMonthYear || '—'}
                        {selectedMonthYear !== getCurrentMonthKey() && (
                            <span style={{ color: theme.palette.warning.main, marginLeft: 8 }}>⚠ Historical data is read-only</span>
                        )}
                    </Typography>
                </Box>

                {/* SEARCH BAR FOR BRANDS */}
                <Box sx={{ mb: 2 }}>
                    <TextField
                        fullWidth
                        placeholder="Search Brands..."
                        size="small"
                        value={brandSearchTerm}
                        onChange={(e) => setBrandSearchTerm(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                                </InputAdornment>
                            )
                        }}
                    />
                </Box>

                {/* BRAND RATES TABLE */}
                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', bgcolor: alpha(theme.palette.background.paper, 0.2), borderRadius: 2, overflowX: 'auto', maxHeight: 360 }}>
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ bgcolor: alpha(theme.palette.background.paper, 0.95), color: 'text.secondary', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap', minWidth: 160, fontWeight: 'bold' }}>BRAND</TableCell>
                                <TableCell sx={{ bgcolor: alpha(theme.palette.background.paper, 0.95), color: 'primary.main', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap', minWidth: 110, fontWeight: 'bold' }}>
                                    PRICE ({selectedRegion ? selectedRegion.toUpperCase() : 'N/A'})
                                </TableCell>
                                {selectedMonthYear === getCurrentMonthKey() && (
                                    <TableCell align="right" sx={{ bgcolor: alpha(theme.palette.background.paper, 0.95), width: 60 }} />
                                )}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {(() => {
                                const filteredBrandRates = tempBrandRates.filter(row =>
                                    (row.brand || "").toLowerCase().includes(brandSearchTerm.toLowerCase())
                                );

                                if (filteredBrandRates.length === 0) {
                                    return (
                                        <TableRow>
                                            <TableCell colSpan={selectedMonthYear === getCurrentMonthKey() ? 3 : 2} align="center" sx={{ py: 4, color: 'text.secondary', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>
                                                {brandSearchTerm ? "NO BRANDS MATCHED THE SEARCH." : (selectedMonthYear === getCurrentMonthKey()
                                                    ? "NO BRAND RATES REGISTERED. CLICK '+ ADD BRAND' BELOW."
                                                    : `NO BRAND RATES RECORDED FOR ${selectedMonthYear}.`)
                                                }
                                            </TableCell>
                                        </TableRow>
                                    );
                                }

                                return filteredBrandRates.map((row) => {
                                    const actualIndex = tempBrandRates.indexOf(row);
                                    const isCurrentMonth = selectedMonthYear === getCurrentMonthKey();
                                    const inputSx = {
                                        fontFamily: "'JetBrains Mono', monospace",
                                        fontSize: '12px',
                                        color: 'text.primary',
                                        width: '100%',
                                        padding: '4px 8px',
                                        borderRadius: '6px',
                                        border: '1px solid',
                                        borderColor: isCurrentMonth
                                            ? alpha(theme.palette.common.white, 0.12)
                                            : alpha(theme.palette.warning.main, 0.15),
                                        bgcolor: isCurrentMonth
                                            ? alpha(theme.palette.common.white, 0.02)
                                            : alpha(theme.palette.warning.main, 0.03),
                                    };
                                    return (
                                        <TableRow key={actualIndex} sx={{ '& td': { borderBottom: '1px solid rgba(255,255,255,0.05)' } }}>
                                            <TableCell>
                                                <InputBase
                                                    value={row.brand || ""}
                                                    placeholder="Brand Name..."
                                                    disabled={!isCurrentMonth}
                                                    onChange={(e) => {
                                                        const updated = [...tempBrandRates];
                                                        updated[actualIndex] = { ...updated[actualIndex], brand: e.target.value };
                                                        setTempBrandRates(updated);
                                                    }}
                                                    sx={inputSx}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <InputBase
                                                    type="number"
                                                    value={row[selectedRegion] !== undefined ? row[selectedRegion] : ""}
                                                    placeholder="0"
                                                    disabled={!isCurrentMonth}
                                                    onChange={(e) => {
                                                        const updated = [...tempBrandRates];
                                                        updated[actualIndex] = { ...updated[actualIndex], [selectedRegion]: e.target.value === "" ? "" : Number(e.target.value) };
                                                        setTempBrandRates(updated);
                                                    }}
                                                    sx={inputSx}
                                                />
                                            </TableCell>
                                            {isCurrentMonth && (
                                                <TableCell align="right" sx={{ p: '2px 8px' }}>
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() => {
                                                            const updated = tempBrandRates.filter((_, idx) => idx !== actualIndex);
                                                            setTempBrandRates(updated);
                                                        }}
                                                        sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    );
                                });
                            })()}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* ADD BRAND & AI SUGGESTIONS BUTTONS — only current month */}
                {selectedMonthYear === getCurrentMonthKey() && (
                    <Box display="flex" gap={2} mt={2}>
                        <Button
                            variant="outlined"
                            color="primary"
                            startIcon={<AddCircleOutlineIcon />}
                            onClick={() => {
                                const newRow = { brand: "" };
                                regions.forEach(r => { newRow[r.name] = ""; });
                                setTempBrandRates([...tempBrandRates, newRow]);
                            }}
                            sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}
                        >
                            + ADD BRAND
                        </Button>
                        <Button
                            variant="outlined"
                            disabled={isAiLoading}
                            startIcon={isAiLoading ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
                            onClick={handleFetchAiSuggestions}
                            sx={{ 
                                fontFamily: "'JetBrains Mono', monospace", 
                                fontSize: '12px',
                                color: '#00e5ff',
                                borderColor: 'rgba(0, 229, 255, 0.5)',
                                background: 'rgba(0, 229, 255, 0.08)',
                                transition: 'all 0.3s ease',
                                textShadow: '0 0 5px rgba(0, 229, 255, 0.3)',
                                '&:hover': {
                                    background: 'rgba(0, 229, 255, 0.2)',
                                    borderColor: '#00e5ff',
                                    boxShadow: '0 0 15px rgba(0,229,255,0.4)',
                                    transform: 'translateY(-1px)'
                                }
                            }}
                        >
                            {isAiLoading ? "FETCHING SUGGESTIONS..." : "AI SUGGESTIONS"}
                        </Button>
                    </Box>
                )}
            </DialogContent>

            <Snackbar open={!!aiError} autoHideDuration={6000} onClose={() => setAiError(null)}>
                <Alert onClose={() => setAiError(null)} severity="error" sx={{ width: '100%', fontFamily: "'JetBrains Mono', monospace" }}>
                    {aiError}
                </Alert>
            </Snackbar>

            <DialogActions sx={{ p: 3, borderTop: '1px solid', borderColor: 'divider', gap: 1 }}>
                <Button
                    onClick={onClose}
                    sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}
                >
                    CLOSE
                </Button>
                {selectedMonthYear === getCurrentMonthKey() && (
                    <Button
                        variant="contained"
                        color="success"
                        onClick={async () => {
                            const currentKey = getCurrentMonthKey();
                            const cleanedBrandRates = tempBrandRates.filter(r => String(r.brand || '').trim() !== '');
                            const existingHistory = (resource.rates?.brandRatesHistory && typeof resource.rates.brandRatesHistory === 'object')
                                ? resource.rates.brandRatesHistory
                                : {};
                            const updatedHistory = { ...existingHistory, [currentKey]: cleanedBrandRates };
                            const updatedRates = { ...resource.rates, brandRatesHistory: updatedHistory };
                            await updateResourceRate(resource.id, 'rates', updatedRates);
                            onClose();
                        }}
                        sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', boxShadow: 'none' }}
                    >
                        SAVE_CHANGES
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}
