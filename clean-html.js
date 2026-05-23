const fs = require('fs');

function cleanHtml(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace excessive spaces/newlines inside tags
  content = content.replace(/\s{20,}/g, ' ');

  // Remove specific inline handlers
  // This is a basic regex that catches oninput="...", onclick="...", onchange="..."
  // but it's safer to use DOMParser if possible. Since we are in node, regex is faster but we must be careful.
  
  // Actually, let's just strip the specific large inline handlers manually or via a clean regex
  // Find oninput="...mascaraTelefone(this)..."
  content = content.replace(/oninput="[^"]*"/g, '');
  content = content.replace(/onclick="[^"]*"/g, '');
  content = content.replace(/onchange="[^"]*"/g, '');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Cleaned: ${filePath}`);
}

cleanHtml('index.html');
if (fs.existsSync('crm/index.html')) cleanHtml('crm/index.html');
if (fs.existsSync('login.html')) cleanHtml('login.html');
