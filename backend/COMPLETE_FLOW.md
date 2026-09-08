## COMPLETE DEBT FLOW ANALYSIS

### When a SALE is created with unpaid amount:
✅ Customer debt is incremented by amountDue
✅ Sale tracks amountDue
Result: Customer debt includes unpaid sales

### When a LOAN is created:
✅ Customer debt is incremented by loan principal (in loan creation)
✅ Loan tracks amountDue
Result: Customer debt includes active loans

### When payment is made on CUSTOMERS page:
✅ Allocates to unpaid sales first
✅ Then allocates to active loans
✅ Decrements customer debt by payment amount
Result: Customer debt, sales, and loans all decrease

### When payment is made on SALES page:
Need to check: Does it decrement customer debt?

### When payment is made on LOANS page:
✅ Decrements customer debt by payment amount
✅ Decrements loan amountDue

### THE PROBLEM:
Customer debt = unpaid sales + active loans
But if you look at LOANS page, you only see loans (not unpaid sales)
This is BY DESIGN - they are separate concepts.

### THE QUESTION:
What do you want the Loans page to show?
A) Only explicit loans (current behavior)
B) All customer debt including unpaid sales (would require redesign)

Please clarify what you expect to see on the Loans page.
