@echo off
setlocal
pushd "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Instala Node.js 22 o posterior y vuelve a abrir este archivo.
  echo https://nodejs.org/
  pause
  exit /b 1
)
if not exist "node_modules\ws\package.json" (
  echo Preparando dependencias por primera vez. Se necesita internet.
  call npm ci
  if errorlevel 1 goto fallo
)
echo Preparando el proyecto para la exposicion...
call npm run build -- --configLoader runner
if errorlevel 1 goto fallo
if not exist "tmp" mkdir "tmp"
powershell -NoProfile -Command "$ready=$false; try { $health=Invoke-RestMethod 'http://127.0.0.1:3000/api/cabina/health' -TimeoutSec 2; $ready=$health.product -eq 'eva03-cabina' } catch {}; if (-not $ready) { Start-Process -FilePath (Get-Command node).Source -ArgumentList 'static-server.cjs' -WorkingDirectory (Get-Location).Path -WindowStyle Hidden -RedirectStandardOutput 'tmp\cabina-servidor.log' -RedirectStandardError 'tmp\cabina-servidor-error.log'; Start-Sleep -Seconds 2 }; try { $health=Invoke-RestMethod 'http://127.0.0.1:3000/api/cabina/health' -TimeoutSec 3; if ($health.product -ne 'eva03-cabina') { exit 1 } } catch { exit 1 }"
if errorlevel 1 (
  echo No se pudo iniciar la sala. Cierra otro servidor que use el puerto 3000.
  goto fallo
)
start "" "http://127.0.0.1:3000/?eva01=surface&scene=1"
echo Proyecto abierto. Dentro de la pagina escribe EVA03, seguido, para abrir la cabina.
popd
exit /b 0
:fallo
echo Revisa el error mostrado arriba o los registros de tmp.
pause
popd
exit /b 1
