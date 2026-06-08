# DrukNest — Use Case Diagram

```mermaid
flowchart LR

    GUEST(["👤 Guest"])
    TENANT(["🧑 Tenant"])
    OWNER(["🏠 Owner"])
    ADMIN(["⚙️ Admin"])

    subgraph DN["  DrukNest Platform  "]

        subgraph A["Authentication"]
            A1(["Sign Up"])
            A2(["Sign In"])
        end

        subgraph B["Browsing"]
            B1(["View Home Page"])
            B2(["Browse & Filter Listings"])
            B3(["View Listing Detail"])
            B4(["View How It Works"])
        end

        subgraph C["Tenant"]
            C1(["Save to Wishlist"])
            C2(["Send Inquiry"])
            C3(["Chat with Owner"])
            C4(["View Lease"])
            C5(["Upload Payment Proof"])
            C6(["Upload CID Document"])
            C7(["Update Profile & Avatar"])
        end

        subgraph D["Roommate Finder"]
            D1(["Post / Edit Profile"])
            D2(["Browse Roommate Posts"])
            D3(["Send Connection Request"])
        end

        subgraph E["Owner"]
            E1(["Add / Edit Listing"])
            E2(["Publish / Unpublish"])
            E3(["Accept or Decline Inquiry"])
            E4(["Chat with Tenant"])
            E5(["Create Lease"])
            E6(["Confirm Payment"])
            E7(["Set Bank Details"])
        end

        subgraph F["Admin"]
            F1(["Approve / Reject Listing"])
            F2(["Verify / Reject CID"])
            F3(["Suspend / Restore User"])
            F4(["Resolve Reports"])
            F5(["View Analytics"])
        end

        subgraph G["System Auto"]
            G1(["Send Notification"])
            G2(["Generate Payment Schedule"])
        end

    end

    GUEST --> A1 & A2
    GUEST --> B1 & B2 & B3 & B4

    TENANT --> A2
    TENANT --> B2 & B3
    TENANT --> C1 & C2 & C3 & C4 & C5 & C6 & C7
    TENANT --> D1 & D2 & D3

    OWNER --> A2
    OWNER --> E1 & E2 & E3 & E4 & E5 & E6 & E7

    ADMIN --> A2
    ADMIN --> F1 & F2 & F3 & F4 & F5

    E3 -.->|include| G1
    E5 -.->|include| G2
    E6 -.->|include| G1
    F1 -.->|include| G1
    F2 -.->|include| G1
    D3 -.->|include| G1
```

---

# Interaction Overview — Guest

```mermaid
flowchart TD
    START(("●")) --> G1([Open DrukNest])
    G1 --> G2([View Home Page])
    G2 --> G3([Browse Listings])
    G3 --> G4([Filter by City / Type / Price])
    G4 --> G5([View Listing Detail])
    G5 --> G6{Want to act?}
    G6 -->|Browse more| G3
    G6 -->|Sign up| G7([Register as Tenant or Owner])
    G6 -->|Already have account| G8([Sign In])
    G7 --> G9([Confirm Email])
    G9 --> G8
    G8 --> G10{Role?}
    G10 -->|Tenant| G11([Redirected to Home])
    G10 -->|Owner| G12([Redirected to Owner Dashboard])
    G10 -->|Admin| G13([Redirected to Admin Console])
    G11 & G12 & G13 --> STOP(("◉"))
```

---

# Interaction Overview — Tenant

```mermaid
flowchart TD
    START(("●")) --> T1([Sign In])

    T1 --> T2([Browse & Filter Listings])
    T2 --> T3([View Listing Detail])
    T3 --> T4{Action?}
    T4 -->|Save| T5([Add to Wishlist])
    T5 --> T2
    T4 -->|Inquire| T6([Send Inquiry to Owner])
    T6 --> T7([Wait for Owner Response])
    T7 --> T8{Owner Decision}
    T8 -->|Declined| T2
    T8 -->|Accepted| T9([Chat with Owner])
    T9 --> T10([Owner Creates Lease])
    T10 --> T11([View Lease Details])
    T11 --> T12([Upload Payment Proof\n+ Bank Reference])
    T12 --> T13([Wait for Owner Confirmation])
    T13 --> T14{Confirmed?}
    T14 -->|Pending| T13
    T14 -->|Yes| T15([Payment Marked Paid])
    T15 --> T11

    T1 --> T16([Upload CID Document])
    T16 --> T17([Wait for Admin Review])
    T17 --> T18{Admin Decision}
    T18 -->|Rejected| T16
    T18 -->|Verified| T19([CID Verified])

    T1 --> T20([Post Roommate Profile])
    T20 --> T21([Browse Roommate Posts])
    T21 --> T22([Send Connection Request])
    T22 --> T23([Notification Sent to Poster])
    T20 --> T24{Profile expired?}
    T24 -->|Yes| T25([Renew for 30 Days])
    T25 --> T20

    T15 --> STOP(("◉"))
    T19 --> STOP
    T23 --> STOP
```

