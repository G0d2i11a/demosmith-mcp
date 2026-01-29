@echo off
REM Generate GIF from screenshots using ffmpeg
REM Requires: ffmpeg installed and in PATH
REM Usage: cd examples\github-login-demo && generate-gif.bat

cd /d "%~dp0"

echo Creating frames list...
(
echo file 'assets/step-001.png'
echo duration 1.5
echo file 'assets/step-002.png'
echo duration 1.5
echo file 'assets/step-003.png'
echo duration 1.5
echo file 'assets/step-004.png'
echo duration 1.5
echo file 'assets/step-005.png'
echo duration 1.5
echo file 'assets/step-006.png'
echo duration 1.5
echo file 'assets/step-007.png'
echo duration 1.5
echo file 'assets/step-008.png'
echo duration 1.5
) > frames.txt

echo Generating GIF...
ffmpeg -f concat -safe 0 -i frames.txt ^
  -vf "fps=0.67,scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" ^
  -loop 0 ^
  demo.gif

del frames.txt
echo GIF generated: demo.gif
pause
