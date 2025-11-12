# Portfolio Site Startup Script
Write-Host "Starting Portfolio Application..." -ForegroundColor Cyan

# Start backend server
Write-Host "`nStarting Backend Server (Port 5000)..." -ForegroundColor Yellow
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "Set-Location 'c:\Users\mkane\Development\New folder (2)\Portfolio site\backend'; node server.js"

Start-Sleep -Seconds 3

# Start frontend server
Write-Host "Starting Frontend Server (Port 3000)..." -ForegroundColor Yellow
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "Set-Location 'c:\Users\mkane\Development\New folder (2)\Portfolio site\frontend'; npm run dev"

Start-Sleep -Seconds 2

Write-Host "`n✓ Portfolio application is starting!" -ForegroundColor Green
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "  Backend:  http://localhost:5000" -ForegroundColor Cyan
Write-Host "`nPress any key to open in browser..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Start-Process "http://localhost:3000"
