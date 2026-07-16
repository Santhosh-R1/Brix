const fs = require('fs');
const path = 'C:/Users/santh/OneDrive/Desktop/tech_quest/openprix/src/components/workspace/ResourceTrackerTab.jsx';
const cssPath = 'C:/Users/santh/OneDrive/Desktop/tech_quest/openprix/src/components/workspace/ResourceTrackerTab.css';

let jsx = fs.readFileSync(path, 'utf8');
let css = fs.readFileSync(cssPath, 'utf8');

const replacements = [
    {
        from: /sx=\{\{\s*color: 'text\.secondary',\s*borderColor: 'rgba\(255, 255, 255, 0\.2\)',\s*fontFamily: "'JetBrains Mono', monospace",\s*fontSize: '0\.7rem',\s*p: '2px 8px',\s*minWidth: 'auto',\s*'&:hover': \{\s*bgcolor: 'rgba\(255, 255, 255, 0\.1\)',\s*borderColor: '#fff',\s*color: '#fff'\s*\}\s*\}\}/g,
        to: 'className="market-use-btn"',
        css: `.market-use-btn { color: rgba(255, 255, 255, 0.7) !important; border-color: rgba(255, 255, 255, 0.2) !important; font-family: 'JetBrains Mono', monospace !important; font-size: 0.7rem !important; padding: 2px 8px !important; min-width: auto !important; }\n.market-use-btn:hover { background-color: rgba(255, 255, 255, 0.1) !important; border-color: #fff !important; color: #fff !important; }`
    },
    {
        from: /sx=\{\{\s*color: '#00e5ff',\s*borderColor: 'rgba\(0, 229, 255, 0\.3\)',\s*fontFamily: "'JetBrains Mono', monospace",\s*fontSize: '0\.75rem',\s*flex: 1,\s*'&:hover': \{\s*bgcolor: 'rgba\(0, 229, 255, 0\.1\)',\s*borderColor: '#00e5ff'\s*\}\s*\}\}/g,
        to: 'className="ai-base-btn"',
        css: `.ai-base-btn { color: #00e5ff !important; border-color: rgba(0, 229, 255, 0.3) !important; font-family: 'JetBrains Mono', monospace !important; font-size: 0.75rem !important; flex: 1; }\n.ai-base-btn:hover { background-color: rgba(0, 229, 255, 0.1) !important; border-color: #00e5ff !important; }`
    },
    {
        from: /sx=\{\{\s*color: '#4caf50',\s*borderColor: 'rgba\(76, 175, 80, 0\.3\)',\s*fontFamily: "'JetBrains Mono', monospace",\s*fontSize: '0\.75rem',\s*'&:hover': \{\s*bgcolor: 'rgba\(76, 175, 80, 0\.1\)',\s*borderColor: '#4caf50'\s*\}\s*\}\}/g,
        to: 'className="ai-low-btn"',
        css: `.ai-low-btn { color: #4caf50 !important; border-color: rgba(76, 175, 80, 0.3) !important; font-family: 'JetBrains Mono', monospace !important; font-size: 0.75rem !important; }\n.ai-low-btn:hover { background-color: rgba(76, 175, 80, 0.1) !important; border-color: #4caf50 !important; }`
    },
    {
        from: /sx=\{\{\s*color: '#ff9800',\s*borderColor: 'rgba\(255, 152, 0, 0\.3\)',\s*fontFamily: "'JetBrains Mono', monospace",\s*fontSize: '0\.75rem',\s*'&:hover': \{\s*bgcolor: 'rgba\(255, 152, 0, 0\.1\)',\s*borderColor: '#ff9800'\s*\}\s*\}\}/g,
        to: 'className="ai-high-btn"',
        css: `.ai-high-btn { color: #ff9800 !important; border-color: rgba(255, 152, 0, 0.3) !important; font-family: 'JetBrains Mono', monospace !important; font-size: 0.75rem !important; }\n.ai-high-btn:hover { background-color: rgba(255, 152, 0, 0.1) !important; border-color: #ff9800 !important; }`
    },
    {
        from: /sx=\{\{\s*width: 120,\s*bgcolor: 'rgba\(0, 229, 255, 0\.05\)',\s*border: '1px solid rgba\(0, 229, 255, 0\.2\)',\s*borderRadius: 1\s*\}\}/g,
        to: 'className="brand-autocomplete-container"',
        css: `.brand-autocomplete-container { width: 120px; background-color: rgba(0, 229, 255, 0.05); border: 1px solid rgba(0, 229, 255, 0.2); border-radius: 8px; }`
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
console.log("Successfully applied " + changedCount + " remaining replacements");
