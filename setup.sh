#!/bin/bash

# AI Artifact Builder - Setup Script
# This script automates the initial setup of the project

set -e  # Exit on error

echo "🚀 AI Artifact Builder - Setup Script"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "ℹ $1"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        echo "Visit: https://docs.docker.com/get-docker/"
        exit 1
    fi
    print_success "Docker is installed"
}

# Check if Docker Compose is installed
check_docker_compose() {
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        echo "Visit: https://docs.docker.com/compose/install/"
        exit 1
    fi
    print_success "Docker Compose is installed"
}

# Generate random secrets
generate_secret() {
    openssl rand -base64 32
}

# Setup environment file
setup_env() {
    print_info "Setting up environment variables..."
    
    if [ -f .env ]; then
        print_warning ".env file already exists. Backing up to .env.backup"
        cp .env .env.backup
    fi
    
    cp .env.example .env
    
    # Prompt for Anthropic API key
    echo ""
    read -p "Enter your Anthropic API Key (get it from https://console.anthropic.com/): " ANTHROPIC_KEY
    
    if [ -z "$ANTHROPIC_KEY" ]; then
        print_error "Anthropic API Key is required!"
        exit 1
    fi
    
    # Generate secure passwords and secrets
    DB_PASSWORD=$(generate_secret)
    JWT_SECRET=$(generate_secret)
    ANYTHINGLLM_KEY=$(generate_secret)
    
    # Update .env file
    sed -i.bak "s/ANTHROPIC_API_KEY=.*/ANTHROPIC_API_KEY=$ANTHROPIC_KEY/" .env
    sed -i.bak "s/DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" .env
    sed -i.bak "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
    sed -i.bak "s/ANYTHINGLLM_API_KEY=.*/ANYTHINGLLM_API_KEY=$ANYTHINGLLM_KEY/" .env
    
    # Remove backup file
    rm .env.bak
    
    print_success "Environment file configured"
}

# Create necessary directories
create_directories() {
    print_info "Creating necessary directories..."
    
    mkdir -p backend/uploads
    mkdir -p backend/logs
    mkdir -p frontend/build
    mkdir -p docs
    
    # Create .gitkeep files
    touch backend/uploads/.gitkeep
    touch backend/logs/.gitkeep
    
    print_success "Directories created"
}

# Build and start containers
start_containers() {
    print_info "Building and starting Docker containers..."
    print_warning "This may take a few minutes on first run..."
    echo ""
    
    docker-compose up -d --build
    
    print_success "Containers started"
}

# Wait for services to be healthy
wait_for_services() {
    print_info "Waiting for services to be ready..."
    
    local max_attempts=60
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if docker-compose ps | grep -q "unhealthy"; then
            echo -n "."
            sleep 2
            attempt=$((attempt + 1))
        else
            echo ""
            print_success "All services are ready!"
            return 0
        fi
    done
    
    echo ""
    print_error "Services failed to become healthy in time"
    docker-compose ps
    exit 1
}

# Display access information
display_info() {
    echo ""
    echo "======================================"
    echo "🎉 Setup Complete!"
    echo "======================================"
    echo ""
    print_success "Frontend: http://localhost:3000"
    print_success "Backend API: http://localhost:4000"
    print_success "AnythingLLM: http://localhost:3001"
    print_success "ChromaDB: http://localhost:8000"
    echo ""
    echo "📝 Useful commands:"
    echo "  - View logs: docker-compose logs -f"
    echo "  - Stop services: docker-compose down"
    echo "  - Restart services: docker-compose restart"
    echo "  - View status: docker-compose ps"
    echo ""
    echo "📖 Check README.md for more information"
    echo ""
}

# Main execution
main() {
    echo "Checking prerequisites..."
    check_docker
    check_docker_compose
    echo ""
    
    setup_env
    create_directories
    start_containers
    wait_for_services
    display_info
}

# Run main function
main
