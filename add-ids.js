const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

html = html.replace('<button class="hero-btn"', '<button id="btnScrollSimulador" class="hero-btn"');
html = html.replace('<button class="btn-sec">', '<button id="btnVerTelhado" class="btn-sec">');

// Also update the UI scripts
fs.writeFileSync('index.html', html, 'utf8');
console.log('Added IDs to index.html');
