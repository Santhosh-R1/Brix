import React, { useState, useEffect, useMemo, useRef } from "react";
import { Box, Button, Typography, Paper, TextField, MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, TableSortLabel, InputAdornment, Pagination, IconButton, Backdrop, CircularProgress, useTheme } from "@mui/material";
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import LanguageIcon from '@mui/icons-material/Language';
import * as XLSX from "xlsx";
import AddCategoryModal from "./AddCategoryModal";
import ConfirmDeleteCategoryModal from "./ConfirmDeleteCategoryModal";
import AddDatabookEntryModal from "./AddDatabookEntryModal";
import { getResizerStyle, getViewBoqTabStyles } from "./ViewBoqTab.styles";
const CIVIL_STATIC_CATEGORIES = [
    "2. Earth Work",
    "3. Mortars",
    "4. Concrete work",
    "5. Reinforced Cement Concrete",
    "6. Brick Work",
    "7. Stone Work",
    "8. Marble & Granite Work",
    "9. Wood and PVC Work",
    "10. Steel Work",
    "11. Flooring",
    "12. Roofing",
    "13. Finishing",
    "14. Repairs to Buildings",
    "15. Dismantling and Demolishing",
    "16. Road Work",
    "17. Sanitary Installations",
    "18. Water Supply",
    "19. Drainage",
    "20. Pile Work",
    "21. Aluminium Work",
    "22. Water Proofing",
    "23. Rain Water Harvesting & Tubewells",
    "24. Conservation of Heritage Buildings",
    "25. Structural Glazing & Aluminium Composite Panel",
    "26. New Technologies and Materials",
    "30. Horticulture",
    "49. Horticulture and Landscaping",
    "50. Approved Observed data",
    "51. Approved OD for LSGD",
    "56. Investigation Rate",
    "60. OD Irrigation",
    "65. OD Harbour",
    "70. OD Ports",
    "72. KSEB Approved Data",
    "85. OD Mechanical",
    "100. KWA Approved Data"
];

const ELECTRICAL_STATIC_CATEGORIES = [
    "1. Wiring",
    "2. MCCB, MCB & DBS",
    "3. Rising Mains & Bus Trunking",
    "4. Cable Trays",
    "5. Earthing",
    "6. Lighting Conductor",
    "7. MV Cable Laying",
    "8. HT Cable Laying",
    "9. MV Cable End Termination & Jointing",
    "10. HV Cable Jointing & End Termination",
    "11. Pole Erection",
    "12. MV Over Head Line work",
    "13. HV Over Head Line Work",
    "14. Civil Items",
    "15. Lighting Control",
    "16. HVAC(Only Plumbing,Ducting & AHU)",
    "17. Fire Detection and Alarm System",
    "18. Wet Riser and Sprinkler System",
    "19. Bee 5 Star Rated Ceiling Fan with Brush Less Direct Current (BLDC) Motor",
    "90. OD Electrical"
];

const Resizer = ({ onMouseDown }) => (
    <div onMouseDown={onMouseDown} style={getResizerStyle()} onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(59, 130, 246, 0.2)'} onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'} />
);

