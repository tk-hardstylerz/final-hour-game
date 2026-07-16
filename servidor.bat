@echo off
cd /d "C:\Users\HP\Desktop\final-hour\server"
set FH_NO_DISCORD=1
node --enable-source-maps dist\server.js
pause
