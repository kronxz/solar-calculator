const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 3000;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.pdf': 'application/pdf'
};

const server = http.createServer((req, res) => {
    // Decode URL to handle spaces or special characters in filenames
    let safeUrl = decodeURIComponent(req.url);
    
    // Normalize path to prevent directory traversal
    let filePath = path.join(__dirname, safeUrl === '/' ? 'index.html' : safeUrl);
    
    // Check if the path is a directory and serve index.html inside it
    fs.stat(filePath, (err, stats) => {
        if (!err && stats.isDirectory()) {
            filePath = path.join(filePath, 'index.html');
        }

        fs.readFile(filePath, (error, content) => {
            if (error) {
                if (error.code === 'ENOENT') {
                    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end('<h1>404 - Página Não Encontrada</h1><p>O arquivo solicitado não existe.</p>', 'utf-8');
                } else {
                    res.writeHead(500);
                    res.end(`Erro no servidor: ${error.code}`);
                }
            } else {
                const ext = path.extname(filePath).toLowerCase();
                const contentType = MIME_TYPES[ext] || 'application/octet-stream';
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content, 'utf-8');
            }
        });
    });
});

server.listen(PORT, () => {
    const url = `http://localhost:${PORT}`;
    console.log('\x1b[32m%s\x1b[0m', '==================================================');
    console.log('\x1b[32m%s\x1b[0m', '⚡ Servidor Local da MF Soluções Iniciado com Sucesso!');
    console.log('\x1b[36m%s\x1b[0m', `👉 Acesse no seu navegador: ${url}`);
    console.log('\x1b[33m%s\x1b[0m', 'Para encerrar o servidor, feche esta janela ou aperte Ctrl+C.');
    console.log('\x1b[32m%s\x1b[0m', '==================================================');

    // Automatically open the default browser on Windows
    exec(`start ${url}`);
});
