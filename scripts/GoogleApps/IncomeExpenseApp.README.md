# Income & Expense mobile web app

This is the first vertical slice for issue #34. It adds a responsive Apps Script web page and server functions to:

- offer three record types: Income, General Expense, and Mileage;
- keep Mileage limited to date, Dropoff/Pickup, booking, and cost;
- derive RT mileage from the selected booking's `Bookings` row;
- search existing booking IDs and renter names;
- validate income, general expense, and booking-mileage entries;
- select the `HHRentals-YYYYIncomeExpenses` workbook from the entry date;
- insert a formatted row into `Income`, `Expenses`, or `Mileage`; and
- save an optional receipt image/PDF into a year-specific private Drive folder.

Receipt OCR is intentionally a follow-up slice. The current receipt flow stores the original file but does not extract fields from it.

## Install in Apps Script

1. Open the Apps Script project that contains `CamperRental2024`.
2. Replace or update the server-side `CamperRental2024` file with the repository version.
3. Add an Apps Script HTML file named `IncomeExpenseApp` and paste in `IncomeExpenseApp.html`.
4. Confirm the template and year-specific workbooks contain the required headers and the `{{insertRow}}` placeholder rows.
5. Deploy a new **Web app** deployment.
6. Prefer **Execute as: User accessing the web app** and restrict **Who has access** to the intended signed-in Google account(s) or domain. Do not enable anonymous access for financial records.
7. Open the deployment URL on the Samsung S24 in Chrome. Use Chrome's “Add to Home screen” action for app-like access.

Each user must have access to the workflow spreadsheets and Drive folder. The web app does not accept spreadsheet IDs or arbitrary sheet names from the browser; it derives the year and target sheet on the server.

## First-pass test checklist

- Save an income record with a valid booking ID and verify a new row in that year's `Income` tab.
- Save a general expense and verify a new row in `Expenses`.
- Save booking mileage and verify a new row in `Mileage` with the booking ID.
- Confirm the Mileage form only requires date, Dropoff/Pickup, booking, and cost; verify RT mileage is copied from that booking's `Bookings` row.
- Search by both booking ID and renter name.
- Upload a JPG or PDF receipt under 5 MB and verify it is stored in the private `Income Expense Receipts YYYY` Drive folder and linked when a Receipt column exists.
- Try an invalid date, zero amount, unknown booking ID, and oversized receipt; each should be rejected before a row is written.

## Next slices

1. Add an explicit “apply to this booking?” confirmation for optional expense associations.
2. Add Google Document AI/AppSheet receipt extraction with a review-before-save step.
3. Add account/tax-category configuration from sheet metadata instead of fixed form options.
4. Add automated Apps Script tests and a PWA manifest/service-worker strategy if offline use is required.
