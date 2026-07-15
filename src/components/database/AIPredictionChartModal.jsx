import { useState, useEffect } from "react";
import {
    Box, Button, Typography, Paper, Grid, IconButton, Dialog, DialogTitle,
    DialogContent, DialogActions, useTheme, CircularProgress
} from "@mui/material";
import TimelineIcon from '@mui/icons-material/Timeline';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import CloseIcon from '@mui/icons-material/Close';
import { ComposedChart, Area, Line, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';

export default function AIPredictionChartModal({ open, onClose, resource, region, formatCurrency }) {
    const theme = useTheme();
    const [loading, setLoading] = useState(false);
    const [chartData, setChartData] = useState([]);
    
    useEffect(() => {
        if (open && resource) {
            fetchHistory();
        } else {
            setChartData([]);
        }
    }, [open, resource, region]);
    
    const fetchHistory = async () => {
        setLoading(true);
        try {
            const baseUrl = import.meta.env.VITE_PYTHON_API_URL || 'http://127.0.0.1:8000';
            let url = `${baseUrl}/api/ml/resource-history?resource=${encodeURIComponent(resource.description)}`;
            if (region) url += `&region=${encodeURIComponent(region)}`;
            
            const res = await fetch(url);
            const data = await res.json();
            if (data.success) {
                const processed = data.history.map(d => ({
                    ...d,
                    confidence_interval: (d.predicted_rate_low != null && d.predicted_rate_high != null) ? [d.predicted_rate_low, d.predicted_rate_high] : null
                }));
                setChartData(processed);
            }
        } catch (err) {
            console.error("Failed to fetch ML history", err);
        }
        setLoading(false);
    };

    if (!resource) return null;

    const CustomTooltip = ({ active, payload, label }) => {
        if (!active || !payload?.length) return null;
        return (
            <Paper elevation={0} sx={{
                p: 1.5, bgcolor: 'rgba(10,20,45,0.97)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 2, minWidth: 160
            }}>
                <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 'bold', color: 'primary.main', mb: 1 }}>
                    {label}
                </Typography>
                {payload.map((p, i) => (
                    <Box key={i} display="flex" justifyContent="space-between" gap={2} mb={0.3}>
                        <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: p.color }}>{p.name}</Typography>
                        <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'text.primary', fontWeight: 'bold' }}>
                            {Array.isArray(p.value) 
                                ? `${formatCurrency(p.value[0])} - ${formatCurrency(p.value[1])}`
                                : (p.value ? formatCurrency(p.value) : '---')
                            }
                        </Typography>
                    </Box>
                ))}
            </Paper>
        );
    };

    // Calculate max and current rates for KPIs
    const actualRates = chartData.map(d => d.actual_rate).filter(v => v != null);
    const currentRate = actualRates.length > 0 ? actualRates[actualRates.length - 1] : 0;
    
    // Future predictions
    const futureData = chartData.filter(d => d.actual_rate == null);
    const futureForecast = futureData.length > 0 ? futureData[futureData.length - 1].predicted_rate : 0;
    
    // Variance percentage
    const variance = currentRate > 0 ? (((futureForecast - currentRate) / currentRate) * 100).toFixed(2) : 0;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="lg"
            fullWidth
            PaperProps={{
                sx: {
                    bgcolor: '#080f1e',
                    backgroundImage: 'none',
                    border: '1px solid rgba(0, 229, 255, 0.2)',
                    borderRadius: 3,
                    boxShadow: '0 24px 48px -12px rgba(0,229,255,0.15)'
                }
            }}
        >
            <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.06)', pb: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box display="flex" alignItems="center" gap={1.5}>
                    <AutoGraphIcon sx={{ color: '#00e5ff', fontSize: 28 }} />
                    <Box>
                        <Typography variant="h6" sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 'bold', fontSize: '16px', color: '#00e5ff' }}>
                            AI_TREND_FORECAST
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'JetBrains Mono', monospace" }}>
                            Bayesian Probabilistic Forecasting
                        </Typography>
                    </Box>
                </Box>
                <IconButton onClick={onClose} sx={{ color: 'rgba(255,255,255,0.4)', '&:hover': { color: '#fff' } }} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 4, bgcolor: '#080f1e' }}>
                <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                    <Box>
                        <Typography variant="subtitle2" sx={{ fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.4)', fontSize: '10px', letterSpacing: '1px' }}>
                            TARGET_RESOURCE
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: '800', color: '#fff', mt: 0.5, letterSpacing: '-0.5px' }}>
                            {resource.description}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.5, fontFamily: "'JetBrains Mono', monospace", mt: 0.5, display: 'block' }}>
                            CODE: {resource.code || 'N/A'} &nbsp;|&nbsp; REGION: {region || 'ALL'}
                        </Typography>
                    </Box>
                </Box>

                {loading ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height={300}>
                        <CircularProgress sx={{ color: '#00e5ff' }} />
                    </Box>
                ) : chartData.length === 0 ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height={300} sx={{ border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 2 }}>
                        <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.4)' }}>
                            No historical data available for ML processing.
                        </Typography>
                    </Box>
                ) : (
                    <>
                        <Grid container spacing={3} mb={4}>
                            <Grid item xs={12} sm={4}>
                                <Paper elevation={0} sx={{ p: 2.5, bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 2 }}>
                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'JetBrains Mono', monospace" }}>LATEST_ACTUAL_RATE</Typography>
                                    <Typography variant="h4" sx={{ fontWeight: 'bold', fontFamily: "'JetBrains Mono', monospace", mt: 1, color: '#fff' }}>
                                        {formatCurrency(currentRate)}
                                    </Typography>
                                </Paper>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <Paper elevation={0} sx={{ p: 2.5, bgcolor: 'rgba(0, 229, 255, 0.05)', border: '1px solid rgba(0, 229, 255, 0.1)', borderRadius: 2 }}>
                                    <Typography variant="caption" sx={{ color: '#00e5ff', fontFamily: "'JetBrains Mono', monospace" }}>6_MONTH_AI_FORECAST</Typography>
                                    <Typography variant="h4" sx={{ fontWeight: 'bold', fontFamily: "'JetBrains Mono', monospace", mt: 1, color: '#00e5ff' }}>
                                        {formatCurrency(futureForecast)}
                                    </Typography>
                                </Paper>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <Paper elevation={0} sx={{ p: 2.5, bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 2 }}>
                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'JetBrains Mono', monospace" }}>PROJECTED_VARIANCE</Typography>
                                    <Typography variant="h4" sx={{ fontWeight: 'bold', fontFamily: "'JetBrains Mono', monospace", mt: 1, color: variance >= 0 ? '#10b981' : '#ef4444' }}>
                                        {variance > 0 ? '+' : ''}{variance}%
                                    </Typography>
                                </Paper>
                            </Grid>
                        </Grid>

                        <Paper elevation={0} sx={{ p: 3, bgcolor: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 2 }}>
                            <ResponsiveContainer width="100%" height={350}>
                                <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                    <defs>
                                        <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                                    <XAxis 
                                        dataKey="date" 
                                        tick={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fill: 'rgba(255,255,255,0.55)' }}
                                        axisLine={false} 
                                        tickLine={false} 
                                        minTickGap={20}
                                    />
                                    <YAxis 
                                        tick={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fill: 'rgba(255,255,255,0.35)' }}
                                        axisLine={false} 
                                        tickLine={false}
                                        tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
                                        domain={['auto', 'auto']}
                                    />
                                    <RechartsTooltip content={<CustomTooltip />} />
                                    <Legend wrapperStyle={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'rgba(255,255,255,0.6)' }} />
                                    
                                    <Area 
                                        type="monotone" 
                                        dataKey="actual_rate" 
                                        name="Actual Rate" 
                                        stroke="#8b5cf6" 
                                        strokeWidth={3} 
                                        fillOpacity={1} 
                                        fill="url(#colorActual)"
                                        dot={{ r: 4, strokeWidth: 2, fill: '#080f1e', stroke: '#8b5cf6' }} 
                                        activeDot={{ r: 6 }} 
                                        connectNulls
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="confidence_interval"
                                        name="95% Confidence Band"
                                        stroke="none"
                                        fill="#00e5ff"
                                        fillOpacity={0.15}
                                        connectNulls
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="predicted_rate" 
                                        name="AI Bayesian Trend" 
                                        stroke="#00e5ff" 
                                        strokeWidth={2} 
                                        strokeDasharray="5 5" 
                                        dot={false} 
                                        activeDot={{ r: 6 }} 
                                    />
                                    {actualRates.length > 0 && (
                                        <ReferenceLine x={chartData[actualRates.length - 1]?.date} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
                                    )}
                                </ComposedChart>
                            </ResponsiveContainer>
                        </Paper>
                    </>
                )}
            </DialogContent>
            <DialogActions sx={{ p: 2.5, borderTop: '1px solid rgba(255,255,255,0.06)', bgcolor: '#080f1e' }}>
                <Button onClick={onClose} sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                    CLOSE
                </Button>
            </DialogActions>
        </Dialog>
    );
}
