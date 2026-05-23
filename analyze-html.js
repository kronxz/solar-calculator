const fs = require('fs');
const html = fs.readFileSync('index_original.html', 'utf8');
const regex = /<(button|input|select|textarea)[^>]*?(id="[^"]*")?[^>]*?(onclick|oninput|onchange)="[^"]*"[^>]*?>/gi;
let match;
while ((match = regex.exec(html)) !== null) {
  console.log(match[0].replace(/\s{2,}/g, ' '));
}
