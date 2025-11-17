# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a cross-platform audio recognition desktop application built with Go, Whisper speech recognition engine, and Wails v2. The application provides offline audio-to-text transcription with timestamp generation and AI optimization capabilities. It has evolved from using Vosk to Whisper for speech recognition.

## Key Development Commands

### Development Environment Setup
```bash
# Install dependencies (macOS)
brew install go node ffmpeg
go install github.com/wailsapp/wails/v2/cmd/wails@latest
export PATH=$PATH:~/go/bin

# Start development server with hot reload (from project root)
export PATH=$PATH:~/go/bin && wails dev

# Alternative development startup
./start-dev.sh

# Frontend development only (in audio-recognizer/frontend/)
cd frontend && npm run dev
```

### Building
```bash
# Development build
wails build -debug

# Production build
wails build -production

# Using build scripts
./scripts/build.sh

# Cross-platform builds
wails build -platform darwin/amd64 -production
wails build -platform windows/amd64 -production
wails build -platform linux/amd64 -production
```

### Model Management
```bash
# Download Whisper speech recognition models
./scripts/download-models.sh

# Manual model download (Base model recommended)
mkdir -p models/whisper
curl -L https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin -o models/whisper/ggml-base.bin

# Other model sizes
curl -L https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin -o models/whisper/ggml-small.bin
curl -L https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large.bin -o models/whisper/ggml-large.bin
```

## Architecture Overview

### Frontend Architecture (Vue.js + Vite)
The frontend has been migrated to Vue.js 3 with modern component architecture:

- **Vue 3.3.0 + Vite 5.0** - Modern development environment with hot reload
- **Pinia** - State management for application state
- **Component-based architecture** - Reusable Vue components
- **Composables** - Reusable composition functions

Key Vue components:
- **App.vue** - Main application component with overall layout
- **FileDropZone.vue** - Drag-and-drop file upload with validation
- **ProgressBar.vue** - Real-time progress indicator with animations
- **ResultDisplay.vue** - Tabbed interface for recognition results
- **SettingsModal.vue** - Configuration panel for recognition settings
- **ToastContainer.vue & ToastMessage.vue** - Notification system

Composables (Composition API):
- **useAudioFile.js** - Audio file handling and validation
- **useWails.js** - Wails API integration and communication
- **useSettings.js** - Settings management and persistence
- **useToast.js** - Toast notification management

### Backend Architecture (Go + Wails)
The backend follows a modular Go structure with Whisper integration:

