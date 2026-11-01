@echo off
start "Food Reels Backend" cmd /k "cd backend && npm install && npm run dev"
timeout /t 2 >nul
start "Food Reels Frontend" cmd /k "cd frontend && npm install && npm run dev"