export default function ViewBoqTab({ masterBoqs, regions, resources, onEditBoq, deleteMasterBoq, loadData }) {
    const theme = useTheme();
    const styles = getViewBoqTabStyles(theme);
    const [searchCode, setSearchCode] = useState('');
    const [searchDesc, setSearchDesc] = useState('');
    const [discipline, setDiscipline] = useState('Civil');
    const [selectedCategory, setSelectedCategory] = useState('');

    const [civilCustomCats, setCivilCustomCats] = useState([]);
    const [electricalCustomCats, setElectricalCustomCats] = useState([]);

    useEffect(() => {
        let isMounted = true;
        const parseDbSettingArray = (res) => {
            if (!res) return null;
            if (Array.isArray(res)) return res;
            if (typeof res === 'string') {
                try {
                    const parsed = JSON.parse(res);
                    if (Array.isArray(parsed)) return parsed;
                } catch (e) {}
            }
            if (typeof res === 'object') {
                const val = res.value !== undefined ? res.value : (res.data?.value !== undefined ? res.data.value : res.data);
                if (Array.isArray(val)) return val;
                if (typeof val === 'string') {
                    try {
                        const parsed = JSON.parse(val);
                        if (Array.isArray(parsed)) return parsed;
                    } catch (e) {}
                }
            }
            return null;
        };

        const loadCategoriesFromDb = async () => {
            try {
                // Fetch Civil databook custom categories strictly from database
                const civilRes = await window.api.db.getSettings('databook_categories_civil');
                if (isMounted && civilRes) {
                    const parsed = parseDbSettingArray(civilRes);
                    if (Array.isArray(parsed)) setCivilCustomCats(parsed);
                }

                // Fetch Electrical databook custom categories strictly from database
                const elecRes = await window.api.db.getSettings('databook_categories_electrical');
                if (isMounted && elecRes) {
                    const parsed = parseDbSettingArray(elecRes);
                    if (Array.isArray(parsed)) setElectricalCustomCats(parsed);
                }
            } catch (e) {
                console.error("Error loading databook categories from database:", e);
            }
        };

        loadCategoriesFromDb();
        return () => { isMounted = false; };
    }, []);

    const staticCategories = useMemo(() => {
        return discipline === "Civil" ? CIVIL_STATIC_CATEGORIES : ELECTRICAL_STATIC_CATEGORIES;
    }, [discipline]);

    const activeCategories = useMemo(() => {
        if (discipline === "Civil") {
            return [...CIVIL_STATIC_CATEGORIES, ...civilCustomCats];
        } else {
            return [...ELECTRICAL_STATIC_CATEGORIES, ...electricalCustomCats];
        }
    }, [discipline, civilCustomCats, electricalCustomCats]);

    const [categoryModalOpen, setCategoryModalOpen] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState(null);
    const [deleteCategoryModalOpen, setDeleteCategoryModalOpen] = useState(false);
    const [addEntryModalOpen, setAddEntryModalOpen] = useState(false);
    const [sortDirection, setSortDirection] = useState('asc');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [uploadStatus, setUploadStatus] = useState({ active: false, status: 'idle', message: '' });
    const excelInputRef = useRef(null);

    const [expandedDesc, setExpandedDesc] = useState({});
    const toggleDesc = (id) => {
        if (!id) return;
        setExpandedDesc(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleAddCategory = async (newCat) => {
        if (discipline === "Civil") {
            const updated = [...civilCustomCats, newCat];
            setCivilCustomCats(updated);
            try {
                await window.api.db.saveSettings('databook_categories_civil', JSON.stringify(updated));
            } catch (e) {
                console.error("Failed to save civil category to database:", e);
            }
        } else {
            const updated = [...electricalCustomCats, newCat];
            setElectricalCustomCats(updated);
            try {
                await window.api.db.saveSettings('databook_categories_electrical', JSON.stringify(updated));
            } catch (e) {
                console.error("Failed to save electrical category to database:", e);
            }
        }
        setSelectedCategory(newCat);
        setPage(0);
    };

    const handleDeleteCategory = async () => {
        if (!categoryToDelete) return;
        const targetCat = categoryToDelete;

        if (discipline === "Civil") {
            const updated = civilCustomCats.filter(cat => cat !== targetCat);
            setCivilCustomCats(updated);
            try {
                await window.api.db.saveSettings('databook_categories_civil', JSON.stringify(updated));
            } catch (e) {
                console.error("Failed to delete civil category from database:", e);
            }
        } else {
            const updated = electricalCustomCats.filter(cat => cat !== targetCat);
            setElectricalCustomCats(updated);
            try {
                await window.api.db.saveSettings('databook_categories_electrical', JSON.stringify(updated));
            } catch (e) {
                console.error("Failed to delete electrical category from database:", e);
            }
        }

        // Delete ALL master BOQ assembly entries in database belonging to this category
        const matchPrefix = targetCat.match(/^([\d.]+)\./);
        const sectionNum = matchPrefix ? matchPrefix[1] : null;

        const itemsToDelete = (masterBoqs || []).filter(boq => {
            if (boq.category === targetCat) return true;
            if (sectionNum) {
                const normCode = (boq.itemCode || '').trim();
                if (normCode.startsWith(`${sectionNum}.`) || normCode === sectionNum) return true;
            }
            return false;
        });

        console.log(`[Databook Category Delete] Deleting ${itemsToDelete.length} master BOQ items for category "${targetCat}" from database...`);

        for (const item of itemsToDelete) {
            try {
                await window.api.db.deleteMasterBoq(item.id);
            } catch (err) {
                console.error("Failed to delete master BOQ entry from database:", err);
            }
        }

        if (selectedCategory === targetCat) {
            setSelectedCategory('');
            setPage(0);
        }
        setCategoryToDelete(null);
        setDeleteCategoryModalOpen(false);
        if (typeof loadData === 'function') loadData();
    };

    const [colWidths, setColWidths] = useState({ code: 150, desc: 550, unit: 100, actions: 150 });

    const handleResizeStart = (colKey) => (e) => {
        e.preventDefault();
        const startX = e.clientX;
        const thElement = e.target.closest('th');
        const startWidth = thElement ? thElement.getBoundingClientRect().width : colWidths[colKey];
        const handleMouseMove = (moveEvent) => setColWidths(prev => ({ ...prev, [colKey]: Math.max(50, startWidth + (moveEvent.clientX - startX)) }));
        const handleMouseUp = () => { document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp); };
        document.addEventListener('mousemove', handleMouseMove); document.addEventListener('mouseup', handleMouseUp);
    };

    const handleSortToggle = () => setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));

    const processedBOQs = useMemo(() => {
        let filtered = masterBoqs.filter((boq) => {
            const matchCode = boq.itemCode?.toLowerCase().includes(searchCode.toLowerCase());
            const matchDesc = boq.description?.toLowerCase().includes(searchDesc.toLowerCase());

            let matchCat = true;
            if (selectedCategory) {
                const match = selectedCategory.match(/^([\d.]+)\./);
                if (match) {
                    const sectionNum = match[1];
                    const normalizedCode = (boq.itemCode || '').trim();
                    matchCat = normalizedCode.startsWith(`${sectionNum}.`) ||
                        normalizedCode === sectionNum ||
                        normalizedCode.startsWith(`0${sectionNum}.`) ||
                        normalizedCode === `0${sectionNum}`;
                }
            }
            return matchCode && matchDesc && matchCat;
        });
        filtered.sort((a, b) => {
            const codeA = a.itemCode || ''; const codeB = b.itemCode || '';
            return sortDirection === 'asc' ? codeA.localeCompare(codeB, undefined, { numeric: true }) : codeB.localeCompare(codeA, undefined, { numeric: true });
        });
        return filtered;
    }, [masterBoqs, searchCode, searchDesc, sortDirection, selectedCategory]);

    const paginatedBOQs = useMemo(() => processedBOQs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage), [processedBOQs, page, rowsPerPage]);

    const generateDatabookTemplate = () => {
        const match = selectedCategory ? selectedCategory.match(/^([\d.]+)\./) : null;
        const sectionPrefix = match ? match[1] : "1";

        const wsData = [
            {
                "No": 1,
                "Spec Code": `${sectionPrefix}.1.1`,
                "Specification": "Earth work in excavation by mechanical means (Hydraulic excavator) / manual means in foundation trenches or drains (not exceeding 1.5 m in width or 10 sqm on plan), including dressing of sides and ramming of bottoms, lift upto 1.5 m, including getting out the excavated soil and disposal surplus excavated soil as directed, within a lead of 50 m. All kinds of soil.",
                "Rate(₹)": 150.50,
                "Unit": "cum"
            },
            {
                "No": 2,
                "Spec Code": `${sectionPrefix}.1.2`,
                "Specification": "Providing and laying in position cement concrete of specified grade excluding the cost of centering and shuttering - All work up to plinth level : 1:2:4 (1 Cement : 2 coarse sand (zone-III) : 4 graded stone aggregate 20 mm nominal size).",
                "Rate(₹)": 5400.00,
                "Unit": "cum"
            }
        ];
        const ws = XLSX.utils.json_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Assemblies Template");
        XLSX.writeFile(wb, "Assemblies_Upload_Template.xlsx");
    };

    const handleDatabookExcelUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploadStatus({ active: true, status: 'loading', message: '' });
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
                if (jsonData.length === 0) throw new Error("Empty Excel file");

                // Check if it is the new simple Assemblies format
                const firstRowKeys = Object.keys(jsonData[0]);
                const isSimpleFormat = firstRowKeys.some(k => k.includes("Spec Code") || k === "Code") &&
                    firstRowKeys.some(k => k.includes("Specification") || k === "Description");

                if (isSimpleFormat) {
                    const resourcesToSave = [];
                    const boqsToSave = [];

                    jsonData.forEach(row => {
                        // Find spec code key
                        const codeKey = firstRowKeys.find(k => k.includes("Spec Code") || k === "Code");
                        const descKey = firstRowKeys.find(k => k.includes("Specification") || k === "Description");
                        const rateKey = firstRowKeys.find(k => k.includes("Rate") || k === "Price");
                        const unitKey = firstRowKeys.find(k => k.includes("Unit"));

                        const itemCode = String(row[codeKey] || "").trim();
                        const description = String(row[descKey] || "").trim();
                        const unit = String(row[unitKey] || "each").trim();
                        const rate = Number(row[rateKey] || 0);

                        if (!itemCode || !description) return;

                        // We use itemType: "custom" so we don't pollute the Local Market Rates (resources) table
                        const components = [
                            {
                                itemType: "custom",
                                itemId: "custom-" + window.crypto.randomUUID(),
                                description: description,
                                qty: 1,
                                formulaStr: "1",
                                rate: rate
                            }
                        ];

                        boqsToSave.push({
                            itemCode,
                            description,
                            unit,
                            overhead: 0,
                            profit: 0,
                            components: JSON.stringify(components)
                        });
                    });

                    // 2. Save master BOQs
                    let added = 0;
                    for (const boq of boqsToSave) {
                        const existing = masterBoqs.find(b => b.itemCode === boq.itemCode);
                        if (existing) {
                            await window.api.db.saveMasterBoq(boq, existing.id, false);
                        } else {
                            await window.api.db.saveMasterBoq(boq, null, true);
                        }
                        added++;
                    }

                    setUploadStatus({
                        active: true,
                        status: 'success',
                        message: `Databook Excel Processed!\n\nProcessed: ${added} items`
                    });
                    loadData();
                    return;
                }

                // Fallback to old format
                const boqGroups = {};
                jsonData.forEach(row => {
                    const boqCode = String(row["BOQ_Code"] || "").trim();
                    if (!boqCode) return;
                    if (!boqGroups[boqCode]) boqGroups[boqCode] = { itemCode: boqCode, description: String(row["BOQ_Description"] || ""), unit: String(row["BOQ_Unit"] || "each"), overhead: Number(row["Overhead_Percent"]) || 0, profit: Number(row["Profit_Percent"]) || 0, components: [] };
                    const compType = String(row["Component_Type"] || "").toLowerCase().trim();
                    const compCode = String(row["Component_Code"] || "").trim();
                    const compQty = Number(row["Component_Qty"]) || 0;
                    if (compType && compCode && compQty > 0) boqGroups[boqCode].components.push({ tempType: compType, tempCode: compCode, qty: compQty });
                });

                let added = 0, updated = 0;
                for (const boqCode of Object.keys(boqGroups)) {
                    const group = boqGroups[boqCode];
                    const validComponents = [];
                    for (const comp of group.components) {
                        let itemId = null; let itemType = "resource";
                        if (comp.tempType === 'resource') { const res = resources.find(r => r.code === comp.tempCode); if (res) itemId = res.id; }
                        else if (comp.tempType === 'boq' || comp.tempType === 'databook_item') { const b = masterBoqs.find(b => b.itemCode === comp.tempCode); if (b) itemId = b.id; itemType = "boq"; }
                        if (itemId) validComponents.push({ itemType, itemId, qty: comp.qty, formulaStr: String(comp.qty) });
                    }
                    const payload = { ...group, components: JSON.stringify(validComponents) };
                    const existing = masterBoqs.find(b => b.itemCode === group.itemCode);
                    if (existing) { await window.api.db.saveMasterBoq(payload, existing.id, false); updated++; }
                    else { await window.api.db.saveMasterBoq(payload, null, true); added++; }
                }
                setUploadStatus({
                    active: true,
                    status: 'success',
                    message: `Databook Excel Processed!\n\nProcessed: ${added + updated} items`
                });
                loadData();
            } catch (err) {
                setUploadStatus({
                    active: true,
                    status: 'error',
                    message: "Failed to parse Excel file."
                });
            } finally {
                if (excelInputRef.current) excelInputRef.current.value = "";
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const pdfInputRef = useRef(null);

    const handlePdfUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadStatus({ active: true, status: 'loading', message: '' });
        
        const formData = new FormData();
        formData.append("file", file);

        try {
            const baseUrl = import.meta.env.VITE_PYTHON_API_URL || "http://localhost:8000";
            const url = `${baseUrl}/api/ml/extract-master-databook-pdf`;
            const response = await fetch(url, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                
                if (data.success && data.items && Array.isArray(data.items)) {
                    if (data.items.length === 0) {
                        setUploadStatus({
                            active: true,
                            status: 'error',
                            message: "No valid items found in the PDF. Please check the format."
                        });
                        return;
                    }

                    const resourcesToSave = [];
                    const boqsToSave = [];

                    data.items.forEach(item => {
                        const itemCode = String(item.itemCode || "").trim();
                        const description = String(item.description || "").trim();
                        const unit = String(item.unit || "each").trim();
                        const rate = Number(item.rate || 0);

                        if (!itemCode || !description) return;

                        // We use itemType: "custom" so we don't pollute the Local Market Rates (resources) table
                        const components = [
                            {
                                itemType: "custom",
                                itemId: "custom-" + window.crypto.randomUUID(),
                                description: description,
                                qty: 1,
                                formulaStr: "1",
                                rate: rate
                            }
                        ];

                        boqsToSave.push({
                            itemCode,
                            description,
                            unit,
                            overhead: 0,
                            profit: 0,
                            components: JSON.stringify(components)
                        });
                    });

                    if (boqsToSave.length === 0) {
                        setUploadStatus({
                            active: true,
                            status: 'error',
                            message: "AI could not parse any complete items from this PDF."
                        });
                        return;
                    }

                    // 2. Save master BOQs
                    let added = 0;
                    for (const boq of boqsToSave) {
                        const existing = masterBoqs.find(b => b.itemCode === boq.itemCode);
                        if (existing) {
                            await window.api.db.saveMasterBoq(boq, existing.id, false);
                        } else {
                            await window.api.db.saveMasterBoq(boq, null, true);
                        }
                        added++;
                    }

                    setUploadStatus({
                        active: true,
                        status: 'success',
                        message: `Databook PDF Processed by AI!\n\nProcessed: ${added} items`
                    });
                    loadData();
                } else {
                    setUploadStatus({
                        active: true,
                        status: 'error',
                        message: data.error || "Failed to extract PDF data using AI."
                    });
                }
            } else {
                setUploadStatus({
                    active: true,
                    status: 'error',
                    message: `Server returned error ${response.status}`
                });
            }
        } catch (error) {
            console.error("PDF upload error:", error);
            setUploadStatus({
                active: true,
                status: 'error',
                message: "Error processing PDF: " + error.message
            });
        } finally {
            if (pdfInputRef.current) pdfInputRef.current.value = "";
        }
    };

    const totalPages = Math.ceil(processedBOQs.length / rowsPerPage);
    const startEntry = processedBOQs.length === 0 ? 0 : page * rowsPerPage + 1;
    const endEntry = Math.min((page + 1) * rowsPerPage, processedBOQs.length);

    return (
        <Box sx={styles.mainContainer}>
            <Typography variant="h6" fontWeight="bold" mb={3} sx={styles.headerTitle}>DATABOOK_ASSEMBLIES</Typography>
            <Box display="flex" flexDirection="column" gap={2} sx={styles.subContainer}>
                {/* Top Row: Template and Import Excel Buttons on the right side */}
                <Box display="flex" gap={2} alignItems="center" justifyContent="flex-end">
                    <Button 
                        size="small" 
                        variant="outlined" 
                        color="info" 
                        startIcon={<LanguageIcon />} 
                        onClick={() => window.open("https://price.kerala.gov.in/price3_pmu/call_databook_home.htm", "_blank")} 
                        sx={styles.actionButton}
                    >
                        KERALA_PWD
                    </Button>
                    <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={generateDatabookTemplate} sx={styles.actionButton}>TEMPLATE</Button>
                    <input type="file" accept=".xls,.xlsx" ref={excelInputRef} style={{ display: 'none' }} onChange={(e) => { handleDatabookExcelUpload(e); excelInputRef.current.value = null; }} />
                    <input type="file" accept=".pdf" ref={pdfInputRef} style={{ display: 'none' }} onChange={(e) => { handlePdfUpload(e); pdfInputRef.current.value = null; }} />
                    <Button size="small" variant="contained" disableElevation startIcon={<UploadIcon />} onClick={() => excelInputRef.current.click()} sx={styles.actionButton}>IMPORT EXCEL</Button>
                </Box>

                {/* Bottom Row: Filters (Search Code, Search Desc, Discipline, Category) & Upload/Add Entry buttons */}
                <Box display="flex" alignItems="center" flexWrap="wrap" gap={2}>
                    <TextField placeholder="Search Code..." variant="outlined" size="small" value={searchCode} onChange={(e) => { setSearchCode(e.target.value); setPage(0); }} sx={styles.searchCodeField} InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>, sx: styles.searchInputProps }} />
                    <TextField placeholder="Search Description..." variant="outlined" size="small" value={searchDesc} onChange={(e) => { setSearchDesc(e.target.value); setPage(0); }} sx={styles.searchDescField} InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>, sx: styles.searchInputProps }} />

                    {/* DISCIPLINE DROPDOWN (CIVIL / ELECTRICAL) */}
                    <TextField
                        select
                        size="small"
                        label="DISCIPLINE"
                        value={discipline}
                        onChange={(e) => {
                            setDiscipline(e.target.value);
                            setSelectedCategory('');
                            setPage(0);
                        }}
                        sx={{ flex: 1, minWidth: 140 }}
                        InputLabelProps={{ sx: styles.categoryInputLabel }}
                        InputProps={{ sx: styles.searchInputProps }}
                    >
                        <MenuItem value="Civil" sx={styles.menuItemDefault}>Civil</MenuItem>
                        <MenuItem value="Electrical" sx={styles.menuItemDefault}>Electrical</MenuItem>
                    </TextField>

                    {/* CATEGORY DROPDOWN */}
                    <TextField
                        select
                        size="small"
                        label="CATEGORY"
                        value={selectedCategory}
                        onChange={(e) => {
                            if (e.target.value === "__ADD_CATEGORY__") {
                                setCategoryModalOpen(true);
                            } else {
                                setSelectedCategory(e.target.value);
                                setPage(0);
                            }
                        }}
                        sx={styles.categorySelect}
                        InputLabelProps={{ sx: styles.categoryInputLabel }}
                        InputProps={{ sx: styles.searchInputProps }}
                        SelectProps={{
                            renderValue: (selected) => selected || "---select---"
                        }}
                    >
                        <MenuItem value="" sx={styles.menuItemDefault}>---select---</MenuItem>
                        <MenuItem value="__ADD_CATEGORY__" sx={styles.menuItemAdd}>+ Add Category</MenuItem>
                        {activeCategories.map(cat => {
                            const isCustom = !staticCategories.includes(cat);
                            return (
                                <MenuItem
                                    key={cat}
                                    value={cat}
                                    sx={styles.menuItemCustom}
                                >
                                    <span>{cat}</span>
                                    {isCustom && (
                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setCategoryToDelete(cat);
                                                setDeleteCategoryModalOpen(true);
                                            }}
                                            sx={styles.deleteIconBtn}
                                        >
                                            <DeleteIcon sx={{ fontSize: 16 }} />
                                        </IconButton>
                                    )}
                                </MenuItem>
                            );
                        })}
                    </TextField>

                    <Box display="flex" gap={2} alignItems="center" flexWrap="wrap" sx={styles.actionsWrapper}>
                        <Button size="small" variant="contained" color="secondary" disableElevation startIcon={<UploadIcon />} onClick={() => { if (!selectedCategory) { alert("Please select a category first!"); return; } pdfInputRef.current.click(); }} sx={styles.primaryGradientButton}>UPLOAD ASSEMBLY</Button>

                        <Button
                            size="small"
                            variant="contained"
                            onClick={() => {
                                if (!selectedCategory) {
                                    alert("Please select a category first!");
                                    return;
                                }
                                setAddEntryModalOpen(true);
                            }}
                            sx={styles.primaryGradientButton}
                        >
                            + ADD DATABOOK ENTRY
                        </Button>
                    </Box>
                </Box>
            </Box>

            <TableContainer component={Paper} elevation={0} variant="outlined" sx={styles.tableContainer}>
                <Table size="small" sx={styles.table(Object.values(colWidths).reduce((a, b) => a + b, 0))}>
                    <TableHead sx={styles.tableHead}>
                        <TableRow>
                            <TableCell sx={styles.headerCellCode(colWidths.code)}><TableSortLabel active={true} direction={sortDirection} onClick={handleSortToggle}><strong>ITEM_CODE</strong></TableSortLabel><Resizer onMouseDown={handleResizeStart('code')} /></TableCell>
                            <TableCell sx={styles.headerCellDesc(colWidths.desc)}><strong>DESCRIPTION</strong><Resizer onMouseDown={handleResizeStart('desc')} /></TableCell>
                            <TableCell sx={styles.headerCellUnit(colWidths.unit)}><strong>UNIT</strong><Resizer onMouseDown={handleResizeStart('unit')} /></TableCell>
                            <TableCell align="center" sx={styles.headerCellActions(colWidths.actions)}><strong>ACTIONS</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {paginatedBOQs.length > 0 ? (
                            paginatedBOQs.map((b) => {
                                const rowKey = b.id || b.itemCode;
                                const isExpanded = !!expandedDesc[rowKey];
                                return (
                                    <React.Fragment key={rowKey}>
                                        <TableRow hover onClick={() => toggleDesc(rowKey)} sx={{ cursor: 'pointer', transition: 'all 0.2s', '&:hover': { bgcolor: 'rgba(59, 130, 246, 0.05)' } }}>
                                            <TableCell sx={styles.bodyCellCode}>{b.itemCode || '-'}</TableCell>
                                            <TableCell sx={{ ...styles.bodyCellDesc, whiteSpace: isExpanded ? 'pre-wrap' : 'nowrap', wordBreak: isExpanded ? 'break-word' : 'normal', color: isExpanded ? 'primary.main' : 'inherit', py: isExpanded ? 2 : 1 }}>
                                                <span style={{ marginRight: '8px', fontSize: '10px', opacity: 0.7 }}>{isExpanded ? '▼' : '▶'}</span>
                                                {b.description}
                                            </TableCell>
                                            <TableCell sx={styles.bodyCellUnit}>{b.unit}</TableCell>
                                            <TableCell align="center"><Box display="flex" gap={1} justifyContent="center" onClick={e => e.stopPropagation()}><Button size="small" variant="outlined" color="warning" onClick={() => onEditBoq(b)} sx={styles.editButton}>EDIT</Button><Button size="small" variant="outlined" color="error" onClick={() => deleteMasterBoq(b.id, `${b.itemCode} - ${b.description}`)} sx={styles.deleteButton}>DELETE</Button></Box></TableCell>
                                        </TableRow>
                                    </React.Fragment>
                                );
                            })
                        ) : (<TableRow><TableCell colSpan={4} align="center" sx={styles.noItemsCell}>NO_MATCHING_ITEMS</TableCell></TableRow>)}
                    </TableBody>
                </Table>
            </TableContainer>

            <Box display="flex" justifyContent="space-between" alignItems="center" sx={styles.paginationContainer}>
                <Typography variant="caption" sx={styles.paginationText}>
                    SHOWING {startEntry}–{endEntry} OF {processedBOQs.length} ENTRIES
                </Typography>
                <Pagination
                    count={totalPages}
                    page={page + 1}
                    onChange={(e, v) => setPage(v - 1)}
                    color="primary"
                    size="medium"
                    showFirstButton
                    showLastButton
                    sx={styles.paginationControl}
                />
            </Box>

            <AddCategoryModal
                open={categoryModalOpen}
                onClose={() => setCategoryModalOpen(false)}
                onAddCategory={handleAddCategory}
                existingCategories={activeCategories}
            />

            <ConfirmDeleteCategoryModal
                open={deleteCategoryModalOpen}
                onClose={() => { setCategoryToDelete(null); setDeleteCategoryModalOpen(false); }}
                onConfirm={handleDeleteCategory}
                categoryName={categoryToDelete}
            />

            <AddDatabookEntryModal
                open={addEntryModalOpen}
                onClose={() => setAddEntryModalOpen(false)}
                onSave={loadData}
                categoryPrefix={selectedCategory}
                masterBoqs={masterBoqs}
                regions={regions}
            />

            {/* EXCEL/PDF UPLOAD PROGRESS OVERLAY */}
            <Backdrop
                sx={styles.backdrop}
                open={uploadStatus.active}
            >
                {uploadStatus.status === 'success' ? (
                    <CheckCircleOutlineIcon sx={styles.successIcon} />
                ) : uploadStatus.status === 'error' ? (
                    <ErrorOutlineIcon sx={styles.errorIcon} />
                ) : (
                    <CircularProgress color="primary" size={60} thickness={4} />
                )}

                <Box textAlign="center" sx={styles.uploadBox}>
                    <Typography variant="h6" sx={styles.uploadTitle}>
                        {uploadStatus.status === 'success' ? "IMPORT SUCCESSFUL" : uploadStatus.status === 'error' ? "IMPORT FAILED" : "PROCESSING_DATA"}
                    </Typography>

                    <Typography variant="body2" sx={styles.uploadSubtitle}>
                        {uploadStatus.status === 'success' || uploadStatus.status === 'error'
                            ? uploadStatus.message
                            : "Processing document assemblies, please wait..."}
                    </Typography>

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