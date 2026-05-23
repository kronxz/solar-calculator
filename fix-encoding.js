const fs = require('fs');
const path = require('path');

const replacements = {
  'á': 'á',
  'ç': 'ç',
  'õ': 'õ',
  'ã': 'ã',
  'é': 'é',
  'ê': 'ê',
  'Ã\xad': 'í', // hex for í
  'ó': 'ó',
  'ú': 'ú',
  'â': 'â',
  '☀️': '☀️',
  '⚡': '⚡',
  '🔎': '🔎',
  '👤': '👤',
  '✔': '✔',
  'â\xad ': '⭐ ', // hex for ⭐
  '🔑': '🔑',
  'çõ': 'çõ',
  'Ã\x8d': 'Í',
  'Ã\x89': 'É',
  'Ã\x81': 'Á',
  'Ã\x95': 'Õ',
  'Ã\x87': 'Ç',
  'Ã\x82': 'Â'
};

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        processDir(fullPath);
      }
    } else if (/\.(html|js|css|md|txt)$/.test(file)) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let original = content;
      
      for (const [bad, good] of Object.entries(replacements)) {
        content = content.split(bad).join(good);
      }
      
      // additional fix for isolated í if hex regex fails
      content = content.replace(/í/g, 'í');
      content = content.replace(/⭐/g, '⭐');
      
      if (content !== original) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Fixed: ${fullPath}`);
      }
    }
  }
}

processDir(__dirname);
