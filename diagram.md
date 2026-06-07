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
