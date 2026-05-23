@echo off
title MF Solucoes - Simulador Solar Local
chcp 65001 > nul
cls

echo ===================================================
echo ⚡ MF SOLUÇÕES ELÉTRICAS - PREVIEW LOCAL ⚡
echo ===================================================
echo.
echo Iniciando o servidor de visualização...
echo.

node "%~dp0server.js"

if %errorlevel% neq 0 (
    echo.
    echo ❌ Ocorreu um erro ao tentar iniciar o servidor local.
    echo Certifique-se de que o Node.js está instalado em seu computador.
    echo.
    pause
)