---

# Interaction Overview — Owner

```mermaid
flowchart TD
    START(("●")) --> O1([Sign In])
    O1 --> O2([Set Bank Details])
    O2 --> O3([Add New Listing])
    O3 --> O4([Submit for Admin Approval])
    O4 --> O5([Wait for Admin Review])
    O5 --> O6{Admin Decision}
    O6 -->|Rejected| O3
    O6 -->|Approved| O7([Listing Goes Live])
    O7 --> O8([Publish / Unpublish Listing])
    O7 --> O20([Edit Listing])
    O7 --> O21([Delete Listing])
    O8 --> O9([Tenant Sends Inquiry])
    O9 --> O10([Review Inquiry])
    O10 --> O11{Accept or Decline?}
    O11 -->|Decline| O12([Notify Tenant — Declined])
    O12 --> O9
    O11 -->|Accept| O13([Chat Opens with Tenant])
    O13 --> O14([Create Formal Lease])
    O14 --> O15([Payment Schedule Auto-Generated])
    O15 --> O16([Tenant Uploads Payment Proof])
    O16 --> O17([Review Payment Proof])
    O17 --> O18{Confirm?}
    O18 -->|Pending| O17
    O18 -->|Yes| O19([Mark Payment as Paid\nNotify Tenant])
    O19 --> O16
    O21 --> STOP(("◉"))
    O20 --> STOP
    O19 --> STOP
```

---

# Interaction Overview — Admin

```mermaid
flowchart TD
    START(("●")) --> A1([Sign In])
    A1 --> A2([View Admin Console])

    A2 --> A3([Check Approval Queue])
    A3 --> A4([Review Pending Listing])
    A4 --> A5{Decision}
    A5 -->|Approve| A6([Listing status = live\nNotify Owner])
    A5 -->|Reject| A7([Notify Owner — Rejected])
    A6 --> A3
    A7 --> A3

    A2 --> A8([Check CID Verification Queue])
    A8 --> A9([Review CID Document])
    A9 --> A10{Decision}
    A10 -->|Verify| A11([cid_verified = true\nNotify Tenant])
    A10 -->|Reject| A12([Notify Tenant — Rejected])
    A11 --> A8
    A12 --> A8

    A2 --> A13([View All Users])
    A13 --> A14{Action?}
    A14 -->|Suspend| A15([User Blocked from Login])
    A14 -->|Restore| A16([User Access Restored])

    A2 --> A17([View Reports])
    A17 --> A18([Investigate Report])
    A18 --> A19([Resolve Report])

    A2 --> A20([View Analytics Dashboard])
    A20 --> A21([Listings by City])
    A20 --> A22([Property Types])
    A20 --> A23([CID Verification Status])
    A20 --> A24([User Role Distribution])

    A15 --> STOP(("◉"))
    A16 --> STOP
    A19 --> STOP
    A24 --> STOP
```

---

# DrukNest — System Architecture

```mermaid
flowchart TD

    USERS["👤 Guest   🧑 Tenant   🏠 Owner   ⚙️ Admin"]

    subgraph FE["🌐 Frontend — React 18 + TypeScript + Vite"]
        F1["Pages\nHome · Listings · Dashboards · AdminConsole"]
        F2["Auth Context · Toast Context · Role-Based Routing"]
        F3["Nav · Card · ChatModal · ConfirmDialog · Skeleton"]
    end

    subgraph SB["☁️ Supabase — Backend as a Service"]
        S1["🔐 Auth — JWT · Email + Password · DB Trigger"]
        S2["🗄️ PostgreSQL — 11 Tables · Row Level Security"]
        S3["📦 Storage — avatars · cid-docs · payment-proofs"]
        S4["⚡ Realtime — WebSocket · Notifications"]
    end

    subgraph CD["🚀 CI/CD — GitHub Actions → Docker Hub → Render"]
        C1["Security: TruffleHog · SonarQube · Trivy · OWASP ZAP"]
        C2["Build: Vite + Docker · Push: Docker Hub · Deploy: Render"]
    end

    USERS -->|"HTTPS"| FE
    FE -->|"REST API"| S2
    FE -->|"JWT"| S1
    FE -->|"File Upload"| S3
    FE -->|"WebSocket"| S4
    S1 -.->|"DB Trigger"| S2
    CD -->|"Deploys"| FE
```
