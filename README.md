
# Document Processing Pipeline

A robust, scalable NestJS application for processing and managing documents with OCR capabilities, built with a microservices architecture and message queue system. This application provides a complete document processing pipeline from upload to validation, with asynchronous processing for high performance and reliability.

## 🏗️ Architecture Overview

This application follows a modular, event-driven architecture designed for scalability, maintainability, and fault tolerance:

### Core Architecture Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Gateway   │    │  Message Queue  │    │   Database      │
│   (NestJS)      │◄──►│   (RabbitMQ)    │◄──►│  (PostgreSQL)   │
│   Port: 3000    │    │   Port: 5672    │    │   Port: 5432    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  File Storage   │    │ Processing      │    │  Management UI  │
│   (Local Disk)  │    │ Workers         │    │  (RabbitMQ UI)  │
│                 │    │ (Event-Driven)  │    │   Port: 15672   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Processing Pipeline Flow

1. **Document Upload**: Files are uploaded via REST API and stored locally
2. **Event Emission**: Upload triggers a processing event to RabbitMQ
3. **OCR Processing**: Asynchronous OCR processing extracts text content
4. **Validation**: Extracted content is validated against schemas
5. **Status Updates**: Document status is updated throughout the pipeline
6. **Error Handling**: Failed documents are marked with error details

**Note**: Documents are created automatically through the upload process. Manual document creation and updates are not supported as the system is designed for automated document processing workflows.

### Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Backend Framework** | [NestJS](https://nestjs.com/) | Progressive Node.js framework with TypeScript support |
| **Database** | [PostgreSQL](https://www.postgresql.org/) | Primary data store for document metadata |
| **ORM** | [TypeORM](https://typeorm.io/) | Database abstraction and entity management |
| **Message Queue** | [RabbitMQ](https://www.rabbitmq.com/) | Asynchronous message processing and event distribution |
| **File Upload** | [Multer](https://github.com/expressjs/multer) | Multipart file handling and storage |
| **Validation** | [Zod](https://zod.dev/) | Schema validation for OCR results |
| **Validation** | [class-validator](https://github.com/typestack/class-validator) | DTO validation and transformation |
| **API Documentation** | [Swagger/OpenAPI](https://swagger.io/) | Interactive API documentation and testing |
| **Testing** | [Jest](https://jestjs.io/) | Unit and end-to-end testing framework |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | Type-safe JavaScript development |
| **Containerization** | [Docker](https://www.docker.com/) | Application containerization and orchestration |

## 🚀 Features

### Core Features

- **Document Upload & Storage**: Secure file upload with validation and unique naming
- **Asynchronous Processing**: Event-driven document processing pipeline
- **OCR Integration**: Text extraction from various document formats
- **Content Validation**: Schema-based validation of extracted content
- **Status Tracking**: Real-time document processing status updates
- **Error Handling**: Comprehensive error handling and logging
- **RESTful API**: Document retrieval, deletion, and upload operations
- **API Documentation**: Interactive Swagger/OpenAPI documentation for easy API exploration and testing

### Supported File Types

- **PDF Documents** (`application/pdf`)
- **Images**: JPEG, PNG, TIFF, BMP (`image/jpeg`, `image/png`, `image/tiff`, `image/bmp`)
- **Text Files** (`text/plain`)

### Document Processing States

| Status | Description |
|--------|-------------|
| `UPLOADED` | Document has been uploaded and queued for processing |
| `PROCESSING` | Document is currently being processed (OCR extraction) |
| `VALIDATED` | Document has been processed and validated successfully |
| `FAILED` | Document processing failed (with error details) |

## 📋 Prerequisites

Before running this application, ensure you have the following installed:

- **Docker** (v20.10+) and **Docker Compose** (v2.0+)
- **Node.js** (v20+) and **npm** (v8+) for local development
- **Git** for version control

## 🛠️ Quick Start

### Option 1: Docker Compose (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/darko-radosavljevic/document-processing-pipeline.git
   cd document-processing-pipeline
   ```

2. **Start all services**
   ```bash
   docker-compose up -d
   ```

3. **Verify services are running**
   ```bash
   docker-compose ps
   ```

4. **Access the application**
   - **API**: http://localhost:3000
   - **API Documentation (Swagger)**: http://localhost:3000/api
   - **RabbitMQ Management**: http://localhost:15672 (admin/admin)
   - **PostgreSQL**: localhost:15432

### Option 2: Development Environment

1. **Start infrastructure services only**
   ```bash
   docker-compose -f docker-compose.dev.yml up postgres rabbitmq -d
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment**
   ```bash
   cp env.example .env
   ```

4. **Run the application**
   ```bash
   npm run start:dev
   ```

## 🔧 Configuration



### Environment Variables

Create a `.env` file based on `env.example`:

```env
# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=document_processing

# File Upload Configuration
UPLOAD_DESTINATION=./uploads
MAX_FILE_SIZE=10485760  # 10MB in bytes

# RabbitMQ Configuration
RABBITMQ_URL=amqp://admin:admin@rabbitmq:5672
RABBITMQ_QUEUE=document_queue
```

### Configuration Options

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | `postgres` | PostgreSQL host address |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USERNAME` | `postgres` | Database username |
| `DB_PASSWORD` | `password` | Database password |
| `DB_NAME` | `document_processing` | Database name |
| `UPLOAD_DESTINATION` | `./uploads` | File storage directory |
| `MAX_FILE_SIZE` | `10485760` | Maximum file size (10MB) |
| `RABBITMQ_URL` | `amqp://admin:admin@rabbitmq:5672` | RabbitMQ connection URL |
| `RABBITMQ_QUEUE` | `document_queue` | RabbitMQ queue name |

## 📚 API Reference

### Base URL
```
http://localhost:3000
```

### API Documentation (Swagger)

The application includes comprehensive API documentation powered by Swagger/OpenAPI. You can access the interactive API documentation at:

```
http://localhost:3000/api
```

The Swagger UI provides:
- **Interactive API Explorer**: Test endpoints directly from the browser
- **Request/Response Examples**: See expected data formats
- **Schema Definitions**: View detailed data models
- **Authentication**: Currently no authentication required (see security notes below)

### Authentication
Currently, the API does not require authentication. In production, implement proper authentication mechanisms.

### Endpoints

#### Document Management

**Get All Documents**
```http
GET /documents
```
Returns a list of all documents with their processing status.

**Get Document by ID**
```http
GET /documents/{id}
```
Returns a specific document by its UUID.

**Delete Document**
```http
DELETE /documents/{id}
```

#### File Upload

**Upload Document**
```http
POST /documents/upload
Content-Type: multipart/form-data

file: [binary file data]
```

**Response Example**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "filename": "document.pdf",
  "path": "uploads/550e8400-e29b-41d4-a716-446655440000.pdf",
  "status": "uploaded",
  "ocr_text": null,
  "ocr_confidence": null,
  "ocr_language": null,
  "validation_errors": null,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Error Responses

**Validation Error (400)**
```json
{
  "statusCode": 400,
  "message": "File type image/gif is not supported. Allowed types: application/pdf, image/jpeg, image/png, image/tiff, image/bmp, text/plain",
  "error": "Bad Request"
}
```

**Not Found Error (404)**
```json
{
  "statusCode": 404,
  "message": "Document not found",
  "error": "Not Found"
}
```

## 🐳 Docker Commands

### Production Environment

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Rebuild and start
docker-compose up --build -d

# View logs
docker-compose logs -f app

# Access container shell
docker-compose exec app sh

# Remove all containers and volumes
docker-compose down -v
```

### Development Environment

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# Stop development environment
docker-compose -f docker-compose.dev.yml down

# View development logs
docker-compose -f docker-compose.dev.yml logs -f app
```



## 🧪 Testing

### Running Tests

```bash
# Unit tests
npm run test

# Unit tests with coverage
npm run test:cov

# Unit tests in watch mode
npm run test:watch

# End-to-end tests
npm run test:e2e
```





## 🔍 Monitoring & Logs



### Logging

```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs app
docker-compose logs postgres
docker-compose logs rabbitmq

# Follow logs in real-time
docker-compose logs -f
```

### RabbitMQ Management

Access the RabbitMQ Management UI at http://localhost:15672:
- **Username**: `admin`
- **Password**: `admin`

Monitor queues, connections, and message flow in real-time.

## 🚨 Troubleshooting

### Common Issues

**Port Conflicts**
```bash
# Check if ports are in use
netstat -tulpn | grep :3000
netstat -tulpn | grep :5432
netstat -tulpn | grep :5672
```

**Permission Issues**
```bash
# Fix upload directory permissions
sudo chown -R 1001:1001 ./uploads
```

**Database Connection Issues**
```bash
# Wait for PostgreSQL to be ready
docker-compose logs postgres
```

### Reset Everything

```bash
# Stop and remove everything
docker-compose down -v --remove-orphans

# Remove all images
docker system prune -a

# Start fresh
docker-compose up --build -d
```



## 🔒 Security Considerations

### Production Deployment

1. **Environment Variables**: Use secure, unique passwords
2. **Network Security**: Implement proper firewall rules
3. **File Upload**: Validate file types and scan for malware
4. **Authentication**: Implement proper authentication/authorization
5. **HTTPS**: Use SSL/TLS for all communications
6. **Database Security**: Use strong passwords and limit access



## 📈 Scalability

### Horizontal Scaling

The application is designed for horizontal scaling:

1. **Multiple App Instances**: Run multiple app containers behind a load balancer
2. **Database Scaling**: Use read replicas for read-heavy workloads
3. **Message Queue**: RabbitMQ supports clustering for high availability
4. **File Storage**: Consider cloud storage (S3, Azure Blob) for production



## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write comprehensive tests
- Update documentation for new features
- Follow the existing code style
- Add proper error handling

---

**Built with ❤️ using NestJS, TypeScript, and Docker**

