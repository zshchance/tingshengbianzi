# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a cross-platform audio recognition desktop application built with Go, Vosk speech recognition engine, and Wails v2. The application provides offline audio-to-text transcription with timestamp generation and AI optimization capabilities.

## Key Development Commands

### Development Environment
```bash
# Start development server with hot reload
wails dev

# Alternative development startup
./start-dev.sh

# Install dependencies (macOS)
brew install go node ffmpeg
go install github.com/wailsapp/wails/v2/cmd/wails@latest
export PATH=$PATH:~/go/bin
```

### Building
```bash
# Development build
wails build -debug

# Production build
wails build -production

# Using build scripts
./scripts/build.sh

# Platform-specific builds
wails build -platform darwin/amd64 -production
wails build -platform windows/amd64 -production
wails build -platform linux/amd64 -production
```

### Model Management
```bash
# Download speech recognition models
./scripts/download-models.sh

# Manual model download example
curl -L https://alphacephei.com/vosk/models/vosk-model-small-cn-0.22.zip -o zh-CN-model.zip
unzip zh-CN-model.zip -d models/zh-CN/
```

## Architecture Overview

### Frontend Structure
The frontend is a standard web application using HTML5, CSS3, and ES6+ JavaScript:

- **index.html** - Main application interface with semantic HTML structure
- **src/style.css** - Comprehensive design system with CSS custom properties
- **src/app.css** - Application-specific animations and component styles
- **src/main.js** - Core application logic using class-based architecture

Key UI components include:
- File drop zone with drag-and-drop support
- Settings panel with basic/advanced configuration
- Progress tracking with real-time updates
- Result display with tabbed interface (Original, AI Optimized, Subtitle)
- Modal dialogs for settings and toast notifications

### Backend Architecture
The backend follows a modular Go structure:

- **app.go** - Wails application entry point and context setup
- **main.go** - Go program main function
- **backend/** - Core business logic modules:
  - **audio/** - Audio processing using FFmpeg and go-audio libraries
  - **recognition/** - Vosk API integration for speech recognition
  - **models/** - Data structures and model definitions
  - **services/** - Business logic services
  - **utils/** - Utility functions and helpers

### Configuration System
Configuration is JSON-based with these key files:
- **config/default.json** - Main application settings
- **config/languages.json** - Language support definitions
- **config/templates.json** - AI optimization prompt templates

### Model Structure
Vosk speech models are stored in `./models/` with language-specific directories:
- **models/zh-CN/** - Chinese speech recognition model
- **models/en-US/** - English speech recognition model

Each model contains:
- `am/final.mdl` - Acoustic model
- `conf/mfcc.conf` - Feature extraction configuration
- `graph/HCLr.fst` - Language model (note: not HCLG.fst)

## Important Implementation Details

### Audio Processing Pipeline
1. **File Validation** - Check audio format and duration
2. **Format Conversion** - Use FFmpeg to convert to WAV format
3. **Audio Preprocessing** - Apply normalization and noise reduction if enabled
4. **Speech Recognition** - Process through Vosk engine with configured parameters
5. **Result Processing** - Generate timestamps and format output

### Wails Integration
- Application context is managed through `AppContext` struct
- Frontend-backend communication uses Wails' runtime binding system
- UI state updates are handled through event-driven architecture
- File operations use the system dialog service

### CSS Design System
The application uses a comprehensive CSS custom properties system:
- Color variables in `:root` for consistent theming
- Spacing scale using CSS variables (`--spacing-xs` to `--spacing-2xl`)
- Typography scale with defined font sizes and weights
- Responsive breakpoints at 768px and 480px
- Animation system with reduced motion support

### JavaScript Application Structure
The frontend uses a class-based architecture:
- `AudioRecognizerApp` class manages application state
- Event delegation pattern for UI interactions
- Async/await for file processing and recognition
- Mock recognition simulation for development testing

## Cross-Platform Considerations

### Build Targets
- **Windows**: Creates `.exe` with embedded resources
- **macOS**: Creates `.app` bundle with proper signing
- **Linux**: Creates standalone binary with AppImage option

### Dependencies
- FFmpeg must be available in system PATH for all platforms
- CGO is required for Vosk integration
- Go 1.21+ is mandatory for Wails v2 compatibility

### File Path Handling
- Use forward slashes for cross-platform compatibility
- Model paths are relative to application executable
- Configuration paths support both Unix and Windows separators