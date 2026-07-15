import { useState, useEffect } from "react";
import {
    Box, Button, Typography, Paper, Grid, IconButton, Dialog, DialogTitle,
    DialogContent, DialogActions, Chip, alpha, useTheme, TextField, MenuItem
} from "@mui/material";
import TimelineIcon from '@mui/icons-material/Timeline';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import CloseIcon from '@mui/icons-material/Close';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, LabelList } from 'recharts';

const REGION_COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
];

const MonthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const getCurrentMonthKey = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
};

export default function BrandPriceChartModal({ open, onClose, resource, regions, formatCurrency }) {
    const theme = useTheme();
    const [brandChartMonthYear, setBrandChartMonthYear] = useState("");

    useEffect(() => {
        if (open && resource) {
            setBrandChartMonthYear(getCurrentMonthKey());
        }
    }, [open, resource]);

    const [currentYear, currentMonth] = brandChartMonthYear ? brandChartMonthYear.split('-') : getCurrentMonthKey().split('-');

    const handleMonthChange = (e) => {
        const newMonth = e.target.value;
        setBrandChartMonthYear(`${currentYear}-${newMonth}`);
    };

    const handleYearChange = (e) => {
        const newYear = e.target.value;
        setBrandChartMonthYear(`${newYear}-${currentMonth}`);
    };

    if (!resource) return null;

    const history = resource.rates?.brandRatesHistory || {};
    const rowData = Array.isArray(history[brandChartMonthYear]) ? history[brandChartMonthYear] : [];

    // Build chart data: one entry per brand, keys per region
    const chartData = rowData.map(row => {
        const entry = { brand: row.brand || 'Unknown' };
        let total = 0;
        regions.forEach(r => {
            const val = Number(row[r.name] || 0);
            entry[r.name] = val;
            total += val;
        });
        entry._avg = regions.length ? total / regions.length : 0;
        return entry;
    });

    // Summary stats
    const allVals = chartData.flatMap(d => regions.map(r => ({ brand: d.brand, region: r.name, val: d[r.name] })));
    const highestEntry = allVals.reduce((a, b) => b.val > a.val ? b : a, { brand: '-', region: '-', val: 0 });
    const lowestNonZero = allVals.filter(x => x.val > 0).reduce((a, b) => b.val < a.val ? b : a, { brand: '-', region: '-', val: Infinity });

    // All historical months for this resource (for the dropdown)
    const availableMonths = Object.keys(history).sort().reverse();

    // Extract unique years from history keys
    const yearsFromHistory = availableMonths.map(m => m.split('-')[0]);
    const currentYearNum = new Date().getFullYear();
    const startYear = 2026;

    // Generate years from the current system year down to the baseline year 2026
    const generatedYears = [];
    for (let y = currentYearNum; y >= startYear; y--) {
        generatedYears.push(String(y));
    }

    const allYearsSet = new Set([...yearsFromHistory, ...generatedYears]);
    const availableYears = Array.from(allYearsSet).sort().reverse();

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
                        <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: p.fill }}>{p.dataKey}</Typography>
                        <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'text.primary', fontWeight: 'bold' }}>
                            {formatCurrency(p.value)}
                        </Typography>
                    </Box>
                ))}
            </Paper>
        );
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xl"
            fullWidth
            PaperProps={{
                sx: {
                    bgcolor: '#080f1e',
                    backgroundImage: 'none',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 3,
                    boxShadow: '0 24px 48px -12px rgba(0,0,0,0.5)'
                }
            }}
        >
            {/* DIALOG HEADER */}
            <DialogTitle sx={{
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                pb: 2.5,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 2,
                bgcolor: '#080f1e'
            }}>
                <Box display="flex" alignItems="center" gap={1.5}>
                    <TimelineIcon sx={{ color: 'primary.main', fontSize: 24 }} />
                    <Box>
                        <Typography variant="h6" sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 'bold', fontSize: '16px', lineHeight: 1.2 }}>
                            BRAND_MARKET_ANALYTICS
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'JetBrains Mono', monospace" }}>
                            Compare rates across multiple brands and regions
                        </Typography>
                    </Box>
                </Box>
                <IconButton onClick={onClose} sx={{ color: 'rgba(255,255,255,0.4)', '&:hover': { color: '#fff' } }} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 4, bgcolor: '#080f1e' }}>
                {/* MAT INFO HEADER */}
                <Box sx={{
                    mb: 4, p: 2.5,
                    background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(139,92,246,0.05) 100%)',
                    borderRadius: 2,
                    border: '1px solid rgba(59,130,246,0.2)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 2
                }}>
                    <Box>
                        <Typography variant="subtitle2" sx={{ fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.4)', fontSize: '10px', letterSpacing: '1px' }}>
                            SELECTED_MATERIAL
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: '800', color: '#fff', mt: 0.5, letterSpacing: '-0.5px' }}>
                            {resource.description}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.5, fontFamily: "'JetBrains Mono', monospace", mt: 0.5, display: 'block' }}>
                            CODE: {resource.code || 'N/A'} &nbsp;|&nbsp; UNIT: {resource.unit || 'nos'}
                        </Typography>
                    </Box>

                    {/* SELECTOR FOR MONTH AND YEAR */}
                    <Box display="flex" gap={1.5} alignItems="center">
                        <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'rgba(255,255,255,0.5)', mr: 0.5 }}>
                            Active Period:
                        </Typography>
                        <TextField
                            select
                            size="small"
                            value={currentMonth}
                            onChange={handleMonthChange}
                            SelectProps={{
                                native: false,
                                MenuProps: {
                                    PaperProps: {
                                        sx: {
                                            bgcolor: '#283a54',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            color: '#fff',
                                            boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
                                            '& .MuiMenuItem-root': {
                                                fontSize: '12px',
                                                fontFamily: "'JetBrains Mono', monospace",
                                                color: 'rgba(255,255,255,0.9)',
                                                py: 1,
                                                px: 2,
                                                '&:hover': {
                                                    bgcolor: '#334a6c'
                                                },
                                                '&.Mui-selected': {
                                                    bgcolor: '#334a6c',
                                                    fontWeight: 'bold',
                                                    color: '#00e5ff',
                                                    '&:hover': {
                                                        bgcolor: '#3d5980'
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }}
                            slotProps={{
                                input: {
                                    sx: {
                                        fontFamily: "'JetBrains Mono', monospace",
                                        fontSize: '12px',
                                        color: '#fff',
                                        bgcolor: 'rgba(255,255,255,0.03)',
                                        '& .MuiOutlinedInput-notchedOutline': {
                                            borderColor: 'rgba(255,255,255,0.1)'
                                        },
                                        '&:hover .MuiOutlinedInput-notchedOutline': {
                                            borderColor: '#00e5ff'
                                        },
                                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                            borderColor: '#00e5ff'
                                        }
                                    }
                                }
                            }}
                        >
                            {MonthNames.map((name, index) => {
                                const val = String(index + 1).padStart(2, '0');
                                return <MenuItem key={val} value={val}>{name}</MenuItem>;
                            })}
                        </TextField>

                        <TextField
                            select
                            size="small"
                            value={currentYear}
                            onChange={handleYearChange}
                            SelectProps={{
                                native: false,
                                MenuProps: {
                                    PaperProps: {
                                        sx: {
                                            bgcolor: '#283a54',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            color: '#fff',
                                            boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
                                            '& .MuiMenuItem-root': {
                                                fontSize: '12px',
                                                fontFamily: "'JetBrains Mono', monospace",
                                                color: 'rgba(255,255,255,0.9)',
                                                py: 1,
                                                px: 2,
                                                '&:hover': {
                                                    bgcolor: '#334a6c'
                                                },
                                                '&.Mui-selected': {
                                                    bgcolor: '#334a6c',
                                                    fontWeight: 'bold',
                                                    color: '#00e5ff',
                                                    '&:hover': {
                                                        bgcolor: '#3d5980'
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }}
                            slotProps={{
                                input: {
                                    sx: {
                                        fontFamily: "'JetBrains Mono', monospace",
                                        fontSize: '12px',
                                        color: '#fff',
                                        bgcolor: 'rgba(255,255,255,0.03)',
                                        '& .MuiOutlinedInput-notchedOutline': {
                                            borderColor: 'rgba(255,255,255,0.1)'
                                        },
                                        '&:hover .MuiOutlinedInput-notchedOutline': {
                                            borderColor: '#00e5ff'
                                        },
                                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                            borderColor: '#00e5ff'
                                        }
                                    }
                                }
                            }}
                        >
                            {availableYears.map(year => (
                                <MenuItem key={year} value={year}>{year}</MenuItem>
                            ))}
                        </TextField>
                    </Box>
                </Box>

                {chartData.length === 0 ? (
                    <Paper elevation={0} sx={{
                        p: 8, textAlign: 'center', borderRadius: 3,
                        border: '1px dashed rgba(255,255,255,0.1)', bgcolor: 'rgba(255,255,255,0.01)'
                    }}>
                        <Box sx={{ fontSize: 40, mb: 1 }}>📊</Box>
                        <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
                            No brand rates recorded for the selected period ({MonthNames[Number(currentMonth) - 1] || currentMonth} {currentYear}).
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.25)', display: 'block', mt: 1 }}>
                            Register brand rates in the Brand Rates Editor first.
                        </Typography>
                    </Paper>
                ) : (
                    (
                        <>
                            {/* STAT CARDS */}
                            <Grid container spacing={3} mb={4}>
                                <Grid item xs={12} sm={4}>
                                    <Paper elevation={0} sx={{
                                        p: 2.5,
                                        bgcolor: 'rgba(255,255,255,0.02)',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        borderRadius: 2,
                                        minHeight: '115px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between'
                                    }}>
                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'JetBrains Mono', monospace" }}>REGISTERED_BRANDS</Typography>
                                            <LocalOfferIcon sx={{ color: '#00e5ff', fontSize: 18 }} />
                                        </Box>
                                        <Typography variant="h4" sx={{ fontWeight: 'bold', fontFamily: "'JetBrains Mono', monospace", mt: 1, color: '#00e5ff' }}>
                                            {chartData.length}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', fontFamily: "'JetBrains Mono', monospace", display: 'block', mt: 0.5 }}>
                                            active in this period
                                        </Typography>
                                    </Paper>
                                </Grid>

                                <Grid item xs={12} sm={4}>
                                    <Paper elevation={0} sx={{
                                        p: 2.5,
                                        bgcolor: 'rgba(255,255,255,0.02)',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        borderRadius: 2,
                                        minHeight: '115px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between'
                                    }}>
                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'JetBrains Mono', monospace" }}>HIGHEST_RATE</Typography>
                                            <EmojiEventsIcon sx={{ color: '#f59e0b', fontSize: 18 }} />
                                        </Box>
                                        <Typography variant="h4" sx={{ fontWeight: 'bold', fontFamily: "'JetBrains Mono', monospace", mt: 1, color: '#f59e0b' }}>
                                            {formatCurrency(highestEntry.val)}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', fontFamily: "'JetBrains Mono', monospace", display: 'block', mt: 0.5 }}>
                                            {highestEntry.brand} ({highestEntry.region?.toUpperCase()})
                                        </Typography>
                                    </Paper>
                                </Grid>

                                <Grid item xs={12} sm={4}>
                                    <Paper elevation={0} sx={{
                                        p: 2.5,
                                        bgcolor: 'rgba(255,255,255,0.02)',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        borderRadius: 2,
                                        minHeight: '115px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between'
                                    }}>
                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'JetBrains Mono', monospace" }}>BEST_VALUE_RATE</Typography>
                                            <TrendingDownIcon sx={{ color: '#10b981', fontSize: 18 }} />
                                        </Box>
                                        <Typography variant="h4" sx={{ fontWeight: 'bold', fontFamily: "'JetBrains Mono', monospace", mt: 1, color: '#10b981' }}>
                                            {lowestNonZero.val !== Infinity ? formatCurrency(lowestNonZero.val) : '—'}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', fontFamily: "'JetBrains Mono', monospace", display: 'block', mt: 0.5 }}>
                                            {lowestNonZero.val !== Infinity ? `${lowestNonZero.brand} (${lowestNonZero.region?.toUpperCase()})` : '—'}
                                        </Typography>
                                    </Paper>
                                </Grid>
                            </Grid>

                            {/* CHART PANEL */}
                            <Paper elevation={0} sx={{ p: 3, bgcolor: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 2 }}>
                                <Typography variant="subtitle2" mb={3} sx={{ fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.4)', fontSize: '11px', letterSpacing: '0.5px' }}>
                                    // RATE_COMPARISON_BY_BRAND
                                </Typography>
                                <ResponsiveContainer width="100%" height={Math.max(280, chartData.length * 60)}>
                                    <BarChart
                                        data={chartData}
                                        margin={{ top: 20, right: 30, left: 20, bottom: chartData.length > 4 ? 60 : 20 }}
                                        barCategoryGap="25%"
                                        barGap={3}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                                        <XAxis
                                            dataKey="brand"
                                            tick={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fill: 'rgba(255,255,255,0.55)' }}
                                            axisLine={false}
                                            tickLine={false}
                                            angle={chartData.length > 5 ? -25 : 0}
                                            textAnchor={chartData.length > 5 ? 'end' : 'middle'}
                                            interval={0}
                                        />
                                        <YAxis
                                            tick={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fill: 'rgba(255,255,255,0.35)' }}
                                            axisLine={false}
                                            tickLine={false}
                                            tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
                                        />
                                        <RechartsTooltip
                                            content={<CustomTooltip />}
                                            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                        />
                                        <Legend
                                            iconType="circle"
                                            iconSize={8}
                                            formatter={(value) => (
                                                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>{value}</span>
                                            )}
                                        />
                                        {regions.map((r, ri) => (
                                            <Bar
                                                key={r.id}
                                                dataKey={r.name}
                                                name={r.name}
                                                fill={REGION_COLORS[ri % REGION_COLORS.length]}
                                                radius={[4, 4, 0, 0]}
                                                maxBarSize={48}
                                            >
                                                <LabelList
                                                    dataKey={r.name}
                                                    position="top"
                                                    style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', fill: 'rgba(255,255,255,0.45)' }}
                                                    formatter={(v) => v > 0 ? (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v) : ''}
                                                />
                                            </Bar>
                                        ))}
                                    </BarChart>
                                </ResponsiveContainer>
                            </Paper>

                            {/* AVAILABLE PERIODS QUICK-NAV */}
                            {availableMonths.length > 1 && (
                                <Box mt={3}>
                                    <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: 'rgba(255,255,255,0.3)', mb: 1, letterSpacing: '1px' }}>
                                        // AVAILABLE_PERIODS
                                    </Typography>
                                    <Box display="flex" gap={1} flexWrap="wrap">
                                        {availableMonths.map(mk => (
                                            <Chip
                                                key={mk} label={mk} size="small"
                                                onClick={() => setBrandChartMonthYear(mk)}
                                                variant={brandChartMonthYear === mk ? 'filled' : 'outlined'}
                                                sx={{
                                                    fontFamily: "'JetBrains Mono', monospace", fontSize: '10px',
                                                    cursor: 'pointer',
                                                    bgcolor: brandChartMonthYear === mk ? 'rgba(59,130,246,0.25)' : 'transparent',
                                                    color: brandChartMonthYear === mk ? '#3b82f6' : 'rgba(255,255,255,0.4)',
                                                    border: `1px solid ${brandChartMonthYear === mk ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.1)'}`,
                                                    '&:hover': { bgcolor: 'rgba(59,130,246,0.15)' }
                                                }}
                                            />
                                        ))}
                                    </Box>
                                </Box>
                            )}
                        </>
                    )
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
