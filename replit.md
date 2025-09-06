# Overview

This is a professional AI-powered web scraping platform that automatically analyzes website structures and generates intelligent scraping strategies. The application provides real-time monitoring of scraping tasks, data management with inline editing capabilities, CSV export functionality, and displays generated scraping code for transparency. Built as a full-stack TypeScript application with React frontend and Express.js backend.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for fast development
- **UI Components**: Radix UI primitives with shadcn/ui design system
- **Styling**: Tailwind CSS with CSS variables for theming (dark theme by default)
- **State Management**: TanStack Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Real-time Updates**: WebSocket integration for live task monitoring and progress updates

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Job Queue**: BullMQ with Redis for background task processing
- **Web Scraping**: Puppeteer for browser automation and Cheerio for HTML parsing
- **WebSockets**: Built-in WebSocket server for real-time client communication
- **AI Integration**: OpenAI API (GPT-5) for website structure analysis and code generation

## Database Design
- **Users**: Authentication and user management with plan-based access
- **API Keys**: Secure API key management with hashing
- **Scraping Tasks**: Task metadata, progress tracking, and generated code storage
- **Scraped Data**: JSON storage of extracted data with source URL tracking
- **Website Analysis**: Cached AI analysis results for website structures
- **Task Logs**: Comprehensive logging and debugging information

## Real-time Communication
- **WebSocket Server**: Custom WebSocket implementation for live updates
- **Progress Broadcasting**: Real-time task progress, status changes, and error notifications
- **Client Synchronization**: Automatic query invalidation and cache updates

## AI-Powered Analysis
- **Structure Detection**: Automatic website DOM analysis and pattern recognition
- **Strategy Generation**: AI-recommended CSS selectors, XPath expressions, and scraping approaches
- **Code Generation**: Python (Scrapy) and JavaScript (Puppeteer) code generation
- **Confidence Scoring**: AI confidence levels for recommended strategies

## Authentication & Security
- **Session Management**: Express sessions with PostgreSQL storage
- **API Key Authentication**: Hashed API keys for programmatic access
- **Request Validation**: Zod schema validation for API requests
- **Error Handling**: Comprehensive error middleware and logging

## Performance Optimizations
- **Concurrent Processing**: BullMQ worker pools for parallel scraping operations
- **Caching Strategy**: Query caching with TanStack Query and database-level caching
- **Connection Pooling**: Neon PostgreSQL connection pooling for database efficiency
- **Asset Optimization**: Vite build optimization with code splitting

# External Dependencies

## Database Services
- **Neon PostgreSQL**: Serverless PostgreSQL database with connection pooling
- **Redis**: In-memory data store for job queues and session management

## AI & Machine Learning
- **OpenAI API**: GPT-5 model for website analysis and code generation
- **Web Scraping Intelligence**: AI-powered pattern recognition and strategy optimization

## Third-party APIs
- **Web Scraping Tools**: Puppeteer for browser automation, Cheerio for HTML parsing
- **UI Components**: Radix UI primitives for accessible component foundations
- **Styling Framework**: Tailwind CSS for utility-first styling approach

## Development Tools
- **Replit Integration**: Replit-specific plugins for development environment optimization
- **TypeScript Toolchain**: Full TypeScript support with strict type checking
- **Build Tools**: Vite for fast development builds and optimized production bundles

## Monitoring & Analytics
- **Real-time Metrics**: WebSocket-based progress monitoring and task analytics
- **Error Tracking**: Comprehensive error logging and debugging capabilities
- **Performance Monitoring**: Built-in request timing and performance metrics