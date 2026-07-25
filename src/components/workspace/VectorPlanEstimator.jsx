import React, { useState, useRef, useEffect } from 'react';
import {
    Box, Typography, Button, Paper, TextField, Grid, Chip, CircularProgress,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import RefreshIcon from '@mui/icons-material/Refresh';
import CalculateIcon from '@mui/icons-material/Calculate';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';

// Dynamically load PDF.js from CDN to avoid React 19 / canvas package conflicts
const loadPdfJs = () => {
    return new Promise((resolve, reject) => {
        if (window.pdfjsLib) {
            resolve(window.pdfjsLib);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
        script.onload = () => {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
            resolve(window.pdfjsLib);
        };
        script.onerror = reject;
        document.head.appendChild(script);
    });
};

const AI_STEPS = [
    "Extracting structural lines & CAD layers...",
    "Detecting room boundaries...",
    "Aligning spatial coordinate system...",
    "Finalizing room corners & wall vectors..."
];

const RED_CROSSHAIR_CURSOR = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><line x1='12' y1='2' x2='12' y2='22' stroke='%23ff1744' stroke-width='2'/><line x1='2' y1='12' x2='22' y2='12' stroke='%23ff1744' stroke-width='2'/></svg>") 12 12, crosshair`;

export default function VectorPlanEstimator({ onQuantitiesCalculated }) {
    const [file, setFile] = useState(null);
    const [height, setHeight] = useState('3.0');
    const [refLength, setRefLength] = useState('5.0');
    const [wallThickness, setWallThickness] = useState('0.20');
    const [autoThickness, setAutoThickness] = useState(true);
    const [zoom, setZoom] = useState(1.0);
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
    const [isModelEstimator, setIsModelEstimator] = useState(false);

    const renderRef = useRef(null);
    const canvasRef = useRef(null);

    const [points, setPoints] = useState([]); // Stores { xPct, yPct }
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [pdfDoc, setPdfDoc] = useState(null);
    
    const [vertices, setVertices] = useState([]);
    const [segments, setSegments] = useState([]);
    const [snapPoint, setSnapPoint] = useState(null); // { xPct, yPct }
    const [snapSegment, setSnapSegment] = useState(null); // { p1: {xPct, yPct}, p2: {xPct, yPct} }

    const [aiAnalyzing, setAiAnalyzing] = useState(false);
    const [aiStep, setAiStep] = useState(0);

    const [panning, setPanning] = useState(false);
    const isDragging = useRef(false);
    const startX = useRef(0);
    const startY = useRef(0);
    const scrollLeft = useRef(0);
    const scrollTop = useRef(0);
    const dragDistance = useRef(0);

    const handleMouseDown = (e) => {
        if (e.button !== 0) return; // Only pan on left click
        const container = renderRef.current;
        if (!container) return;
        
        isDragging.current = true;
        setPanning(true);
        startX.current = e.pageX - container.offsetLeft;
        startY.current = e.pageY - container.offsetTop;
        scrollLeft.current = container.scrollLeft;
        scrollTop.current = container.scrollTop;
        dragDistance.current = 0;
    };

    const handleMouseMove = (e) => {
        if (!isDragging.current) return;
        e.preventDefault();
        const container = renderRef.current;
        if (!container) return;

        const x = e.pageX - container.offsetLeft;
        const y = e.pageY - container.offsetTop;
        const walkX = (x - startX.current) * 1.2;
        const walkY = (y - startY.current) * 1.2;
        
        container.scrollLeft = scrollLeft.current - walkX;
        container.scrollTop = scrollTop.current - walkY;
        
        dragDistance.current = Math.hypot(walkX, walkY);
    };

    const handleMouseUpOrLeave = () => {
        if (isDragging.current) {
            isDragging.current = false;
            setTimeout(() => setPanning(false), 50);
        }
    };

    const handleFileChange = async (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && selectedFile.type === "application/pdf") {
            setFile(selectedFile);
            setPoints([]);
            setResults(null);
            setPdfDoc(null);
            setVertices([]);
            setSegments([]);
            setAiAnalyzing(true);
            setAiStep(0);
            
            // Load and render PDF using PDF.js
            try {
                const pdfjs = await loadPdfJs();
                const arrayBuffer = await selectedFile.arrayBuffer();
                const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
                const pdf = await loadingTask.promise;
                setPdfDoc(pdf);
                setZoom(1.0);
                setTimeout(() => renderPage(pdf, 1, 1.0), 100);
                
                let backendDone = false;
                let animationDone = false;
                let responseData = null;

                const checkCompletion = () => {
                    if (backendDone && animationDone) {
                        setAiAnalyzing(false);
                        if (responseData) {
                            if (responseData.vertices) {
                                setVertices(responseData.vertices);
                            } else if (Array.isArray(responseData)) {
                                setVertices(responseData);
                            }
                            if (responseData.segments) {
                                setSegments(responseData.segments);
                            }
                        }
                    }
                };

                // Simulate AI Layout Analysis steps
                let currentStep = 0;
                const interval = setInterval(() => {
                    currentStep++;
                    if (currentStep < AI_STEPS.length) {
                        setAiStep(currentStep);
                    } else {
                        clearInterval(interval);
                        animationDone = true;
                        checkCompletion();
                    }
                }, 600);

                // Fetch structural corners (vertices) from backend
                const formData = new FormData();
                formData.append('file', selectedFile);
                const pythonApi = import.meta.env.VITE_PYTHON_API_URL || 'http://localhost:8000';
                fetch(`${pythonApi}/extract-vertices/`, {
                    method: 'POST',
                    body: formData
                })
                .then(res => res.json())
                .then(data => {
                    responseData = data;
                    backendDone = true;
                    checkCompletion();
                })
                .catch(err => {
                    console.error("Error loading vertices:", err);
                    setAiAnalyzing(false);
                });
            } catch (error) {
                console.error("Error loading PDF:", error);
                alert("Error parsing PDF file.");
                setAiAnalyzing(false);
            }
        } else {
            alert("Please upload a valid vector PDF file.");
        }
    };

    const renderPage = async (pdf, num, currentZoom = zoom) => {
        try {
            const page = await pdf.getPage(num);
            const canvas = canvasRef.current;
            const container = renderRef.current;
            if (!canvas || !container) return;
            
            const context = canvas.getContext('2d');
            const viewport = page.getViewport({ scale: 1 });
            const containerWidth = container.clientWidth || 600;
            const displayWidth = containerWidth * currentZoom;
            
            // Render at higher resolution (minimum 2.5x scale) for ultra-sharp CAD lines and text
            const dpr = Math.max(window.devicePixelRatio || 1, 2.5);
            const scale = (displayWidth / viewport.width) * dpr;
            const scaledViewport = page.getViewport({ scale });
            
            canvas.width = scaledViewport.width;
            canvas.height = scaledViewport.height;
            canvas.style.width = `${displayWidth}px`;
            canvas.style.height = `${scaledViewport.height / dpr}px`;
            
            const renderContext = {
                canvasContext: context,
                viewport: scaledViewport
            };
            await page.render(renderContext).promise;
            setCanvasSize({ width: displayWidth, height: scaledViewport.height / dpr });
        } catch (error) {
            console.error("Error rendering page:", error);
        }
    };

    // Re-render PDF on resize
    useEffect(() => {
        const handleResize = () => {
            if (pdfDoc) {
                renderPage(pdfDoc, 1, zoom);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [pdfDoc, zoom]);

    const handleZoomIn = () => {
        setZoom(prev => {
            const next = Math.min(prev + 0.25, 3.0);
            if (pdfDoc) renderPage(pdfDoc, 1, next);
            return next;
        });
    };

    const handleZoomOut = () => {
        setZoom(prev => {
            const next = Math.max(prev - 0.25, 0.5);
            if (pdfDoc) renderPage(pdfDoc, 1, next);
            return next;
        });
    };

    // Helper function to calculate the closest point on a line segment from a mouse point
    const getClosestPointOnSegment = (px, py, x1, y1, x2, y2) => {
        const dx = x2 - x1;
        const dy = y2 - y1;
        if (dx === 0 && dy === 0) {
            return { x: x1, y: y1, dist: Math.hypot(px - x1, py - y1) };
        }
        
        let t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
        t = Math.max(0, Math.min(1, t)); // Clamp projection to the line segment
        
        const cx = x1 + t * dx;
        const cy = y1 + t * dy;
        
        return {
            x: cx,
            y: cy,
            dist: Math.hypot(px - cx, py - cy)
        };
    };

    const handleCanvasMouseMove = (e) => {
        if (points.length >= 2 || isDragging.current || vertices.length === 0) {
            setSnapPoint(null);
            setSnapSegment(null);
            return;
        }

        const rect = canvasRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // 1. First prioritize snapping to a single corner point/vertex
        const vertexSnapThreshold = 18; 
        let closestVertex = null;
        let minVertexDist = vertexSnapThreshold;

        vertices.forEach(v => {
            const vx = v.xPct * rect.width;
            const vy = v.yPct * rect.height;
            const dist = Math.hypot(mouseX - vx, mouseY - vy);
            if (dist < minVertexDist) {
                minVertexDist = dist;
                closestVertex = { xPct: v.xPct, yPct: v.yPct };
            }
        });

        if (closestVertex) {
            setSnapPoint(closestVertex);
            setSnapSegment(null);
            return;
        }

        // 2. If not close to any vertex, check for snapping to a drawing line segment
        const segmentSnapThreshold = 12;
        let closestSegment = null;
        let minSegmentDist = segmentSnapThreshold;

        segments.forEach(seg => {
            const x1 = seg.p1.xPct * rect.width;
            const y1 = seg.p1.yPct * rect.height;
            const x2 = seg.p2.xPct * rect.width;
            const y2 = seg.p2.yPct * rect.height;

            const res = getClosestPointOnSegment(mouseX, mouseY, x1, y1, x2, y2);
            if (res.dist < minSegmentDist) {
                minSegmentDist = res.dist;
                closestSegment = seg;
            }
        });

        if (closestSegment) {
            setSnapSegment(closestSegment);
            setSnapPoint(null);
        } else {
            setSnapPoint(null);
            setSnapSegment(null);
        }
    };

    const handleContainerClick = (e) => {
        if (points.length >= 2 || dragDistance.current > 6) return;

        const rect = canvasRef.current.getBoundingClientRect();
        
        // If a whole segment is snapped, immediately mark both end points of the segment
        if (snapSegment) {
            setPoints([
                { xPct: snapSegment.p1.xPct, yPct: snapSegment.p1.yPct },
                { xPct: snapSegment.p2.xPct, yPct: snapSegment.p2.yPct }
            ]);
            setSnapSegment(null);
            setSnapPoint(null);
            return;
        }

        let xPct, yPct;
        if (snapPoint) {
            xPct = snapPoint.xPct;
            yPct = snapPoint.yPct;
        } else {
            // Recalculate closest vertex as fallback to guarantee exact snapping on click
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const snapThreshold = 20; 
            let closest = null;
            let minDistance = snapThreshold;

            vertices.forEach(v => {
                const vx = v.xPct * rect.width;
                const vy = v.yPct * rect.height;
                const dist = Math.hypot(mouseX - vx, mouseY - vy);
                if (dist < minDistance) {
                    minDistance = dist;
                    closest = { xPct: v.xPct, yPct: v.yPct };
                }
            });

            if (closest) {
                xPct = closest.xPct;
                yPct = closest.yPct;
            } else {
                // Calculate percentages (0.0 to 1.0) relative to the PDF rendering canvas
                xPct = (e.clientX - rect.left) / rect.width;
                yPct = (e.clientY - rect.top) / rect.height;
            }
        }

        setPoints([...points, { xPct, yPct }]);
        setSnapPoint(null);
    };

    const clearPoints = () => setPoints([]);

    const handleUpload = async (e) => {
        if (e && typeof e.preventDefault === 'function') {
            e.preventDefault();
        }
        if (!file || !height || !refLength || points.length !== 2) {
            alert("Please provide all inputs and click two points on the floor plan.");
            return;
        }

        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('ceiling_height', height);
        formData.append('reference_length_m', refLength);
        formData.append('wall_thickness', autoThickness ? '0.0' : wallThickness);
        
        // Send relative percentages to the backend
        formData.append('p1_x_pct', points[0].xPct);
        formData.append('p1_y_pct', points[0].yPct);
        formData.append('p2_x_pct', points[1].xPct);
        formData.append('p2_y_pct', points[1].yPct);

        try {
            const apiUrl = import.meta.env.VITE_PYTHON_API_URL || 'http://localhost:8000';
            const endpoint = isModelEstimator ? 'calculate-model-quantities' : 'calculate-vector-quantities';
            const response = await fetch(`${apiUrl}/${endpoint}/`, {
                method: 'POST',
                body: formData,
            });
            if (!response.ok) {
                throw new Error(`Server returned error: ${response.statusText}`);
            }
            const data = await response.json();
            setResults(data);
            if (onQuantitiesCalculated) onQuantitiesCalculated(data);
        } catch (error) {
            console.error("Error calculating quantities:", error);
            const fallbackUrl = import.meta.env.VITE_PYTHON_API_URL || 'http://localhost:8000';
            alert("Failed to connect to backend estimator at " + (window.location.origin.includes('localhost') ? fallbackUrl : 'estimation backend'));
        } finally {
            setLoading(false);
        }
    };

    const wallLength = results?.total_wall_length_m || 0;
    const wallThicknessVal = results?.wall_thickness_m || 0;
    const ceilingHeightVal = parseFloat(height) || 0;

    const blockWorkVolume = results?.block_work_cum ?? '0.00';
    const plasterPainting = results?.plastering_sqm ?? '0.00';
    const blockCount = results?.block_count ?? 0;
    const netVolume = results?.net_volume_cum ?? '0.00';

    return (
        <Paper
            elevation={0}
            sx={{
                p: 4,
                bgcolor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: 3,
                color: '#fff',
                fontFamily: "'Inter', sans-serif"
            }}
        >
            {/* Header */}
            <Box display="flex" alignItems="center" gap={2} mb={3}>
                <PictureAsPdfIcon sx={{ fontSize: 32, color: 'primary.main' }} />
                <Box>
                    <Typography variant="h5" sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 'bold' }}>
                        VECTOR PDF QUANTITY ESTIMATOR
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'JetBrains Mono', monospace" }}>
                        Interactive CAD Vector Parsing & Takeoff Tool
                    </Typography>
                </Box>
            </Box>

            {/* Estimator Mode Switcher */}
            <Box display="flex" gap={2} mb={3} p={1.5} bgcolor="rgba(255, 255, 255, 0.02)" border="1px solid rgba(255,255,255,0.05)" borderRadius={2}>
                <Button
                    onClick={() => { setIsModelEstimator(false); setResults(null); }}
                    variant={!isModelEstimator ? "contained" : "outlined"}
                    size="small"
                    sx={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '11px',
                        textTransform: 'none',
                        flex: 1,
                        bgcolor: !isModelEstimator ? '#3b82f6' : 'transparent',
                        borderColor: 'rgba(255,255,255,0.1)',
                        color: '#fff',
                        '&:hover': { bgcolor: !isModelEstimator ? '#2563eb' : 'rgba(255,255,255,0.05)' }
                    }}
                >
                    📐 CAD Vector Takeoff (Precise)
                </Button>
                <Button
                    onClick={() => { setIsModelEstimator(true); setResults(null); }}
                    variant={isModelEstimator ? "contained" : "outlined"}
                    size="small"
                    sx={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '11px',
                        textTransform: 'none',
                        flex: 1,
                        bgcolor: isModelEstimator ? '#3b82f6' : 'transparent',
                        borderColor: 'rgba(255,255,255,0.1)',
                        color: '#fff',
                        '&:hover': { bgcolor: isModelEstimator ? '#2563eb' : 'rgba(255,255,255,0.05)' }
                    }}
                >
                    🤖 AI Deep Learning Model (Symbol Spotting)
                </Button>
            </Box>

            <Grid container spacing={4}>
                {/* Inputs & Rendering */}
                <Grid item xs={12} md={7}>
                    <Box component="form" onSubmit={handleUpload} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        
                        {/* File Upload */}
                        <Box>
                            <Typography variant="subtitle2" sx={{ fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.6)', mb: 1 }}>
                                1. UPLOAD CAD DRAWING (PDF)
                            </Typography>
                            <Button
                                variant="outlined"
                                component="label"
                                fullWidth
                                sx={{
                                    border: '1px dashed rgba(255,255,255,0.2)',
                                    py: 3,
                                    bgcolor: 'rgba(255,255,255,0.01)',
                                    color: '#fff',
                                    fontFamily: "'JetBrains Mono', monospace",
                                    fontSize: '13px',
                                    '&:hover': {
                                        border: '1px dashed #3b82f6',
                                        bgcolor: 'rgba(59,130,246,0.05)'
                                    }
                                }}
                            >
                                {file ? file.name : "CHOOSE VECTOR PDF FILE"}
                                <input
                                    type="file"
                                    accept="application/pdf"
                                    hidden
                                    onChange={handleFileChange}
                                />
                            </Button>
                        </Box>

                        {/* Interactive Canvas */}
                        {file && (
                            <Box sx={{ border: '1px solid rgba(255,255,255,0.1)', p: 1.5, borderRadius: 2, bgcolor: 'rgba(0,0,0,0.2)' }}>
                                 <Box display="flex" justifyContent="space-between" alignItems="center" mb={1} flexWrap="wrap" gap={1}>
                                    <Box display="flex" alignItems="center" gap={1.5}>
                                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontFamily: "'JetBrains Mono', monospace" }}>
                                            2. Define reference line ({points.length}/2 points clicked)
                                        </Typography>
                                        {snapPoint && (
                                            <Chip 
                                                label="CORNER SNAPPED" 
                                                size="small" 
                                                sx={{ 
                                                    height: 18, 
                                                    fontSize: '9px', 
                                                    fontFamily: "'JetBrains Mono', monospace", 
                                                    fontWeight: 'bold',
                                                    bgcolor: '#2ecc71',
                                                    color: '#fff',
                                                    animation: 'pulseSuccess 0.8s infinite alternate',
                                                    '@keyframes pulseSuccess': {
                                                        '0%': { opacity: 0.7 },
                                                        '100%': { opacity: 1 }
                                                    }
                                                }} 
                                            />
                                        )}
                                        {snapSegment && (
                                            <Chip 
                                                label="SEGMENT SNAPPED" 
                                                size="small" 
                                                sx={{ 
                                                    height: 18, 
                                                    fontSize: '9px', 
                                                    fontFamily: "'JetBrains Mono', monospace", 
                                                    fontWeight: 'bold',
                                                    bgcolor: '#3498db',
                                                    color: '#fff',
                                                    animation: 'pulseInfo 0.8s infinite alternate',
                                                    '@keyframes pulseInfo': {
                                                        '0%': { opacity: 0.7 },
                                                        '100%': { opacity: 1 }
                                                    }
                                                }} 
                                            />
                                        )}
                                    </Box>
                                    
                                    <Box display="flex" alignItems="center" gap={1}>
                                        {/* Zoom Controls */}
                                        <Box display="flex" alignItems="center" bgcolor="rgba(255,255,255,0.05)" borderRadius={1} px={0.5}>
                                            <IconButton size="small" onClick={handleZoomOut} sx={{ color: '#fff' }} disabled={zoom <= 0.5}>
                                                <ZoomOutIcon fontSize="small" />
                                            </IconButton>
                                            <Typography variant="caption" sx={{ color: '#fff', fontFamily: "'JetBrains Mono', monospace", mx: 1, minWidth: '40px', textAlign: 'center' }}>
                                                {Math.round(zoom * 100)}%
                                            </Typography>
                                            <IconButton size="small" onClick={handleZoomIn} sx={{ color: '#fff' }} disabled={zoom >= 3.0}>
                                                <ZoomInIcon fontSize="small" />
                                            </IconButton>
                                        </Box>

                                        {points.length > 0 && (
                                            <Button
                                                size="small"
                                                startIcon={<RefreshIcon />}
                                                onClick={clearPoints}
                                                sx={{ color: 'error.main', fontSize: '10px', fontFamily: "'JetBrains Mono', monospace" }}
                                            >
                                                Reset Points
                                            </Button>
                                        )}
                                    </Box>
                                </Box>

                                <Box
                                    ref={renderRef}
                                    onMouseDown={handleMouseDown}
                                    onMouseMove={handleMouseMove}
                                    onMouseUp={handleMouseUpOrLeave}
                                    onMouseLeave={handleMouseUpOrLeave}
                                    sx={{
                                        position: 'relative',
                                        overflow: 'auto',
                                        cursor: points.length < 2 ? (panning ? 'grabbing' : RED_CROSSHAIR_CURSOR) : (panning ? 'grabbing' : 'grab'),
                                        width: '100%',
                                        height: '500px', // Fixed viewport height
                                        bgcolor: '#fff',
                                        borderRadius: 1,
                                        userSelect: 'none',
                                        display: 'block',
                                        textAlign: zoom > 1.0 ? 'left' : 'center',
                                        lineHeight: 0
                                    }}
                                >
                                    <Box sx={{ position: 'relative', display: 'inline-block' }}>
                                        <canvas
                                            ref={canvasRef}
                                            onClick={handleContainerClick}
                                            onMouseMove={handleCanvasMouseMove}
                                            onMouseLeave={() => { setSnapPoint(null); setSnapSegment(null); }}
                                            style={{ display: 'block', maxWidth: 'none' }}
                                        />
                                        
                                        {/* Render clicked reference points relative to canvas */}
                                        {points.map((pt, idx) => (
                                            <Box
                                                key={idx}
                                                sx={{
                                                    position: 'absolute',
                                                    width: 14,
                                                    height: 14,
                                                    bgcolor: '#ff1744', // Bright red
                                                    borderRadius: '50%',
                                                    transform: 'translate(-50%, -50%)',
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                                                    border: '2px solid #fff',
                                                    zIndex: 10,
                                                    pointerEvents: 'none'
                                                }}
                                                style={{ left: pt.xPct * canvasSize.width, top: pt.yPct * canvasSize.height }}
                                            />
                                        ))}

                                        {/* Render all structural vertices/corners as small, semi-transparent dots to make them visible */}
                                        {vertices.map((v, idx) => (
                                            <Box
                                                key={`vertex-${idx}`}
                                                sx={{
                                                    position: 'absolute',
                                                    width: 6,
                                                    height: 6,
                                                    bgcolor: 'rgba(41, 128, 185, 0.8)', // Professional deeper blue
                                                    borderRadius: '50%',
                                                    transform: 'translate(-50%, -50%)',
                                                    border: '1px solid #ffffff',
                                                    boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
                                                    zIndex: 8,
                                                    pointerEvents: 'none'
                                                }}
                                                style={{ left: v.xPct * canvasSize.width, top: v.yPct * canvasSize.height }}
                                            />
                                        ))}
                                        
                                        {/* Render reference line relative to canvas */}
                                        {points.length === 2 && (
                                            <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
                                                <line
                                                    x1={points[0].xPct * canvasSize.width} y1={points[0].yPct * canvasSize.height}
                                                    x2={points[1].xPct * canvasSize.width} y2={points[1].yPct * canvasSize.height}
                                                    stroke="#dc2626" strokeWidth="2.5" strokeDasharray="5"
                                                />
                                            </svg>
                                        )}

                                        {/* Snap Target Indicator - Green Blinking/Pulsing Dot */}
                                        {snapPoint && (
                                            <>
                                                <Box
                                                    sx={{
                                                        position: 'absolute',
                                                        width: 12,
                                                        height: 12,
                                                        bgcolor: '#2ecc71', // Professional material green
                                                        borderRadius: '50%',
                                                        transform: 'translate(-50%, -50%)',
                                                        boxShadow: '0 0 8px #2ecc71, 0 0 15px #2ecc71',
                                                        zIndex: 21,
                                                        pointerEvents: 'none',
                                                        animation: 'blinkDot 0.4s infinite alternate',
                                                        '@keyframes blinkDot': {
                                                            '0%': { opacity: 0.6 },
                                                            '100%': { opacity: 1 }
                                                        }
                                                    }}
                                                    style={{ left: snapPoint.xPct * canvasSize.width, top: snapPoint.yPct * canvasSize.height }}
                                                />
                                                <Box
                                                    sx={{
                                                        position: 'absolute',
                                                        width: 24,
                                                        height: 24,
                                                        border: '2px solid #2ecc71',
                                                        borderRadius: '50%',
                                                        transform: 'translate(-50%, -50%)',
                                                        zIndex: 20,
                                                        pointerEvents: 'none',
                                                        animation: 'pulseGreenRing 1.2s infinite',
                                                        '@keyframes pulseGreenRing': {
                                                            '0%': { transform: 'translate(-50%, -50%) scale(0.5)', opacity: 1 },
                                                            '100%': { transform: 'translate(-50%, -50%) scale(2.0)', opacity: 0 }
                                                        }
                                                    }}
                                                    style={{ left: snapPoint.xPct * canvasSize.width, top: snapPoint.yPct * canvasSize.height }}
                                                />
                                            </>
                                        )}

                                        {/* Render snapped segment highlight */}
                                        {snapSegment && (
                                            <Box
                                                component="svg"
                                                sx={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    width: '100%',
                                                    height: '100%',
                                                    zIndex: 19,
                                                    pointerEvents: 'none',
                                                    '@keyframes pulseLine': {
                                                        '0%': { opacity: 0.5 },
                                                        '100%': { opacity: 1 }
                                                    }
                                                }}
                                            >
                                                <line
                                                    x1={snapSegment.p1.xPct * canvasSize.width}
                                                    y1={snapSegment.p1.yPct * canvasSize.height}
                                                    x2={snapSegment.p2.xPct * canvasSize.width}
                                                    y2={snapSegment.p2.yPct * canvasSize.height}
                                                    stroke="#3498db"
                                                    strokeWidth="3.5"
                                                    style={{
                                                        animation: 'pulseLine 0.6s infinite alternate'
                                                    }}
                                                />
                                                <circle
                                                    cx={snapSegment.p1.xPct * canvasSize.width}
                                                    cy={snapSegment.p1.yPct * canvasSize.height}
                                                    r="6"
                                                    fill="#3498db"
                                                />
                                                <circle
                                                    cx={snapSegment.p2.xPct * canvasSize.width}
                                                    cy={snapSegment.p2.yPct * canvasSize.height}
                                                    r="6"
                                                    fill="#3498db"
                                                />
                                            </Box>
                                        )}

                                        {/* Render Computational Geometry Polygons */}
                                        {!isModelEstimator && (() => {
                                            const labelPositions = [];
                                            return results?.polygons?.map((poly, idx) => {
                                                const pointsStr = poly.vertices.map(pt => 
                                                    `${pt.xPct * canvasSize.width},${pt.yPct * canvasSize.height}`
                                                ).join(" ");
                                                
                                                let fillColor = "rgba(41, 128, 185, 0.15)";
                                                let strokeColor = "#2980b9";
                                                if (poly.label === "Wall Thickness") {
                                                    fillColor = "rgba(192, 57, 43, 0.15)";
                                                    strokeColor = "#c0392b";
                                                } else if (poly.label === "Slab") {
                                                    fillColor = "rgba(39, 174, 96, 0.15)";
                                                    strokeColor = "#27ae60";
                                                } else if (poly.label === "Column") {
                                                    fillColor = "rgba(211, 84, 0, 0.2)";
                                                    strokeColor = "#d35400";
                                                }

                                                let cx = poly.centroid.xPct * canvasSize.width;
                                                let cy = poly.centroid.yPct * canvasSize.height;

                                                if (poly.label !== "Wall Thickness") {
                                                    let overlap = true;
                                                    let attempts = 0;
                                                    let dx = 0;
                                                    let dy = 0;
                                                    while (overlap && attempts < 20) {
                                                        overlap = false;
                                                        for (const pos of labelPositions) {
                                                            if (Math.abs(cx + dx - pos.x) < 210 && Math.abs(cy + dy - pos.y) < 45) {
                                                                overlap = true;
                                                                break;
                                                            }
                                                        }
                                                        if (overlap) {
                                                            attempts++;
                                                            const step = Math.floor(attempts / 4) + 1;
                                                            const dir = attempts % 4;
                                                            if (dir === 0) { dx = 0; dy = -45 * step; }
                                                            else if (dir === 1) { dx = 210 * step; dy = 0; }
                                                            else if (dir === 2) { dx = 0; dy = 45 * step; }
                                                            else if (dir === 3) { dx = -210 * step; dy = 0; }
                                                        }
                                                    }
                                                    cx += dx;
                                                    cy += dy;
                                                    labelPositions.push({ x: cx, y: cy });
                                                }
                                                
                                                let labelText = `ROOM ${idx + 1}`;
                                                if (poly.text_inside && poly.text_inside.length > 0 && typeof poly.text_inside[0] === 'string' && poly.text_inside[0].trim() !== '') {
                                                    labelText = poly.text_inside[0];
                                                } else if (poly.label && typeof poly.label === 'string' && poly.label.trim() !== '' && poly.label !== "Wall Thickness") {
                                                    labelText = `${poly.label} ${idx + 1}`;
                                                }

                                                return (
                                                    <Box
                                                        key={`poly-${idx}`}
                                                        component="svg"
                                                        sx={{
                                                            position: 'absolute',
                                                            top: 0,
                                                            left: 0,
                                                            width: '100%',
                                                            height: '100%',
                                                            zIndex: 14,
                                                            pointerEvents: 'none'
                                                        }}
                                                    >
                                                        <polygon
                                                            points={pointsStr}
                                                            fill={fillColor}
                                                            stroke={strokeColor}
                                                            strokeWidth="1.5"
                                                        />
                                                        
                                                        {poly.label !== "Wall Thickness" && (
                                                            <foreignObject
                                                                x={cx - 105}
                                                                y={cy - 18}
                                                                width="210"
                                                                height="36"
                                                                style={{ pointerEvents: 'none', overflow: 'visible' }}
                                                            >
                                                                <div style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                gap: '8px',
                                                                padding: '6px 12px',
                                                                background: 'rgba(15, 23, 42, 0.85)',
                                                                backdropFilter: 'blur(12px)',
                                                                WebkitBackdropFilter: 'blur(12px)',
                                                                border: `1px solid rgba(255, 255, 255, 0.15)`,
                                                                borderLeft: `4px solid ${strokeColor}`,
                                                                borderRadius: '6px',
                                                                boxShadow: '0 6px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
                                                                color: '#fff',
                                                                fontFamily: "'Inter', 'Roboto', sans-serif",
                                                                letterSpacing: '0.5px'
                                                            }}>
                                                                <div style={{
                                                                    fontSize: '11px',
                                                                    fontWeight: '700',
                                                                    textTransform: 'uppercase',
                                                                    color: 'rgba(255,255,255,0.95)',
                                                                    whiteSpace: 'nowrap'
                                                                }}>
                                                                    {labelText}
                                                                </div>

                                                                {poly.width_m !== undefined && poly.height_m !== undefined ? (
                                                                    <>
                                                                        <div style={{
                                                                            width: '1px',
                                                                            height: '12px',
                                                                            background: 'rgba(255,255,255,0.2)'
                                                                        }} />
                                                                        <div style={{
                                                                            fontSize: '10px',
                                                                            fontWeight: '600',
                                                                            color: 'rgba(255,255,255,0.85)',
                                                                            whiteSpace: 'nowrap'
                                                                        }}>
                                                                            {poly.width_m} * {poly.height_m}
                                                                        </div>
                                                                        <div style={{
                                                                            fontSize: '11px',
                                                                            fontWeight: '700',
                                                                            color: 'rgba(255,255,255,0.6)',
                                                                            marginRight: '2px'
                                                                        }}>
                                                                            =
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    <div style={{
                                                                        width: '1px',
                                                                        height: '12px',
                                                                        background: 'rgba(255,255,255,0.2)'
                                                                    }} />
                                                                )}
                                                                <div style={{
                                                                    fontSize: '11px',
                                                                    fontWeight: '700',
                                                                    color: '#4ade80',
                                                                    whiteSpace: 'nowrap'
                                                                }}>
                                                                    {poly.area_sqm}<span style={{ fontSize: '9px', opacity: 0.8, marginLeft: '2px' }}>m²</span>
                                                                </div>
                                                            </div>
                                                        </foreignObject>
                                                    )}
                                                </Box>
                                            );
                                            });
                                        })()}

                                        {/* Render AI Detected Objects segments/polygons or boxes */}
                                        {isModelEstimator && results?.detected_objects?.map((obj, idx) => {
                                            if (obj.polygon && obj.polygon.length > 0) {
                                                const pointsStr = obj.polygon.map(pt => 
                                                    `${pt[0] * canvasSize.width},${pt[1] * canvasSize.height}`
                                                ).join(" ");
                                                
                                                return (
                                                    <Box
                                                        key={`ai-obj-${idx}`}
                                                        component="svg"
                                                        sx={{
                                                            position: 'absolute',
                                                            top: 0,
                                                            left: 0,
                                                            width: '100%',
                                                            height: '100%',
                                                            zIndex: 15,
                                                            pointerEvents: 'none'
                                                        }}
                                                    >
                                                        <polygon
                                                            points={pointsStr}
                                                            fill="rgba(142, 68, 173, 0.15)"
                                                            stroke="#8e44ad"
                                                            strokeWidth="1.5"
                                                        />
                                                        <text
                                                            x={obj.polygon[0][0] * canvasSize.width}
                                                            y={obj.polygon[0][1] * canvasSize.height - 5}
                                                            fill="#2ecc71"
                                                            fontSize="10px"
                                                            fontFamily="'JetBrains Mono', monospace"
                                                            fontWeight="bold"
                                                            style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.8)' }}
                                                        >
                                                            {obj.label} ({Math.round(obj.confidence * 100)}%)
                                                        </text>
                                                    </Box>
                                                );
                                            } else if (obj.box && obj.box.length === 4) {
                                                const [x1, y1, x2, y2] = obj.box;
                                                return (
                                                    <Box
                                                        key={`ai-box-${idx}`}
                                                        sx={{
                                                            position: 'absolute',
                                                            left: x1 * canvasSize.width,
                                                            top: y1 * canvasSize.height,
                                                            width: (x2 - x1) * canvasSize.width,
                                                            height: (y2 - y1) * canvasSize.height,
                                                            border: '1.5px solid #8e44ad',
                                                            bgcolor: 'rgba(142, 68, 173, 0.1)',
                                                            zIndex: 15,
                                                            pointerEvents: 'none'
                                                        }}
                                                    >
                                                        <Typography
                                                            variant="caption"
                                                            sx={{
                                                                position: 'absolute',
                                                                top: -16,
                                                                left: 0,
                                                                color: '#2ecc71',
                                                                fontFamily: "'JetBrains Mono', monospace",
                                                                fontWeight: 'bold',
                                                                fontSize: '9px',
                                                                whiteSpace: 'nowrap',
                                                                bgcolor: 'rgba(15, 23, 42, 0.8)',
                                                                px: 0.5,
                                                                borderRadius: 0.5
                                                            }}
                                                        >
                                                            {obj.label} ({Math.round(obj.confidence * 100)}%)
                                                        </Typography>
                                                    </Box>
                                                );
                                            }
                                            return null;
                                        })}

                                    </Box>

                                    {/* AI Layout Analysis loading overlay */}
                                    {aiAnalyzing && (
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: '100%',
                                                bgcolor: 'rgba(15, 23, 42, 0.9)', // Deep dark slate
                                                backdropFilter: 'blur(8px)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                zIndex: 100,
                                                borderRadius: 1,
                                                color: '#fff',
                                                p: 4,
                                                textAlign: 'center'
                                            }}
                                        >
                                            {/* Pulsing AI Brain/Radar graphic */}
                                            <Box
                                                sx={{
                                                    position: 'relative',
                                                    width: 100,
                                                    height: 100,
                                                    mb: 4,
                                                    display: 'flex',
                                                    justifyContent: 'center',
                                                    alignItems: 'center'
                                                }}
                                            >
                                                <CircularProgress
                                                    size={80}
                                                    thickness={2.5}
                                                    sx={{
                                                        color: '#3b82f6',
                                                        position: 'absolute'
                                                    }}
                                                />
                                                <Box
                                                    sx={{
                                                        width: 90,
                                                        height: 90,
                                                        borderRadius: '50%',
                                                        border: '2px solid #00e676',
                                                        position: 'absolute',
                                                        animation: 'pulseAI 1.5s infinite',
                                                        '@keyframes pulseAI': {
                                                            '0%': { transform: 'scale(0.8)', opacity: 0.8 },
                                                            '100%': { transform: 'scale(1.4)', opacity: 0 }
                                                        }
                                                    }}
                                                />
                                                <Typography sx={{ fontSize: 36, animation: 'bounce 2s infinite' }}>🤖</Typography>
                                            </Box>
                                            
                                            <Typography variant="h6" sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 'bold', mb: 1, letterSpacing: '1.5px', color: '#3b82f6' }}>
                                                AI LAYOUT ANALYZER
                                            </Typography>
                                            
                                            <Typography variant="body2" sx={{ fontFamily: "'JetBrains Mono', monospace", color: '#00e676', mb: 3, height: '24px', fontWeight: 'bold' }}>
                                                {AI_STEPS[aiStep]}
                                            </Typography>
                                            
                                            {/* Custom AI styling progress bar */}
                                            <Box sx={{ width: '280px', height: '6px', bgcolor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                <Box
                                                    sx={{
                                                        width: `${((aiStep + 1) / AI_STEPS.length) * 100}%`,
                                                        height: '100%',
                                                        bgcolor: '#3b82f6',
                                                        borderRadius: 3,
                                                        boxShadow: '0 0 8px #3b82f6',
                                                        transition: 'width 0.4s ease-in-out'
                                                    }}
                                                />
                                            </Box>
                                        </Box>
                                    )}
                                </Box>
                            </Box>
                        )}

                        {/* Scaling Inputs */}
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <Typography variant="subtitle2" sx={{ fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.6)', mb: 1, fontSize: '11px' }}>
                                    3. REF LENGTH (m)
                                </Typography>
                                <TextField
                                    fullWidth
                                    size="small"
                                    type="number"
                                    value={refLength}
                                    onChange={(e) => setRefLength(e.target.value)}
                                    placeholder="5.0"
                                    slotProps={{
                                        htmlInput: { step: "0.01", min: "0.1" },
                                        input: {
                                            sx: {
                                                fontFamily: "'JetBrains Mono', monospace",
                                                fontSize: '12px',
                                                color: '#fff',
                                                bgcolor: 'rgba(255,255,255,0.03)',
                                                borderColor: 'rgba(255,255,255,0.1)'
                                            }
                                        }
                                    }}
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <Typography variant="subtitle2" sx={{ fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.6)', mb: 1, fontSize: '11px' }}>
                                    4. HEIGHT (m)
                                </Typography>
                                <TextField
                                    fullWidth
                                    size="small"
                                    type="number"
                                    value={height}
                                    onChange={(e) => setHeight(e.target.value)}
                                    placeholder="3.0"
                                    slotProps={{
                                        htmlInput: { step: "0.01", min: "0.1" },
                                        input: {
                                            sx: {
                                                fontFamily: "'JetBrains Mono', monospace",
                                                fontSize: '12px',
                                                color: '#fff',
                                                bgcolor: 'rgba(255,255,255,0.03)',
                                                borderColor: 'rgba(255,255,255,0.1)'
                                            }
                                        }
                                    }}
                                />
                            </Grid>
                        </Grid>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            disabled={loading || points.length !== 2}
                            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CalculateIcon />}
                            sx={{
                                py: 1.5,
                                fontFamily: "'JetBrains Mono', monospace",
                                fontWeight: 'bold',
                                fontSize: '14px',
                                borderRadius: 2,
                                textTransform: 'none',
                                bgcolor: '#3b82f6',
                                color: '#fff',
                                '&:hover': { bgcolor: '#2563eb' },
                                '&:disabled': { bgcolor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.3)' }
                            }}
                        >
                            {loading ? "PARSING CAD VECTORS..." : "CALCULATE QUANTITIES"}
                        </Button>
                    </Box>
                </Grid>

                {/* Results Screen */}
                <Grid item xs={12} md={5}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 3,
                            height: '100%',
                            bgcolor: 'rgba(0, 0, 0, 0.2)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            borderRadius: 3,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: results ? 'flex-start' : 'center',
                            alignItems: results ? 'stretch' : 'center',
                            minHeight: '400px'
                        }}
                    >
                        {!results ? (
                            <Box sx={{ textAlign: 'center', p: 4 }}>
                                <Typography sx={{ fontSize: 48, mb: 1 }}>📐</Typography>
                                <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: 'rgba(255,255,255,0.4)', maxWidth: 280, mx: 'auto' }}>
                                    Upload a vector floor plan, draw the reference scale line, and click calculate to estimate quantities.
                                </Typography>
                            </Box>
                        ) : (
                            <Box>
                                <Typography variant="subtitle1" sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 'bold', color: 'primary.main', mb: 2 }}>
                                    ESTIMATION SUMMARY
                                </Typography>
                                
                                <Box sx={{ mb: 3, p: 2, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <Typography variant="caption" sx={{ fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.4)' }}>
                                        Scale factor: 1 PDF point = {results.scale_factor.toFixed(6)} meters
                                    </Typography>
                                </Box>

                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ color: 'rgba(255,255,255,0.5)', fontFamily: "'JetBrains Mono', monospace", borderBottomColor: 'rgba(255,255,255,0.08)' }}>PARAMETER</TableCell>
                                                <TableCell align="right" sx={{ color: 'rgba(255,255,255,0.5)', fontFamily: "'JetBrains Mono', monospace", borderBottomColor: 'rgba(255,255,255,0.08)' }}>VALUE</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            <TableRow hover>
                                                <TableCell sx={{ color: '#fff', borderBottomColor: 'rgba(255,255,255,0.05)' }}>Wall Thickness</TableCell>
                                                <TableCell align="right" sx={{ color: '#fff', fontWeight: 'bold', borderBottomColor: 'rgba(255,255,255,0.05)' }}>{results.wall_thickness_m} m</TableCell>
                                            </TableRow>
                                            {results.total_brickwork_cum !== undefined && (
                                                <TableRow hover>
                                                    <TableCell sx={{ color: '#fff', borderBottomColor: 'rgba(255,255,255,0.05)', fontWeight: '500' }}>Total Brickwork</TableCell>
                                                    <TableCell align="right" sx={{ color: '#00e676', fontWeight: 'bold', borderBottomColor: 'rgba(255,255,255,0.05)' }}>{results.total_brickwork_cum} m³</TableCell>
                                                </TableRow>
                                            )}

                                            <TableRow hover>
                                                <TableCell sx={{ color: '#fff', borderBottomColor: 'rgba(255,255,255,0.05)' }}>Gross Volume (Net + Waste)</TableCell>
                                                <TableCell align="right" sx={{ color: '#fff', fontWeight: 'bold', borderBottomColor: 'rgba(255,255,255,0.05)' }}>{blockWorkVolume} m³</TableCell>
                                            </TableRow>
                                            <TableRow hover>
                                                <TableCell sx={{ color: '#fff', borderBottomColor: 'rgba(255,255,255,0.05)' }}>Standard Block Count</TableCell>
                                                <TableCell align="right" sx={{ color: '#3498db', fontWeight: 'bold', borderBottomColor: 'rgba(255,255,255,0.05)' }}>{blockCount} blocks</TableCell>
                                            </TableRow>
                                            <TableRow hover>
                                                <TableCell sx={{ color: '#fff', borderBottomColor: 'rgba(255,255,255,0.05)' }}>Plastering</TableCell>
                                                <TableCell align="right" sx={{ color: '#fff', fontWeight: 'bold', borderBottomColor: 'rgba(255,255,255,0.05)' }}>{plasterPainting} m²</TableCell>
                                            </TableRow>
                                            <TableRow hover>
                                                <TableCell sx={{ color: '#fff', borderBottomColor: 'rgba(255,255,255,0.05)' }}>Painting</TableCell>
                                                <TableCell align="right" sx={{ color: '#fff', fontWeight: 'bold', borderBottomColor: 'rgba(255,255,255,0.05)' }}>{plasterPainting} m²</TableCell>
                                            </TableRow>
                                            {results.flooring_area_sqm !== undefined && (
                                                <>
                                                    <TableRow hover>
                                                        <TableCell sx={{ color: '#00e676', fontWeight: 'bold', borderBottomColor: 'rgba(255,255,255,0.05)' }}>Total Flooring Area</TableCell>
                                                        <TableCell align="right" sx={{ color: '#00e676', fontWeight: 'bold', borderBottomColor: 'rgba(255,255,255,0.05)' }}>{results.flooring_area_sqm} m²</TableCell>
                                                    </TableRow>
                                                    <TableRow hover>
                                                        <TableCell sx={{ color: '#00e676', fontWeight: 'bold', borderBottomColor: 'rgba(255,255,255,0.05)' }}>Flooring Perimeter / Skirting</TableCell>
                                                        <TableCell align="right" sx={{ color: '#00e676', fontWeight: 'bold', borderBottomColor: 'rgba(255,255,255,0.05)' }}>{results.flooring_perimeter_m} m</TableCell>
                                                    </TableRow>
                                                </>
                                            )}
                                            {!isModelEstimator && results?.polygons && results.polygons.length > 0 && (
                                                <>
                                                    <TableRow>
                                                        <TableCell colSpan={2} sx={{ color: '#3b82f6', fontWeight: 'bold', fontFamily: "'JetBrains Mono', monospace", borderBottomColor: 'rgba(255,255,255,0.08)', pt: 2, fontSize: '12px' }}>
                                                            DETECTED ROOMS / SPACES (COMPUTATIONAL GEOMETRY)
                                                        </TableCell>
                                                    </TableRow>
                                                    {results.polygons.map((poly, idx) => (
                                                        <TableRow key={`poly-summary-${idx}`} hover>
                                                            <TableCell sx={{ color: '#fff', borderBottomColor: 'rgba(255,255,255,0.05)', fontSize: '12px', pl: 2 }}>
                                                                <span style={{
                                                                    display: 'inline-block',
                                                                    width: 8,
                                                                    height: 8,
                                                                    borderRadius: '50%',
                                                                    backgroundColor: poly.label === 'Wall Thickness' ? '#ef4444' : poly.label === 'Slab' ? '#10b981' : poly.label === 'Column' ? '#f59e0b' : '#3b82f6',
                                                                    marginRight: 6
                                                                }}></span>
                                                                {poly.label} {poly.text_inside.length > 0 ? `("${poly.text_inside[0]}")` : `#${idx + 1}`}
                                                            </TableCell>
                                                            <TableCell align="right" sx={{ color: '#00e676', fontWeight: 'bold', borderBottomColor: 'rgba(255,255,255,0.05)', fontSize: '12px' }}>
                                                                {poly.width_m !== undefined && poly.height_m !== undefined ? (
                                                                    `${poly.width_m} * ${poly.height_m} = ${poly.area_sqm} m²`
                                                                ) : (
                                                                    `${poly.area_sqm} m²`
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </>
                                            )}
                                            {isModelEstimator && results?.object_summaries && results.object_summaries.length > 0 && (
                                                <>
                                                    <TableRow>
                                                        <TableCell colSpan={2} sx={{ color: '#3b82f6', fontWeight: 'bold', fontFamily: "'JetBrains Mono', monospace", borderBottomColor: 'rgba(255,255,255,0.08)', pt: 2, fontSize: '12px' }}>
                                                            DETECTED AI SYMBOLS / TAKEOFF
                                                        </TableCell>
                                                    </TableRow>
                                                    {results.object_summaries.map((summary, idx) => {
                                                        const [count, ...nameParts] = summary.split(" ");
                                                        const name = nameParts.join(" ");
                                                        return (
                                                            <TableRow key={`summary-obj-${idx}`} hover>
                                                                 <TableCell sx={{ color: '#fff', borderBottomColor: 'rgba(255,255,255,0.05)', fontSize: '12px', pl: 2 }}>
                                                                    {name}
                                                                </TableCell>
                                                                <TableCell align="right" sx={{ color: '#00e676', fontWeight: 'bold', borderBottomColor: 'rgba(255,255,255,0.05)', fontSize: '12px' }}>
                                                                    {count}
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>
                        )}
                    </Paper>
                </Grid>
            </Grid>
        </Paper>
    );
}
