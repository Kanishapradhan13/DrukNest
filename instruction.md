# DrukNest — MVP Live Demonstration Script

---

## Before You Start — Pre-Demo Setup Checklist

Do these **before** you hit record. This prevents awkward waits during the demo.

- [ ] Have **3 browser profiles** (or 3 incognito tabs) ready — one logged in as each role
- [ ] **Admin account** — already signed in at the Admin Console
- [ ] **Owner account** — already signed in, has at least one listing submitted (status = pending)
- [ ] **Tenant account** — already signed in, has sent an inquiry to the owner's listing
- [ ] Clear your browser zoom to 100% so everything is readable on screen
- [ ] Close all unrelated tabs
- [ ] Make sure your Render deployment is live and working
- [ ] Turn off notifications on your PC

---

## Introduction (Say This First)

> "Welcome to DrukNest — a digital rental platform built specifically for Bhutan.
> DrukNest solves a real problem: finding and managing rentals in cities like Thimphu and Paro
> is still done through word of mouth and paper contracts. DrukNest brings this process online
> with verified listings, digital leases, and an integrated payment tracking system.
>
> The platform has **four roles**:
> - **Guest** — anyone who visits the site without an account. They can browse listings but cannot interact.
> - **Tenant** — a registered renter who can send inquiries, sign leases, pay rent, and find roommates.
> - **Owner** — a property owner who lists properties, manages tenants, creates leases, and confirms payments.
> - **Admin** — the platform moderator who approves listings, verifies identity documents, manages users, and monitors the platform through analytics.
>
> Let me walk you through each role now."

---

## PART 1 — Guest Experience (1–2 minutes)

**Open the live site as a logged-out user.**

### Step 1 — Home Page
- Open the DrukNest URL in a fresh browser tab (not logged in)
- Point out the **hero section** — search bar with City, Type, and Duration filters
- Show the **featured listings** below the hero
- Scroll down and show the **Cities section** — click a city pill to demonstrate filtering
- Scroll further to show the **Trust section** and **Host CTA**

> "This is what any visitor sees — no account needed to browse. The home page shows featured listings and lets users search by city."

### Step 2 — Browse Listings
- Click **Listings** in the nav
- Use the **filter sidebar** — select a city (e.g. Thimphu), choose a property type
- Show listings updating in the grid
- Click a listing card to open the detail page

### Step 3 — Listing Detail
- Show the **photo gallery** — click thumbnails to switch images
- Scroll down to show **amenities**, **description**, **location**, **host profile**
- Click **"Send Inquiry"** — it redirects to Sign In

> "Guests can browse everything but the moment they try to interact — send an inquiry, save a listing — they are redirected to sign in. Let me now show the Tenant experience."

---

## PART 2 — Tenant Experience (3–4 minutes)

**Switch to your Tenant browser tab (already logged in).**

### Step 4 — Tenant Sign Up Flow (explain, don't re-do if already logged in)
- Navigate to Sign In page and briefly show the **Create Account form**
- Point out the **role selector** — Tenant vs Owner
- Point out **Step 1** (personal details) and **Step 2** (CID document upload)

> "Registration is a two-step process. Tenants fill in their details and optionally upload their CID document for verification. The document goes to the Admin queue — we'll see that in a moment."

### Step 5 — Browse and Save
- As the logged-in Tenant, go to **Listings**
- Open a listing detail page
- Click the **heart / Save** button — show it turning saved
- Navigate to **Dashboard → Wishlist tab** to show the saved listing

> "Tenants can save listings to their wishlist for easy access later."

### Step 6 — Send Inquiry
- Go back to a listing detail page
- Click **"Send Inquiry"**
- Type a short message and submit
- Show the success state

> "The tenant sends an inquiry with a message to the owner. The owner gets a real-time notification — which we'll see when we switch to the Owner role."

### Step 7 — CID Verification
- Go to **Dashboard → Profile tab** (or Verify ID in nav)
- Show the **CID upload section** — upload a test document
- Show the status changes to **"Pending Review"**

> "Tenants upload their CID for identity verification. The admin reviews and approves or rejects it. This keeps the platform trusted."

### Step 8 — Roommate Finder
- Click **Roommates** in the nav
- Show the **filter sidebar** — city, budget slider, occupation, gender preference
- Show existing roommate cards
- Click **"+ Post My Profile"** — fill in the form and post
- Show your profile appearing in the banner

> "The Roommate Finder lets tenants find people to share rent with. You post your profile, others send connection requests, and you accept or decline."

---

## PART 3 — Owner Experience (3–4 minutes)

**Switch to your Owner browser tab.**

### Step 9 — Owner Dashboard Overview
- Show the **Owner Dashboard** with tabs: Listings, Inquiries, Leases, Payments, Chats
- Point out the **bank details warning banner** if bank is not set

