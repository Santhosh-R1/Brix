const fs = require('fs');
const path = 'C:/Users/santh/OneDrive/Desktop/tech_quest/openprix/src/components/workspace/ResourceTrackerTab.jsx';
const cssPath = 'C:/Users/santh/OneDrive/Desktop/tech_quest/openprix/src/components/workspace/ResourceTrackerTab.css';

let jsx = fs.readFileSync(path, 'utf8');
let css = fs.readFileSync(cssPath, 'utf8');

const replacements = [
    {
        from: /sx=\{\{\s*position: 'absolute',\s*right: 5,\s*top: '50%',\s*marginTop: '-6px',\s*color: '#00e5ff'\s*\}\}/g,
        to: 'className="predicting-spinner"',
        css: `.predicting-spinner { position: absolute; right: 5px; top: 50%; margin-top: -6px; color: #00e5ff; }`
    },
    {
        from: /sx=\{\{\s*position: 'absolute',\s*right: 0,\s*top: 0,\s*bottom: 0,\s*display: 'flex',\s*alignItems: 'center',\s*px: 0\.25,\s*cursor: 'pointer',\s*color: '#00e5ff',\s*bgcolor: 'rgba\(0, 229, 255, 0\.05\)',\s*borderLeft: '1px solid rgba\(0, 229, 255, 0\.2\)',\s*'&:hover': \{\s*bgcolor: 'rgba\(0, 229, 255, 0\.2\)'\s*\}\s*\}\}/g,
        to: 'className="market-data-dropdown"',
        css: `.market-data-dropdown { position: absolute; right: 0; top: 0; bottom: 0; display: flex; align-items: center; padding-left: 2px; padding-right: 2px; cursor: pointer; color: #00e5ff; background-color: rgba(0, 229, 255, 0.05); border-left: 1px solid rgba(0, 229, 255, 0.2); }\n.market-data-dropdown:hover { background-color: rgba(0, 229, 255, 0.2); }`
    },
    {
        from: /sx: \{\s*bgcolor: '#0f172a',\s*border: '1px solid rgba\(255,255,255,0\.1\)',\s*boxShadow: '0 8px 32px rgba\(0,0,0,0\.5\)',\s*borderRadius: 2,\s*p: 2\.5,\s*minWidth: 340,\s*fontFamily: "'JetBrains Mono', monospace"\s*\}/g,
        to: 'className: "market-data-popover"',
        css: `.market-data-popover { background-color: #0f172a !important; border: 1px solid rgba(255,255,255,0.1) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.5) !important; border-radius: 16px !important; padding: 20px !important; min-width: 340px !important; font-family: 'JetBrains Mono', monospace !important; }`
    },
    {
        from: /sx=\{\{\s*color: 'text\.secondary',\s*fontWeight: 'bold',\s*fontSize: '0\.75rem',\s*fontFamily: "'JetBrains Mono', monospace",\s*mb: 1\.5,\s*letterSpacing: 1\s*\}\}/g,
        to: 'className="market-data-title"',
        css: `.market-data-title { color: rgba(255, 255, 255, 0.7); font-weight: bold; font-size: 0.75rem; font-family: 'JetBrains Mono', monospace; margin-bottom: 12px; letter-spacing: 1px; }`
    },
    {
        from: /sx=\{\{\s*color: '#00e5ff',\s*fontWeight: 'bold',\s*fontSize: '0\.75rem',\s*fontFamily: "'JetBrains Mono', monospace",\s*mb: 1\.5,\s*letterSpacing: 1\s*\}\}/g,
        to: 'className="market-data-title-active"',
        css: `.market-data-title-active { color: #00e5ff; font-weight: bold; font-size: 0.75rem; font-family: 'JetBrains Mono', monospace; margin-bottom: 12px; letter-spacing: 1px; }`
    },
    {
        from: /sx=\{\{\s*color: '#fff',\s*fontSize: '0\.85rem',\s*fontFamily: "'JetBrains Mono', monospace"\s*\}\}/g,
        to: 'className="market-data-text"',
        css: `.market-data-text { color: #fff; font-size: 0.85rem; font-family: 'JetBrains Mono', monospace; }`
    },
    {
        from: /sx=\{\{\s*color: '#fff',\s*fontSize: '0\.85rem',\s*fontWeight: 'bold',\s*fontFamily: "'JetBrains Mono', monospace"\s*\}\}/g,
        to: 'className="market-data-text-bold"',
        css: `.market-data-text-bold { color: #fff; font-size: 0.85rem; font-weight: bold; font-family: 'JetBrains Mono', monospace; }`
    },
    {
        from: /sx=\{\{\s*color: '#fff',\s*borderColor: 'rgba\(255, 255, 255, 0\.3\)',\s*fontFamily: "'JetBrains Mono', monospace",\s*fontSize: '0\.7rem',\s*p: '2px 8px',\s*minWidth: 'auto',\s*'&:hover': \{\s*bgcolor: 'rgba\(255, 255, 255, 0\.1\)',\s*borderColor: '#fff'\s*\}\s*\}\}/g,
        to: 'className="use-rate-btn"',
        css: `.use-rate-btn { color: #fff !important; border-color: rgba(255, 255, 255, 0.3) !important; font-family: 'JetBrains Mono', monospace !important; font-size: 0.7rem !important; padding: 2px 8px !important; min-width: auto !important; }\n.use-rate-btn:hover { background-color: rgba(255, 255, 255, 0.1) !important; border-color: #fff !important; }`
    },
    {
        from: /sx=\{\{\s*color: 'text\.secondary',\s*fontSize: '0\.85rem',\s*fontFamily: "'JetBrains Mono', monospace"\s*\}\}/g,
        to: 'className="market-data-text-secondary"',
        css: `.market-data-text-secondary { color: rgba(255, 255, 255, 0.7); font-size: 0.85rem; font-family: 'JetBrains Mono', monospace; }`
    },
    {
        from: /sx=\{\{\s*color: 'text\.secondary',\s*fontSize: '0\.85rem',\s*fontWeight: 'bold',\s*fontFamily: "'JetBrains Mono', monospace"\s*\}\}/g,
        to: 'className="market-data-text-secondary-bold"',
        css: `.market-data-text-secondary-bold { color: rgba(255, 255, 255, 0.7); font-size: 0.85rem; font-weight: bold; font-family: 'JetBrains Mono', monospace; }`
    },
    {
        from: /sx=\{\{\s*color: '#00e5ff',\s*fontSize: '0\.85rem',\s*fontFamily: "'JetBrains Mono', monospace",\s*marginRight:\s*"10px"\s*\}\}/g,
        to: 'className="market-data-text-cyan"',
        css: `.market-data-text-cyan { color: #00e5ff; font-size: 0.85rem; font-family: 'JetBrains Mono', monospace; margin-right: 10px; }`
    },
    {
        from: /sx=\{\{\s*color: 'text\.secondary',\s*fontSize: '0\.85rem',\s*fontFamily: "'JetBrains Mono', monospace",\s*fontStyle: 'italic'\s*\}\}/g,
        to: 'className="no-prediction-text"',
        css: `.no-prediction-text { color: rgba(255, 255, 255, 0.7); font-size: 0.85rem; font-family: 'JetBrains Mono', monospace; font-style: italic; }`
    },
    {
        from: /sx=\{\{\s*p: 2,\s*borderRadius: 2,\s*display: 'flex',\s*justifyContent: 'space-between',\s*alignItems: 'center',\s*flexDirection: \{\s*xs: 'column',\s*md: 'row'\s*\},\s*gap: 2,\s*bgcolor: project\?.isPriceLocked \? 'rgba\(16, 185, 129, 0\.1\)' : 'rgba\(245, 158, 11, 0\.1\)',\s*border: '1px solid',\s*borderColor: project\?.isPriceLocked \? '#10b981' : '#f59e0b'\s*\}\}/g,
        to: 'className={`status-banner-box ${project?.isPriceLocked ? "locked" : "unlocked"}`}',
        css: `.status-banner-box { padding: 16px; border-radius: 16px; display: flex; justify-content: space-between; align-items: center; gap: 16px; border: 1px solid; }\n@media (max-width: 900px) { .status-banner-box { flex-direction: column; } }\n.status-banner-box.locked { background-color: rgba(16, 185, 129, 0.1); border-color: #10b981; }\n.status-banner-box.unlocked { background-color: rgba(245, 158, 11, 0.1); border-color: #f59e0b; }`
    },
    {
        from: /sx=\{\{\s*color: '#10b981',\s*fontSize: 32\s*\}\}/g,
        to: 'className="lock-icon-locked"',
        css: `.lock-icon-locked { color: #10b981; font-size: 32px !important; }`
    },
    {
        from: /sx=\{\{\s*color: '#f59e0b',\s*fontSize: 32\s*\}\}/g,
        to: 'className="lock-icon-unlocked"',
        css: `.lock-icon-unlocked { color: #f59e0b; font-size: 32px !important; }`
    },
    {
        from: /sx=\{\{\s*color: project\?.isPriceLocked \? '#10b981' : '#f59e0b',\s*fontFamily: "'JetBrains Mono', monospace"\s*\}\}/g,
        to: 'className={`lock-title ${project?.isPriceLocked ? "locked" : "unlocked"}`}',
        css: `.lock-title { font-family: 'JetBrains Mono', monospace; }\n.lock-title.locked { color: #10b981; }\n.lock-title.unlocked { color: #f59e0b; }`
    },
    {
        from: /sx=\{\{\s*color: 'text\.secondary',\s*fontFamily: "'JetBrains Mono', monospace"\s*\}\}/g,
        to: 'className="lock-desc"',
        css: `.lock-desc { color: rgba(255, 255, 255, 0.7); font-family: 'JetBrains Mono', monospace; }`
    },
    {
        from: /sx=\{\{\s*fontFamily: "'JetBrains Mono', monospace",\s*fontWeight: 'bold',\s*borderRadius: 50,\s*whiteSpace: 'nowrap'\s*\}\}/g,
        to: 'className="finalize-btn"',
        css: `.finalize-btn { font-family: 'JetBrains Mono', monospace !important; font-weight: bold !important; border-radius: 50px !important; white-space: nowrap !important; }`
    },
    {
        from: /sx=\{\{\s*width: 280,\s*fontFamily: "'JetBrains Mono', monospace",\s*'& \.MuiOutlinedInput-root': \{\s*borderRadius: '8px',\s*bgcolor: 'rgba\(0,0,0,0\.2\)'\s*\}\s*\}\}/g,
        to: 'className="execution-date-input"',
        css: `.execution-date-input { width: 280px; font-family: 'JetBrains Mono', monospace; }\n.execution-date-input .MuiOutlinedInput-root { border-radius: 8px; background-color: rgba(0,0,0,0.2); }`
    },
    {
        from: /sx=\{\{\s*fontFamily: "'JetBrains Mono', monospace",\s*fontWeight: 'bold',\s*fontSize: '12px',\s*padding: '6px 16px',\s*borderWidth: '2px',\s*'&:hover': \{\s*borderWidth: '2px'\s*\},\s*borderRadius: 1\s*\}\}/g,
        to: 'className="sync-market-btn"',
        css: `.sync-market-btn { font-family: 'JetBrains Mono', monospace !important; font-weight: bold !important; font-size: 12px !important; padding: 6px 16px !important; border-width: 2px !important; border-radius: 8px !important; }\n.sync-market-btn:hover { border-width: 2px !important; }`
    },
    {
        from: /sx=\{\{\s*'& \.MuiInputBase-root': \{\s*padding: '2px 30px 2px 8px !important',\s*fontSize: '0\.75rem',\s*height: '28px',\s*color: '#00e5ff',\s*'& input': \{\s*p: 0\s*\}\s*\},\s*'& \.MuiOutlinedInput-notchedOutline': \{\s*border: 'none'\s*\}\s*\}\}/g,
        to: 'className="brand-autocomplete"',
        css: `.brand-autocomplete .MuiInputBase-root { padding: 2px 30px 2px 8px !important; font-size: 0.75rem !important; height: 28px !important; color: #00e5ff !important; }\n.brand-autocomplete .MuiInputBase-root input { padding: 0 !important; }\n.brand-autocomplete .MuiOutlinedInput-notchedOutline { border: none !important; }`
    }
];

let changedCount = 0;
replacements.forEach((r, i) => {
    let before = jsx.length;
    jsx = jsx.replace(r.from, r.to);
    if (jsx.length !== before) {
        changedCount++;
        if (!css.includes(r.to.replace('className=', '').replace(/"/g, '').replace('className:', '').trim().split(' ')[0].replace(/[^a-zA-Z0-9-]/g, ''))) {
            css += '\n\n' + r.css;
        }
    } else {
        console.log("Failed to match rule " + i + ": " + r.to);
    }
});

fs.writeFileSync(path, jsx);
fs.writeFileSync(cssPath, css);
console.log("Successfully applied " + changedCount + " replacements");
