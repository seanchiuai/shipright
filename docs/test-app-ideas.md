# Test App Ideas for Shipright

Three app ideas designed to exercise different parts of the Shipright pipeline (interview extraction, template matching, integration research, scaffolding injection).

---

## 1. PetSitter — On-Demand Pet Sitting Marketplace

**Persona:** Non-technical founder who loves animals and wants to connect pet owners with local sitters.

**Core Features:**
- User auth (pet owners + sitters, two roles)
- Profile pages with photos, bio, availability
- Search/filter sitters by location, animal type, price
- Booking system with date picking and confirmation
- Stripe payments (owner pays sitter through platform)
- Review/rating system after each booking
- Email notifications (booking confirmed, reminder, review prompt)

**Why this tests Shipright well:**
- Two-sided marketplace = complex data model (users, bookings, reviews, payments)
- Stripe integration research + scaffolding
- Email/notification integration (SendGrid or Resend)
- Location-based search (potential geolocation integration)
- Multiple user roles = auth complexity

---

## 2. HabitStack — Daily Habit Tracker with Social Accountability

**Persona:** Non-technical founder who wants a simple, beautiful habit tracker where friends keep each other accountable.

**Core Features:**
- User auth (single role)
- Create/edit/delete habits with custom frequency (daily, weekly, MWF, etc.)
- Daily check-in screen with streak tracking
- Dashboard with charts showing completion rates over time
- Friend system — add friends, see their streaks
- Push notifications / reminders
- Weekly summary email

**Why this tests Shipright well:**
- Simpler data model than #1 — tests that Shipright doesn't over-engineer
- Heavy frontend (charts, animations, streak visuals) — tests UI scaffolding
- Cron/scheduled jobs for reminders and weekly emails
- Social features without payments — different integration mix
- Mobile-first design considerations

---

## 3. InvoiceBot — AI Invoice Generator for Freelancers

**Persona:** Non-technical freelance designer who hates writing invoices and wants AI to generate them from project descriptions.

**Core Features:**
- User auth (single role)
- AI-powered invoice generation: describe work done, AI creates line items + pricing
- PDF export of invoices
- Client management (name, email, payment terms)
- Send invoice via email directly from app
- Dashboard showing paid/unpaid/overdue invoices
- Stripe integration for "Pay Now" links on invoices

**Why this tests Shipright well:**
- AI/LLM integration for invoice generation — tests how Shipright handles AI-in-app
- PDF generation integration (research step)
- Stripe for payment links (different use case than marketplace payments)
- Email sending with rich HTML templates
- Simpler auth but complex integrations — tests integration research depth

---

## Coverage Matrix

| Capability | PetSitter | HabitStack | InvoiceBot |
|---|---|---|---|
| Multi-role auth | Y | | |
| Payments (Stripe) | Y | | Y |
| Email integration | Y | Y | Y |
| Charts/data viz | | Y | Y |
| AI/LLM in-app | | | Y |
| PDF generation | | | Y |
| Social features | | Y | |
| Search/filtering | Y | | |
| Scheduling/cron | Y | Y | |
| Complex data model | Y | | |
| Simple data model | | Y | Y |
