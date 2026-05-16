# Mechanics

- Add mechanic with percent-of-item pay structure and verify appears in list
- Add mechanic with monthly salary pay structure
- Add mechanic with fixed-per-item pay structure
- Cannot submit add mechanic form without name
- Cannot submit add mechanic form without phone number
- Cancel mechanic modal without submitting does not save
- Mechanic detail page shows attendance and payout info

# Analytics & Revenue Model

- Analytics P&L page loads with date pickers
- Applying current month date range shows P&L data
- P&L shows revenue, gross margin, and job cost rows
- Package performance section appears when packages have been applied to SRs
- Aftermarket parts analysis section appears when aftermarket parts are recorded
- Invalid date range shows validation error

# Service Packages in Settings

- Settings Packages tab is visible
- New Service Package modal opens from Packages tab
- Can create a package with name, price, and duration (minutes)
- Created package appears in active packages list with correct duration badge
- Package sub-items (with MRP) can be added inside the modal
- MRP summary strip updates as items are added
- Customer Saves line appears when MRP total exceeds package price
- Inactive packages are shown in collapsible section
- Can deactivate an active package

# SR Creation with Inventory & Packages

- New SR wizard shows customer selection in step 1
- Service categories are collapsible in step 2
- Selected service count badge shows on a collapsed category
- Inventory section always shows after load (not hidden when empty)
- Can select an inventory item from dropdown and add to SR
- Adding an inventory item deducts from stock
- Can select a service package in SR creation
- Package price is included in the bottom total bar
- Review step shows all selected services, packages, and inventory parts with totals

# Invoice with Package Display

- Invoice list page loads with status filter
- Opening an invoice detail page shows line items
- Invoice with package shows green Package badge on the line item
- Package sub-items appear indented under the package row
- MRP price shows with strikethrough next to actual price
- Customer Saves ₹X savings nudge is visible for package items
- Invoice total, subtotal, tax, and discount rows are correct
- Mark as Paid button visible on unpaid invoice
- Retrigger send button available on sent invoices
