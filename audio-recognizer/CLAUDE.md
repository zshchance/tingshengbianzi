# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a cross-platform audio recognition desktop application built with Go, Whisper speech recognition engine, and Wails v2. The application provides offline audio-to-text transcription with timestamp generation and AI optimization capabilities. It has evolved from using Vosk to Whisper for speech recognition and features a modern Vue.js 3 frontend architecture.

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

# Ensure proper PATH setup before development
export PATH=$PATH:~/go/bin && wails dev
```

### Building
```bash
# Development build
wails build -debug

# Production build (default)
wails build

# Clean build
wails build -clean

# Using build scripts
./scripts/build.sh

# Build with third-party dependencies (recommended)
./scripts/build-with-third-party.sh

# Complete build with all dependencies
./scripts/build-complete.sh

# Cross-platform builds
wails build -platform darwin/amd64 -clean
wails build -platform windows/amd64 -clean
wails build -platform linux/amd64 -clean

# Platform-specific builds
./scripts/build-macos-release.sh
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

# Large-v3-turbo models (recommended for better quality)
curl -L https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin -o models/whisper/ggml-large-v3-turbo.bin

# Quantized model for better performance
curl -L https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo-q8_0.bin -o models/whisper/ggml-large-v3-turbo-q8_0.bin
```

### Icon and Asset Management
```bash
# Fix icon display issues
./scripts/fix-all-icons.sh

# Generate high-quality icons
./scripts/generate-icons.sh

# Optimize icons for production
./scripts/optimize-icons.sh

# Fix icon cache issues
./scripts/clear-icon-cache.sh
```

### Testing and Debugging
```bash
# Show application logs
./scripts/show-logs.sh

# Run development server with restart
./scripts/restart-dev.sh

