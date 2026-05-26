@echo off
chcp 65001 >nul
title SIGFEC - Inicializador
setlocal

set "JAVA_HOME=C:\Users\pedro\.jdks\openjdk-24.0.1"
set "BASE=%~dp0"

echo ===============================================
echo                INICIANDO SIGFEC
echo ===============================================
echo.

echo [1/4] Verificando banco de dados PostgreSQL...
net start postgresql-x64-17 >nul 2>&1
net start postgresql-x64-18 >nul 2>&1

echo [2/4] Iniciando o servidor (backend)...
start "SIGFEC - Backend" /min /D "%BASE%SIGFEC-backend" cmd /k "set "JAVA_HOME=%JAVA_HOME%" && mvnw.cmd spring-boot:run"

echo [3/4] Iniciando a interface (frontend)...
start "SIGFEC - Frontend" /min /D "%BASE%sigfec-front" cmd /k "npm run dev"

echo [4/4] Aguardando o sistema ficar pronto...
echo       (a primeira vez pode demorar ate 1 minuto)
echo.

:aguardar
timeout /t 3 >nul
powershell -NoProfile -Command "if (Test-NetConnection -ComputerName localhost -Port 8080 -InformationLevel Quiet) { exit 0 } else { exit 1 }"
if errorlevel 1 (
    echo    ... ainda iniciando ...
    goto aguardar
)

echo.
echo  SIGFEC pronto! Abrindo no navegador...
start "" http://localhost:5173

echo.
echo  Sistema rodando. Esta janela pode ser fechada.
echo  Para DESLIGAR o SIGFEC, feche as janelas Backend e Frontend.
timeout /t 6 >nul
exit
