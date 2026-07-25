import { memo, useCallback, useDeferredValue, useState, useMemo, useRef, useEffect } from "react";
import {
    Box, Button, Typography, Paper, Grid, TextField, MenuItem, Table,
    TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton,
    InputAdornment, Pagination, Divider, alpha, useTheme, InputBase, Backdrop,
    CircularProgress, LinearProgress, FormControlLabel, Switch, Checkbox,
    Avatar, Chip, Dialog, DialogTitle, DialogContent, DialogActions, Alert
} from "@mui/material";
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import UploadIcon from '@mui/icons-material/Upload';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditIcon from '@mui/icons-material/Edit';
import BarChartIcon from '@mui/icons-material/BarChart';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PublicIcon from '@mui/icons-material/Public';
import AddIcon from '@mui/icons-material/Add';
import CategoryIcon from '@mui/icons-material/Category';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useSettings } from "../../context/SettingsContext";
import { getResourcesTabStyles, getInflationDrawerStyles } from "./ResourcesTab.styles";
import ConfirmDeleteModal from "./ConfirmDeleteModal";
import InflationDrawer from "./InflationDrawer";
import BrandRatesModal from "./BrandRatesModal";
import BrandPriceChartModal from "./BrandPriceChartModal";
import AIPredictionChartModal from "./AIPredictionChartModal";
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import LanguageIcon from '@mui/icons-material/Language';