### Step 10 — Add a New Listing
- Click **Add Property** in the nav
- Fill in the listing form — title, city, type, price, beds, baths, amenities
- Upload a photo
- Click **Submit**

> "The owner fills in property details and submits. The listing goes to the Admin approval queue — it won't appear to tenants until Admin approves it."

### Step 11 — Manage Inquiries
- Go to **Dashboard → Inquiries tab**
- Show the pending inquiry from the Tenant (sent in Step 6)
- Click **Accept**
- Show the confirmation dialog — confirm
- Show the notification sent to the tenant

> "When an owner accepts an inquiry, a chat thread opens and the tenant gets a real-time notification on their bell icon."

### Step 12 — Create a Lease
- Go to **Dashboard → Leases tab**
- Click **Create Lease** on the accepted inquiry
- Fill in start date, end date, monthly rent, deposit
- Submit

> "The owner creates a formal digital lease. The system automatically generates a monthly payment schedule — one row per month for the entire lease duration. No manual entry needed."

### Step 13 — Confirm a Payment
- Go to **Dashboard → Payments tab**
- Show the payment schedule — all months listed with status
- Show a payment with status **"Pending Confirmation"** (from tenant's proof upload)
- Click **Confirm Payment**
- Show it turning to **"Paid"** with a timestamp

> "When the tenant uploads their bank transfer proof, the owner reviews it and confirms. The tenant gets notified immediately."

---

## PART 4 — Admin Experience (2–3 minutes)

**Switch to your Admin browser tab.**

### Step 14 — Admin Console Overview
- Show the **Admin Console** with tabs: Queue, Users, CID, Analytics, Reports

### Step 15 — Approve a Listing
- Go to **Queue tab**
- Show the pending listing submitted by the Owner (Step 10)
- Click **Approve**
- Show the confirmation dialog — confirm
- Show it disappearing from the queue

> "Admin reviews every listing before it goes live. This prevents fake or misleading listings from appearing on the platform."

### Step 16 — Verify a CID
- Go to **CID tab**
- Show the pending CID document uploaded by the Tenant (Step 7)
- Click **Verify**
- Show the tenant's CID status updating to Verified

> "Admin verifies identity documents. Once verified, the tenant gets a verified badge and the owner can trust they are dealing with a real person."

### Step 17 — User Management
- Go to **Users tab**
- Show the list of all users with their roles and status
- Show the **Suspend** button on a user (do not actually suspend a real account — just point to it)

> "Admin can suspend any user who violates platform rules. Suspended users cannot log in."

### Step 18 — Analytics Dashboard
- Go to **Analytics tab**
- Show all four bar charts:
  - Listings by City
  - Property Types
  - CID Verification Status
  - User Role Distribution

> "The analytics tab gives the admin a live overview of the platform — which cities have the most listings, what types of properties are most common, and how many users are verified."

---

## PART 5 — Real-Time Notifications (1 minute)

**Show both Tenant and Owner tabs side by side (or switch quickly between them).**

### Step 19 — Live Notification Bell
- On the **Tenant tab** — point to the notification bell in the nav
- Show the unread count badge
- Click the bell to open the notification dropdown
- Show notifications: inquiry accepted, payment confirmed, CID verified

> "Every action triggers a real-time notification delivered via Supabase WebSocket. The bell updates instantly without refreshing the page — no polling, no delays."

---

## PART 6 — Closing Summary (30 seconds)

> "That completes the full demonstration of DrukNest.
>
> We showed all four roles working end-to-end:
> - A **Guest** browsing listings and being guided to sign up
> - A **Tenant** sending inquiries, tracking payments, verifying identity, and finding roommates
> - An **Owner** listing property, managing tenants, creating leases, and confirming payments
> - An **Admin** approving listings, verifying documents, managing users, and monitoring analytics
>
> The entire rental lifecycle — from listing discovery to monthly payment tracking — is handled in one platform, built for Bhutan."

---

## Role Switching Quick Reference

| Role | How to access |
|---|---|
| Guest | Open any incognito tab — not logged in |
| Tenant | Browser profile / tab logged in as tenant account |
| Owner | Browser profile / tab logged in as owner account |
| Admin | Browser profile / tab logged in as admin account |

---

## If Something Goes Wrong During Demo

| Problem | Quick fix |
|---|---|
| Page not loading | Refresh — Render free tier may have spun down |
| Notification not appearing | Manually refresh the page — realtime needs active connection |
| Listing not showing after approval | Hard refresh `Ctrl + Shift + R` |
| Login failing | Use pre-logged-in tabs — don't log in live |
| Image not uploading | Have a small JPG ready under 1 MB |
