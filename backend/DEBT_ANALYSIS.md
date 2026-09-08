## DEBT TRACKING SYSTEM ANALYSIS

### Current Problem:
Customer debt is calculated from TWO sources:
1. Unpaid sales (amountDue on sales)
2. Active loans (amountDue on loans)

But the system doesn't have a clear rule for when to create a SALE vs a LOAN.

### Questions to Answer:

1. **When should debt be tracked as a SALE?**
   - Answer: When a customer buys products and doesn't pay in full immediately

2. **When should debt be tracked as a LOAN?**
   - Answer: When you explicitly lend money to a customer (not related to a sale)

3. **Should SALES create LOANS automatically?**
   - Current: NO - Sales with unpaid amounts stay as sales
   - Problem: Customer debt = unpaid sales + loans, but loans page doesn't show unpaid sales

### The Real Issue:

Mohamed's situation:
- Made a sale for $1561, paid $1150, owes $411 (this is SALE debt, not LOAN debt)
- Also has a separate loan of $400 (paid $111, owes $289... wait, you said $350?)

The Loans page SHOULD only show explicit loans, NOT unpaid sales.
The Customers page shows TOTAL debt (sales + loans).

### Two Possible Solutions:

**Solution 1: Keep them separate (RECOMMENDED)**
- Unpaid sales = accounts receivable (shown in Customers page)
- Loans = explicit money lending (shown in Loans page)
- Customer debt = sum of both
- Loans page ONLY shows loans, not unpaid sales

**Solution 2: Convert unpaid sales to loans**
- When a sale is not paid in full, automatically create a loan for the unpaid amount
- All debt becomes loans
- More complex, might not match real business workflow

Which approach matches your business needs?
