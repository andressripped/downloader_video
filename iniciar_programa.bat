@echo off
echo Iniciando Social Downloader...
echo.
echo Por favor, espera un momento. La aplicacion se abrira en tu navegador.
echo (Manten esta ventana negra abierta mientras uses el programa)
echo.

:: Se asume que las dependencias ya estan instaladas globalmente

:: Abrir el navegador en la URL local (lo abrimos primero)
start http://127.0.0.1:8000

:: Iniciar el servidor en esta misma ventana
echo.
echo ==================================================
echo SERVIDOR INICIADO. NO CIERRES ESTA VENTANA NEGRA.
echo ==================================================
python run.py

pause