# Test third-party dependencies
./scripts/test-dependencies.sh
```

## Project Structure

```
audio-recognizer/
├── third-party/                    # Third-party binary dependencies
│   └── bin/                       # Binary executables
│       ├── whisper-cli          # Whisper speech recognition CLI
│       ├── ffmpeg               # FFmpeg multimedia framework
│       └── ffprobe              # FFprobe media analysis tool
├── frontend/                      # Vue.js frontend application
│   ├── src/
│   │   ├── components/           # Vue components
│   │   ├── composables/          # Composition API functions
│   │   ├── stores/              # Pinia state stores
│   │   └── modules/             # Frontend modules
│   ├── package.json             # Frontend dependencies
│   └── vite.config.js           # Vite configuration
├── backend/                       # Go backend application
│   ├── recognition/             # Speech recognition services
│   ├── audio/                   # Audio processing services
│   ├── models/                  # Data structures and types
│   ├── utils/                   # Utility functions
│   ├── services/                # Business logic services
│   ├── config/                  # Configuration management
│   └── path/                    # Path and dependency management
├── scripts/                       # Build and utility scripts
├── config/                        # Configuration files
├── models/                        # Whisper speech models
├── docs/                          # Documentation
├── wails.json                     # Wails configuration
└── app.go                         # Main application entry point
```

## Architecture Overview

### Frontend Architecture (Vue.js 3 + Vite + Pinia)
The frontend has been completely migrated to Vue.js 3 with modern component architecture:

- **Vue 3.3.0 + Vite 5.0** - Modern development environment with hot reload
- **Pinia 2.1.0** - State management for application state (replacing Vuex)
- **Composition API** - Reusable logic through composables
- **Component-based architecture** - Reusable Vue components

**Key Vue components:**
- **App.vue** - Main application component with overall layout and Wails integration
- **FileDropZone.vue** - Drag-and-drop file upload with validation
- **ProgressBar.vue** - Real-time progress indicator with animations
- **ResultDisplay.vue** - Tabbed interface for recognition results with export options
- **SettingsModal.vue** - Configuration panel for recognition settings with global state management
- **ToastContainer.vue & ToastMessage.vue** - Notification system using Pinia store

**Composables (Composition API):**
- **useAudioFile.js** - Audio file handling, validation, and upload logic
- **useWails.js** - Wails API integration and communication with backend
- **useSettings.js** - Settings management with singleton pattern and backend sync
- **useToast.js** - Toast notification management through Pinia store

**State Management:**
- **Pinia stores** (`stores/toast.js`) - Centralized state management
- **Singleton pattern** - Global settings shared across all components
- **Reactive configuration** - Real-time settings synchronization with backend

### Backend Architecture (Go + Wails v2)
The backend follows a modular Go structure with Whisper integration:

- **app.go** - Main application struct with Wails integration and configuration management
- **main.go** - Entry point with embedded frontend assets
- **backend/** - Core business logic modules:
  - **recognition/** - Whisper speech recognition service
    - `service.go` - Interface definition for recognition services
    - `whisper_service.go` - Whisper.cpp implementation with model loading
    - `mock_service.go` - Mock service for development and testing
  - **audio/** - Audio processing using FFmpeg
    - `processor.go` - Audio format conversion and processing with embedded FFmpeg support
  - **models/** - Data structures and configurations
    - `recognition.go` - Recognition result and config models with detailed Word and Segment structures
    - `errors.go` - Error handling definitions with structured error types
  - **utils/** - Utility functions
    - `ffmpeg_manager.go` - FFmpeg binary management with embedded fallback
    - `embedded_ffmpeg.go` - Embedded FFmpeg handling for self-contained deployment
    - `time_utils.go` - Time formatting utilities for timestamps
    - `text_utils.go` - Text processing utilities for AI optimization
    - `logger.go` - Structured logging system
    - `file_utils.go` - File handling utilities
  - **services/** - Business logic services
    - `model_service.go` - Model management and validation
    - `audio_service.go` - Audio file handling and processing
    - `export_service.go` - Result export functionality
  - **config/** - Configuration management
    - `config_manager.go` - Configuration loading, saving, and validation
  - **path/** - Path and dependency management
    - `path_manager.go` - Unified path management for dependencies and templates
    - `app_locator.go` - Application location detection
    - `dependency_manager.go` - Third-party dependency extraction and management
    - `template_manager.go` - AI template system initialization

### Configuration System
Advanced configuration system with real-time synchronization:

- **JSON-based configuration** with automatic backend-frontend sync
- **User config file**: `config/user-config.json` for persistent settings
- **Runtime updates** via `UpdateConfig()` method
- **Global singleton pattern** ensures consistent state across all components
- **Backend integration** with model paths, audio processing, and Whisper settings
- **Watch-based auto-save** with dirty state tracking

### Speech Recognition Pipeline
1. **File Validation** - Check audio format, size, and accessibility
2. **Audio Processing** - Convert to WAV format using embedded FFmpeg if needed
3. **Whisper Recognition** - Process through Whisper.cpp with word timestamps and confidence scoring
4. **Result Processing** - Generate formatted text with precise timestamps and AI optimization
5. **Export Options** - Support for TXT, SRT, VTT, JSON formats with custom formatting

### Third-Party Dependencies

The application includes third-party binary dependencies managed in `third-party/bin/`:

- **whisper-cli** (~825KB) - Whisper speech recognition CLI
- **ffmpeg** (~489KB) - FFmpeg multimedia framework for audio processing
- **ffprobe** (~286KB) - FFprobe media analysis tool for audio file inspection

**Dependency Resolution Priority:**
1. **Embedded Dependencies** (`Resources/third-party/bin/`) - Highest priority in production builds
2. **Development Dependencies** (`third-party/bin/`) - Development environment
3. **System PATH** - Fallback when internal dependencies unavailable

**Building with Third-Party Dependencies:**
```bash
./scripts/build-with-third-party.sh
```

This script automatically packages all third-party dependencies into the application bundle, ensuring complete self-contained deployment.

### Model Structure
Whisper models are stored in configurable paths (default `./models/whisper/`):
- **ggml-base.bin** - Base model (recommended, balances speed/accuracy)
- **ggml-small.bin** - Small model (faster, less accurate)
- **ggml-large.bin** - Large model (slower, more accurate)
- **ggml-large-v3-turbo.bin** - Latest optimized model (recommended for quality)
- **ggml-large-v3-turbo-q8_0.bin** - Quantized version for better performance

### Wails Integration (v2.11.0)
- **Application context** managed through `App` struct with `ctx context.Context`
- **Event-driven communication** between frontend and backend via `runtime.EventsEmit()`
- **Progress updates** with percentage and status tracking
- **File operations** using Wails runtime services including drag-and-drop support
- **Embedded frontend assets** in production builds
- **Cross-platform deployment** with proper asset embedding
- **Configuration management** with real-time frontend-backend synchronization
- **AI template system** for intelligent text optimization and processing
- **Third-party dependency management** with automatic extraction from embedded resources
- **Model validation** and path management for Whisper models

## Important Implementation Details

### Settings Management (Singleton Pattern)
- **Global singleton implementation** ensures all components share the same settings instance
- **Real-time backend sync** with automatic config updates
- **LocalStorage persistence** for UI-specific settings
- **Dirty state tracking** with watch-based auto-save functionality
- **Error handling** for configuration loading and validation

### Audio Processing Pipeline
- **Embedded FFmpeg support** for self-contained deployment
- **Automatic format detection** and conversion to WAV for Whisper
- **Real-time duration calculation** with fallback estimation
- **Format support** - MP3, WAV, M4A, AAC, OGG, FLAC
- **Size limits** - Configurable file size limits with validation

### Whisper Recognition Service
- **Interface pattern** with clean separation between service interface and implementation
- **Fallback strategy** to mock service if Whisper unavailable
- **Real-time progress tracking** during recognition processing
- **Dynamic model loading** with validation and error handling
- **Multi-language support** with configurable language codes and confidence thresholds

### State Management Architecture
- **Pinia stores** for centralized state management
- **Composition API** for reusable logic and reactive state
- **Singleton composables** for global state sharing
- **Event-driven updates** with automatic persistence
- **Reactive configuration** with deep watching and validation

### Error Handling Strategy
- **Structured errors** defined in `models/errors.go` with error codes
- **Consistent error code system** for frontend handling
- **Graceful degradation** with fallback behaviors for missing dependencies
- **User feedback** through toast notifications with actionable guidance

### Event System
- **Progress events** (`recognition_progress`) with percentage and status updates
- **Completion events** (`recognition_complete`) with success/failure status
- **Result events** (`recognition_result`) with final recognition data and metadata
- **Error events** (`recognition_error`) for error propagation and handling

### Cross-Platform Considerations
- **Embedded FFmpeg** detection with multiple fallback paths for self-contained deployment
- **Cross-platform file path handling** with proper separators
- **Dynamic path resolution** for model directory and configuration files
- **Platform-specific builds** with proper asset embedding and signing
- **Icon generation** and optimization for different platforms
- **Dependency packaging** for truly self-contained distribution

## Development Workflow

### Hot Reload Development
1. **Start Wails development server**: `export PATH=$PATH:~/go/bin && wails dev`
2. **Frontend runs** on Vite dev server with hot reload at `http://localhost:5173/`
3. **Backend Go code** automatically recompiles on changes
4. **Full application restarts** on backend changes
5. **Frontend-only changes** hot reload without restart
6. **Development scripts**: Use `./start-dev.sh` for automated environment setup and model downloading

