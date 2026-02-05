@echo off
echo ============================================
echo  Installing Playwright for Auto-Cookies
echo ============================================
echo.
echo This will install Playwright and browser binaries
echo Required for auto-cookie fetching feature
echo.
echo Installing Playwright...
pip install playwright

echo.
echo Installing Chromium browser...
playwright install chromium

echo.
echo ============================================
echo Installation complete!
echo ============================================
echo.
echo You can now use the auto-cookie feature!
echo.
pause
