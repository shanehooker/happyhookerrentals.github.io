# Feature: create new worksheet for future years

## Summary

Update the CamperRental2024 Google Apps Script so future rental years can be provisioned automatically from the clean `HHRentals-TemplateIncomeExpenses` workbook.

The workflow should continue using an existing yearly workbook when available. When a booking's start year does not have a workbook, the script should create one from the template, name it using the canonical format `HHRentals-YYYYIncomeExpenses`, create the matching quote-storage year folder when needed, synchronize metadata, and install the required spreadsheet triggers.

## Required Changes

### Google Apps Script

1. Add a metadata pointer for the workbook template, preferably under `googleAssets`, for example:

   ```json
   "workflowSpreadsheetTemplate": {
     "name": "HHRentals-TemplateIncomeExpenses",
     "id": "<template-file-id>"
   }
   ```

2. Update workflow-folder resolution to use `googleAssets.topLevelFolder` explicitly. The yearly workflow spreadsheets should be stored in that folder.

3. Modify `getWorkflowSpreadsheetForYear_()`:

   - Search for existing yearly workbooks first.
   - Use the canonical name `HHRentals-YYYYIncomeExpenses` for newly created workbooks.
   - If the workbook is missing, locate the configured template workbook.
   - Copy the template into the configured top-level folder.
   - Rename the copy to `HHRentals-YYYYIncomeExpenses`.
   - Open the new workbook using its generated file ID.
   - Synchronize the metadata tab and metadata-backed formulas.
   - Initialize the `nextBookingId` named range using the established booking-ID convention for that year.
   - Install the spreadsheet edit/open triggers before returning the workbook.

4. Wrap workbook provisioning in `LockService` and recheck for the target workbook after acquiring the lock so concurrent quote requests cannot create duplicates.

5. Preserve recognition of existing legacy filename variants for backward compatibility, but use only `HHRentals-YYYYIncomeExpenses` for new files.

6. Create the quote-storage year folder automatically when it does not exist. The folder should be named with the four-digit booking year and created beneath the configured `quoteFolder`.

7. Keep the existing validation and error handling for missing folders, templates, required tabs, and malformed metadata. Errors should identify the year, expected file/folder, and metadata path involved.

8. Ensure `setupOnEditTrigger()` continues to discover newly provisioned yearly workbooks. The canonical filename already matches the workflow workbook pattern, but the search should include the configured top-level folder explicitly.

### Workbook Template

The template must remain structurally complete and should be cleaned without deleting required sentinel rows or formulas.

Preserve these placeholders:

- `Bookings!{{nextRenter}}`
- `Waiting to Book!{{nextQuote}}`
- `Income!{{insertRow}}`
- `Expenses!{{insertRow}}`
- `Mileage!{{insertRow}}`

Preserve the `NH M&R Tax` headers, monthly rows, and formulas. Clear transaction values rather than deleting structural rows.

Reset or review the following template values:

- `data!B1` / `nextBookingId`
- Sample renter, location, camper, dates, and overrides on `Quote`
- Default values on the `Bookings` placeholder row
- Historical values and year labels on `Summary`
- Year-specific descriptions such as the IRS mileage-rate text
- Loan, storage, and other annual assumptions that should not be copied blindly into every future year

Keep the EIA API key and gas-price formulas private in the workbook if they are still required. They must not be added to public `metadata.json`.

### Metadata Synchronization

Use the existing metadata synchronization path when creating a yearly workbook:

```javascript
syncMetadataToSheet_(newSpreadsheet, getMetadata_(true));
```

This should rebuild the `metadata` tab, refresh named ranges, update camper/rate/fee/add-on tables, repair metadata-backed formulas, and reapply Quote-sheet validations.

The provisioning process should fail clearly if the metadata file is unavailable or fails validation.

## Acceptance Criteria

- A booking for a year with an existing `HHRentals-YYYYIncomeExpenses` workbook uses that workbook unchanged.
- A booking for a year without a workbook automatically creates exactly one `HHRentals-YYYYIncomeExpenses` workbook from the template.
- The new workbook is placed in the configured top-level folder.
- A missing quote-storage folder is automatically created beneath the configured quote folder using the four-digit year as its name.
- The new workbook contains all required tabs, formulas, named ranges, dropdowns, placeholders, and metadata-backed calculations.
- The new workbook receives the installable edit and open triggers.
- `nextBookingId` is initialized correctly for the new year.
- Repeated or concurrent attempts do not create duplicate yearly workbooks or duplicate year folders.
- Existing 2026 workflows and legacy workbook names continue to work.
- Creating a quote in the newly provisioned year completes the normal quote, calendar, document, and waiting-list workflow.

## Testing Plan

1. Use a test year with no existing yearly workbook and no quote year folder.
2. Create a quote whose start date is in that year.
3. Verify the workbook and year folder are created in the expected Drive locations.
4. Verify the workbook title is exactly `HHRentals-YYYYIncomeExpenses`.
5. Verify the `metadata` tab, named ranges, dropdowns, and formulas.
6. Verify the new workbook has the required installable triggers.
7. Verify the booking ID sequence and quote insertion placeholders.
8. Repeat the test and confirm the existing workbook is reused rather than copied again.
9. Confirm the existing 2026 workbook remains unchanged.

## Codex Implementation Prompt

Implement the feature described in this issue in `scripts/GoogleApps/CamperRental2024`.

Use `HHRentals-TemplateIncomeExpenses` as the source for missing future-year workflow workbooks. New workbooks must use the exact canonical name `HHRentals-YYYYIncomeExpenses` and be stored in the metadata-configured `topLevelFolder`. When the booking year does not have a quote-storage folder beneath `quoteFolder`, create that folder automatically using the four-digit year.

Preserve existing filename aliases for already-created workbooks. Add concurrency protection with `LockService`, recheck for duplicates after acquiring the lock, synchronize the copied workbook with `syncMetadataToSheet_(newSpreadsheet, getMetadata_(true))`, initialize `nextBookingId`, and call `ensureSpreadsheetTriggers_()` for the new workbook. Do not delete required placeholders, formulas, named ranges, validations, or workbook tabs. Add or update focused tests or a safe manual verification function if the Apps Script environment does not support automated tests. Report the exact files changed and the verification performed.
