# AGENT.md --- Backend Generation Guide (NestJS Marketplace)

## Objective

Build a scalable **NestJS backend** for a platform where:

-   Clients search professionals
-   Professionals pay to appear in the marketplace
-   Contact occurs **outside the platform** (WhatsApp / email)
-   Professionals manage their profile through a dashboard
-   The platform includes **community features**
-   Admins manage the platform via **backoffice**

------------------------------------------------------------------------

# High Level Architecture

    src
     ├── auth
     ├── users
     ├── professionals
     ├── profiles
     ├── search
     ├── payments
     ├── contacts
     ├── jobs
     ├── community
     ├── dashboard
     ├── admin
     ├── onboarding
     └── common

------------------------------------------------------------------------

# Core Entities

## User

    User
    - id
    - email
    - password_hash
    - role (client | professional | admin)
    - created_at

## ProfessionalProfile

    ProfessionalProfile
    - id
    - user_id
    - name
    - bio
    - photo
    - services
    - price_range
    - city
    - categories
    - whatsapp
    - email_contact
    - is_active
    - created_at

## Payment

    Payment
    - id
    - user_id
    - amount
    - currency
    - status
    - payment_provider
    - created_at

## Job

    Job
    - id
    - title
    - description
    - created_by_admin
    - created_at

## CommunityPost

    CommunityPost
    - id
    - user_id
    - content
    - created_at

## ContactLog

    ContactLog
    - id
    - professional_id
    - contact_type (whatsapp | email)
    - estimated
    - created_at

------------------------------------------------------------------------

# NestJS Modules

## AuthModule

Responsibility: - login - register - JWT

Endpoints:

    POST /auth/register
    POST /auth/login
    POST /auth/professional-register

------------------------------------------------------------------------

## ProfessionalsModule

    GET /professionals
    GET /professionals/:id
    POST /professionals
    PATCH /professionals/:id

------------------------------------------------------------------------

## SearchModule

    GET /search?category=
    GET /search?city=
    GET /search?price=

------------------------------------------------------------------------

## PaymentsModule

    POST /payments/create
    POST /payments/webhook
    GET /payments/status

------------------------------------------------------------------------

## DashboardModule

    GET /dashboard/me
    GET /dashboard/contacts
    GET /dashboard/jobs

------------------------------------------------------------------------

## CommunityModule

    GET /community/posts
    POST /community/posts
    POST /community/comments

------------------------------------------------------------------------

## JobsModule

    GET /jobs
    POST /jobs/apply

------------------------------------------------------------------------

## AdminModule

    GET /admin/professionals/pending
    POST /admin/professionals/:id/approve
    POST /admin/jobs
    GET /admin/payments

------------------------------------------------------------------------

# Client Flow

``` mermaid
flowchart TD

A[Home] --> B[Search]

B --> C[Results]

C --> D[Professional Profile]

D --> E{Contact Method}

E -->|WhatsApp| F[Open WhatsApp]

E -->|Email| G[Send Email]

F --> H[External Conversation]
G --> H
```

------------------------------------------------------------------------

# Search Adjustment Flow

``` mermaid
flowchart TD

A[Results]

A --> B{Not found}

B --> C[Adjust filters]

C --> D[New results]

D --> E[Open profile]
```

------------------------------------------------------------------------

# Professional Registration Flow

``` mermaid
flowchart TD

A[Home]

A --> B[Join Platform]

B --> C[Form]

C --> D[Payment]

D --> E[Confirmation]

E --> F[Profile active]

F --> G[Dashboard]
```

------------------------------------------------------------------------

# Professional Onboarding

``` mermaid
flowchart TD

A[First Login]

A --> B[Checklist]

B --> C[Upload Photo]

C --> D[Write Bio]

D --> E[Define Price]

E --> F[Optimized Profile]

F --> G[Published]
```

------------------------------------------------------------------------

# Professional Recurring Use

``` mermaid
flowchart TD

A[Login]

A --> B[Dashboard]

B --> C[Edit profile]

B --> D[View contacts]

B --> E[Community]

B --> F[Jobs]

B --> G[Calendar]

B --> H[Content]
```

------------------------------------------------------------------------

# Admin Flow

``` mermaid
flowchart TD

A[Admin Login]

A --> B[Approve profiles]

A --> C[Moderate community]

A --> D[Publish jobs]

A --> E[Manage payments]
```

------------------------------------------------------------------------

# Critical Product Rules

## Profile is the Product

Public endpoint:

    GET /professionals/:id

Response example:

    {
     name
     bio
     photo
     services
     prices
     city
     categories
     whatsapp_link
     email_link
     reviews
    }

------------------------------------------------------------------------

## External Contact

The backend generates links:

    https://wa.me/phone
    mailto:email

Optional tracking:

    POST /contacts/log

------------------------------------------------------------------------

## Onboarding State

    profile_status
    - incomplete
    - onboarding
    - active

Dashboard must expose:

    profile_completion_percentage

------------------------------------------------------------------------

# Recommended Stack

    NestJS
    PostgreSQL
    Prisma ORM
    Redis
    Stripe or MercadoPago
    JWT auth
    Cloudinary

------------------------------------------------------------------------

# Database Indexes

    INDEX professionals_city
    INDEX professionals_category
    INDEX professionals_active

------------------------------------------------------------------------

# Search API

    GET /search

Query example:

    ?category=design
    &city=buenosaires
    &price_min=10
    &price_max=50

------------------------------------------------------------------------

# Development Phases

## Phase 1 (MVP)

    auth
    users
    professionals
    search
    profiles

## Phase 2

    payments
    dashboard
    onboarding

## Phase 3

    community
    jobs
    admin
    analytics

------------------------------------------------------------------------

# Prompt for AI Code Generation

    Create a scalable NestJS backend for a marketplace of professionals.

    Requirements:

    - PostgreSQL
    - Prisma ORM
    - JWT authentication
    - Roles: client, professional, admin

    Modules:
    auth
    users
    professionals
    profiles
    search
    payments
    dashboard
    community
    jobs
    admin

    Rules:

    Clients contact professionals externally via WhatsApp or email.

    The backend must:

    - expose professional public profiles
    - allow search by city/category
    - support onboarding checklist
    - activate professionals after payment
    - provide a professional dashboard
    - include admin moderation

    Generate:
    - modules
    - controllers
    - services
    - prisma schema
    - DTOs
