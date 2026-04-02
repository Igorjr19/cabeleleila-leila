erDiagram
Establishment ||--o{ UserRole : "possui"
Establishment ||--o{ Service : "oferece"
Establishment ||--o{ Booking : "gerencia"

    User ||--o{ UserRole : "vinculado_a"
    User ||--o{ Booking : "realiza"

    Booking ||--|{ BookingService : "contém"
    Service ||--o{ BookingService : "item_de"

    Establishment {
        uuid id PK
        string name
        string cnpj
        datetime created_at
    }

    User {
        uuid id PK
        string email UK
        string password
        string name
    }

    UserRole {
        uuid user_id FK
        uuid establishment_id FK
        role enum "ADMIN_CUSTOMER_EMPLOYEE"
    }

    Service {
        uuid id PK
        uuid establishment_id FK
        string name
        decimal price
        int duration_minutes
    }

    Booking {
        uuid id PK
        uuid establishment_id FK
        uuid customer_id FK
        datetime scheduled_at
        enum status "PENDING, CONFIRMED, CANCELLED, FINISHED"
        datetime created_at
    }

    BookingService {
        uuid booking_id FK
        uuid service_id FK
    }
