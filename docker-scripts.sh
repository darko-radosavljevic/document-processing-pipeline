#!/bin/bash

# Docker management script for Document Processing Pipeline

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Function to start production environment
start_production() {
    print_header "Starting Production Environment"
    check_docker
    docker-compose up -d
    print_status "Production environment started successfully!"
    print_status "API: http://localhost:3000"
    print_status "RabbitMQ Management: http://localhost:15672 (admin/admin)"
    print_status "PostgreSQL: localhost:15432"
}

# Function to start development environment
start_development() {
    print_header "Starting Development Environment"
    check_docker
    docker-compose -f docker-compose.dev.yml up -d
    print_status "Development environment started successfully!"
    print_status "API: http://localhost:3000"
    print_status "RabbitMQ Management: http://localhost:15672 (admin/admin)"
    print_status "PostgreSQL: localhost:15432"
}

# Function to stop all services
stop_services() {
    print_header "Stopping All Services"
    check_docker
    docker-compose down
    docker-compose -f docker-compose.dev.yml down
    print_status "All services stopped successfully!"
}

# Function to restart services
restart_services() {
    print_header "Restarting Services"
    check_docker
    docker-compose down
    docker-compose up -d
    print_status "Services restarted successfully!"
}

# Function to view logs
view_logs() {
    local service=${1:-app}
    print_header "Viewing Logs for $service"
    check_docker
    docker-compose logs -f "$service"
}

# Function to rebuild and start
rebuild() {
    print_header "Rebuilding and Starting Services"
    check_docker
    docker-compose down
    docker-compose up --build -d
    print_status "Services rebuilt and started successfully!"
}

# Function to clean everything
clean_all() {
    print_header "Cleaning All Docker Resources"
    check_docker
    print_warning "This will remove all containers, volumes, and images!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker-compose down -v --remove-orphans
        docker-compose -f docker-compose.dev.yml down -v --remove-orphans
        docker system prune -a -f
        print_status "All Docker resources cleaned successfully!"
    else
        print_status "Clean operation cancelled."
    fi
}

# Function to show status
show_status() {
    print_header "Service Status"
    check_docker
    docker-compose ps
    echo
    print_status "Application Status:"
    curl -s http://localhost:3000/documents || print_warning "Application not responding"
}

# Function to access database
access_db() {
    print_header "Accessing PostgreSQL Database"
    check_docker
    docker-compose exec postgres psql -U postgres -d document_processing
}

# Function to backup database
backup_db() {
    local backup_file="backup_$(date +%Y%m%d_%H%M%S).sql"
    print_header "Backing up Database"
    check_docker
    docker-compose exec postgres pg_dump -U postgres document_processing > "$backup_file"
    print_status "Database backed up to $backup_file"
}

# Function to show help
show_help() {
    echo "Document Processing Pipeline - Docker Management Script"
    echo
    echo "Usage: $0 [COMMAND]"
    echo
    echo "Commands:"
    echo "  start-prod     Start production environment"
    echo "  start-dev      Start development environment"
    echo "  stop           Stop all services"
    echo "  restart        Restart all services"
    echo "  logs [service] View logs (default: app)"
    echo "  rebuild        Rebuild and start services"
    echo "  clean          Clean all Docker resources"
    echo "  status         Show service status"
    echo "  db             Access PostgreSQL database"
    echo "  backup         Backup database"
    echo "  help           Show this help message"
    echo
    echo "Examples:"
    echo "  $0 start-prod"
    echo "  $0 logs postgres"
    echo "  $0 backup"
}

# Main script logic
case "${1:-help}" in
    "start-prod")
        start_production
        ;;
    "start-dev")
        start_development
        ;;
    "stop")
        stop_services
        ;;
    "restart")
        restart_services
        ;;
    "logs")
        view_logs "$2"
        ;;
    "rebuild")
        rebuild
        ;;
    "clean")
        clean_all
        ;;
    "status")
        show_status
        ;;
    "db")
        access_db
        ;;
    "backup")
        backup_db
        ;;
    "help"|*)
        show_help
        ;;
esac 