// 🔥 DEBOUCED SEARCH INPUT COMPONENT FOR HIGH PERFORMANCE
const SearchInput = memo(({ value, onChange }) => {
    const [localVal, setLocalVal] = useState(value);
    useEffect(() => {
        setLocalVal(value);
    }, [value]);
    useEffect(() => {
        if (!localVal || localVal.trim() === "") {
            onChange("");
            return;
        }
        const handler = setTimeout(() => {
            if (localVal !== value) {
                onChange(localVal);
            }
        }, 300);
        return () => clearTimeout(handler);
    }, [localVal, onChange, value]);
    return (
        <TextField
            fullWidth
            placeholder="Search Materials..."
            size="small"
            value={localVal}
            onChange={e => setLocalVal(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
        />
    );
});

// 🔥 UPGRADED HIGH-PERFORMANCE "GHOST" INPUT CELL
const RateInputCell = memo(({ resource, regionName, actualRate, onSave, ghostInputStyle }) => {
    // If the ML backend provides an actualRate (which is considered the source of truth for "accurate latest region wise rate"),
    // use it. Otherwise fallback to the local DB rate.
    const effectiveRate = (actualRate !== undefined && actualRate !== null) ? actualRate : resource.rates[regionName];
    const [localVal, setLocalVal] = useState(effectiveRate || "");

    useEffect(() => {
        setLocalVal(effectiveRate || "");
    }, [effectiveRate]);

    const handleBlur = () => {
        const numVal = Number(localVal);
        const currentDbVal = Number(effectiveRate || 0);
        if (numVal !== currentDbVal) {
            onSave(resource.id, numVal);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') e.target.blur();
    };

    return (
        <InputBase
            type="number"
            value={localVal}
            onChange={(e) => setLocalVal(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            sx={ghostInputStyle}
        />
    );
});

// 🔥 HIGH-PERFORMANCE MEMOIZED RESOURCE ROW
const ResourceRow = memo(({
    res,
    aiPrediction,
    actualRate,
    predictionsLoading,
    index,
    currentPage,
    itemsPerPage,
    selectedRegion,
    handleSaveRate,
    handleOpenBrandModal,
    handleOpenBrandChart,
    handleOpenAIPredictionModal,
    openDeleteResourceModal,
    isSelected,
    onSelect,
    ghostInputStyle,
    theme
}) => {
    const styles = getResourcesTabStyles(theme);
    return (
        <TableRow hover sx={styles.resourceRow(index)}>
            <TableCell padding="checkbox">
                <Checkbox
                    color="primary"
                    checked={isSelected}
                    onChange={(e) => onSelect(res.id, e.target.checked)}
                />
            </TableCell>
            <TableCell sx={styles.indexCell}>
                {(currentPage - 1) * itemsPerPage + index + 1}
            </TableCell>
            <TableCell sx={styles.codeCell}>
                {res.code || '---'}
            </TableCell>
            <TableCell sx={styles.descCell}>
                {res.description}
            </TableCell>
            <TableCell sx={styles.unitCell}>
                {res.unit}
            </TableCell>
            {selectedRegion && (
                <TableCell>
                    <RateInputCell
                        resource={res}
                        regionName={selectedRegion}
                        actualRate={actualRate}
                        onSave={handleSaveRate}
                        ghostInputStyle={ghostInputStyle}
                    />
                </TableCell>
            )}

            <TableCell sx={{ color: '#8b5cf6', fontWeight: 'bold' }}>
                {predictionsLoading ? (
                    <CircularProgress size={16} sx={{ color: '#8b5cf6' }} />
                ) : aiPrediction ? `₹${aiPrediction}` : '---'}
            </TableCell>

            <TableCell align="right" sx={styles.actionsBox}>
                <Box display="flex" justifyContent="flex-end" gap={0.5}>
                    <IconButton size="small" sx={{ color: '#00e5ff' }} onClick={() => handleOpenAIPredictionModal(res)} title="AI Prediction Chart">
                        <AutoGraphIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="primary" onClick={() => handleOpenBrandModal(res)} sx={styles.editIcon} title="Edit Brand Rates">
                        <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="secondary" onClick={() => handleOpenBrandChart(res)} sx={styles.chartIcon} title="Brand Price Chart">
                        <BarChartIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => openDeleteResourceModal(res.id, res.description, res.code)} sx={styles.deleteIcon}>
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Box>
            </TableCell>
        </TableRow>
    );
});

// 🔥 HIGH-PERFORMANCE MATERIAL REGISTRATION FORM
const RegisterMaterialForm = memo(({ onRegister }) => {
    const theme = useTheme();
    const styles = getResourcesTabStyles(theme);
    const [code, setCode] = useState("");
    const [desc, setDesc] = useState("");
    const [unit, setUnit] = useState("nos");

    const handleRegister = () => {
        if (!desc.trim()) return;
        onRegister({ code, description: desc, unit });
        setCode("");
        setDesc("");
    };

    return (
        <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3} md={2}>
                <TextField fullWidth size="small" label="CODE" value={code} onChange={e => setCode(e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6} md={6}>
                <TextField fullWidth size="small" label="DESCRIPTION" value={desc} onChange={e => setDesc(e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={3} md={2}>
                <TextField fullWidth size="small" label="UNIT" value={unit} onChange={e => setUnit(e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={12} md={2}>
                <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    sx={styles.registerButton}
                    onClick={handleRegister}
                >
                    REGISTER_ITEM
                </Button>
            </Grid>
        </Grid>
    );
});

const DEFAULT_LMR_GROUPS = [
    "LMRDSORCIVIL-DSOR CIVIL CODES ALL",
    "LMRDSORELECTRICAL-DSOR ELECTRICAL CODES ALL",
    "LMRCPWD1-MR CIVIL CODES FOR PWD"
];

export default function ResourcesTab({ regions, resources, masterBoqs = [], loadData }) {
    const theme = useTheme();
    const styles = getResourcesTabStyles(theme);
    const { formatCurrency } = useSettings();
    const fileInputRef = useRef(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [importRegion, setImportRegion] = useState("");
    const [newRegion, setNewRegion] = useState("");
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const currentQuarterIndex = Math.floor(currentMonth / 3);
    const [importYear, setImportYear] = useState(currentYear);
    const [importQuarter, setImportQuarter] = useState("JANMAR");

    // 🔥 LMR GROUP / CATEGORIES STATE (PERMANENTLY STORED IN DATABASE)
    const [lmrCategories, setLmrCategories] = useState(DEFAULT_LMR_GROUPS);

    // Fetch categories from database settings on mount
    useEffect(() => {
        let isMounted = true;
        const loadDbCategories = async () => {
            try {
                const res = await window.api.db.getSettings('lmr_categories');
                if (res && isMounted) {
                    let catArray = null;
                    if (Array.isArray(res)) {
                        catArray = res;
                    } else if (typeof res === 'string') {
                        try {
                            const parsed = JSON.parse(res);
                            if (Array.isArray(parsed)) catArray = parsed;
                        } catch (e) {}
                    } else if (typeof res === 'object') {
                        const val = res.value !== undefined ? res.value : (res.data?.value !== undefined ? res.data.value : res.data);
                        if (Array.isArray(val)) {
                            catArray = val;
                        } else if (typeof val === 'string') {
                            try {
                                const parsed = JSON.parse(val);
                                if (Array.isArray(parsed)) catArray = parsed;
                            } catch (e) {}
                        }
                    }

                    if (Array.isArray(catArray) && catArray.length > 0) {
                        setLmrCategories(catArray);
                        return;
                    }
                }
                // Initialize DB with default categories ONLY if no settings exist in DB yet
                await window.api.db.saveSettings('lmr_categories', JSON.stringify(DEFAULT_LMR_GROUPS));
            } catch (e) {
                console.error("Error fetching LMR categories from database:", e);
            }
        };
        loadDbCategories();
        return () => { isMounted = false; };
    }, []);

    const [importLmrCategory, setImportLmrCategory] = useState(DEFAULT_LMR_GROUPS[0]);
    const [selectedLmrFilter, setSelectedLmrFilter] = useState(DEFAULT_LMR_GROUPS[0]);

    useEffect(() => {
        if (lmrCategories.length > 0 && !importLmrCategory) {
            setImportLmrCategory(lmrCategories[0]);
            if (!selectedLmrFilter || selectedLmrFilter === "ALL") {
                setSelectedLmrFilter(lmrCategories[0]);
            }
        }
    }, [lmrCategories, importLmrCategory, selectedLmrFilter]);

    // 🔥 AUTO-TAG EXISTING DATABASE RESOURCES WITH FIRST CATEGORY ("LMRDSORCIVIL-DSOR CIVIL CODES ALL")
    const hasMigratedRef = useRef(false);
    useEffect(() => {
        if (hasMigratedRef.current || !resources || resources.length === 0 || !lmrCategories || lmrCategories.length === 0) return;
        
        const firstCategory = lmrCategories[0]; // "LMRDSORCIVIL-DSOR CIVIL CODES ALL"
        const untaggedResources = resources.filter(r => !r.rates?._category && !r.category);

        if (untaggedResources.length > 0) {
            hasMigratedRef.current = true;
            console.log(`[LMR Category DB Auto-Sync] Tagging ${untaggedResources.length} existing DB items with 1st category: "${firstCategory}"`);
            
            const bulkPayload = untaggedResources.map(r => {
                const updatedRates = { ...(r.rates || {}), _category: firstCategory };
                return {
                    id: r.id,
                    code: r.code,
                    description: r.description,
                    unit: r.unit,
                    rates: JSON.stringify(updatedRates),
                    rateHistory: JSON.stringify(r.rateHistory || [])
                };
            });

            window.api.db.bulkSaveResources(bulkPayload)
                .then(() => {
                    if (typeof loadData === 'function') loadData();
                })
                .catch(err => console.error("Failed to auto-tag existing resources in DB:", err));
        }
    }, [resources, lmrCategories, loadData]);

    const [addCategoryDialogOpen, setAddCategoryDialogOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [categoryError, setCategoryError] = useState("");

    const [deleteCategoryDialogConfig, setDeleteCategoryDialogConfig] = useState({ open: false, categoryName: "" });

    const openDeleteLmrCategoryDialog = useCallback((catName) => {
        setDeleteCategoryDialogConfig({ open: true, categoryName: catName });
    }, []);

    const handleConfirmDeleteLmrCategory = useCallback(async () => {
        const targetCat = deleteCategoryDialogConfig.categoryName;
        if (!targetCat) return;

        // 1. Remove category from lmrCategories list
        const updatedCategories = lmrCategories.filter(c => c !== targetCat);
        const finalCategories = updatedCategories.length > 0 ? updatedCategories : DEFAULT_LMR_GROUPS;
        setLmrCategories(finalCategories);

        try {
            // Save updated categories to database
            await window.api.db.saveSettings('lmr_categories', JSON.stringify(finalCategories));
        } catch (e) {
            console.error("Failed to update categories in database:", e);
        }

        // 2. Delete ALL data / resource records in database belonging to this category
        const itemsToDelete = resources.filter(r => {
            let resCat = r.category;
            if (!resCat && r.rates) {
                if (typeof r.rates === 'string') {
                    try {
                        const parsed = JSON.parse(r.rates);
                        resCat = parsed?._category;
                    } catch (e) {}
                } else if (typeof r.rates === 'object') {
                    resCat = r.rates._category;
                }
            }
            if (!resCat && lmrCategories[0] === targetCat) {
                resCat = targetCat;
            }
            return resCat === targetCat;
        });

        console.log(`[Category Delete] Deleting ${itemsToDelete.length} resource records for category "${targetCat}" from database...`);

        for (const item of itemsToDelete) {
            try {
                await window.api.db.deleteResource(item.id);
            } catch (err) {
                console.error(`Failed to delete resource ${item.id} from database:`, err);
            }
        }

        // Reset current active categories if deleted
        if (importLmrCategory === targetCat) {
            setImportLmrCategory(finalCategories[0]);
        }
        if (selectedLmrFilter === targetCat) {
            setSelectedLmrFilter(finalCategories[0]);
        }

        setDeleteCategoryDialogConfig({ open: false, categoryName: "" });
        if (typeof loadData === 'function') loadData();
    }, [deleteCategoryDialogConfig, lmrCategories, resources, importLmrCategory, selectedLmrFilter, loadData]);

    const handleAddLmrCategory = useCallback(async () => {
        const trimmed = newCategoryName.trim();
        if (!trimmed) {
            setCategoryError("Category name cannot be empty.");
            return;
        }
        if (lmrCategories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
            setCategoryError(`Category "${trimmed}" already exists.`);
            return;
        }
        const updated = [...lmrCategories, trimmed];
        setLmrCategories(updated);
        try {
            // Save updated categories directly into the DATABASE app_settings table
            await window.api.db.saveSettings('lmr_categories', JSON.stringify(updated));
        } catch (e) {
            console.error("Failed to save categories to database:", e);
        }
        setImportLmrCategory(trimmed);
        setSelectedLmrFilter(trimmed);
        setNewCategoryName("");
        setCategoryError("");
        setAddCategoryDialogOpen(false);
    }, [newCategoryName, lmrCategories]);

    useEffect(() => {
        if (importYear === currentYear) {
            const quarterMap = { "JANMAR": 0, "APRJUN": 1, "JULSEP": 2, "OCTDEC": 3 };
            if (quarterMap[importQuarter] > currentQuarterIndex) {
                const validQuarters = ["JANMAR", "APRJUN", "JULSEP", "OCTDEC"];
                setImportQuarter(validQuarters[currentQuarterIndex]);
            }
        }
    }, [importYear, importQuarter, currentYear, currentQuarterIndex]);

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;

    const [selectedResource, setSelectedResource] = useState(null);
    const [brandModalOpen, setBrandModalOpen] = useState(false);
    const [brandModalResource, setBrandModalResource] = useState(null);
    const [tempBrandRates, setTempBrandRates] = useState([]);
    const [selectedMonthYear, setSelectedMonthYear] = useState("");
    const [selectedRegion, setSelectedRegion] = useState(regions[0]?.name || "");
    const [brandSearchTerm, setBrandSearchTerm] = useState("");
    const [uploadStatus, setUploadStatus] = useState({ active: false, current: 0, total: 0, status: 'idle', message: '' });
    const [predictions, setPredictions] = useState({});
    const [predictionsLoading, setPredictionsLoading] = useState(false);
    
    // 🔥 BULK SELECTION STATE
    const [selectedIds, setSelectedIds] = useState(new Set());

    const handleSelectRow = useCallback((id, checked) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (checked) next.add(id);
            else next.delete(id);
            return next;
        });
    }, []);

    useEffect(() => {
        const fetchPredictions = async () => {
            if (!selectedRegion) return;
            setPredictionsLoading(true);
            try {
                const baseUrl = import.meta.env.VITE_PYTHON_API_URL || 'http://127.0.0.1:8000';
                const response = await fetch(`${baseUrl}/api/ml/predictions?region=${encodeURIComponent(selectedRegion)}`);
                const data = await response.json();
                if (data.success && data.predictions) {
                    setPredictions(data.predictions);
                } else {
                    setPredictions({});
                }
            } catch (err) {
                console.error("Failed to fetch predictions:", err);
            } finally {
                setPredictionsLoading(false);
            }
        };
        fetchPredictions();
    }, [selectedRegion]);

    useEffect(() => {
        if (regions.length > 0 && !selectedRegion) {
            setSelectedRegion(regions[0].name);
        }
    }, [regions, selectedRegion]);

    const [brandChartOpen, setBrandChartOpen] = useState(false);
    const [brandChartResource, setBrandChartResource] = useState(null);
    const [brandChartMonthYear, setBrandChartMonthYear] = useState("");
    const [analyticsTab, setAnalyticsTab] = useState("brands");

    const [aiPredictionModalOpen, setAiPredictionModalOpen] = useState(false);
    const [aiPredictionResource, setAiPredictionResource] = useState(null);

    const handleOpenAIPredictionModal = useCallback((res) => {
        setAiPredictionResource(res);
        setAiPredictionModalOpen(true);
    }, []);
    const [hideEmptyRates, setHideEmptyRates] = useState(true);

    const [deleteConfig, setDeleteConfig] = useState({
        open: false,
        id: null,
        name: "",
        type: null
    });

    const deferredSearchTerm = useDeferredValue(searchTerm);

    const getCurrentMonthKey = () => {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        return `${y}-${m}`;
    };

    const filteredResources = useMemo(() => {
        const masterBoqCodes = new Set(masterBoqs.map(b => b.itemCode).filter(Boolean));
        const normalizedSearch = !searchTerm || searchTerm.trim() === "" ? "" : deferredSearchTerm.toLowerCase();
        
        // Regex to identify assembly codes (e.g., 2.1, 2.37, 2.1.1, etc.)
        const assemblyCodeRegex = /^\d+\.\d+(\.\d+)*$/;
        
        let filtered = resources.filter(r => {
            // Do not show master databook data (assemblies that exist in masterBoqs)
            if (r.code && masterBoqCodes.has(r.code)) return false;
            
            // Also hide any orphaned assemblies that were deleted from masterBoqs but still exist in resources
            if (r.code && assemblyCodeRegex.test(String(r.code).trim())) return false;

            // Filter by LMR Group / Category
            if (selectedLmrFilter !== "ALL") {
                const resCat = r.rates?._category || r.category || lmrCategories[0];
                if (resCat !== selectedLmrFilter) return false;
            }

            if (normalizedSearch === "") {
                if (selectedRegion && hideEmptyRates) {
                    const rate = r.rates?.[selectedRegion];
                    return rate !== undefined && rate !== null && rate !== "" && Number(rate) >= 0;
                }
                return true;
            }

            const matchesSearch = (r.code || "").toLowerCase().includes(normalizedSearch) ||
                (r.description || "").toLowerCase().includes(normalizedSearch);
            if (!matchesSearch) return false;

            if (selectedRegion && hideEmptyRates) {
                const rate = r.rates?.[selectedRegion];
                return rate !== undefined && rate !== null && rate !== "" && Number(rate) >= 0;
            }
            return true;
        });

        // Deduplicate: Keep only the latest entry if there are duplicate codes/descriptions
        const uniqueFiltered = [];
        const seenKeys = new Set();
        for (let i = filtered.length - 1; i >= 0; i--) {
            const r = filtered[i];
            const key = (r.code || r.description || String(r.id)).toLowerCase().trim();
            if (!seenKeys.has(key)) {
                seenKeys.add(key);
                uniqueFiltered.unshift(r);
            }
        }
        filtered = uniqueFiltered;

        // Sort by code (natural sort: numeric when possible, fallback to string compare)
        return filtered.sort((a, b) => {
            const codeA = String(a.code || "");
            const codeB = String(b.code || "");
            
            const numA = Number(codeA);
            const numB = Number(codeB);
            if (!isNaN(numA) && !isNaN(numB)) {
                return numA - numB;
            }
            return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
        });
    }, [resources, masterBoqs, searchTerm, deferredSearchTerm, selectedRegion, hideEmptyRates, selectedLmrFilter, lmrCategories]);

    const totalPages = Math.ceil(filteredResources.length / itemsPerPage);
    const paginatedResources = useMemo(() => (
        filteredResources.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    ), [filteredResources, currentPage]);

    const startEntry = filteredResources.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
    const endEntry = Math.min(currentPage * itemsPerPage, filteredResources.length);

    const handleSearchChange = useCallback((val) => {
        setSearchTerm(val);
        setCurrentPage(1);
    }, []);

    const handleRegionChange = useCallback((e) => {
        setSelectedRegion(e.target.value);
        setCurrentPage(1);
    }, []);

    const handleHideEmptyRatesChange = useCallback((e) => {
        setHideEmptyRates(e.target.checked);
        setCurrentPage(1);
    }, []);

    const handleRegisterResource = useCallback(async (data) => {
        const activeCat = importLmrCategory || lmrCategories[0];
        const initialRates = { _category: activeCat };
        regions.forEach(r => {
            initialRates[r.name] = 0;
        });
        const payload = {
            ...data,
            rates: JSON.stringify(initialRates),
            rateHistory: JSON.stringify([])
        };
        await window.api.db.createResource(payload);
        loadData();
    }, [loadData, regions, importLmrCategory, lmrCategories]);

    // --- LOGIC HANDLERS ---

    // Triggered when user clicks delete icon on a resource row
    const openDeleteResourceModal = useCallback((id, description, code) => {
        setDeleteConfig({ open: true, id, name: description, type: 'resource', code });
    }, []);

    // Triggered when user clicks delete icon on a region (if you add that UI)
    const openDeleteRegionModal = (id, name) => {
        setDeleteConfig({ open: true, id, name, type: 'region' });
    };

    // The actual API call after confirmation
    const handleConfirmDelete = async () => {
        if (deleteConfig.type === 'bulk') {
            for (const id of selectedIds) {
                const res = resources.find(r => r.id === id);
                if (!res) continue;
                
                // Find all hidden duplicates in the Postgres database and purge them
                const duplicates = resources.filter(r => 
                    (r.code || "").toLowerCase().trim() === (res.code || "").toLowerCase().trim()
                );
                for (const dup of duplicates) {
                    await window.api.db.deleteResource(dup.id);
                }
                
                try {
                    if (res.code) {
                        const baseUrl = import.meta.env.VITE_PYTHON_API_URL || 'http://127.0.0.1:8000';
                        await fetch(`${baseUrl}/api/ml/training-data/${encodeURIComponent(res.code)}`, {
                            method: 'DELETE'
                        });
                    }
                } catch (err) {
                    console.error("Failed to bulk delete from ML backend:", err);
                }
            }
            setSelectedIds(new Set());
        } else if (deleteConfig.type === 'resource') {
            if (deleteConfig.code) {
                // Find all hidden duplicates in the Postgres database and purge them
                const duplicates = resources.filter(r => 
                    (r.code || "").toLowerCase().trim() === (deleteConfig.code || "").toLowerCase().trim()
                );
                for (const dup of duplicates) {
                    await window.api.db.deleteResource(dup.id);
                }
            } else {
                await window.api.db.deleteResource(deleteConfig.id);
            }
            try {
                if (deleteConfig.code) {
                    const baseUrl = import.meta.env.VITE_PYTHON_API_URL || 'http://127.0.0.1:8000';
                    await fetch(`${baseUrl}/api/ml/training-data/${encodeURIComponent(deleteConfig.code)}`, {
                        method: 'DELETE'
                    });
                }
            } catch (err) {
                console.error("Failed to delete from ML backend:", err);
            }
        } else if (deleteConfig.type === 'region') {
            await window.api.db.deleteRegion(deleteConfig.id);
        }
        setDeleteConfig({ open: false, id: null, name: "", type: null, code: null });
        loadData();
    };

    const updateResourceRate = useCallback(async (id, field, value, regionName = null) => {
        const res = resources.find(r => r.id === id);
        if (field === 'rates' && regionName) {
            const currentHistory = Array.isArray(res.rateHistory) ? res.rateHistory : [];
            const updatedHistory = [
                ...currentHistory,
                { date: new Date().toISOString().split('T')[0], rate: value[regionName], region: regionName }
            ];
            await window.api.db.updateResource(id, 'rates', typeof value === 'string' ? value : JSON.stringify(value));
            await window.api.db.updateResource(id, 'rateHistory', JSON.stringify(updatedHistory));

            // Sync the updated rate to the ML database
            try {
                if (res && res.description) {
                    const baseUrl = import.meta.env.VITE_PYTHON_API_URL || 'http://127.0.0.1:8000';
                    await fetch(`${baseUrl}/api/ml/train-local-rates`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            rates: [{
                                resource: res.description.trim(),
                                rate: Number(value[regionName]),
                                region: regionName
                            }]
                        })
                    });
                }
            } catch (err) {
                console.error("Failed to sync rate with ML backend:", err);
            }

        } else {
            let finalValue = value;
            if (field === 'rates' && typeof value === 'object') {
                finalValue = JSON.stringify(value);
            }
            await window.api.db.updateResource(id, field, finalValue);
        }
        
        if (res) {
            if (field === 'rates') {
                try {
                    res.rates = typeof value === 'string' ? JSON.parse(value) : value;
                } catch (e) {
                    // Ignore parse error
                }
            } else {
                res[field] = value;
            }
        }
        
        loadData();
    }, [loadData, resources]);

    const handleOpenBrandModal = useCallback((res) => {
        setBrandModalResource(res);
        const ratesObj = res.rates || {};
        const history = (ratesObj.brandRatesHistory && typeof ratesObj.brandRatesHistory === 'object')
            ? ratesObj.brandRatesHistory
            : {};
        const currentKey = getCurrentMonthKey();
        const currentMonthData = Array.isArray(history[currentKey]) ? history[currentKey] : [];
        setSelectedMonthYear(currentKey);
        setTempBrandRates(JSON.parse(JSON.stringify(currentMonthData)));
        setBrandSearchTerm("");
        setBrandModalOpen(true);
    }, []);

    const handleOpenBrandChart = useCallback((res) => {
        setBrandChartResource(res);
        setBrandChartMonthYear(getCurrentMonthKey());
        setBrandChartOpen(true);
    }, []);

    // Stable cell save handler
    const handleSaveRate = useCallback(async (id, newVal) => {
        const res = resources.find(r => r.id === id);
        if (!res) return;
        const updatedRates = { ...res.rates, [selectedRegion]: newVal };
        await updateResourceRate(id, 'rates', updatedRates, selectedRegion);
    }, [resources, selectedRegion, updateResourceRate]);

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file || !importRegion) return;

        setUploadStatus({ active: true, current: 0, total: 0 });

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const data = evt.target.result;
                const XLSX = await import('xlsx');
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const rawSheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

                let headerRowIdx = -1;
                for (let i = 0; i < Math.min(10, rawSheetData.length); i++) {
                    const row = rawSheetData[i];
                    if (row.some(cell => typeof cell === 'string' && cell.toLowerCase().includes('code'))) {
                        headerRowIdx = i; break;
                    }
                }

                if (headerRowIdx === -1) {
                    setUploadStatus({ active: false, current: 0, total: 0 });
                    return alert("Upload Failed: Could not find a header row containing 'Code'.");
                }

                const headers = rawSheetData[headerRowIdx].map(h => typeof h === 'string' ? h.toLowerCase().trim() : '');
                const codeIdx = headers.findIndex(h => h === 'code' || h.includes('code'));
                const descIdx = headers.findIndex(h => h.includes('description') || h.includes('item'));
                const unitIdx = headers.findIndex(h => h === 'unit' || h.includes('unit'));
                const rateIdx = headers.findIndex(h => h.includes('rate') || h.includes('price'));

                if (codeIdx === -1 || descIdx === -1 || rateIdx === -1) {
                    setUploadStatus({
                        active: true,
                        current: 0,
                        total: 0,
                        status: 'error',
                        message: "Missing required columns. Ensure your file has 'Code', 'Description', and 'Rate' headers."
                    });
                    return;
                }

                const formattedData = [];
                for (let i = headerRowIdx + 1; i < rawSheetData.length; i++) {
                    const row = rawSheetData[i];
                    if (!row || row.length === 0) continue;

                    const code = String(row[codeIdx] || '').trim();
                    const desc = String(row[descIdx] || '').trim();
                    const unit = String(row[unitIdx] || 'nos').trim();
                    const rate = Number(row[rateIdx] || 0);

                    if (code && desc) formattedData.push({ code, description: desc, unit, rate, category: importLmrCategory || lmrCategories[0] });
                }

                // Deduplicate formattedData before processing to prevent inserting duplicate DB records
                const uniqueFormattedData = [];
                const seenUploadKeys = new Set();
                for (let i = formattedData.length - 1; i >= 0; i--) {
                    const item = formattedData[i];
                    const key = item.code.toLowerCase().trim();
                    if (!seenUploadKeys.has(key)) {
                        seenUploadKeys.add(key);
                        uniqueFormattedData.unshift(item);
                    }
                }

                if (uniqueFormattedData.length === 0) {
                    setUploadStatus({
                        active: true,
                        current: 0,
                        total: 0,
                        status: 'error',
                        message: "No valid material rows found under the headers."
                    });
                    return;
                }

                const total = uniqueFormattedData.length;
                setUploadStatus({ active: true, current: 0, total, status: 'loading', message: "Parsing Excel file..." });

                const activeCat = importLmrCategory || lmrCategories[0];
                const bulkPayload = uniqueFormattedData.map(item => {
                    let existingRes = resources.find(r => r.code === item.code);
                    if (existingRes) {
                        const newRates = { ...existingRes.rates, [importRegion]: item.rate, _category: activeCat };
                        const currentHistory = Array.isArray(existingRes.rateHistory) ? existingRes.rateHistory : [];
                        const updatedHistory = [
                            ...currentHistory,
                            { date: new Date().toISOString().split('T')[0], rate: item.rate, region: importRegion, category: activeCat }
                        ];
                        return {
                            id: existingRes.id,
                            code: existingRes.code,
                            description: existingRes.description,
                            unit: existingRes.unit,
                            rates: JSON.stringify(newRates),
                            rateHistory: JSON.stringify(updatedHistory)
                        };
                    } else {
                        return {
                            id: null,
                            code: item.code,
                            description: item.description,
                            unit: item.unit,
                            rates: JSON.stringify({ [importRegion]: item.rate, _category: activeCat }),
                            rateHistory: JSON.stringify([{ date: new Date().toISOString().split('T')[0], rate: item.rate, region: importRegion, category: activeCat }])
                        };
                    }
                });

                const chunkSize = 50;
                for (let i = 0; i < total; i += chunkSize) {
                    const chunk = bulkPayload.slice(i, i + chunkSize);
                    await window.api.db.bulkSaveResources(chunk);
                    setUploadStatus({ active: true, current: Math.min(i + chunkSize, total), total, status: 'loading', message: `Processing items into [${importRegion}] market...` });
                }

                let trainingProgress = 0;
                setUploadStatus({ active: true, current: 0, total: 100, status: 'loading', title: "TRAINING_AI_MODEL", message: "Training AI model with new data..." });
                const trainingInterval = setInterval(() => {
                    trainingProgress += Math.floor(Math.random() * 5) + 1;
                    if (trainingProgress > 95) trainingProgress = 95;
                    setUploadStatus(prev => ({ ...prev, current: trainingProgress, total: 100 }));
                }, 500);

                // --- SEND DATA TO MACHINE LEARNING BACKEND FOR CONTINUOUS TRAINING ---
                try {
                    const formData = new FormData();
                    formData.append("file", file);
                    formData.append("months_to_predict", 1);
                    formData.append("past_year", importYear);
                    formData.append("quarter", importQuarter);
                    formData.append("region", importRegion);

                    const baseUrl = import.meta.env.VITE_PYTHON_API_URL || 'http://127.0.0.1:8000';
                    const mlResponse = await fetch(`${baseUrl}/api/ml/train-predict`, {
                        method: "POST",
                        body: formData
                    });
                    
                    if (mlResponse.ok) {
                        const mlData = await mlResponse.json();
                        if (mlData.error) {
                            clearInterval(trainingInterval);
                            setUploadStatus({
                                active: true,
                                current: 0,
                                total: 0,
                                status: 'error',
                                message: mlData.error
                            });
                            return; // Stop here, do not show success message
                        }
                        
                        // Immediately fetch updated predictions for the current selected region
                        if (selectedRegion) {
                            const predResponse = await fetch(`${baseUrl}/api/ml/predictions?region=${encodeURIComponent(selectedRegion)}`);
                            const predData = await predResponse.json();
                            if (predData.success && predData.predictions) {
                                setPredictions(predData.predictions);
                            }
                        }
                    }
                } catch (mlErr) {
                    console.error("Machine Learning training request failed:", mlErr);
                }

                clearInterval(trainingInterval);
                setUploadStatus({
                    active: true,
                    current: 100,
                    total: 100,
                    status: 'success',
                    message: `${importRegion} region data uploaded successfully`
                });
                loadData();
                setTimeout(() => {
                    setUploadStatus(prev => ({ ...prev, active: false }));
                }, 3000);
            } catch (err) {
                console.error("Import Error:", err);
                setUploadStatus({
                    active: true,
                    current: 0,
                    total: 0,
                    status: 'error',
                    message: "Failed to parse Excel file. Is the file corrupted?"
                });
            } finally {
                if (fileInputRef.current) fileInputRef.current.value = "";
            }
        };
        reader.readAsBinaryString(file);
    };

    const downloadTemplate = async () => {
        try {
            const XLSX = await import('xlsx');
            const headers = [["No", "Code", "Description", "Unit", "Lmr Rate (₹)"]];
            // Add some sample data rows
            const sampleData = [
                [1, "0001", "Hire charges of Coaltar Boiler 900 to 1400 litres", "Day", 100],
                [2, "0002", "Bitumen Emulsion", "Tonne", 45000]
            ];
            const sheetData = [...headers, ...sampleData];
            const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "LMR Template");

            const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'binary' });
            const s2ab = (s) => {
                const buf = new ArrayBuffer(s.length);
                const view = new Uint8Array(buf);
                for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
                return buf;
            };
            const blob = new Blob([s2ab(wbout)], { type: "application/octet-stream" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "LMR_Upload_Template.xlsx";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Failed to generate template:", error);
            alert("Error downloading template.");
        }
    };

    // --- STYLES FOR GHOST INPUTS ---
    const ghostInputStyle = styles.ghostInput;

    const InflationDrawer = ({ open, onClose, resource, formatCurrency }) => {
        if (!resource) return null;
        const history = (resource.rateHistory || []).sort((a, b) => new Date(a.date) - new Date(b.date));
        const latest = history.length > 0 ? history[history.length - 1].rate : 0;
        const oldest = history.length > 0 ? history[0].rate : 0;
        const trend = oldest > 0 ? ((latest - oldest) / oldest) * 100 : 0;
        const drawerStyles = getInflationDrawerStyles(theme, trend);

        return (
            <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { bgcolor: 'background.default', backgroundImage: 'none' } }}>
                <Box sx={drawerStyles.drawerBox}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                        <Typography variant="h6" sx={drawerStyles.drawerHeader}>MARKET_ANALYTICS</Typography>
                        <IconButton onClick={onClose} color="inherit"><CloseIcon /></IconButton>
                    </Box>
                    <Typography variant="h5" fontWeight="bold" color="primary.main" sx={drawerStyles.drawerTitle}>{resource.description}</Typography>
                    <Typography variant="caption" sx={drawerStyles.drawerSubtitle}>CODE: {resource.code}</Typography>

                    <Box display="flex" gap={2} my={4} flexDirection={{ xs: 'column', sm: 'row' }}>
                        <Paper elevation={0} sx={drawerStyles.paper1}>
                            <Typography variant="caption" color="text.secondary">LATEST_PRICE</Typography>
                            <Typography variant="h6" sx={drawerStyles.priceText}>{formatCurrency(latest)}</Typography>
                        </Paper>
                        <Paper elevation={0} sx={drawerStyles.paper2}>
                            <Typography variant="caption" color="text.secondary">MARKET_TREND</Typography>
                            <Box display="flex" alignItems="center" color={trend >= 0 ? 'error.main' : 'success.main'}>
                                {trend >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
                                <Typography variant="h6" ml={1} sx={drawerStyles.priceText}>{Math.abs(trend).toFixed(1)}%</Typography>
                            </Box>
                        </Paper>
                    </Box>

                    <Box sx={{ height: 300, mt: 4 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={history}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="date" tick={{ fontSize: 10, fill: theme.palette.text.secondary }} stroke="none" />
                                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: theme.palette.text.secondary }} stroke="none" />
                                <RechartsTooltip contentStyle={{ backgroundColor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: '8px' }} formatter={(val) => formatCurrency(val)} />
                                <Area type="monotone" dataKey="rate" stroke={theme.palette.primary.main} fill={theme.palette.primary.main} fillOpacity={0.2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Box>
                </Box>
            </Drawer>
        );
    };

    const resourceRows = useMemo(() => paginatedResources.map((res, index) => {
        const aiPrediction = predictions[(res.description || "").trim()]?.predicted_rate;
        const actualRate = predictions[(res.description || "").trim()]?.actual_rate;

        // Ensure we always use the latest actual rate from ML backend if available, as a fallback to DB state, or overriding it.
        // The prompt says "show accurate latest region wise rate in rate field" and the modal rate is the correct one.
        // We will pass the ML actualRate as a prop to RateInputCell, but RateInputCell manages its own state.
        
        return (
            <ResourceRow
                key={res.id}
                res={res}
                aiPrediction={aiPrediction}
                actualRate={actualRate}
                predictionsLoading={predictionsLoading}
                index={index}
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
                selectedRegion={selectedRegion}
                handleSaveRate={handleSaveRate}
                handleOpenBrandModal={handleOpenBrandModal}
                handleOpenBrandChart={handleOpenBrandChart}
                handleOpenAIPredictionModal={handleOpenAIPredictionModal}
                openDeleteResourceModal={openDeleteResourceModal}
                isSelected={selectedIds.has(res.id)}
                onSelect={handleSelectRow}
                ghostInputStyle={ghostInputStyle}
                theme={theme}
            />
        );
    }), [currentPage, openDeleteResourceModal, paginatedResources, theme, handleOpenBrandModal, handleOpenBrandChart, handleOpenAIPredictionModal, selectedRegion, ghostInputStyle, itemsPerPage, handleSaveRate, predictions, selectedIds, handleSelectRow]);

    return (
        <Box>
            {/* TOP CONTROLS (IMPORT & REGIONS) */}
            <Grid container spacing={3} mb={3}>
                <Grid item xs={12} md={7} lg={8}>
                    <Paper elevation={0} sx={styles.paperCard}>
                        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2.5} flexWrap="wrap" gap={1}>
                            <Box display="flex" alignItems="center" gap={1.5}>
                                <Avatar sx={{ bgcolor: alpha('#00e5ff', 0.1), color: '#00e5ff', width: 38, height: 38, border: '1px solid rgba(0, 229, 255, 0.3)' }}>
                                    <CloudUploadIcon fontSize="small" />
                                </Avatar>
                                <Box>
                                    <Typography variant="subtitle1" fontWeight="bold" sx={{ color: '#fff', fontFamily: "'Inter', 'Roboto', sans-serif", fontSize: '15px', letterSpacing: '0.3px', display: 'flex', alignItems: 'center', gap: 1 }}>
                                        LMR Data Import & Category Center
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>
                                        IMPORT_EXCEL_LMR // CATEGORY_MANAGEMENT
                                    </Typography>
                                </Box>
                            </Box>
                            <Chip 
                                icon={<CategoryIcon style={{ color: '#00e5ff', fontSize: 14 }} />}
                                label={importLmrCategory ? importLmrCategory.split('-')[0] : "DEFAULT"} 
                                size="small" 
                                sx={{ 
                                    bgcolor: alpha('#00e5ff', 0.12), 
                                    color: '#00e5ff', 
                                    border: '1px solid rgba(0,229,255,0.3)', 
                                    fontFamily: "'JetBrains Mono', monospace", 
                                    fontSize: '11px', 
                                    fontWeight: 'bold' 
                                }} 
                            />
                        </Box>

                        <Grid container spacing={2} alignItems="center">
                            {/* LMR GROUP / CATEGORY DROPDOWN */}
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    select
                                    fullWidth
                                    size="small"
                                    label="LMR GROUP / CATEGORY"
                                    value={importLmrCategory}
                                    onChange={(e) => {
                                        if (e.target.value === '__ADD_NEW_LMR_CATEGORY__') {
                                            setAddCategoryDialogOpen(true);
                                        } else {
                                            setImportLmrCategory(e.target.value);
                                        }
                                    }}
                                    SelectProps={{
                                        renderValue: (selected) => (
                                            <Typography variant="body2" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: '#fff', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                                {selected}
                                            </Typography>
                                        ),
                                        MenuProps: {
                                            PaperProps: {
                                                sx: {
                                                    bgcolor: '#0a101d',
                                                    backgroundImage: 'none',
                                                    border: '1px solid rgba(0,229,255,0.25)',
                                                    boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
                                                    maxHeight: 300,
                                                    '& .MuiMenuItem-root': { fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', py: 1 }
                                                }
                                            }
                                        }
                                    }}
                                >
                                    {lmrCategories.map((cat) => {
                                        const isCustom = !DEFAULT_LMR_GROUPS.includes(cat);
                                        return (
                                            <MenuItem key={cat} value={cat} sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Typography variant="body2" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', flexGrow: 1 }}>
                                                    {cat}
                                                </Typography>
                                                {isCustom && (
                                                    <IconButton 
                                                        size="small" 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openDeleteLmrCategoryDialog(cat);
                                                        }} 
                                                        sx={{ color: 'rgba(255,255,255,0.4)', '&:hover': { color: '#ef4444', bgcolor: 'rgba(239, 68, 68, 0.15)' }, ml: 1, p: 0.5 }}
                                                        title="Delete Custom Category & DB Data"
                                                    >
                                                        <DeleteIcon style={{ fontSize: 15 }} />
                                                    </IconButton>
                                                )}
                                            </MenuItem>
                                        );
                                    })}
                                    <Divider sx={{ my: 0.5, borderColor: 'rgba(255,255,255,0.1)' }} />
                                    <MenuItem value="__ADD_NEW_LMR_CATEGORY__" sx={{ color: '#00e5ff', fontWeight: 'bold', fontFamily: "'JetBrains Mono', monospace", display: 'flex', alignItems: 'center' }}>
                                        <AddIcon fontSize="small" sx={{ mr: 1 }} /> + ADD NEW CATEGORY...
                                    </MenuItem>
                                </TextField>
                            </Grid>

                            {/* TARGET REGION */}
                            <Grid item xs={12} sm={6}>
                                <TextField 
                                    select 
                                    fullWidth 
                                    size="small" 
                                    label="TARGET REGION" 
                                    value={importRegion} 
                                    onChange={e => setImportRegion(e.target.value)}
                                    SelectProps={{
                                        MenuProps: {
                                            PaperProps: {
                                                sx: {
                                                    bgcolor: '#0a101d', backgroundImage: 'none', border: '1px solid rgba(0,229,255,0.2)',
                                                    '& .MuiMenuItem-root': { fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }
                                                }
                                            }
                                        }
                                    }}
                                >
                                    {regions.map(r => <MenuItem key={r.id} value={r.name}>{r.name}</MenuItem>)}
                                </TextField>
                            </Grid>

                            {/* YEAR */}
                            <Grid item xs={6} sm={6}>
                                <TextField 
                                    select 
                                    fullWidth 
                                    size="small" 
                                    label="YEAR" 
                                    value={importYear} 
                                    onChange={e => setImportYear(e.target.value)}
                                    SelectProps={{
                                        MenuProps: {
                                            PaperProps: {
                                                sx: {
                                                    bgcolor: '#0a101d', backgroundImage: 'none', border: '1px solid rgba(0,229,255,0.2)',
                                                    '& .MuiMenuItem-root': { fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }
                                                }
                                            }
                                        }
                                    }}
                                >
                                    {Array.from({ length: 6 }, (_, i) => currentYear - 5 + i).map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                                </TextField>
                            </Grid>

                            {/* QUARTER */}
                            <Grid item xs={6} sm={6}>
                                <TextField 
                                    select 
                                    fullWidth 
                                    size="small" 
                                    label="QUARTER" 
                                    value={importQuarter} 
                                    onChange={e => setImportQuarter(e.target.value)}
                                    SelectProps={{
                                        MenuProps: {
                                            PaperProps: {
                                                sx: {
                                                    bgcolor: '#0a101d', backgroundImage: 'none', border: '1px solid rgba(0,229,255,0.2)',
                                                    '& .MuiMenuItem-root': { fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }
                                                }
                                            }
                                        }
                                    }}
                                >
                                    <MenuItem value="JANMAR" disabled={importYear === currentYear && currentQuarterIndex < 0}>JANMAR</MenuItem>
                                    <MenuItem value="APRJUN" disabled={importYear === currentYear && currentQuarterIndex < 1}>APRJUN</MenuItem>
                                    <MenuItem value="JULSEP" disabled={importYear === currentYear && currentQuarterIndex < 2}>JULSEP</MenuItem>
                                    <MenuItem value="OCTDEC" disabled={importYear === currentYear && currentQuarterIndex < 3}>OCTDEC</MenuItem>
                                </TextField>
                            </Grid>

                            {/* ACTION BUTTONS */}
                            <Grid item xs={12} sm={4}>
                                <input type="file" accept=".xlsx, .xls, .csv" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
                                <Button fullWidth variant="contained" startIcon={<UploadIcon />} disabled={!importRegion} onClick={() => fileInputRef.current.click()} sx={styles.uploadButton}>
                                    UPLOAD DATA
                                </Button>
                            </Grid>

                            <Grid item xs={12} sm={4}>
                                <Button fullWidth variant="outlined" startIcon={<DownloadIcon />} onClick={downloadTemplate} sx={styles.actionButton}>
                                    TEMPLATE
                                </Button>
                            </Grid>

                            <Grid item xs={12} sm={4}>
                                <Button fullWidth variant="outlined" startIcon={<LanguageIcon />} onClick={() => window.open('https://price.kerala.gov.in/price3_pmu/', '_blank')} sx={styles.actionButton}>
                                    KERALA PWD
                                </Button>
                            </Grid>
                        </Grid>
                    </Paper>
                </Grid>

                {/* MANAGE REGIONS CARD */}
                <Grid item xs={12} md={5} lg={4}>
                    <Paper elevation={0} sx={styles.paperCard}>
                        <Box display="flex" alignItems="center" gap={1.5} mb={2.5}>
                            <Avatar sx={{ bgcolor: alpha('#8b5cf6', 0.1), color: '#8b5cf6', width: 38, height: 38, border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                                <PublicIcon fontSize="small" />
                            </Avatar>
                            <Box>
                                <Typography variant="subtitle1" fontWeight="bold" sx={{ color: '#fff', fontFamily: "'Inter', 'Roboto', sans-serif", fontSize: '15px', letterSpacing: '0.3px' }}>
                                    Regional Management
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>
                                    MANAGE_REGIONS // ACTIVE_ZONES
                                </Typography>
                            </Box>
                        </Box>

                        <Box display="flex" gap={1.5} flexDirection="column">
                            <Box display="flex" gap={1.5}>
                                <TextField 
                                    fullWidth 
                                    size="small" 
                                    label="NEW REGION NAME" 
                                    value={newRegion} 
                                    onChange={e => setNewRegion(e.target.value)} 
                                />
                                <Button 
                                    variant="contained" 
                                    disabled={!newRegion} 
                                    onClick={async () => { await window.api.db.createRegion(newRegion); setNewRegion(""); loadData(); }} 
                                    sx={styles.addRegionButton}
                                >
                                    <AddIcon fontSize="small" sx={{ mr: 0.5 }} /> ADD
                                </Button>
                            </Box>

                            {/* REGION CHIPS LIST */}
                            {regions && regions.length > 0 && (
                                <Box mt={1} pt={1.5} borderTop="1px dashed rgba(255,255,255,0.1)">
                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', fontFamily: "'JetBrains Mono', monospace", display: 'block', mb: 1, fontSize: '10px' }}>
                                        AVAILABLE REGIONS ({regions.length}):
                                    </Typography>
                                    <Box display="flex" gap={0.8} flexWrap="wrap" maxHeight={90} sx={{ overflowY: 'auto' }}>
                                        {regions.map(r => (
                                            <Chip 
                                                key={r.id} 
                                                label={r.name} 
                                                size="small" 
                                                onClick={() => setSelectedRegion(r.name)}
                                                sx={{ 
                                                    borderRadius: 1.5, 
                                                    fontFamily: "'JetBrains Mono', monospace", 
                                                    fontSize: '11px',
                                                    cursor: 'pointer',
                                                    bgcolor: selectedRegion === r.name ? alpha('#00e5ff', 0.2) : 'rgba(255,255,255,0.04)',
                                                    borderColor: selectedRegion === r.name ? '#00e5ff' : 'rgba(255,255,255,0.12)',
                                                    borderWidth: 1,
                                                    borderStyle: 'solid',
                                                    color: selectedRegion === r.name ? '#00e5ff' : 'rgba(255,255,255,0.7)',
                                                    fontWeight: selectedRegion === r.name ? 'bold' : 'normal',
                                                    '&:hover': { borderColor: '#00e5ff', bgcolor: alpha('#00e5ff', 0.1) }
                                                }} 
                                            />
                                        ))}
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            {/* SEARCH & QUICK ADD */}
            <Paper elevation={0} sx={styles.searchCard}>
                {/* SECTION 1: SEARCH & FILTERS */}
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <SearchIcon color="primary" fontSize="small" />
                    <Typography variant="subtitle2" fontWeight="bold" sx={styles.sectionTitle}>
                        SEARCH_AND_FILTERS
                    </Typography>
                </Box>
                <Grid container spacing={2} alignItems="center" mb={3}>
                    <Grid item xs={12} sm={4} md={4}>
                        <SearchInput value={searchTerm} onChange={handleSearchChange} />
                    </Grid>

                    <Grid item xs={12} sm={3} md={3}>
                        <TextField
                            select
                            fullWidth
                            size="small"
                            label="SELECT REGION"
                            value={selectedRegion}
                            onChange={handleRegionChange}
                        >
                            {regions.map(r => <MenuItem key={r.id} value={r.name}>{r.name}</MenuItem>)}
                        </TextField>
                    </Grid>

                    <Grid item xs={12} sm={3} md={3}>
                        <TextField
                            select
                            fullWidth
                            size="small"
                            label="FILTER BY LMR GROUP"
                            value={selectedLmrFilter}
                            onChange={e => setSelectedLmrFilter(e.target.value)}
                            SelectProps={{
                                renderValue: (selected) => (
                                    <Typography variant="body2" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: '#fff', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                        {selected === "ALL" ? "ALL LMR GROUPS" : selected}
                                    </Typography>
                                ),
                                MenuProps: {
                                    PaperProps: {
                                        sx: {
                                            bgcolor: '#0a101d',
                                            backgroundImage: 'none',
                                            border: '1px solid rgba(0,229,255,0.2)',
                                            '& .MuiMenuItem-root': { fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }
                                        }
                                    }
                                }
                            }}
                        >
                            <MenuItem value="ALL">ALL LMR GROUPS</MenuItem>
                            {lmrCategories.map((cat) => {
                                const isCustom = !DEFAULT_LMR_GROUPS.includes(cat);
                                return (
                                    <MenuItem key={cat} value={cat} sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="body2" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', flexGrow: 1 }}>
                                            {cat}
                                        </Typography>
                                        {isCustom && (
                                            <IconButton 
                                                size="small" 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openDeleteLmrCategoryDialog(cat);
                                                }} 
                                                sx={{ color: 'rgba(255,255,255,0.4)', '&:hover': { color: '#ef4444', bgcolor: 'rgba(239, 68, 68, 0.15)' }, ml: 1, p: 0.5 }}
                                                title="Delete Custom Category & DB Data"
                                            >
                                                <DeleteIcon style={{ fontSize: 15 }} />
                                            </IconButton>
                                        )}
                                    </MenuItem>
                                );
                            })}
                        </TextField>
                    </Grid>

                    <Grid item xs={12} sm={2} md={2}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={hideEmptyRates}
                                    onChange={handleHideEmptyRatesChange}
                                    color="primary"
                                    size="small"
                                />
                            }
                            label="Hide Empty"
                            sx={styles.switchControl}
                        />
                    </Grid>
                </Grid>

                <Divider sx={styles.divider} />

                {/* SECTION 2: REGISTER NEW MATERIAL */}
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <AddCircleOutlineIcon color="primary" fontSize="small" />
                    <Typography variant="subtitle2" fontWeight="bold" sx={styles.sectionTitle}>
                        QUICK_REGISTER_NEW_MATERIAL
                    </Typography>
                </Box>
                <RegisterMaterialForm onRegister={handleRegisterResource} />
            </Paper>

            {/* 🔥 BEAUTIFIED EXCEL-STYLE TABLE */}
            <TableContainer component={Paper} elevation={0} sx={styles.tableContainer}>
                {selectedIds.size > 0 && (
                    <Box sx={{ p: 2, display: 'flex', alignItems: 'center', bgcolor: 'rgba(255, 23, 68, 0.1)', borderBottom: '1px solid rgba(255, 23, 68, 0.2)' }}>
                        <Typography variant="subtitle2" sx={{ flexGrow: 1, color: '#ff1744', fontWeight: 'bold' }}>
                            {selectedIds.size} ITEMS SELECTED
                        </Typography>
                        <Button 
                            variant="contained" 
                            color="error" 
                            startIcon={<DeleteSweepIcon />}
                            onClick={() => setDeleteConfig({ open: true, type: 'bulk', count: selectedIds.size })}
                        >
                            BULK DELETE
                        </Button>
                    </Box>
                )}
                <Table size="small" sx={styles.table}>
                    <TableHead sx={styles.tableHead}>
                        <TableRow>
                            <TableCell padding="checkbox">
                                <Checkbox
                                    color="primary"
                                    indeterminate={paginatedResources.length > 0 && paginatedResources.some(r => selectedIds.has(r.id)) && !paginatedResources.every(r => selectedIds.has(r.id))}
                                    checked={paginatedResources.length > 0 && paginatedResources.every(r => selectedIds.has(r.id))}
                                    onChange={(e) => {
                                        const newIds = new Set(selectedIds);
                                        if (e.target.checked) {
                                            paginatedResources.forEach(r => newIds.add(r.id));
                                        } else {
                                            paginatedResources.forEach(r => newIds.delete(r.id));
                                        }
                                        setSelectedIds(newIds);
                                    }}
                                />
                            </TableCell>
                            <TableCell sx={styles.headerCellNo}>NO</TableCell>
                            <TableCell sx={styles.headerCellCode}>CODE</TableCell>
                            <TableCell sx={styles.headerCell}>DESCRIPTION</TableCell>
                            <TableCell sx={styles.headerCell}>UNIT</TableCell>
                            {selectedRegion && (
                                <TableCell sx={styles.headerCellRate}>
                                    {selectedRegion.toUpperCase()} RATE
                                </TableCell>
                            )}
                            <TableCell sx={{ ...styles.headerCell, color: '#8b5cf6' }}>AI PREDICTION</TableCell>
                            <TableCell align="right" sx={styles.headerCellRight}></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {resourceRows}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* PROFESSIONAL INTEGRATED PAGINATION FOOTER */}
            <Box display="flex" justifyContent="space-between" alignItems="center" sx={styles.paginationContainer}>
                <Typography variant="caption" sx={styles.paginationText}>
                    SHOWING {startEntry}–{endEntry} OF {filteredResources.length} ENTRIES
                </Typography>
                <Pagination
                    count={totalPages}
                    page={currentPage}
                    onChange={(e, v) => setCurrentPage(v)}
                    color="primary"
                    size="medium"
                    showFirstButton
                    showLastButton
                    sx={styles.paginationItem}
                />
            </Box>

            {/* INFLATION DRAWER */}
            <InflationDrawer
                open={!!selectedResource}
                onClose={() => setSelectedResource(null)}
                resource={selectedResource}
                formatCurrency={formatCurrency}
            />

            {/* BRAND RATES MODAL */}
            <BrandRatesModal
                open={brandModalOpen}
                onClose={() => setBrandModalOpen(false)}
                resource={brandModalResource}
                regions={regions}
                selectedRegion={selectedRegion}
                updateResourceRate={updateResourceRate}
            />

            {/* BRAND PRICE CHART MODAL */}
            <BrandPriceChartModal
                open={brandChartOpen}
                onClose={() => setBrandChartOpen(false)}
                resource={brandChartResource}
                regions={regions}
                formatCurrency={formatCurrency}
            />

            {/* AI PREDICTION TREND MODAL */}
            <AIPredictionChartModal
                open={aiPredictionModalOpen}
                onClose={() => setAiPredictionModalOpen(false)}
                resource={aiPredictionResource}
                region={selectedRegion}
                formatCurrency={formatCurrency}
            />

            {/* --- INTEGRATED DELETE CONFIRMATION MODAL --- */}
            <ConfirmDeleteModal
                open={deleteConfig.open}
                onClose={() => setDeleteConfig({ ...deleteConfig, open: false })}
                onConfirm={handleConfirmDelete}
                itemName={deleteConfig.type === 'bulk' ? `${deleteConfig.count} selected items` : deleteConfig.name}
            />

            {/* ADD CUSTOM LMR CATEGORY DIALOG */}
            <Dialog
                open={addCategoryDialogOpen}
                onClose={() => { setAddCategoryDialogOpen(false); setNewCategoryName(''); setCategoryError(''); }}
                PaperProps={{
                    sx: {
                        bgcolor: '#0d1527',
                        backgroundImage: 'none',
                        color: 'white',
                        borderRadius: 3,
                        border: '1px solid rgba(0,229,255,0.3)',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
                        minWidth: { xs: '300px', sm: '440px' }
                    }
                }}
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1.5, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <CategoryIcon sx={{ color: '#00e5ff' }} />
                    <Typography variant="h6" fontWeight="bold" sx={{ fontFamily: "'Inter', sans-serif", fontSize: '17px' }}>
                        Add Custom LMR Group / Category
                    </Typography>
                </DialogTitle>

                <DialogContent sx={{ pt: 3, pb: 2, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Enter a unique category name for your Local Market Rates dataset (e.g. <code>LMRPLUMBING - PLUMBING CODES ALL</code>).
                    </Typography>

                    {categoryError && (
                        <Alert severity="error" sx={{ bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                            {categoryError}
                        </Alert>
                    )}

                    <TextField
                        autoFocus
                        fullWidth
                        size="small"
                        label="Category Name"
                        placeholder="e.g. LMRPLUMBING - PLUMBING CODES ALL"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddLmrCategory(); }}
                        InputLabelProps={{ sx: { color: 'text.secondary', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' } }}
                        InputProps={{
                            sx: {
                                color: 'white',
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: '13px',
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0,229,255,0.3)' },
                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#00e5ff' },
                            }
                        }}
                    />
                </DialogContent>

                <DialogActions sx={{ p: 2.5, pt: 1.5, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <Button 
                        onClick={() => { setAddCategoryDialogOpen(false); setNewCategoryName(''); setCategoryError(''); }} 
                        sx={{ color: 'text.secondary', fontFamily: "'JetBrains Mono', monospace" }}
                    >
                        CANCEL
                    </Button>
                    <Button 
                        onClick={handleAddLmrCategory} 
                        variant="contained" 
                        sx={{ 
                            background: 'linear-gradient(90deg, #00e5ff 0%, #0284c7 100%)',
                            color: '#0a101d',
                            fontWeight: 'bold',
                            fontFamily: "'JetBrains Mono', monospace",
                            boxShadow: '0 4px 14px rgba(0, 229, 255, 0.3)',
                            '&:hover': { background: 'linear-gradient(90deg, #0284c7 0%, #0369a1 100%)', color: '#fff' }
                        }}
                    >
                        ADD CATEGORY
                    </Button>
                </DialogActions>
            </Dialog>

            {/* CONFIRM DELETE LMR CATEGORY & ALL ITS DB DATA MODAL */}
            <Dialog
                open={deleteCategoryDialogConfig.open}
                onClose={() => setDeleteCategoryDialogConfig({ open: false, categoryName: "" })}
                PaperProps={{
                    sx: {
                        bgcolor: '#0d1527',
                        backgroundImage: 'none',
                        color: 'white',
                        borderRadius: 3,
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
                        minWidth: { xs: '300px', sm: '440px' }
                    }
                }}
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1.5, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <DeleteIcon sx={{ color: '#ef4444' }} />
                    <Typography variant="h6" fontWeight="bold" sx={{ fontFamily: "'Inter', sans-serif", fontSize: '17px', color: '#ef4444' }}>
                        Delete Category & Complete DB Data
                    </Typography>
                </DialogTitle>

                <DialogContent sx={{ pt: 3, pb: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Typography variant="body1" sx={{ mt: 1, color: '#fff', fontWeight: 500 }}>
                        Are you sure you want to delete this LMR category?
                    </Typography>
                    <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontFamily: "'JetBrains Mono', monospace", color: '#ef4444', fontWeight: 'bold' }}>
                            {deleteCategoryDialogConfig.categoryName}
                        </Typography>
                    </Paper>
                    <Alert severity="warning" sx={{ bgcolor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                        <strong>PERMANENT DELETION:</strong> This action will delete this category and purge all associated material resource records in the database.
                    </Alert>
                </DialogContent>

                <DialogActions sx={{ p: 2.5, pt: 1.5, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <Button 
                        onClick={() => setDeleteCategoryDialogConfig({ open: false, categoryName: "" })} 
                        sx={{ color: 'text.secondary', fontFamily: "'JetBrains Mono', monospace" }}
                    >
                        CANCEL
                    </Button>
                    <Button 
                        onClick={handleConfirmDeleteLmrCategory} 
                        variant="contained" 
                        color="error"
                        sx={{ 
                            background: 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)',
                            fontWeight: 'bold',
                            fontFamily: "'JetBrains Mono', monospace",
                            boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
                            '&:hover': { background: 'linear-gradient(90deg, #dc2626 0%, #b91c1c 100%)' }
                        }}
                    >
                        DELETE CATEGORY & DATA
                    </Button>
                </DialogActions>
            </Dialog>

            {/* EXCEL UPLOAD PROGRESS OVERLAY */}
            <Backdrop
                sx={styles.backdrop}
                open={uploadStatus.active}
            >
                {uploadStatus.status === 'success' ? (
                    <CheckCircleOutlineIcon sx={{ fontSize: 60, color: '#00e676' }} />
                ) : uploadStatus.status === 'error' ? (
                    <ErrorOutlineIcon sx={{ fontSize: 60, color: '#ff1744' }} />
                ) : (
                    <CircularProgress color="primary" size={60} thickness={4} />
                )}
                
                <Box textAlign="center" sx={styles.uploadBox}>
                    <Typography variant="h6" sx={styles.uploadTitle}>
                        {uploadStatus.status === 'success' ? "IMPORT SUCCESSFUL" : uploadStatus.status === 'error' ? "IMPORT FAILED" : (uploadStatus.title || "IMPORTING_EXCEL_DATA")}
                    </Typography>
                    
                    <Typography variant="body2" sx={styles.uploadSubtitle}>
                        {uploadStatus.message || `Processing items into [${importRegion}] market...`}
                    </Typography>
                    
                    {uploadStatus.status !== 'success' && uploadStatus.status !== 'error' && uploadStatus.total > 0 && (
                        <Box sx={styles.uploadProgressContainer}>
                            <LinearProgress
                                variant="determinate"
                                value={Math.round((uploadStatus.current / uploadStatus.total) * 100)}
                                sx={styles.uploadProgressBar}
                            />
                            <Typography variant="caption" sx={styles.uploadProgressText}>
                                {uploadStatus.current} / {uploadStatus.total} ({Math.round((uploadStatus.current / uploadStatus.total) * 100)}%)
                            </Typography>
                        </Box>
                    )}

                    {(uploadStatus.status === 'success' || uploadStatus.status === 'error') && (
                        <Button
                            variant="contained"
                            color={uploadStatus.status === 'success' ? "primary" : "error"}
                            onClick={() => setUploadStatus(prev => ({ ...prev, active: false }))}
                            sx={styles.uploadCloseBtn}
                        >
                            Close
                        </Button>
                    )}
                </Box>
            </Backdrop>
        </Box>
    );
}