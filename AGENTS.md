# Persistent System Rules and Security Guidelines

This document contains the core rules and security guidelines for the SaaS application. These rules must be strictly followed and preserved across all system updates.

## 1. Subscription & Plans (Stripe)
- **Default Registration Plan**: The Monthly Plan (R$ 170.00) with a 30-day free trial is the only option shown for new sign-ups.
- **Stripe Price IDs**:
  - Monthly: `price_1TGOtqD8oc9026ObuG9Ygacx` (R$ 170,00/mês)
  - Annual: `price_1TK3DiD8oc9026ObOteFiRht` (R$ 1.428,00/ano)
- **Upgrade Path**: The Annual Plan is only visible as an upgrade option in the Settings tab for users who are already on the Monthly Plan or within their 30-day trial period.
- **Payment Blocker**: If a user exits the Stripe checkout without subscribing, they must be redirected to a block page. This page must only offer the Monthly Plan (R$ 170.00) with the 30-day trial.
- **Account Activation**: Accounts are created as 'Inactive' by default. They only become 'Active' once Stripe confirms the subscription via webhook.
- **Suspension Logic**: If an account is 'Suspended' or 'Inactive', the user is blocked from interacting with the system. A lock icon must appear on tabs, and no data modifications (POST/PUT/DELETE) should be persisted to the database.

## 2. Registration Screen (RegisterScreen.tsx)
- **Email Validation**:
  - Must be a valid email format.
  - Must include a "Confirm Email" field to prevent typos.
- **Tenant ID (Company ID)**:
  - Must be exactly 8 digits.
  - Must be unique across the entire system (checked against the database).
- **Password Requirements**:
  - Minimum 8 characters.
  - Must include at least one special character (e.g., `#` or `@`).
  - A descriptive hint must be shown to the user.
- **Additional Fields**:
  - **WhatsApp**: A required field for the company's WhatsApp number, located below the Company Name.
  - **Admin Username**: A clear reminder message must be shown so the user doesn't forget their access username.
- **Browser Integration**: The registration form must be structured to trigger the browser's "Save Password" prompt for the username, password, and Tenant ID.

## 3. Security & Data Integrity
- The `checkTenantActive` middleware must be strictly applied to all data-modifying routes.
- Any attempt to bypass the subscription flow must result in a persistent block until payment is confirmed.

## 4. TV Panel (PainelTVTab.tsx)
- **Automatic Removal**: Orders displayed on the TV Panel (Retirada de Pedidos) must be automatically removed 1 hour after they are marked as 'Concluido'. This ensures the screen stays clean and only shows recent orders.
