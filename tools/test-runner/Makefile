# Errly Migration Test Runner Makefile

# Build variables
BINARY_NAME=test-runner
VERSION?=dev
COMMIT?=$(shell git rev-parse --short HEAD)
DATE?=$(shell date -u +"%Y-%m-%dT%H:%M:%SZ")
LDFLAGS=-ldflags "-X main.version=$(VERSION) -X main.commit=$(COMMIT) -X main.date=$(DATE)"

# Go variables
GOCMD=go
GOBUILD=$(GOCMD) build
GOCLEAN=$(GOCMD) clean
GOTEST=$(GOCMD) test
GOGET=$(GOCMD) get
GOMOD=$(GOCMD) mod

# Directories
BUILD_DIR=build
CMD_DIR=cmd/test-runner

.PHONY: all build clean test deps help install run-volume run-chaos run-verify run-suite

# Default target
all: clean deps build

# Build the binary
build:
	@echo "Building $(BINARY_NAME)..."
	@mkdir -p $(BUILD_DIR)
	$(GOBUILD) $(LDFLAGS) -o $(BUILD_DIR)/$(BINARY_NAME) ./$(CMD_DIR)
	@echo "Binary built: $(BUILD_DIR)/$(BINARY_NAME)"

# Build for multiple platforms
build-all: clean deps
	@echo "Building for multiple platforms..."
	@mkdir -p $(BUILD_DIR)
	
	# Linux AMD64
	GOOS=linux GOARCH=amd64 $(GOBUILD) $(LDFLAGS) -o $(BUILD_DIR)/$(BINARY_NAME)-linux-amd64 ./$(CMD_DIR)
	
	# Linux ARM64
	GOOS=linux GOARCH=arm64 $(GOBUILD) $(LDFLAGS) -o $(BUILD_DIR)/$(BINARY_NAME)-linux-arm64 ./$(CMD_DIR)
	
	# macOS AMD64
	GOOS=darwin GOARCH=amd64 $(GOBUILD) $(LDFLAGS) -o $(BUILD_DIR)/$(BINARY_NAME)-darwin-amd64 ./$(CMD_DIR)
	
	# macOS ARM64 (Apple Silicon)
	GOOS=darwin GOARCH=arm64 $(GOBUILD) $(LDFLAGS) -o $(BUILD_DIR)/$(BINARY_NAME)-darwin-arm64 ./$(CMD_DIR)
	
	# Windows AMD64
	GOOS=windows GOARCH=amd64 $(GOBUILD) $(LDFLAGS) -o $(BUILD_DIR)/$(BINARY_NAME)-windows-amd64.exe ./$(CMD_DIR)
	
	@echo "Built binaries:"
	@ls -la $(BUILD_DIR)/

# Install dependencies
deps:
	@echo "Installing dependencies..."
	$(GOMOD) download
	$(GOMOD) tidy

# Clean build artifacts
clean:
	@echo "Cleaning..."
	$(GOCLEAN)
	rm -rf $(BUILD_DIR)

# Run tests
test:
	@echo "Running Go tests..."
	$(GOTEST) -v ./...

# Run tests with coverage
test-coverage:
	@echo "Running tests with coverage..."
	$(GOTEST) -v -coverprofile=coverage.out ./...
	$(GOCMD) tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report: coverage.html"

# Install the binary to GOPATH/bin
install: build
	@echo "Installing $(BINARY_NAME) to $(GOPATH)/bin..."
	cp $(BUILD_DIR)/$(BINARY_NAME) $(GOPATH)/bin/

# Development commands using the built binary
run-volume: build
	@echo "Running volume test (small)..."
	./$(BUILD_DIR)/$(BINARY_NAME) volume --size small --verbose

run-chaos: build
	@echo "Running chaos tests..."
	./$(BUILD_DIR)/$(BINARY_NAME) chaos --type all --verbose

run-verify: build
	@echo "Running verification..."
	./$(BUILD_DIR)/$(BINARY_NAME) verify --verbose

run-suite: build
	@echo "Running basic test suite..."
	./$(BUILD_DIR)/$(BINARY_NAME) suite --type basic --verbose

run-production-ready: build
	@echo "Running production-ready test suite..."
	./$(BUILD_DIR)/$(BINARY_NAME) suite --type production-ready --verbose

# Docker commands
docker-build:
	@echo "Building Docker image..."
	docker build -t errly/test-runner:$(VERSION) .

docker-run: docker-build
	@echo "Running in Docker..."
	docker run --rm -it \
		--network host \
		-e ERRLY_TEST_POSTGRES_URL="postgres://errly:errly_dev_password@localhost:5432/errly?sslmode=disable" \
		-e ERRLY_TEST_CLICKHOUSE_URL="tcp://errly:errly_dev_password@localhost:9000/errly_events" \
		errly/test-runner:$(VERSION) verify --verbose

# Development helpers
dev-setup: deps build
	@echo "Development setup complete!"
	@echo "Available commands:"
	@echo "  make run-volume     - Run volume tests"
	@echo "  make run-chaos      - Run chaos tests"
	@echo "  make run-verify     - Run verification"
	@echo "  make run-suite      - Run test suite"

# Format code
fmt:
	@echo "Formatting code..."
	$(GOCMD) fmt ./...

# Lint code (requires golangci-lint)
lint:
	@echo "Linting code..."
	golangci-lint run

# Generate mocks (requires mockgen)
generate:
	@echo "Generating mocks..."
	$(GOCMD) generate ./...

# Show help
help:
	@echo "Available targets:"
	@echo "  build              - Build the binary"
	@echo "  build-all          - Build for multiple platforms"
	@echo "  clean              - Clean build artifacts"
	@echo "  deps               - Install dependencies"
	@echo "  test               - Run tests"
	@echo "  test-coverage      - Run tests with coverage"
	@echo "  install            - Install binary to GOPATH/bin"
	@echo "  run-volume         - Run volume tests"
	@echo "  run-chaos          - Run chaos tests"
	@echo "  run-verify         - Run verification"
	@echo "  run-suite          - Run test suite"
	@echo "  run-production-ready - Run production-ready suite"
	@echo "  docker-build       - Build Docker image"
	@echo "  docker-run         - Run in Docker"
	@echo "  dev-setup          - Setup development environment"
	@echo "  fmt                - Format code"
	@echo "  lint               - Lint code"
	@echo "  generate           - Generate mocks"
	@echo "  help               - Show this help"

# Version info
version:
	@echo "Version: $(VERSION)"
	@echo "Commit:  $(COMMIT)"
	@echo "Date:    $(DATE)"