### Testing the Application
1. **Unit Testing** - No formal test suite currently implemented
2. **Integration Testing** - Use mock service for development testing
3. **Manual Testing** - Test with various audio formats and languages
4. **Model Testing** - Verify Whisper model loading and recognition accuracy
5. **Configuration Testing** - Test settings persistence and backend sync
6. **Dependency Testing** - Verify third-party binaries are properly extracted and functional

### Frontend Development (Vue.js 3)
- **Component development** in `.vue` files with Composition API
- **Composable usage** for shared logic and state management (useAudioFile, useWails, useSettings, useToast)
- **Pinia integration** for global state management
- **Vite for development** with fast builds and hot reload
- **Singleton patterns** for global settings and state sharing
- **Drag-and-drop support** with Base64 file handling

### Backend Development (Go)
- **Service-oriented architecture** with clear interfaces and implementations
- **Concurrent processing** with goroutines for audio processing
- **Structured logging** and comprehensive error handling with custom error types
- **Configuration management** with validation and real-time updates
- **Embedded resource handling** for self-contained deployment
- **Path management system** for cross-platform dependency resolution
- **Template system** for AI text optimization with multiple prompt templates

## Build and Deployment

### Development Builds
- **Faster compilation** with debug symbols
- **Frontend assets served** from development server
- **Hot reload enabled** for rapid iteration
- **Larger binary sizes** acceptable for development

