import React, { useState, useMemo } from 'react';
import {
    Box, Paper, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Switch, FormControlLabel, Select, MenuItem, TextField, Button, useTheme
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { getResourceTrackerTabStyles, getNativeStyles } from './ResourceTrackerTab.styles';
import { tableInputActiveStyle } from '../../styles';
import { getResourceRate } from '../../engines/calculationEngine';
import { useSettings } from '../../context/SettingsContext';
import { exportResourceTrackerPdf } from '../../utils/exportPdf';

export default function ResourceTrackerTab({ project, renderedProjectBoq, resources, regions = [], updateProject, masterBoqs = [], togglePriceLock }) {
    const theme = useTheme();
    const styles = getResourceTrackerTabStyles(theme);
    const nativeStyles = getNativeStyles(tableInputActiveStyle);
    const { formatCurrency } = useSettings();

    // Safely parse tracking mode
    const trackingMode = project?.resourceTrackingMode || 'manual';

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
    const { manualActuals, selectedBrands } = useMemo(() => {
        let actuals = {};
        let brands = {};
        if (typeof project?.actualResources === 'string') {
            try {
                const parsed = JSON.parse(project.actualResources);
                Object.entries(parsed).forEach(([k, v]) => {
                    if (k.startsWith('brand_')) {
                        brands[k.substring(6)] = v;
                    } else {
                        actuals[k] = v;
                    }
                });
            } catch { }
        } else if (project?.actualResources) {
            Object.entries(project.actualResources).forEach(([k, v]) => {
                if (k.startsWith('brand_')) {
                    brands[k.substring(6)] = v;
                } else {
                    actuals[k] = v;
                }
            });
        }
        return { manualActuals: actuals, selectedBrands: brands };
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
                            const ohMultiplier = 1 + (Number(item.masterBoq.overhead || 0) / 100);
                            const profitMultiplier = 1 + (Number(item.masterBoq.profit || 0) / 100);
                            const totalRequired = Number(comp.qty) * ohMultiplier * profitMultiplier * Number(item.computedQty || 0);
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

        // Pass 2: Inject any custom resources added via Daily Logs that were NOT in the BOQ
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
                        estimatedQty: 0, // Zero estimate because it was not in the original BOQ
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

        let currentActuals = {};
        if (typeof project?.actualResources === 'string') {
            try { currentActuals = JSON.parse(project.actualResources); } catch { }
        } else if (project?.actualResources) {
            currentActuals = { ...project.actualResources };
        }

        currentActuals[`${phase}_${resourceId}`] = Number(val);
        await updateProject("actualResources", currentActuals);
    };

    const updateSelectedBrand = async (phase, resourceId, brandName) => {
        let currentActuals = {};
        if (typeof project?.actualResources === 'string') {
            try { currentActuals = JSON.parse(project.actualResources); } catch { }
        } else if (project?.actualResources) {
            currentActuals = { ...project.actualResources };
        }

        if (brandName) {
            currentActuals[`brand_${phase}_${resourceId}`] = brandName;
        } else {
            delete currentActuals[`brand_${phase}_${resourceId}`];
        }
        await updateProject("actualResources", currentActuals);
    };

    // Extract unique brands for a resource across history
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

    // Calculate selected rate (brand or region-wise general rate)
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

    return (
        <Box display="flex" flexDirection="column" gap={4}>
            {/* 🔥 PRICE LOCK BANNER */}
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

            {/* MODE TOGGLE BANNER */}
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

                {/* REGION SELECTION DROPDOWN REMOVED - Using project's cost region */}
                <Box display="flex" alignItems="center" gap={3} flexWrap="wrap">
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
                                    const selectedBrand = selectedBrands[`${phase}_${resId}`] || "";
                                    const availableBrands = getResourceBrands(resourceObj);
                                    const activeRegionName = project?.region || "";
                                    const rate = getSelectedRate(resourceObj, selectedBrand, activeRegionName);
                                    const variance = data.estimatedQty - data.actualQty;
                                    const estCost = data.estimatedQty * rate;
                                    const actualCost = data.actualQty * rate;

                                    return (
                                        <TableRow key={resId} sx={styles.tbRow}>
                                            <TableCell sx={styles.tdCell}>{data.code}</TableCell>
                                            <TableCell sx={styles.tdCellDesc} title={data.description}>
                                                {data.description}
                                                {data.estimatedQty === 0 && <Typography component="span" variant="caption" color="error.main" ml={0.5} sx={styles.unplannedText}>(Unplanned)</Typography>}
                                            </TableCell>
                                            <TableCell sx={styles.tdCell}>{data.unit}</TableCell>
                                            <TableCell>
                                                <Select
                                                    size="small"
                                                    value={selectedBrand}
                                                    onChange={(e) => updateSelectedBrand(phase, resId, e.target.value)}
                                                    displayEmpty
                                                    sx={styles.brandSelect}
                                                >
                                                    <MenuItem value="" sx={styles.brandMenuItem}>
                                                        <em>General</em>
                                                    </MenuItem>
                                                    {availableBrands.map(b => (
                                                        <MenuItem key={b} value={b} sx={styles.brandMenuItem}>
                                                            {b}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </TableCell>
                                            <TableCell sx={styles.tdCellRateVal(selectedBrand)}>
                                                {Number(rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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