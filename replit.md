# Overview

LogiSys is a comprehensive logistics management web application designed for a commerce company. The system provides an intuitive, scalable interface for managing orders, tickets, shipping, and administrative tasks. It features role-based authentication, real-time data synchronization with external platforms, and a modular architecture supporting multiple sales channels.

# User Preferences

Preferred communication style: Simple, everyday language.
Last migration completed: August 13, 2025 - Successfully migrated from Replit Agent with multi-store Shopify support.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: TanStack React Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Session Management**: Express session with memory store
- **Authentication**: Session-based with bcrypt password hashing
- **API Design**: RESTful endpoints with consistent error handling

## Database Design
- **Database**: PostgreSQL with Neon serverless hosting
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Core Tables**:
  - Users (authentication and role management)
  - Orders (from multiple channels: Shopify, MercadoLibre)
  - Tickets (order fulfillment tracking)
  - Brands/Catalogs (product inventory management)
  - Channels (sales platform configuration)
  - Carriers (shipping provider management)
  - Notes (dashboard annotations)

## Authentication & Authorization
- **User Roles**: Basic user and administrator roles
- **Session Management**: Server-side sessions with configurable expiration
- **Route Protection**: Middleware-based authentication checks
- **Admin Access**: Separate middleware for administrative features

## Module Organization
- **Shared Schema**: Common type definitions and validation schemas
- **Client Structure**: Component-based architecture with UI library integration
- **Server Structure**: Route-based organization with storage abstraction layer
- **Asset Management**: Dedicated folder for file uploads and static assets

# External Dependencies

## Database Services
- **Neon**: Serverless PostgreSQL hosting with connection pooling
- **Drizzle ORM**: Database toolkit with TypeScript integration

## UI Framework
- **Radix UI**: Headless component primitives for accessibility
- **shadcn/ui**: Pre-built component library
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library

## API Integrations
- **Shopify Admin API**: GraphQL integration for order synchronization
  - Authentication: Basic Auth with API key
  - Endpoint: Shopify GraphQL API
  - Sync frequency: Every 5 minutes
- **MercadoLibre API**: Order management (currently simulated)
  - Future OAuth implementation planned
  - Order search by seller ID

## Development Tools
- **Vite**: Development server and build tool with HMR
- **TypeScript**: Type safety across frontend and backend
- **ESLint**: Code quality and consistency
- **Replit Integration**: Development environment optimization

## File Processing
- **xlsx**: Excel file parsing for catalog imports
- **File Upload**: Multi-format support for inventory management

## Session & Security
- **express-session**: Session management
- **bcrypt**: Password hashing
- **CORS**: Cross-origin resource sharing configuration