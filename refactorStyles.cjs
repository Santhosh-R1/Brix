const fs = require('fs');

const jsxPath = 'C:/Users/santh/OneDrive/Desktop/tech_quest/openprix/src/components/workspace/ResourceTrackerTab.jsx';
const cssPath = 'C:/Users/santh/OneDrive/Desktop/tech_quest/openprix/src/components/workspace/ResourceTrackerTab.css';
const stylesPath = 'C:/Users/santh/OneDrive/Desktop/tech_quest/openprix/src/components/workspace/ResourceTrackerTab.styles.js';

const cssContent = `
.no-resources-paper { padding: 32px; text-align: center; border-radius: 8px; background-color: rgba(13, 31, 60, 0.5); }
.no-resources-text { font-family: 'JetBrains Mono', monospace; }

.toggle-banner-paper { padding: 16px; display: flex; justify-content: space-between; align-items: center; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.12); background-color: rgba(13, 31, 60, 0.5); flex-wrap: wrap; gap: 16px; }
.toggle-title { font-family: 'JetBrains Mono', monospace; }
.toggle-desc { font-family: 'JetBrains Mono', monospace; font-size: 12px; }
.switch-label { font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: bold; }

.phase-paper { overflow: hidden; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.12); background-color: rgba(13, 31, 60, 0.5); margin-bottom: 16px; }
.phase-header-box { background-color: rgba(0,0,0,0.2); padding: 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.12); }
.phase-title { font-family: 'JetBrains Mono', monospace; letter-spacing: 0.5px; }

.table-head { background-color: rgba(0,0,0,0.2); }
.th-row th { padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.1); }
.th-cell { font-family: 'JetBrains Mono', monospace; font-size: 11px; }
.th-cell-brand { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #90caf9; }
.th-cell-rate { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #90caf9; }
.th-cell-est-qty { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #29b6f6; }
.th-cell-act-qty { font-family: 'JetBrains Mono', monospace; font-size: 11px; }
.th-cell-act-qty.auto { color: #81c784; }
.th-cell-act-qty.manual { color: #ffb74d; }
.th-cell-cost { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #81c784; }

.tb-row td { padding: 4px 8px; border-bottom: 1px solid rgba(255,255,255,0.05); }
.td-cell { font-family: 'JetBrains Mono', monospace; font-size: 12px; }
.td-cell-desc { font-family: 'JetBrains Mono', monospace; font-size: 12px; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.unplanned-text { font-size: 9px; }

.brand-select { font-family: 'JetBrains Mono', monospace; font-size: 11px; min-width: 100px; height: 26px; background-color: rgba(255,255,255,0.03); }
.brand-menu-item { font-family: 'JetBrains Mono', monospace; font-size: 11px; }

.td-cell-rate-val { font-family: 'JetBrains Mono', monospace; font-size: 12px; }
.td-cell-rate-val.selected { color: #90caf9; }
.td-cell-est-qty-val { font-weight: bold; font-family: 'JetBrains Mono', monospace; font-size: 12px; }
.td-cell-act-qty-auto { font-weight: bold; color: #81c784; font-family: 'JetBrains Mono', monospace; font-size: 12px; padding: 0 4px; }
.td-cell-variance { font-weight: bold; font-family: 'JetBrains Mono', monospace; font-size: 12px; }
.td-cell-variance.positive { color: #81c784; }
.td-cell-variance.negative { color: #f44336; }
.td-cell-cost-val { font-weight: bold; color: #81c784; font-family: 'JetBrains Mono', monospace; font-size: 12px; }
`;

fs.writeFileSync(cssPath, cssContent);

let jsx = fs.readFileSync(jsxPath, 'utf8');

// Add import
if (!jsx.includes("import './ResourceTrackerTab.css'")) {
    jsx = jsx.replace(/import \{ getResourceTrackerTabStyles.*?;\n/, "import { getNativeStyles } from './ResourceTrackerTab.styles';\nimport './ResourceTrackerTab.css';\n");
}

// Remove styles instance
jsx = jsx.replace(/const styles = getResourceTrackerTabStyles\(theme\);\n/, "");

// Convert sx to className (kebab-case)
const toKebab = (str) => str.replace(/[A-Z]/g, m => '-' + m.toLowerCase());

jsx = jsx.replace(/sx=\{styles\.([a-zA-Z0-9_]+)\}/g, (match, p1) => {
    return 'className="' + toKebab(p1) + '"';
});

// Convert dynamic sx
jsx = jsx.replace(/sx=\{styles\.thCellActQty\(trackingMode\)\}/g, 'className={`th-cell-act-qty ${trackingMode}`}`');
jsx = jsx.replace(/sx=\{styles\.tdCellRateVal\(selectedBrand\)\}/g, 'className={`td-cell-rate-val ${selectedBrand ? "selected" : ""}`}`');
jsx = jsx.replace(/sx=\{styles\.tdCellVariance\(variance\)\}/g, 'className={`td-cell-variance ${variance < 0 ? "negative" : "positive"}`}`');

// Wait, the dynamic ones need to be fixed for template literals in React
jsx = jsx.replace(/className=\{`th-cell-act-qty \$\{trackingMode\}`\}`/g, 'className={`th-cell-act-qty ${trackingMode}`}');
jsx = jsx.replace(/className=\{`td-cell-rate-val \$\{selectedBrand \? "selected" : ""\}`\}`/g, 'className={`td-cell-rate-val ${selectedBrand ? "selected" : ""}`}');
jsx = jsx.replace(/className=\{`td-cell-variance \$\{variance < 0 \? "negative" : "positive"\}`\}`/g, 'className={`td-cell-variance ${variance < 0 ? "negative" : "positive"}`}');

// Also handle the compound phaseHeaderBox: sx={{ ...styles.phaseHeaderBox, display: 'flex', ... }}
jsx = jsx.replace(/sx=\{\{\s*\.\.\.styles\.phaseHeaderBox,([^}]+)\}\}/g, 'className="phase-header-box" sx={{$1}}');
jsx = jsx.replace(/sx=\{\{\s*\.\.\.styles\.monoSubtitle,([^}]+)\}\}/g, 'sx={{ fontFamily: "\'JetBrains Mono\', monospace", $1}}');


fs.writeFileSync(jsxPath, jsx);

console.log("Done refactoring styles!");