### Production Builds
- **Optimized compilation** with size reduction
- **Frontend assets embedded** in binary for self-contained deployment
- **Single executable deployment** with embedded FFmpeg and resources
- **Cross-platform distribution packages** with proper signing

### Platform-Specific Notes
- **macOS** - Creates `.app` bundle, requires code signing for distribution
- **Windows** - Creates `.exe` with embedded resources and FFmpeg
- **Linux** - Creates standalone binary, consider AppImage for distribution

## Troubleshooting

### Common Issues
- **Whisper Model Missing** - Download models using provided scripts or manual download
- **FFmpeg Not Found** - Install FFmpeg or use embedded FFmpeg feature (auto-detected)
- **Build Failures** - Check Go version (1.23+) and Node.js version (16+)
- **Recognition Not Working** - Verify model files, configuration paths, and audio format compatibility
- **Settings Not Persisting** - Check configuration file permissions and backend sync

### Debugging
- **Browser console** for frontend errors and reactive state issues
- **Wails development server output** for backend issues and configuration loading
- **Mock service** for testing UI without Whisper dependency
- **Configuration verification** by checking `config/user-config.json` and browser console logs
- **State synchronization debugging** through singleton pattern logging and watch events

### Development Environment Issues
- **PATH setup** - Ensure `~/go/bin` is in PATH before running `wails dev`
- **Permission issues** - Check configuration directory permissions
- **Hot reload not working** - Verify Wails development server is properly running
- **Build asset issues** - Clean build directory and rebuild from scratch
- **Icon display issues** - Use `./scripts/fix-all-icons.sh` to resolve icon caching problems
- **Missing models** - Run `./scripts/download-models.sh` to download required Whisper models
- **FFmpeg embedding** - Use `./scripts/bundle-ffmpeg.sh` to embed FFmpeg for standalone deployment
- **Packaged app not working** - Use `./scripts/build-complete.sh` for distribution builds with all dependencies
- **Whisper CLI missing** - The complete build script includes `backend/recognition/whisper-cli` binary packaging
- **Third-party dependencies** - Use `./scripts/build-with-third-party.sh` to package all required binaries
- **Template system issues** - Check `Resources/templates/` directory for AI prompt templates
- **Configuration persistence** - Verify `config/user-config.json` is writable and properly formatted

## Additional Development Information

### File Handling and Drag-Drop
The application supports both file path selection and drag-drop functionality:
- **File Path Mode**: Standard file selection with path validation
- **Drag-Drop Mode**: Base64 encoding of file data with temporary file creation
- **Audio Validation**: Format checking (MP3, WAV, M4A, AAC, OGG, FLAC) and size limits (100MB default)
- **Duration Detection**: Automatic audio duration calculation using FFmpeg

### Configuration System Details
- **Default Config**: Loaded from `config/default.json`
- **User Config**: Saved to `config/user-config.json` with real-time updates
- **Backend Sync**: Configuration changes immediately propagated to Go backend services
- **Validation**: Automatic path correction and model directory validation
- **Fallback**: Graceful degradation when configuration files are missing or corrupted

### Third-Party Dependency Resolution
The application uses a sophisticated dependency resolution system:
1. **Embedded Resources**: Highest priority, extracted from application binary
2. **Development Directory**: `third-party/bin/` during development
3. **System PATH**: Fallback to system-installed binaries
4. **Automatic Extraction**: Dependencies extracted to local filesystem on first run
5. **Permission Handling**: Automatic executable permission setting for extracted binaries