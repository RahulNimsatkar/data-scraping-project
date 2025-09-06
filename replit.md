# DataScrapeAI

## Overview

DataScrapeAI is a comprehensive AI-powered web scraping platform that combines intelligent website analysis with automated data extraction. The platform leverages OpenAI's GPT models to analyze website structures and generate optimal scraping strategies, while providing a modern React-based dashboard for managing scraping tasks and monitoring progress in real-time.

The system automatically identifies data patterns, suggests CSS selectors and extraction strategies, and generates production-ready scraping code. Users can monitor active scraping operations through WebSocket connections, edit scraped data inline, and export results in multiple formats.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The client is built using React with TypeScript and Vite as the build tool. The UI framework utilizes shadcn/ui components with Radix UI primitives for accessibility and Tailwind CSS for styling. The application follows a component-based architecture with dedicated pages for different functionality areas (dashboard, analysis, tasks, data export).

State management is handled through TanStack Query (React Query) for server state and caching, eliminating the need for additional global state management. The routing system uses Wouter for client-side navigation, providing a lightweight alternative to React Router.

Real-time updates are implemented via WebSocket connections that push scraping progress and status changes to the frontend. The UI supports live monitoring of active tasks with progress bars and status indicators.

### Backend Architecture
The server is built with Express.js and TypeScript, following a service-oriented architecture. Core services include:
- **ScraperService**: Manages web scraping operations using Cheerio for HTML parsing
- **OpenAI Service**: Handles AI-powered website analysis and code generation
- **Queue Service**: Implements job queuing with BullMQ for background task processing
- **Storage Service**: Provides data persistence abstraction layer

The backend uses a RESTful API design with WebSocket support for real-time communication. API endpoints are organized by functionality (stats, tasks, analysis, data management) with consistent error handling and response formatting.

### Data Storage Solutions
The application uses a flexible storage architecture that supports both MongoDB and PostgreSQL through different adapters. The primary configuration uses MongoDB with the official Node.js driver for document-based storage, ideal for the varied structure of scraped data.

Database schemas are defined using Zod for runtime validation, with separate collections/tables for users, API keys, scraping tasks, scraped data, website analysis, and task logs. The storage layer includes fallback to in-memory storage for development scenarios.

Drizzle ORM is configured for PostgreSQL support with migration capabilities, allowing for future database transitions if needed.

### Authentication and Authorization
The current implementation includes a simplified authentication system with API key-based access for external integrations. User management is handled through the storage service with support for different subscription plans and usage limits.

Session management uses connect-pg-simple for PostgreSQL session storage, providing persistent user sessions across server restarts.

### External Service Integrations
The platform integrates with OpenAI's API for intelligent website analysis and code generation. The AI service analyzes HTML content to identify data patterns, suggest optimal CSS selectors, and generate scraping strategies with confidence scores.

WebSocket integration provides real-time updates for scraping progress, allowing the frontend to display live status updates, progress percentages, and completion notifications.

The system includes export capabilities for multiple formats (CSV, JSON, Excel, SQL) and supports code generation for both Python (Scrapy) and JavaScript (Puppeteer) scraping implementations.

## External Dependencies

### AI and Machine Learning
- **OpenAI API**: Core AI functionality for website analysis, selector generation, and strategy recommendations
- **GPT-5 Model**: Latest language model for enhanced analysis accuracy and code generation

### Data Processing and Web Scraping
- **Cheerio**: Server-side HTML parsing and manipulation
- **BullMQ**: Redis-based job queue for background scraping tasks
- **Puppeteer**: Browser automation support (configured but not actively used in current HTTP-based approach)

### Database and Storage
- **MongoDB**: Primary document database with official Node.js driver
- **Neon Database**: PostgreSQL serverless database option via @neondatabase/serverless
- **Drizzle ORM**: Type-safe database toolkit for PostgreSQL operations
- **connect-pg-simple**: PostgreSQL session store for Express sessions

### Frontend Framework and UI
- **React 18**: Core frontend framework with hooks and concurrent features
- **Vite**: Fast build tool and development server
- **TanStack Query**: Server state management and caching
- **Wouter**: Lightweight client-side routing
- **shadcn/ui**: Modern component library built on Radix UI primitives
- **Tailwind CSS**: Utility-first CSS framework for styling

### Real-time Communication
- **WebSocket (ws)**: Real-time bidirectional communication for live updates
- **Server-sent Events**: Alternative real-time communication method

### Development and Build Tools
- **TypeScript**: Type safety across the full stack
- **ESBuild**: Fast JavaScript bundler for production builds
- **TSX**: TypeScript execution environment for development
- **Zod**: Runtime schema validation and type inference