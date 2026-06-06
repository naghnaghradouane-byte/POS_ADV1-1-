# Security Specification for POS ERP Application

## Data Invariants
1. A category id referenced in a product must exist, or the ID must adhere to strict validation format.
2. Orders total must equal subtotal - discountAmount + taxAmount.
3. Expense amount must be greater than zero.
4. Product selling price must be greater than or equal to cost price (conceptually) or validated positive numbers.
5. Path variable IDs must be validated string types to prevent path poisoning or "Denial of Wallet" resource exhaustion.

## The Dirty Dozen Payloads (Vulnerability Vector Examples)
Below are 12 specific JSON payloads designed to violate Identity, Integrity, and State boundaries, returning `PERMISSION_DENIED` under our security guards:

1. **Anonymous Identity Evader**: Attempting to write a product without a signed-in account.
2. **Identity Spoofing**: Attempting to create a customer with someone else's credentials.
3. **Ghost Fields Injection**: Sending a product update payload containing a ghost/shadow field `isVerifiedBySystem: true`.
4. **Denial of Wallet String Poisoning**: Creating a product with a 1MB string value under `minStockAlert`.
5. **Path Poisoning**: Target update request on an ID string structured like `../../../dangerous/path`.
6. **Negative Value Exploiter**: Setting stock quantity to negative numbers (`-250`) on manual update.
7. **Bypassing Verification**: Creating a movement log while signed-in but with an unverified email address (`email_verified == false`).
8. **Privilege Escalation**: Attempting to override the system settings document without proper ownership or schema compatibility.
9. **Zero-Amount Operational Theft**: Log an expense with negative amount `-5000` to artificially inject fake ledger profits.
10. **State Shortcutting**: Manually updating an invoice from `completed` to `returned` without appropriate refund triggers or metadata matching.
11. **Orphaned Inventory Movement**: Creating a movement record with a non-existent or malformed `productId`.
12. **Double Refund Exploitation**: Triggering multiple updates to an order's status after it has already reached terminal status (`refunded`).

## Test Specifications
All write and read operations are verified to ensure that unauthenticated users are denied complete access, unverified accounts cannot carry out alterations to critical tables, and schemas are strictly obeyed during creations and updates.
