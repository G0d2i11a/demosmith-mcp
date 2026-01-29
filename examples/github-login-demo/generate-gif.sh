#!/bin/bash
# Generate GIF from screenshots using ffmpeg
# Requires: ffmpeg installed
# Usage: cd examples/github-login-demo && ./generate-gif.sh

cd "$(dirname "$0")"

# Create input file list
cat > frames.txt << 'EOF'
file 'assets/step-001.png'
duration 1.5
file 'assets/step-002.png'
duration 1.5
file 'assets/step-003.png'
duration 1.5
file 'assets/step-004.png'
duration 1.5
file 'assets/step-005.png'
duration 1.5
file 'assets/step-006.png'
duration 1.5
file 'assets/step-007.png'
duration 1.5
file 'assets/step-008.png'
duration 1.5
EOF

# Generate GIF with palette for better quality
ffmpeg -f concat -safe 0 -i frames.txt \
  -vf "fps=0.67,scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" \
  -loop 0 \
  demo.gif

rm frames.txt
echo "GIF generated: demo.gif"
