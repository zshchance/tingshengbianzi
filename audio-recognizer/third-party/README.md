# Third-Party Dependencies

This directory contains third-party binary dependencies required by the audio recognizer application.

## Directory Structure

```
third-party/
├── bin/                    # Binary executables
│   ├── whisper-cli         # Whisper speech recognition CLI
│   ├── ffmpeg              # FFmpeg multimedia framework
│   └── ffprobe             # FFprobe media analysis tool
└── README.md              # This file
```

## Dependencies

### Whisper CLI
- **Purpose**: Speech recognition using Whisper models
- **Size**: ~825KB
- **License**: MIT License
- **Source**: Whisper.cpp project

### FFmpeg
- **Purpose**: Audio format conversion and processing
- **Size**: ~775KB total
  - ffmpeg: ~489KB
  - ffprobe: ~286KB
- **License**: GPL/LGPL
- **Source**: FFmpeg.org

## Usage

These binaries are automatically included in the Wails build process and embedded in the final application bundle.

## Building

When building the application, run:
```bash
wails build -clean
```

The binaries will be automatically copied to:
`build/bin/tingshengbianzi.app/Contents/Resources/third-party/bin/`

## License Compliance

- Ensure compliance with each dependency's license terms
- The application uses these tools internally and does not redistribute them separately
- All binaries are included for functional purposes only

## Updating Dependencies

To update dependencies:
1. Replace binaries in the `third-party/bin/` directory
2. Rebuild the application
3. Test functionality

## Architecture

The application searches for dependencies in this priority order:
1. Embedded dependencies (app Resources/third-party/bin/)
2. Development dependencies (project third-party/bin/)
3. System PATH
4. Fallback locations