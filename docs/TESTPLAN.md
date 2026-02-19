# Test Plan — School Accounting System (COBOL)

This test plan documents test cases for validating the current COBOL application's business logic. Use this with business stakeholders to confirm expected behavior before implementing automated unit and integration tests in the Node.js rewrite.

| Test Case ID | Test Case Description | Pre-conditions | Test Steps | Expected Result | Actual Result | Status (Pass/Fail) | Comments |
|---|---|---|---|---|---|---|---|
| TC-01 | View Balance (TOTAL) | Application started; initial balance = 1000.00 | 1. Start app
2. Select menu option `1` (View Balance) | Current balance is displayed as `1000.00` (two decimals) |  |  | System displays balance from `DataProgram` working-storage | 
| TC-02 | Credit Account (valid amount) | Application started; known balance (e.g., 1000.00) | 1. Start app
2. Select `2` (Credit)
3. Enter amount `50.00` | Balance increases by `50.00` and new balance `1050.00` is displayed and stored in memory |  |  | Ensure addition uses `PIC 9(6)V99` precision | 
| TC-03 | Debit Account (sufficient funds) | Application started; known balance (e.g., 1000.00) | 1. Start app
2. Select `3` (Debit)
3. Enter amount `100.00` | Balance decreases by `100.00` and new balance `900.00` is displayed and stored |  |  | Verifies subtraction and write-back to data layer | 
| TC-04 | Debit Account (insufficient funds) | Application started; known balance lower than requested debit (e.g., 50.00) | 1. Start app
2. Select `3` (Debit)
3. Enter amount `200.00` | Operation is rejected; display "Insufficient funds for this debit."; balance remains unchanged |  |  | Business rule: disallow overdraft | 
| TC-05 | Input validation — negative or non-numeric amount | Application started | 1. Start app
2. Select `2` (Credit) or `3` (Debit)
3. Enter `-50.00` or `abc` | Business expectation: input should be validated and rejected with an error; negative amounts not allowed. Current app: no explicit validation — results may be undefined. |  |  | Recommend adding validation in modernization | 
| TC-06 | Numeric limits (overflow) | Application started; balance near PIC max (e.g., 999900.00) | 1. Start app
2. Select `2` (Credit)
3. Enter amount large enough to exceed `PIC 9(6)V99` max (e.g., 200.00) | Expected: operation rejected or handled gracefully; no silent overflow. Current implementation: undefined behavior possible—test to confirm. |  |  | PIC limit is 999999.99 — enforce limits in new implementation | 
| TC-07 | Operation code formatting / padding | App compiled as-is | 1. From `MainProgram`, ensure calls use 6-char padded codes (e.g., `'TOTAL '`)
2. If possible, simulate an unpadded opcode to `Operations` | Expected: operation dispatch uses exact 6-character codes; missing padding may cause mismatched branch. Document that opcodes are fixed-width. |  |  | Recommendation: normalize/trim opcodes in modernization | 
| TC-08 | Persistence check (state lost after exit) | Start with default balance or set a new balance | 1. Start app
2. Credit `50.00`
3. Exit app
4. Restart app
5. Select `1` (View Balance) | Expected: Current app stores balance in-memory only; after restart balance returns to initial value (1000.00) — i.e., changes are not persisted. |  |  | Important for stakeholders: persistence is not implemented | 
| TC-09 | Menu navigation and invalid choice handling | App started | 1. Start app
2. Enter an invalid menu option (e.g., `9` or `x`) | Expected: Display "Invalid choice, please select 1-4." and loop back to the menu |  |  | Confirms menu input handling in `MainProgram` | 

---

How to use this test plan

- For each test case: execute steps, record the actual result and set the Status to Pass/Fail.
- Capture screenshots or console logs for stakeholder review where helpful.
- For tests that reveal undefined or undesirable behavior (e.g., TC-05, TC-06, TC-07), include recommendations in the Comments column and mark as Fail until fixed.

Next steps for Node.js test automation

- Translate these cases into unit tests for the Node.js business-logic module (operations) using a testing framework (e.g., Jest).
- Mock or stub the data layer to verify read/write calls separately from persistence.
- Add integration tests that run the full flow (menu → operations → data) using a harness or CLI test runner.
