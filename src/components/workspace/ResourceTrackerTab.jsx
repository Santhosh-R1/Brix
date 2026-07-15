import React, { useState, useMemo, useEffect } from 'react';
import {
    Box, Paper, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Switch, FormControlLabel, Select, MenuItem, TextField, Button, useTheme,
    Chip, Tooltip, Menu, CircularProgress, Popover, Autocomplete
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { useQueryClient } from '@tanstack/react-query';
import { getResourceTrackerTabStyles, getNativeStyles } from './ResourceTrackerTab.styles';
import { tableInputActiveStyle } from '../../styles';
import { getResourceRate } from '../../engines/calculationEngine';
import { useSettings } from '../../context/SettingsContext';
import { exportResourceTrackerPdf } from '../../utils/exportPdf';

const getCurrentMonthKey = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
};

export default function ResourceTrackerTab({ project, renderedProjectBoq, resources, regions = [], updateProject, masterBoqs = [], togglePriceLock }) {
    const theme = useTheme();
    const styles = getResourceTrackerTabStyles(theme);
    const nativeStyles = getNativeStyles(tableInputActiveStyle);
    const { formatCurrency } = useSettings();

    const trackingMode = project?.resourceTrackingMode || 'manual';
    const queryClient = useQueryClient();

    const [futurePredictions, setFuturePredictions] = useState({});
    const [isPredicting, setIsPredicting] = useState(false);
    const [executionDate, setExecutionDate] = useState("");
    const [syncStatus, setSyncStatus] = useState("idle");

    const pendingActuals = React.useRef(null);
    const saveTimeout = React.useRef(null);

    const getLatestActuals = () => {
        if (pendingActuals.current) return { ...pendingActuals.current };
        let currentActuals = {};
        if (typeof project?.actualResources === 'string') {
            try { currentActuals = JSON.parse(project.actualResources); } catch { }
        } else if (project?.actualResources) {
            currentActuals = { ...project.actualResources };
        }
        return currentActuals;
    };

    const queueActualsUpdate = (newActuals) => {
        pendingActuals.current = newActuals;
        if (saveTimeout.current) clearTimeout(saveTimeout.current);
        saveTimeout.current = setTimeout(() => {
            updateProject("actualResources", pendingActuals.current);
        }, 300);
    };

    // Load initial from DB
    useEffect(() => {
        if (!executionDate && project?.actualResources) {
             const parsed = getLatestActuals();
             if (parsed && parsed.executionDate) {
                 setExecutionDate(parsed.executionDate);
             }
        }
    }, [project?.actualResources, executionDate]);

    const handleExecutionDateChange = async (val) => {
        setExecutionDate(val);
        const currentActuals = getLatestActuals();
        currentActuals.executionDate = val;
        queueActualsUpdate(currentActuals);
    };

    useEffect(() => {
        const fetchPredictions = async () => {
            if (!executionDate) {
                setFuturePredictions({});
                return;
            }
            const [year, month] = executionDate.split('-');
            setIsPredicting(true);
            try {
                const baseUrl = import.meta.env.VITE_PYTHON_API_URL || 'http://127.0.0.1:8000';
                const url = `${baseUrl}/api/ml/future-predictions?region=${encodeURIComponent(project?.region || "")}&target_year=${year}&target_month=${month}`;
                const res = await fetch(url);
                const data = await res.json();
                if (data.success && data.predictions) {
                    setFuturePredictions(data.predictions);
                } else {
                    setFuturePredictions({});
                }
            } catch (err) {
                console.error("Future prediction failed", err);
            } finally {
                setIsPredicting(false);
            }
        };
        fetchPredictions();
    }, [executionDate, project?.region]);

    const toggleMode = async () => {
        await updateProject("resourceTrackingMode", trackingMode === 'manual' ? 'auto' : 'manual');
    };

    // Safely parse daily logs to ensure we don't try to loop over a string
    const safeDailyLogs = useMemo(() => {
        if (!project?.dailyLogs) return [];
        if (typeof project.dailyLogs === 'string') {
            try { return JSON.parse(project.dailyLogs); } catch { return []; }
        }
        return project.dailyLogs;
    }, [project?.dailyLogs]);

    const autoActuals = useMemo(() => {
        const totals = {};
        safeDailyLogs.forEach(log => {
            if (!log.resourceId) return; // Skip invalid logs
            const key = `${log.phase || 'General'}_${log.resourceId}`;
            totals[key] = (totals[key] || 0) + Number(log.qty || 0);
        });
        return totals;
    }, [safeDailyLogs]);

    // Parse actual resources and selected brands from actualResources JSON string
    const { manualActuals, selectedBrands, customRates } = useMemo(() => {
        let actuals = {};
        let brands = {};
        let rates = {};
        if (typeof project?.actualResources === 'string') {
            try {
                const parsed = JSON.parse(project.actualResources);
                Object.entries(parsed).forEach(([k, v]) => {
                    if (k.startsWith('brand_')) {
                        brands[k.substring(6)] = v;
                    } else if (k.startsWith('rate_')) {
                        rates[k.substring(5)] = v;
                    } else {
                        actuals[k] = v;
                    }
                });
            } catch { }
        } else if (project?.actualResources) {
            Object.entries(project.actualResources).forEach(([k, v]) => {
                if (k.startsWith('brand_')) {
                    brands[k.substring(6)] = v;
                } else if (k.startsWith('rate_')) {
                    rates[k.substring(5)] = v;
                } else {
                    actuals[k] = v;
                }
            });
        }
        return { manualActuals: actuals, selectedBrands: brands, customRates: rates };
    }, [project?.actualResources]);

    const resourceTracker = useMemo(() => {
        const tracker = {};
        const masterBoqCodes = new Set((masterBoqs || []).map(b => b.itemCode).filter(Boolean));

        // Pass 1: Add all estimated resources from the BOQ recipes
        renderedProjectBoq.forEach(item => {
            const phase = item.phase || "General";
            if (!tracker[phase]) tracker[phase] = {};

            if (item.masterBoq && item.masterBoq.components) {
                const components = typeof item.masterBoq.components === 'string'
                    ? JSON.parse(item.masterBoq.components)
                    : item.masterBoq.components;

                components.forEach(comp => {
                    if (comp.itemType === 'resource') {
                        const resId = comp.itemId;
                        const resourceData = resources.find(r => r.id === resId);

                        if (resourceData && !masterBoqCodes.has(resourceData.code)) {
                            const ohPercent = Number(item.masterBoq.overhead || 0) / 100;
                            const profitPercent = Number(item.masterBoq.profit || 0) / 100;
                            const markupMultiplier = 1 + ohPercent + profitPercent;
                            const totalRequired = Number(comp.qty) * markupMultiplier * Number(item.computedQty || 0);
                            if (!tracker[phase][resId]) {
                                tracker[phase][resId] = {
                                    code: resourceData.code,
                                    description: resourceData.description,
                                    unit: resourceData.unit,
                                    estimatedQty: 0,
                                    actualQty: trackingMode === 'auto' ? (autoActuals[`${phase}_${resId}`] || 0) : (manualActuals[`${phase}_${resId}`] || 0),
                                    resourceData: resourceData
                                };
                            }
                            tracker[phase][resId].estimatedQty += totalRequired;
                        }
                    }
                });
            }
        });

        safeDailyLogs.forEach(log => {
            if (!log.resourceId) return;
            const phase = log.phase || "General";
            const resId = log.resourceId;
            if (!tracker[phase]) tracker[phase] = {};

            if (!tracker[phase][resId]) {
                const resourceData = resources.find(r => r.id === resId);
                if (resourceData && !masterBoqCodes.has(resourceData.code)) {
                    tracker[phase][resId] = {
                        code: resourceData.code,
                        description: resourceData.description,
                        unit: resourceData.unit,
                        estimatedQty: 0, 
                        actualQty: trackingMode === 'auto' ? (autoActuals[`${phase}_${resId}`] || 0) : (manualActuals[`${phase}_${resId}`] || 0),
                        resourceData: resourceData
                    };
                }
            }
        });

        return tracker;
    }, [renderedProjectBoq, resources, manualActuals, trackingMode, autoActuals, safeDailyLogs, masterBoqs]);

    const updateActualResource = async (phase, resourceId, val) => {
        if (trackingMode === 'auto') return;

        const currentActuals = getLatestActuals();
        currentActuals[`${phase}_${resourceId}`] = Number(val);
        queueActualsUpdate(currentActuals);
    };

    const updateGlobalBrandRate = async (resourceId, brandName, rateVal) => {
        try {
            if (!brandName || brandName.toLowerCase() === "general") return;
            const resource = resources.find(r => String(r.id) === String(resourceId));
            if (!resource) return;

            let currentRates = {};
            if (typeof resource.rates === 'string') {
                try { currentRates = JSON.parse(resource.rates); } catch { }
            } else if (resource.rates) {
                currentRates = { ...resource.rates };
            }
            let activeRegion = project?.region || "";
            if (!activeRegion && regions && regions.length > 0) {
                activeRegion = regions[0].name || "";
            }
            if (!activeRegion) return;

            const currentKey = getCurrentMonthKey();
            const history = (currentRates.brandRatesHistory && typeof currentRates.brandRatesHistory === 'object')
                ? { ...currentRates.brandRatesHistory }
                : {};
            
            let currentMonthData = Array.isArray(history[currentKey]) ? [...history[currentKey]] : [];
            
            const brandSearchName = String(brandName || '').trim().toLowerCase();
            const existingIndex = currentMonthData.findIndex(r => String(r.brand || '').trim().toLowerCase() === brandSearchName);
            
            if (existingIndex >= 0) {
                currentMonthData[existingIndex] = { ...currentMonthData[existingIndex], [activeRegion]: Number(rateVal) };
            } else {
                currentMonthData.push({ brand: brandName, [activeRegion]: Number(rateVal) });
            }
            
            history[currentKey] = currentMonthData;
            currentRates.brandRatesHistory = history;

            resource.rates = currentRates; // Optimistic update

            await window.api.db.updateResource(resourceId, 'rates', JSON.stringify(currentRates));
        } catch (e) {
            console.error("Failed to update global rate", e);
        }
    };

    const updateSelectedBrand = async (phase, resourceId, brandName) => {
        const currentActuals = getLatestActuals();
        if (brandName) {
            currentActuals[`brand_${phase}_${resourceId}`] = brandName;
        } else {
            delete currentActuals[`brand_${phase}_${resourceId}`];
        }
        queueActualsUpdate(currentActuals);
    };

    const updateCustomRate = async (phase, resourceId, val) => {
        const currentActuals = getLatestActuals();

        if (val === null || val === "") {
            delete currentActuals[`rate_${phase}_${resourceId}`];
        } else {
            const numericVal = Number(val);
            currentActuals[`rate_${phase}_${resourceId}`] = numericVal;
        }
        queueActualsUpdate(currentActuals);
    };

    const syncAllRatesToGlobalDB = async () => {
        const currentActuals = getLatestActuals();

        const ratesToSync = {};
        Object.keys(currentActuals).forEach(key => {
            if (key.startsWith('brand_')) {
                const parts = key.split('_');
                const resId = parts.slice(2).join('_');
                if (!ratesToSync[resId]) ratesToSync[resId] = {};
                ratesToSync[resId].brand = currentActuals[key];
            }
            if (key.startsWith('rate_')) {
                const parts = key.split('_');
                const resId = parts.slice(2).join('_');
                if (!ratesToSync[resId]) ratesToSync[resId] = {};
                ratesToSync[resId].rate = currentActuals[key];
            }
        });

        const syncPromises = [];
        for (const resId of Object.keys(ratesToSync)) {
            const data = ratesToSync[resId];
            if (data.brand) {
                let rateToSync = data.rate;
                if (rateToSync === undefined) {
                    const resource = resources.find(r => String(r.id) === String(resId));
                    let activeRegion = project?.region || "";
                    if (!activeRegion && regions && regions.length > 0) activeRegion = regions[0].name || "";
                    rateToSync = getResourceRate(resource, activeRegion) || 0;
                }
                syncPromises.push(updateGlobalBrandRate(resId, data.brand, rateToSync));
            }
        }
        
        // Instant visual feedback for the user
        setSyncStatus("success");
        setTimeout(() => setSyncStatus("idle"), 2000);

        // Process all database operations asynchronously in the background so it doesn't freeze the UI
        if (syncPromises.length > 0) {
            Promise.all(syncPromises).then(() => {
                queryClient.invalidateQueries(['resources']); 
            }).catch(e => console.error("Background sync failed", e));
        }
    };
    const getResourceBrands = (resource) => {
        if (!resource || !resource.rates) return [];
        let ratesObj = resource.rates;
        if (typeof ratesObj === 'string') {
            try { ratesObj = JSON.parse(ratesObj); } catch { return []; }
        }
        const history = ratesObj.brandRatesHistory || {};
        const allBrands = new Set();
        Object.values(history).forEach(monthData => {
            if (Array.isArray(monthData)) {
                monthData.forEach(item => {
                    if (item.brand) allBrands.add(item.brand);
                });
            }
        });
        return Array.from(allBrands);
    };

    const getSelectedRate = (resource, brandName, regionName) => {
        if (!resource) return 0;
        let ratesObj = resource.rates;
        if (typeof ratesObj === 'string') {
            try { ratesObj = JSON.parse(ratesObj); } catch { return 0; }
        }

        if (brandName) {
            const history = ratesObj.brandRatesHistory || {};
            const sortedMonths = Object.keys(history).sort().reverse();
            for (const month of sortedMonths) {
                const monthData = history[month];
                if (Array.isArray(monthData)) {
                    const brandData = monthData.find(b => b.brand === brandName);
                    if (brandData) {
                        if (regionName && brandData[regionName] !== undefined && brandData[regionName] !== "") {
                            const rate = Number(brandData[regionName]);
                            if (rate > 0) return rate;
                        }
                        const availableBrandRates = Object.entries(brandData)
                            .filter(([k, v]) => k !== 'brand' && !isNaN(Number(v)) && Number(v) > 0)
                            .map(([k, v]) => Number(v));
                        if (availableBrandRates.length > 0) return availableBrandRates[0];
                    }
                }
            }
        }

        return getResourceRate(resource, regionName);
    };

    if (Object.keys(resourceTracker).length === 0) {
        return (
            <Paper sx={styles.noResourcesPaper}>
                <Typography color="text.secondary" sx={styles.noResourcesText}>
                    No resources found. Add Databook Items to the BOQ or submit Daily Logs first.
                </Typography>
            </Paper>
        );
    }

    const RateOverrideInput = ({ phase, resId, selectedBrand, baseRate, generalRate, activeRegion, allBrandRates = [], customRate, onSave, onBrandSelect, nativeStyles, prediction, isPredicting }) => {
        const [localVal, setLocalVal] = useState(customRate !== undefined ? customRate : baseRate);
        const [anchorEl, setAnchorEl] = useState(null);
        const containerRef = React.useRef(null);

        React.useEffect(() => {
            setLocalVal(customRate !== undefined ? customRate : baseRate);
        }, [customRate, baseRate]);

        const handleBlur = (e) => {
            // Ignore blur if clicking the prediction popup (which should be within containerRef)
            if (e.relatedTarget && containerRef.current && containerRef.current.contains(e.relatedTarget)) {
                return;
            }
            const numVal = Number(localVal);
            if (localVal === "" || numVal === baseRate) {
                onSave(phase, resId, null);
                if (localVal !== "") setLocalVal(baseRate); 
            } else {
                onSave(phase, resId, numVal);
            }
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Enter') {
                e.target.blur();
                setAnchorEl(null);
            }
        };

        const applyPrediction = (val, brandName = null) => {
            setLocalVal(val);
            onSave(phase, resId, val);
            if (brandName && onBrandSelect) {
                onBrandSelect(phase, resId, brandName);
            }
            setAnchorEl(null);
        };

        return (
            <Box position="relative" display="inline-block" ref={containerRef}>
                <input
                    type="number"
                    value={localVal}
                    onChange={(e) => setLocalVal(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    style={{ ...nativeStyles.actualQtyInput, paddingRight: !isPredicting ? '24px' : '4px' }}
                />
                {isPredicting && <CircularProgress size={12} sx={{ position: 'absolute', right: 5, top: '50%', marginTop: '-6px', color: '#00e5ff' }} />}
                {!isPredicting && (
                    <Box 
                        onClick={() => setAnchorEl(containerRef.current)}
                        sx={{ 
                            position: 'absolute', 
                            right: 0, 
                            top: 0, 
                            bottom: 0, 
                            display: 'flex', 
                            alignItems: 'center', 
                            px: 0.25, 
                            cursor: 'pointer',
                            color: '#00e5ff',
                            bgcolor: 'rgba(0, 229, 255, 0.05)',
                            borderLeft: '1px solid rgba(0, 229, 255, 0.2)',
                            '&:hover': { bgcolor: 'rgba(0, 229, 255, 0.2)' }
                        }}
                    >
                        <ArrowDropDownIcon fontSize="small" />
                    </Box>
                )}
                <Popover
                        open={Boolean(anchorEl)}
                        anchorEl={anchorEl}
                        onClose={() => setAnchorEl(null)}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                        PaperProps={{
                            sx: { 
                                bgcolor: '#0f172a', 
                                border: '1px solid rgba(255,255,255,0.1)', 
                                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                                borderRadius: 2,
                                p: 2.5,
                                minWidth: 340,
                                fontFamily: "'JetBrains Mono', monospace"
                            }
                        }}
                    >
                        <Box display="flex" flexDirection="column" gap={2}>
                            <Box>
                                <Typography sx={{ color: 'text.secondary', fontWeight: 'bold', fontSize: '0.75rem', fontFamily: "'JetBrains Mono', monospace", mb: 1.5, letterSpacing: 1 }}>
                                    MARKET DATA
                                </Typography>
                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Typography sx={{ color: '#fff', fontSize: '0.85rem', fontFamily: "'JetBrains Mono', monospace" }}>
                                        General Rate {activeRegion}
                                    </Typography>
                                    <Box display="flex" alignItems="center" gap={1.5}>
                                        <Typography sx={{ color: '#fff', fontSize: '0.85rem', fontWeight: 'bold', fontFamily: "'JetBrains Mono', monospace" }}>
                                            ₹ {Number(generalRate || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </Typography>
                                        <Button 
                                            variant="outlined" 
                                            size="small" 
                                            onClick={() => applyPrediction(generalRate || 0, 'General')}
                                            sx={{ 
                                                color: '#fff', 
                                                borderColor: 'rgba(255, 255, 255, 0.3)',
                                                fontFamily: "'JetBrains Mono', monospace",
                                                fontSize: '0.7rem',
                                                p: '2px 8px',
                                                minWidth: 'auto',
                                                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)', borderColor: '#fff' }
                                            }}
                                        >
                                            USE
                                        </Button>
                                    </Box>
                                </Box>
                                {baseRate !== generalRate && (
                                    <Box display="flex" justifyContent="space-between" alignItems="center" mt={1.5}>
                                        <Typography sx={{ color: '#fff', fontSize: '0.85rem', fontWeight: 'bold', fontFamily: "'JetBrains Mono', monospace" }}>
                                            {selectedBrand}
                                        </Typography>
                                        <Box display="flex" alignItems="center" gap={1.5}>
                                            <Typography sx={{ color: '#fff', fontSize: '0.85rem', fontWeight: 'bold', fontFamily: "'JetBrains Mono', monospace" }}>
                                                ₹ {Number(baseRate || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </Typography>
                                            <Button 
                                                variant="outlined" 
                                                size="small" 
                                                onClick={() => applyPrediction(baseRate || 0)}
                                                sx={{ 
                                                    color: '#fff', 
                                                    borderColor: 'rgba(255, 255, 255, 0.3)',
                                                    fontFamily: "'JetBrains Mono', monospace",
                                                    fontSize: '0.7rem',
                                                    p: '2px 8px',
                                                    minWidth: 'auto',
                                                    '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)', borderColor: '#fff' }
                                                }}
                                            >
                                                USE
                                            </Button>
                                        </Box>
                                    </Box>
                                )}
                                {allBrandRates.map((brand, idx) => (
                                    <Box key={idx} display="flex" justifyContent="space-between" alignItems="center" mt={1.5}>
                                        <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem', fontFamily: "'JetBrains Mono', monospace" }}>
                                            {brand.name}
                                        </Typography>
                                        <Box display="flex" alignItems="center" gap={1.5}>
                                            <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem', fontWeight: 'bold', fontFamily: "'JetBrains Mono', monospace" }}>
                                                ₹ {Number(brand.rate || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </Typography>
                                            <Button 
                                                variant="outlined" 
                                                size="small" 
                                                onClick={() => applyPrediction(brand.rate || 0, brand.name)}
                                                sx={{ 
                                                    color: 'text.secondary', 
                                                    borderColor: 'rgba(255, 255, 255, 0.2)',
                                                    fontFamily: "'JetBrains Mono', monospace",
                                                    fontSize: '0.7rem',
                                                    p: '2px 8px',
                                                    minWidth: 'auto',
                                                    '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)', borderColor: '#fff', color: '#fff' }
                                                }}
                                            >
                                                USE
                                            </Button>
                                        </Box>
                                    </Box>
                                ))}
                            </Box>

                            <Box borderTop="1px solid rgba(255,255,255,0.1)" pt={2}>
                                <Typography sx={{ color: '#00e5ff', fontWeight: 'bold', fontSize: '0.75rem', fontFamily: "'JetBrains Mono', monospace", mb: 1.5, letterSpacing: 1 }}>
                                    {executionDate ? `AI FORECAST (${executionDate})` : "AI FORECAST (PENDING DATE)"}
                                </Typography>
                                
                                {prediction ? (
                                    <>
                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                            <Typography sx={{ color: '#00e5ff', fontSize: '0.85rem', fontFamily: "'JetBrains Mono', monospace" }}>
                                                95% Confidence Band 
                                            </Typography>
                                            <Typography sx={{ color: '#fff', fontSize: '0.85rem', fontWeight: 'bold', fontFamily: "'JetBrains Mono', monospace" }}>
                                                ₹ {Number(prediction.low).toLocaleString(undefined, { minimumFractionDigits: 2 })} - ₹ {Number(prediction.high).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </Typography>
                                        </Box>
                                        
                                        <Box 
                                            display="flex" 
                                            justifyContent="space-between" 
                                            gap={1} 
                                            mt={2}
                                        >
                                            <Button 
                                                variant="outlined" 
                                                size="small" 
                                                onClick={() => applyPrediction(prediction.expected)}
                                                sx={{ 
                                                    color: '#00e5ff', 
                                                    borderColor: 'rgba(0, 229, 255, 0.3)',
                                                    fontFamily: "'JetBrains Mono', monospace",
                                                    fontSize: '0.75rem',
                                                    flex: 1,
                                                    '&:hover': { bgcolor: 'rgba(0, 229, 255, 0.1)', borderColor: '#00e5ff' }
                                                }}
                                            >
                                                USE AI BASE (₹ {Number(prediction.expected).toLocaleString(undefined, { minimumFractionDigits: 2 })})
                                            </Button>
                                            <Button 
                                                variant="outlined" 
                                                size="small" 
                                                onClick={() => applyPrediction(prediction.low)}
                                                sx={{ 
                                                    color: '#4caf50', 
                                                    borderColor: 'rgba(76, 175, 80, 0.3)',
                                                    fontFamily: "'JetBrains Mono', monospace",
                                                    fontSize: '0.75rem',
                                                    '&:hover': { bgcolor: 'rgba(76, 175, 80, 0.1)', borderColor: '#4caf50' }
                                                }}
                                            >
                                                LOW
                                            </Button>
                                            <Button 
                                                variant="outlined" 
                                                size="small" 
                                                onClick={() => applyPrediction(prediction.high)}
                                                sx={{ 
                                                    color: '#ff9800', 
                                                    borderColor: 'rgba(255, 152, 0, 0.3)',
                                                    fontFamily: "'JetBrains Mono', monospace",
                                                    fontSize: '0.75rem',
                                                    '&:hover': { bgcolor: 'rgba(255, 152, 0, 0.1)', borderColor: '#ff9800' }
                                                }}
                                            >
                                                HIGH
                                            </Button>
                                        </Box>
                                    </>
                                ) : (
                                    <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem', fontFamily: "'JetBrains Mono', monospace", fontStyle: 'italic' }}>
                                        No AI prediction data available for this resource.
                                    </Typography>
                                )}
                            </Box>
                        </Box>
                    </Popover>
            </Box>
        );
    };

    return (
        <Box display="flex" flexDirection="column" gap={4}>
            <Box sx={{ 
                p: 2, borderRadius: 2, 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                flexDirection: { xs: 'column', md: 'row' }, gap: 2,
                bgcolor: project?.isPriceLocked ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                border: '1px solid',
                borderColor: project?.isPriceLocked ? '#10b981' : '#f59e0b'
            }}>
                <Box display="flex" alignItems="center" gap={2}>
                    {project?.isPriceLocked ? <LockIcon sx={{ color: '#10b981', fontSize: 32 }} /> : <LockOpenIcon sx={{ color: '#f59e0b', fontSize: 32 }} />}
                    <Box>
                        <Typography variant="subtitle1" fontWeight="bold" sx={{ color: project?.isPriceLocked ? '#10b981' : '#f59e0b', fontFamily: "'JetBrains Mono', monospace" }}>
                            {project?.isPriceLocked ? "🔒 ESTIMATE FINALIZED & PRICING LOCKED" : "⚠️ LIVE MARKET RATES ACTIVE"}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: "'JetBrains Mono', monospace" }}>
                            {project?.isPriceLocked 
                                ? "Future market rate changes will NOT affect this project's estimates." 
                                : "Rates are fluctuating with the global market. Lock pricing once estimate is finalized."}
                        </Typography>
                    </Box>
                </Box>
                <Box display="flex" gap={2}>
                    <Button 
                        variant={syncStatus === "success" ? "contained" : "outlined"} 
                        color={syncStatus === "success" ? "success" : "info"} 
                        onClick={syncAllRatesToGlobalDB} 
                        sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 'bold', borderRadius: 50, whiteSpace: 'nowrap' }}
                    >
                        {syncStatus === "success" ? "✔ SYNCED TO MARKET" : "SYNC TO MARKET RATES"}
                    </Button>
                    <Button 
                        variant="contained" 
                        color={project?.isPriceLocked ? "success" : "warning"} 
                        onClick={togglePriceLock} 
                        startIcon={project?.isPriceLocked ? <LockIcon /> : <LockOpenIcon />} 
                        sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 'bold', borderRadius: 50, whiteSpace: 'nowrap' }}
                    >
                        {project?.isPriceLocked ? "UNLOCK PRICING" : "FINALIZE & LOCK ESTIMATE"}
                    </Button>
                </Box>
            </Box>

            <Paper sx={styles.toggleBannerPaper}>
                <Box>
                    <Typography variant="subtitle1" fontWeight="bold" sx={styles.toggleTitle}>
                        TRACKING_MODE: {trackingMode.toUpperCase()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={styles.toggleDesc}>
                        {trackingMode === 'auto'
                            ? "Actual quantities are automatically synced from the Daily Site Logs."
                            : "Actual quantities are entered manually in the table below."}
                    </Typography>
                </Box>

                <Box display="flex" alignItems="center" gap={3} flexWrap="wrap">
                    <TextField 
                        type="month"
                        label="TARGET EXECUTION MONTH (AI FORECAST)"
                        size="small"
                        InputLabelProps={{ shrink: true }}
                        value={executionDate}
                        onChange={(e) => handleExecutionDateChange(e.target.value)}
                        sx={{ width: 280, ...styles.monoSubtitle, '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: 'rgba(0,0,0,0.2)' } }}
                    />
                    <FormControlLabel
                        control={<Switch checked={trackingMode === 'auto'} onChange={toggleMode} color="success" />}
                        label={<Typography sx={styles.switchLabel}>AUTO_SYNC</Typography>}
                        labelPlacement="start"
                    />
                </Box>
            </Paper>

            {Object.keys(resourceTracker).map(phase => (
                <Paper key={phase} elevation={0} sx={styles.phasePaper}>
                    <Box sx={styles.phaseHeaderBox}>
                        <Typography variant="subtitle1" fontWeight="bold" sx={styles.phaseTitle}>
                            PHASE: {phase.toUpperCase()}
                        </Typography>
                    </Box>
                    <TableContainer>
                        <Table size="small">
                            <TableHead sx={styles.tableHead}>
                                <TableRow sx={styles.thRow}>
                                    <TableCell sx={styles.thCell}>CODE</TableCell>
                                    <TableCell sx={styles.thCell}>RESOURCE_DESCRIPTION</TableCell>
                                    <TableCell sx={styles.thCell}>UNIT</TableCell>
                                    <TableCell sx={styles.thCellBrand}>BRAND</TableCell>
                                    <TableCell sx={styles.thCellRate}>RATE</TableCell>
                                    <TableCell sx={styles.thCellEstQty}>ESTIMATED_QTY</TableCell>
                                    <TableCell sx={styles.thCellActQty(trackingMode)}>ACTUAL_CONSUMED</TableCell>
                                    <TableCell sx={styles.thCell}>VARIANCE</TableCell>
                                    <TableCell sx={styles.thCellCost}>ESTIMATED_COST</TableCell>
                                    <TableCell sx={styles.thCellCost}>ACTUAL_COST</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {Object.entries(resourceTracker[phase]).map(([resId, data]) => {
                                    const resourceObj = data.resourceData;
                                    const selectedBrand = selectedBrands[`${phase}_${resId}`] || "General";
                                    const availableBrands = getResourceBrands(resourceObj);
                                    const dropdownOptions = availableBrands.includes('General') ? availableBrands : ['General', ...availableBrands];
                                    const activeRegionName = project?.region || "";
                                    const baseRate = getSelectedRate(resourceObj, selectedBrand === 'General' ? "" : selectedBrand, activeRegionName);
                                    const customRate = customRates[`${phase}_${resId}`];
                                    const finalRate = customRate !== undefined ? customRate : baseRate;
                                    const variance = data.estimatedQty - data.actualQty;
                                    const estCost = data.estimatedQty * finalRate;
                                    const actualCost = data.actualQty * finalRate;
                                    const allBrandRates = availableBrands
                                        .filter(brand => brand !== 'General' && brand !== selectedBrand)
                                        .map(brand => ({
                                            name: brand,
                                            rate: getSelectedRate(resourceObj, brand, activeRegionName)
                                        }))
                                        .filter(b => b.rate > 0);

                                    return (
                                        <TableRow key={resId} sx={styles.tbRow}>
                                            <TableCell sx={styles.tdCell}>{data.code}</TableCell>
                                            <TableCell sx={styles.tdCellDesc} title={data.description}>
                                                {data.description}
                                                {data.estimatedQty === 0 && <Typography component="span" variant="caption" color="error.main" ml={0.5} sx={styles.unplannedText}>(Unplanned)</Typography>}
                                            </TableCell>
                                            <TableCell sx={styles.tdCell}>{data.unit}</TableCell>
                                            <TableCell>
                                                <Autocomplete
                                                    freeSolo
                                                    size="small"
                                                    options={dropdownOptions}
                                                    value={selectedBrand}
                                                    onChange={(event, newValue) => {
                                                        updateSelectedBrand(phase, resId, newValue || "");
                                                    }}
                                                    onInputChange={(event, newInputValue) => {
                                                        updateSelectedBrand(phase, resId, newInputValue || "");
                                                    }}
                                                    renderInput={(params) => (
                                                        <TextField 
                                                            {...params} 
                                                            placeholder="General" 
                                                            sx={{ 
                                                                ...styles.brandSelect, 
                                                                '& .MuiInputBase-root': { padding: '2px 30px 2px 8px !important', fontSize: '0.75rem', height: '28px', color: '#00e5ff', '& input': { p: 0 } },
                                                                '& .MuiOutlinedInput-notchedOutline': { border: 'none' }
                                                            }} 
                                                        />
                                                    )}
                                                    sx={{ 
                                                        width: 120,
                                                        bgcolor: 'rgba(0, 229, 255, 0.05)',
                                                        border: '1px solid rgba(0, 229, 255, 0.2)',
                                                        borderRadius: 1
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <RateOverrideInput
                                                    phase={phase}
                                                    resId={resId}
                                                    selectedBrand={selectedBrand}
                                                    baseRate={baseRate}
                                                    generalRate={getResourceRate(resourceObj, activeRegionName)}
                                                    activeRegion={activeRegionName }
                                                    allBrandRates={allBrandRates}
                                                    customRate={customRates[`${phase}_${resId}`]}
                                                    onSave={updateCustomRate}
                                                    onBrandSelect={updateSelectedBrand}
                                                    nativeStyles={nativeStyles}
                                                    prediction={futurePredictions[(data.description || "").trim()]}
                                                    isPredicting={isPredicting}
                                                />
                                            </TableCell>
                                            <TableCell sx={styles.tdCellEstQtyVal}>{data.estimatedQty.toFixed(2)}</TableCell>
                                            <TableCell>
                                                {trackingMode === 'auto' ? (
                                                    <Typography sx={styles.tdCellActQtyAuto}>
                                                        {data.actualQty.toFixed(2)}
                                                    </Typography>
                                                ) : (
                                                    <input
                                                        type="number"
                                                        value={data.actualQty || ""}
                                                        onChange={(e) => updateActualResource(phase, resId, e.target.value)}
                                                        style={nativeStyles.actualQtyInput}
                                                    />
                                                )}
                                            </TableCell>
                                            <TableCell sx={styles.tdCellVariance(variance)}>
                                                {variance > 0 ? "+" : ""}{variance.toFixed(2)}
                                            </TableCell>
                                            <TableCell sx={styles.tdCellCostVal}>
                                                {Number(estCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </TableCell>
                                            <TableCell sx={styles.tdCellCostVal}>
                                                {Number(actualCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            ))}
        </Box>
    );
}