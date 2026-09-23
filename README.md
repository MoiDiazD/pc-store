# pc-store

Backend de una aplicación e-commerce desarrollada con **NestJS, TypeScript, Fastify, PostgreSQL y Drizzle ORM**.

El proyecto incluye autenticación mediante sesiones, gestión de catálogo, carrito de compra, checkout, pedidos, gestión de usuarios por roles e integración con Stripe.

## Stack

- **Node.js / TypeScript**
- **NestJS 11**
- **Fastify**
- **PostgreSQL 17**
- **Drizzle ORM**
- **Argon2id** para el hash de contraseñas
- **Sesiones mediante cookies HTTP-only**
- **Stripe PaymentIntents + Webhooks**
- **Vitest** para tests unitarios, integración y E2E
- **Docker / Docker Compose**

El frontend se encuentra en un repositorio independiente: \`pc-store-frontend\`.

## Arquitectura

La aplicación está organizada por módulos siguiendo la arquitectura de NestJS:

\`\`\`
src/
├── auth/
├── users/
├── products/
├── brands/
├── categories/
├── cart/
├── orders/
├── payments/
└── database/
\`\`\`

La lógica de negocio se mantiene principalmente en los servicios, mientras que los repositorios encapsulan el acceso a PostgreSQL mediante Drizzle ORM.

## Autenticación y autorización

La autenticación utiliza sesiones persistidas en PostgreSQL.

- Las contraseñas se almacenan utilizando **Argon2id**.
- La sesión se mantiene mediante una cookie HTTP-only.
- Las sesiones tienen fecha de expiración y pueden ser revocadas.
- El cambio de contraseña revoca las sesiones existentes.
- Las operaciones administrativas están protegidas mediante roles.

### Roles

| Rol | Descripción |
|---|---|
| \`customer\` | Usuario normal que puede gestionar su cuenta, carrito y pedidos. |
| \`worker\` | Puede realizar determinadas operaciones sobre el catálogo. |
| \`manager\` | Puede realizar operaciones administrativas y gestionar usuarios. |

## API

### Auth

| Método | Endpoint | Acceso | Descripción |
|---|---|---|---|
| POST | \`/auth/register\` | Público | Registrar un usuario |
| POST | \`/auth/login\` | Público | Iniciar sesión |
| POST | \`/auth/logout\` | Autenticado | Cerrar sesión |
| GET | \`/auth/me\` | Autenticado | Obtener el usuario actual |
| PATCH | \`/auth/change-password\` | Autenticado | Cambiar contraseña |

### Products

| Método | Endpoint | Acceso | Descripción |
|---|---|---|---|
| GET | \`/products\` | Público | Listar productos |
| GET | \`/products/:id\` | Público | Obtener un producto |
| POST | \`/products\` | Worker / Manager | Crear producto |
| PATCH | \`/products/:id\` | Worker / Manager | Actualizar producto |
| DELETE | \`/products/:id\` | Worker / Manager | Borrado lógico |
| PATCH | \`/products/:id/restore\` | Manager | Restaurar producto |

### Brands

| Método | Endpoint | Acceso | Descripción |
|---|---|---|---|
| GET | \`/brands\` | Público | Listar marcas |
| GET | \`/brands/:id\` | Público | Obtener una marca |
| POST | \`/brands\` | Manager | Crear marca |
| PATCH | \`/brands/:id\` | Manager | Actualizar marca |
| DELETE | \`/brands/:id\` | Manager | Borrado lógico |
| PATCH | \`/brands/:id/restore\` | Manager | Restaurar marca |

### Categories

| Método | Endpoint | Acceso | Descripción |
|---|---|---|---|
| GET | \`/categories\` | Público | Listar categorías |
| GET | \`/categories/:id\` | Público | Obtener una categoría |
| GET | \`/categories/:id/products\` | Público | Obtener productos de una categoría |
| POST | \`/categories\` | Manager | Crear categoría |
| PATCH | \`/categories/:id\` | Manager | Actualizar categoría |
| DELETE | \`/categories/:id\` | Manager | Borrado lógico |
| PATCH | \`/categories/:id/restore\` | Manager | Restaurar categoría |
| POST | \`/categories/:id/products/:productId\` | Worker / Manager | Asociar producto |
| DELETE | \`/categories/:id/products/:productId\` | Worker / Manager | Desasociar producto |

### Cart

| Método | Endpoint | Acceso | Descripción |
|---|---|---|---|
| GET | \`/cart\` | Autenticado | Obtener carrito |
| POST | \`/cart/items\` | Autenticado | Añadir producto |
| PATCH | \`/cart/items/:productId\` | Autenticado | Modificar cantidad |
| DELETE | \`/cart/items/:productId\` | Autenticado | Eliminar producto |

### Orders

| Método | Endpoint | Acceso | Descripción |
|---|---|---|---|
| POST | \`/orders/checkout\` | Autenticado | Crear checkout |
| GET | \`/orders\` | Autenticado | Obtener pedidos propios |
| GET | \`/orders/:id\` | Autenticado | Obtener un pedido propio |

Durante el checkout el backend reserva el stock y crea un pedido en estado \`pending\`. Una vez confirmado el pago, el pedido pasa a \`confirmed\` y el carrito se limpia.

Los checkouts pendientes pueden expirar y liberar el stock reservado.

### Payments

| Método | Endpoint | Acceso | Descripción |
|---|---|---|---|
| POST | \`/payments/webhook\` | Stripe | Recibir eventos de Stripe |

El webhook valida la firma de Stripe antes de procesar los eventos.

El flujo de pago es:

\`\`\`
Frontend
   │
   ├── POST /orders/checkout
   │
   ▼
Backend
   │
   ├── Reserva stock
   ├── Crea Order
   └── Crea PaymentIntent
   │
   ▼
Stripe Payment Element
   │
   ▼
Stripe
   │
   └── payment_intent.succeeded
             │
             ▼
      /payments/webhook
             │
             ▼
          Backend
             │
             ├── Payment → succeeded
             ├── Order → confirmed
             └── Cart → vacío
\`\`\`

### Users

| Método | Endpoint | Acceso | Descripción |
|---|---|---|---|
| GET | \`/users/me\` | Autenticado | Obtener perfil |
| PATCH | \`/users/me\` | Autenticado | Actualizar perfil |
| GET | \`/users/:id\` | Manager | Obtener usuario |
| PATCH | \`/users/:id\` | Manager | Actualizar usuario |
| DELETE | \`/users/:id\` | Manager | Borrado lógico |
| PATCH | \`/users/:id/role\` | Manager | Cambiar rol |

## Base de datos

La aplicación utiliza PostgreSQL y Drizzle ORM.

Entidades principales:

- \`users\`
- \`sessions\`
- \`brands\`
- \`categories\`
- \`products\`
- \`product_categories\`
- \`carts\`
- \`cart_items\`
- \`orders\`
- \`order_items\`
- \`payments\`

Se utiliza borrado lógico en las entidades que lo requieren mediante \`deletedAt\`.

## Configuración

Crea un archivo \`.env\` a partir de \`.env.example\` y configura las variables necesarias para PostgreSQL, sesiones y Stripe.

Las claves secretas de Stripe deben permanecer exclusivamente en el backend.

## Instalación

### Requisitos

- Node.js 24.x
- npm
- Docker
- Docker Compose
- PostgreSQL 17 mediante Docker

### Ejecutar

\`\`\`bash
npm install
docker compose up -d
npm run db:migrate
npm run start:dev
\`\`\`

El backend se ejecuta por defecto en:

\`\`\`
http://localhost:3000
\`\`\`

Comprobación rápida:

\`\`\`bash
curl http://localhost:3000/products
curl http://localhost:3000/brands
curl http://localhost:3000/categories
\`\`\`

## Tests

El proyecto utiliza Vitest.

\`\`\`bash
npm run test
npm run test:watch
npm run test:cov
\`\`\`

También dispone de pruebas de integración contra PostgreSQL y pruebas E2E.

## Estado

El backend incluye actualmente:

- Autenticación y sesiones
- Autorización por roles
- Gestión de usuarios
- Gestión de productos
- Gestión de marcas
- Gestión de categorías
- Carrito
- Checkout
- Gestión de stock
- Pedidos
- Pagos mediante Stripe
- Webhooks de Stripe
- Expiración de checkouts
- Tests unitarios, de integración y E2E

## Licencia

Este proyecto es de carácter educativo.
