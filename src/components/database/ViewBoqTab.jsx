import { useState, useMemo, useRef } from "react";
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
const STATIC_CATEGORIES = [
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

const loadPdfJs = () => {
    return new Promise((resolve, reject) => {
        if (window['pdfjs-dist/build/pdf']) {
            resolve(window['pdfjs-dist/build/pdf']);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
        script.onload = () => {
            const pdfjs = window['pdfjs-dist/build/pdf'];
            pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
            resolve(pdfjs);
        };
        script.onerror = reject;
        document.head.appendChild(script);
    });
};

const parsePDFItems = (allItems) => {
    // 1. Determine column X coordinates using medians to handle variations safely
    const potentialSpecCodes = allItems.filter(item => item.str.match(/^\d+\.\d+(?:\.\d+)*[a-zA-Z]*$/) && item.x < 150);
    const specCodeXs = potentialSpecCodes.map(i => i.x).sort((a, b) => a - b);
    const medianSpecCodeX = specCodeXs.length > 0 ? specCodeXs[Math.floor(specCodeXs.length / 2)] : 80;

    const potentialRates = allItems.filter(item => item.str.match(/^[\d,]+(?:\.\d+)?$/) && item.x > 350 && item.x < 550);
    const rateXs = potentialRates.map(i => i.x).sort((a, b) => a - b);
    const medianRateX = rateXs.length > 0 ? rateXs[Math.floor(rateXs.length / 2)] : 480;

    const potentialUnits = allItems.filter(item => item.str.match(/^[a-zA-Z]+$/) && item.x > 450);
    const unitXs = potentialUnits.map(i => i.x).sort((a, b) => a - b);
    const medianUnitX = unitXs.length > 0 ? unitXs[Math.floor(unitXs.length / 2)] : 530;

    const potentialNos = allItems.filter(item => item.str.match(/^\d+$/) && item.x < 80);
    const noXs = potentialNos.map(i => i.x).sort((a, b) => a - b);
    const medianNoX = noXs.length > 0 ? noXs[Math.floor(noXs.length / 2)] : 40;

    // 2. Group items into Y-bands
    const linesMap = {};
    allItems.forEach(item => {
        let foundKey = Object.keys(linesMap).find(k => Math.abs(Number(k) - item.y) <= 5);
        if (!foundKey) {
            foundKey = String(item.y);
            linesMap[foundKey] = [];
        }
        linesMap[foundKey].push(item);
    });

    const sortedYKeys = Object.keys(linesMap).sort((a, b) => Number(a) - Number(b)); // top to bottom
    const yBands = sortedYKeys.map(k => ({
        y: Number(k),
        items: linesMap[k].sort((a, b) => a.x - b.x)
    }));

    // 3. Find gap threshold for item separation
    const gaps = [];
    for (let i = 0; i < yBands.length - 1; i++) {
        gaps.push(yBands[i + 1].y - yBands[i].y);
    }
    const validGaps = gaps.filter(g => g > 0).sort((a, b) => a - b);
    const medianGap = validGaps.length > 0 ? validGaps[Math.floor(validGaps.length / 2)] : 15;
    const gapThreshold = Math.max(medianGap * 1.8, 20);

    // 4. Split into initial blocks by gap
    const initialBlocks = [];
    let currentBlock = { items: [] };
    for (let i = 0; i < yBands.length; i++) {
        currentBlock.items.push(...yBands[i].items);
        if (i < yBands.length - 1) {
            const gap = yBands[i + 1].y - yBands[i].y;
            if (gap > gapThreshold) {
                initialBlocks.push(currentBlock);
                currentBlock = { items: [] };
            }
        }
    }
    if (currentBlock.items.length > 0) initialBlocks.push(currentBlock);

    // 5. Merge blocks that don't have a Spec Code (e.g., page breaks)
    const mergedBlocks = [];
    for (let i = 0; i < initialBlocks.length; i++) {
        const block = initialBlocks[i];
        const hasSpecCode = block.items.some(item => item.str.match(/^\d+\.\d+(?:\.\d+)*[a-zA-Z]*$/) && Math.abs(item.x - medianSpecCodeX) < 40);
        
        if (hasSpecCode || mergedBlocks.length === 0) {
            mergedBlocks.push(block);
        } else {
            mergedBlocks[mergedBlocks.length - 1].items.push(...block.items);
        }
    }

    // 6. Fallback: split block by midpoint if it contains multiple Spec Codes
    const finalBlocks = [];
    mergedBlocks.forEach(block => {
        const specCodeItems = block.items.filter(item => item.str.match(/^\d+\.\d+(?:\.\d+)*[a-zA-Z]*$/) && Math.abs(item.x - medianSpecCodeX) < 40).sort((a, b) => a.y - b.y);
        
        if (specCodeItems.length <= 1) {
            finalBlocks.push(block);
        } else {
            let currentSubBlock = { items: [] };
            let currentSpecIdx = 0;
            
            const blockYBands = {};
            block.items.forEach(item => {
                let foundKey = Object.keys(blockYBands).find(k => Math.abs(Number(k) - item.y) <= 5);
                if (!foundKey) {
                    foundKey = String(item.y);
                    blockYBands[foundKey] = [];
                }
                blockYBands[foundKey].push(item);
            });
            const sortedYs = Object.keys(blockYBands).sort((a, b) => Number(a) - Number(b));
            
            sortedYs.forEach(yStr => {
                const y = Number(yStr);
                if (currentSpecIdx < specCodeItems.length - 1) {
                    const currentSpecY = specCodeItems[currentSpecIdx].y;
                    const nextSpecY = specCodeItems[currentSpecIdx + 1].y;
                    const midpoint = (currentSpecY + nextSpecY) / 2;
                    
                    if (y > midpoint) {
                        finalBlocks.push(currentSubBlock);
                        currentSubBlock = { items: [] };
                        currentSpecIdx++;
                    }
                }
                currentSubBlock.items.push(...blockYBands[yStr]);
            });
            finalBlocks.push(currentSubBlock);
        }
    });

    // 7. Parse items from blocks
    const parsedItems = [];
    finalBlocks.forEach(block => {
        if (block.items.length === 0) return;
        
        const specCodeItem = block.items.find(item => item.str.match(/^\d+\.\d+(?:\.\d+)*[a-zA-Z]*$/) && Math.abs(item.x - medianSpecCodeX) < 40);
        if (!specCodeItem) return;
        
        const itemCode = specCodeItem.str;
        
        const rateItems = block.items.filter(item => item.str.match(/^[\d,]+(?:\.\d+)?$/) && Math.abs(item.x - medianRateX) < 40);
        const rateItem = rateItems.length > 0 ? rateItems[0] : null;
        const rate = rateItem ? Number(rateItem.str.replace(/,/g, '')) : 0;
        
        const unitItems = block.items.filter(item => item.str.match(/^[a-zA-Z]+$/) && Math.abs(item.x - medianUnitX) < 40);
        const unitItem = unitItems.length > 0 ? unitItems[0] : null;
        const unit = unitItem ? unitItem.str : "each";
        
        const noItem = block.items.find(item => item.str.match(/^\d+$/) && Math.abs(item.x - medianNoX) < 30);
        
        const specItems = block.items.filter(item => 
            item !== specCodeItem && 
            item !== rateItem && 
            item !== unitItem && 
            item !== noItem
        );
        
        const specYMap = {};
        specItems.forEach(item => {
            let foundKey = Object.keys(specYMap).find(k => Math.abs(Number(k) - item.y) <= 5);
            if (!foundKey) {
                foundKey = String(item.y);
                specYMap[foundKey] = [];
            }
            specYMap[foundKey].push(item);
        });
        
        const sortedYKeys = Object.keys(specYMap).sort((a, b) => Number(a) - Number(b));
        const specLines = sortedYKeys.map(yKey => {
            const lineItems = specYMap[yKey].sort((a, b) => a.x - b.x);
            return lineItems.map(item => item.str).join(" ");
        });
        
        parsedItems.push({
            itemCode: itemCode,
            description: specLines.join(' ').trim(),
            unit: unit,
            rate: rate
        });
    });

    return parsedItems;
};

const Resizer = ({ onMouseDown }) => (
    <div onMouseDown={onMouseDown} style={getResizerStyle()} onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(59, 130, 246, 0.2)'} onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'} />
);

export default function ViewBoqTab({ masterBoqs, regions, resources, onEditBoq, deleteMasterBoq, loadData }) {
    const theme = useTheme();
    const styles = getViewBoqTabStyles(theme);
    const [searchCode, setSearchCode] = useState('');
    const [searchDesc, setSearchDesc] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [categories, setCategories] = useState(() => {
        const saved = localStorage.getItem("custom_categories");
        const parsed = saved ? JSON.parse(saved) : [];
        return [...STATIC_CATEGORIES, ...parsed];
    });
    const [categoryModalOpen, setCategoryModalOpen] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState(null);
    const [deleteCategoryModalOpen, setDeleteCategoryModalOpen] = useState(false);
    const [addEntryModalOpen, setAddEntryModalOpen] = useState(false);
    const [sortDirection, setSortDirection] = useState('asc');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [uploadStatus, setUploadStatus] = useState({ active: false, status: 'idle', message: '' });
    const excelInputRef = useRef(null);

    const handleAddCategory = (newCat) => {
        const saved = localStorage.getItem("custom_categories");
        const parsed = saved ? JSON.parse(saved) : [];
        const updated = [...parsed, newCat];
        localStorage.setItem("custom_categories", JSON.stringify(updated));
        setCategories([...STATIC_CATEGORIES, ...updated]);
        setSelectedCategory(newCat);
        setPage(0);
    };

    const handleDeleteCategory = () => {
        if (!categoryToDelete) return;
        const saved = localStorage.getItem("custom_categories");
        const parsed = saved ? JSON.parse(saved) : [];
        const updated = parsed.filter(cat => cat !== categoryToDelete);
        localStorage.setItem("custom_categories", JSON.stringify(updated));
        setCategories([...STATIC_CATEGORIES, ...updated]);
        if (selectedCategory === categoryToDelete) {
            setSelectedCategory('');
            setPage(0);
        }
        setCategoryToDelete(null);
        setDeleteCategoryModalOpen(false);
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

                        const resourceId = window.crypto.randomUUID();
                        const ratesObj = {};
                        regions.forEach(r => {
                            ratesObj[r.name] = rate;
                        });

                        resourcesToSave.push({
                            id: resourceId,
                            code: itemCode,
                            description,
                            unit,
                            rates: JSON.stringify(ratesObj),
                            rateHistory: JSON.stringify([])
                        });

                        const components = [
                            {
                                itemType: "resource",
                                itemId: resourceId,
                                qty: 1,
                                formulaStr: "1"
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

                    // 1. Bulk save resources
                    await window.api.db.bulkSaveResources(resourcesToSave);

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

    const handlePdfUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadStatus({ active: true, status: 'loading', message: '' });
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const pdfjsLib = await loadPdfJs();
                const arrayBuffer = event.target.result;
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

                let allItems = [];
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();

                    textContent.items.forEach(item => {
                        const text = item.str.trim();
                        if (!text) return;
                        
                        if (text === "No" || text === "Spec" || text === "Code" || text === "Specification" || text === "Rate(₹)" || text === "Unit" || text === "PRICE") return;
                        if (text.match(/^Page \d+ of \d+/)) return;
                        if (text.includes("Code Specification Rate")) return;
                        if (text === "No Spec") return;

                        // PDF coordinates are bottom-up. Create a top-down continuous global Y coordinate.
                        const globalY = (pdf.numPages - i) * 2000 + item.transform[5];
                        
                        allItems.push({
                            str: text,
                            x: item.transform[4],
                            y: globalY,
                            originalY: item.transform[5]
                        });
                    });
                }

                if (allItems.length === 0) {
                    setUploadStatus({
                        active: true,
                        status: 'error',
                        message: "No text found in the PDF. Please check the format."
                    });
                    return;
                }

                const parsedItems = parsePDFItems(allItems);
                if (parsedItems.length === 0) {
                    setUploadStatus({
                        active: true,
                        status: 'error',
                        message: "No valid items found in the PDF. Please check the format."
                    });
                    return;
                }

                const resourcesToSave = [];
                const boqsToSave = [];

                parsedItems.forEach(item => {
                    const resourceId = window.crypto.randomUUID();
                    const ratesObj = {};
                    regions.forEach(r => {
                        ratesObj[r.name] = item.rate;
                    });

                    resourcesToSave.push({
                        id: resourceId,
                        code: item.itemCode,
                        description: item.description,
                        unit: item.unit,
                        rates: JSON.stringify(ratesObj),
                        rateHistory: JSON.stringify([])
                    });

                    const components = [
                        {
                            itemType: "resource",
                            itemId: resourceId,
                            qty: 1,
                            formulaStr: "1"
                        }
                    ];

                    boqsToSave.push({
                        itemCode: item.itemCode,
                        description: item.description,
                        unit: item.unit,
                        overhead: 0,
                        profit: 0,
                        components: JSON.stringify(components)
                    });
                });

                // 1. Bulk save resources
                await window.api.db.bulkSaveResources(resourcesToSave);

                // 2. Save master BOQs
                let added = 0;
                let updated = 0;
                for (const boq of boqsToSave) {
                    const existing = masterBoqs.find(b => b.itemCode === boq.itemCode);
                    if (existing) {
                        await window.api.db.saveMasterBoq(boq, existing.id, false);
                        updated++;
                    } else {
                        await window.api.db.saveMasterBoq(boq, null, true);
                        added++;
                    }
                }

                setUploadStatus({
                    active: true,
                    status: 'success',
                    message: `PDF Assemblies Processed!\n\nAdded: ${added}`
                });
                loadData();
            } catch (err) {
                console.error(err);
                setUploadStatus({
                    active: true,
                    status: 'error',
                    message: "Failed to parse or process the PDF file."
                });
            } finally {
                if (pdfInputRef.current) pdfInputRef.current.value = "";
            }
        };
        reader.readAsArrayBuffer(file);
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

                {/* Bottom Row: Filters (Search, Category) & Upload/Add Entry buttons */}
                <Box display="flex" alignItems="center" flexWrap="wrap" gap={2}>
                    <TextField placeholder="Search Code..." variant="outlined" size="small" value={searchCode} onChange={(e) => { setSearchCode(e.target.value); setPage(0); }} sx={styles.searchCodeField} InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>, sx: styles.searchInputProps }} />
                    <TextField placeholder="Search Description..." variant="outlined" size="small" value={searchDesc} onChange={(e) => { setSearchDesc(e.target.value); setPage(0); }} sx={styles.searchDescField} InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>, sx: styles.searchInputProps }} />

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
                        {categories.map(cat => {
                            const isCustom = !STATIC_CATEGORIES.includes(cat);
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
                                return (
                                    <TableRow key={b.id} hover>
                                        <TableCell sx={styles.bodyCellCode}>{b.itemCode || '-'}</TableCell>
                                        <TableCell sx={styles.bodyCellDesc}>{b.description}</TableCell>
                                        <TableCell sx={styles.bodyCellUnit}>{b.unit}</TableCell>
                                        <TableCell align="center"><Box display="flex" gap={1} justifyContent="center"><Button size="small" variant="outlined" color="warning" onClick={() => onEditBoq(b)} sx={styles.editButton}>EDIT</Button><Button size="small" variant="outlined" color="error" onClick={() => deleteMasterBoq(b.id, `${b.itemCode} - ${b.description}`)} sx={styles.deleteButton}>DELETE</Button></Box></TableCell>
                                    </TableRow>
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
                existingCategories={categories}
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