- **app.go** - Main application struct with Wails integration
- **main.go** - Entry point with embedded frontend assets
- **backend/** - Core business logic modules:
  - **recognition/** - Whisper speech recognition service
    - `service.go` - Interface definition
    - `whisper_service.go` - Whisper implementation
    - `mock_service.go` - Mock service for development
  - **audio/** - Audio processing using FFmpeg
    - `processor.go` - Audio format conversion and processing
  - **models/** - Data structures and configurations
    - `recognition.go` - Recognition result and config models
    - `errors.go` - Error handling definitions
  - **utils/** - Utility functions
    - `ffmpeg_manager.go` - FFmpeg binary management
    - `embedded_ffmpeg.go` - Embedded FFmpeg handling
    - `time_utils.go` - Time formatting utilities
    - `text_utils.go` - Text processing utilities

### Speech Recognition Pipeline
1. **File Validation** - Check audio format, size, and accessibility
2. **Audio Processing** - Convert to WAV format using FFmpeg if needed
3. **Whisper Recognition** - Process through Whisper.cpp with word timestamps
4. **Result Processing** - Generate formatted text with precise timestamps
5. **Export Options** - Support for TXT, SRT, VTT, JSON formats

### Configuration System
Configuration is JSON-based with runtime updates:
- Default configuration loaded in `loadDefaultConfig()`
- Dynamic config updates via `UpdateConfig()` method
- Settings include language, model paths, audio processing options
- Whisper-specific settings for confidence thresholds and word timestamps

### Model Structure
Whisper models are stored in `./models/whisper/`:
- **ggml-base.bin** - Base model (recommended, balances speed/accuracy)
- **ggml-small.bin** - Small model (faster, less accurate)
- **ggml-large.bin** - Large model (slower, more accurate)

### Wails Integration
- Application context managed through `AppContext` struct
- Event-driven communication between frontend and backend
- Progress updates emitted via `runtime.EventsEmit()`
- File operations using Wails runtime services
- Embedded frontend assets in production builds

## Important Implementation Details

### Audio Processing
- **FFmpeg Integration** - Automatic format conversion to WAV for Whisper
- **Duration Detection** - Real-time audio duration calculation with fallback estimation
- **Format Support** - MP3, WAV, M4A, AAC, OGG, FLAC
- **Size Limits** - Default 100MB file size limit with validation

### Whisper Recognition Service
- **Interface Pattern** - Clean separation between service interface and implementation
- **Fallback Strategy** - Graceful fallback to mock service if Whisper unavailable
- **Progress Tracking** - Real-time progress updates during recognition
- **Model Loading** - Dynamic model loading with validation
- **Language Support** - Multi-language recognition with configurable language codes

### Error Handling
- **Structured Errors** - Defined error types in `models/errors.go`
- **Error Codes** - Consistent error code system for frontend handling
- **Graceful Degradation** - Fallback behaviors for missing dependencies
- **User Feedback** - Clear error messages with actionable guidance

### Event System
- **Progress Events** - `recognition_progress` with percentage and status
- **Completion Events** - `recognition_complete` with success/failure status
- **Result Events** - `recognition_result` with final recognition data
- **Error Events** - `recognition_error` for error propagation

### Cross-Platform Considerations
- **FFmpeg Detection** - Multiple fallback paths for FFmpeg binary detection
- **File Paths** - Cross-platform path handling with proper separators
- **Executable Path** - Dynamic path resolution for model directory
- **Build Process** - Platform-specific builds with proper asset embedding

## Development Workflow

### Hot Reload Development
1. Start Wails development server: `wails dev`
2. Frontend runs on Vite dev server with hot reload
3. Backend Go code automatically recompiles on changes
4. Full application restarts on backend changes
5. Frontend-only changes hot reload without restart

### Testing the Application
1. **Unit Testing** - No formal test suite currently implemented
2. **Integration Testing** - Use mock service for development testing
3. **Manual Testing** - Test with various audio formats and languages
4. **Model Testing** - Verify Whisper model loading and recognition

### Frontend Development (Vue.js)
- Component development in `.vue` files
- Use composition API with composables for shared logic
- Pinia for global state management
- Vite for fast development and building

### Backend Development (Go)
- Service-oriented architecture with clear interfaces
- Concurrent recognition processing with goroutines
- Structured logging and error handling
- Configuration management with validation

## Build and Deployment

### Development Builds
- Faster compilation with debug symbols
- Frontend assets served from development server
- Hot reload enabled for rapid iteration
- Larger binary sizes acceptable

### Production Builds
- Optimized compilation with size reduction
- Frontend assets embedded in binary
- Single executable deployment
- Cross-platform distribution packages

### Platform-Specific Notes
- **macOS** - Creates `.app` bundle, requires code signing for distribution
- **Windows** - Creates `.exe` with embedded resources
- **Linux** - Creates standalone binary, consider AppImage for distribution

## Troubleshooting

### Common Issues
- **Whisper Model Missing** - Download models using provided scripts
- **FFmpeg Not Found** - Install FFmpeg or use embedded FFmpeg feature
- **Build Failures** - Check Go version (1.21+) and Node.js version (16+)
- **Recognition Not Working** - Verify model files and audio format compatibility

### Debugging
- Check browser console for frontend errors
- Review Wails development server output for backend issues
- Use mock service for testing UI without Whisper dependency
- Verify file paths and model loading status