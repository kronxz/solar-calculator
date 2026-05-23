const fs = require('fs');

const indexPath = 'c:/Users/kronxz/OneDrive/Área de Trabalho/Nova pasta/solar-calculator-main (1)/index.html';
console.log('Reading index.html from:', indexPath);

let html = fs.readFileSync(indexPath, 'utf8');

// 1. Exclude the massive legacy script block using a precise regex that targets the specific start comment
const beforeLen = html.length;
html = html.replace(/<script>\s*\/\/\s*={5,}\s*\/\/\s*UTM\s*\/[\s\S]*?<\/script>/, '');
const afterLen = html.length;
console.log(`Removed legacy script block. Size reduced from ${beforeLen} to ${afterLen} bytes (saved ${beforeLen - afterLen} bytes).`);

// 2. Fix the login page button key character encoding
html = html.replace(/ðŸ”/g, '🔑');

// 3. Fix the "Última geração" character encoding
html = html.replace(/Ãšltima/g, 'Última');

// 4. Update the "Ver telhado no mapa" button with correct ID and premium emoji
// Supporting potential variations in spacing/newlines
html = html.replace(/<button\s+class="btn-sec">\s*ðŸ›°\s*Ver telhado no mapa\s*<\/button>/g, 
  '<button id="btnVerTelhado" class="btn-sec">\n        🛰️ Ver telhado no mapa\n      </button>'
);
html = html.replace(/<button\s+class="btn-sec">\s*🛰️\s*Ver telhado no mapa\s*<\/button>/g, 
  '<button id="btnVerTelhado" class="btn-sec">\n        🛰️ Ver telhado no mapa\n      </button>'
);

// Fallback in case of two spaces in button
html = html.replace(/<button\s+class="btn-sec">/g, '<button id="btnVerTelhado" class="btn-sec">');
html = html.replace(/ðŸ›°\s*Ver telhado no mapa/g, '🛰️ Ver telhado no mapa');

fs.writeFileSync(indexPath, html, 'utf8');
console.log('Successfully cleaned index.html!');
