# Overview

LogiSys is a comprehensive logistics management web application designed for a commerce company. The system provides an intuitive, scalable interface for managing orders, tickets, shipping, and administrative tasks. It features role-based authentication, real-time data synchronization with external platforms, and a modular architecture supporting multiple sales channels.

# User Preferences

Preferred communication style: Simple, everyday language.
Last migration completed: August 19, 2025 - Successfully updated database schema to match real structure with bigint IDs and complete business rules implementation.
MLG API integration completed: August 26, 2025 - Full MLG Marketplace API integration with authentication, comprehensive endpoints, and React Query hooks.
Three new integrations completed: August 26, 2025 - Express-PL shipping service, GMart image optimization, and Socket.IO real-time chat.
Complete system refactoring completed: August 26, 2025 - Safe refactoring with dark mode, health monitoring, profile management, and code optimization without breaking existing functionality.

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
  - Orders (bigint PK, complete Shopify integration with fulfillment status mapping)
  - Order_Items (product line items with bigint order_id references)  
  - Tickets (order fulfillment tracking)
  - Catalogo_Productos (real product catalog with SKU management)
  - Variants (product variants with inventory tracking)
  - Notes (dashboard annotations with calendar integration)
  - Channels, Carriers, Brands (configuration tables)

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
- **Drizzle ORM**: Database toolkit with TypeScript integration and bigint support

## UI Framework
- **Radix UI**: Headless component primitives for accessibility
- **shadcn/ui**: Pre-built component library
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library

## API Integrations
- **Shopify Admin API**: GraphQL integration for dual-store order synchronization
  - Authentication: Basic Auth with API key per store
  - Endpoint: Shopify GraphQL API
  - Sync frequency: Every 5 minutes
  - Business Rules: FULFILLED → "Gestionado", UNFULFILLED/NULL → "Sin Gestionar", RESTOCKED → "Devuelto", Others → "Error"
- **MLG Marketplace API**: Complete integration for product and sales management
  - Authentication: Token-based with automatic refresh and memory caching
  - Base URL: https://www.mlgdev.mx/marketplaceapi
  - Endpoints: Categories, Subcategories, Brands, Products, Sales, Commissions, Bulk Operations, Stock Updates, Shipping Labels
  - Backend: Express routes with Zod validation and error handling
  - Frontend: React Query hooks for all endpoints
  - Security: Environment-based credentials (MLG_EMAIL, MLG_PASSWORD, MLG_PROVIDER_ID)
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
- **express-session**: Session management with memory store
- **bcrypt**: Password hashing
- **CORS**: Cross-origin resource sharing configuration

## New Integrations (August 26, 2025)
- **Express-PL Shipping API**: Complete shipping label generation service
  - Authentication: Environment-based credentials (EXPRESSPL_LOGIN, EXPRESSPL_PASSWORD, etc.)
  - Endpoint: POST /api/shipping/expresspl/label for PDF label generation
  - Features: Order-based shipping calculations, dimensions from catalog, fixed sender configuration
- **GMart Image Integration**: Automatic product image resolution
  - Utility: getGMartImage() function for SKU-based image URLs
  - Fallback: GMart CDN integration for missing product images
  - Component: OrderImageDisplay for order item visualization
- **Socket.IO Real-time Chat**: Live communication system
  - Backend: Real-time message broadcasting with Socket.IO server
  - Frontend: Floating ChatWidget with connection status and message history
  - Features: Ephemeral messaging, user identification, responsive UI

## Business Logic
- **Business Rules Module**: Centralized fulfillment status mapping and order state management
- **Calendar Integration**: Google Calendar-like interface for notes management