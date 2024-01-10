# Copyright (c) 2024, Balamurugan and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class PurchaseMaster(Document):
	pass

# Server script to be executed on selecting a supplier in Purchase Master
def validate(doc, method):
    # Check if a supplier is selected
    if doc.supplier:
        # Fetch preferred billing address
        billing_address = get_preferred_billing_address(doc.supplier)

        # Set supplier_address_detail field
        doc.supplier_address_detail = billing_address

# Function to get preferred billing address for a supplier
def get_preferred_billing_address(supplier):
    # Fetch addresses for the given supplier with preferred billing checkbox checked
    addresses = frappe.get_all("Address", filters={"supplier": supplier, "is_billing_address": 1}, fields=["address_line1", "address_line2", "city", "state", "pincode", "country"], limit=1)

    # Format the full address
    full_address = ", ".join(filter(None, [addresses.get("address_line1"), addresses.get("address_line2"), addresses.get("city"), addresses.get("state"), addresses.get("pincode"), addresses.get("country")]))

    return full_address


# In your server-side Python script
@frappe.whitelist()
def get_preferred_billing_address(supplier):
    # Fetch addresses for the given supplier with preferred billing checkbox checked
    addresses = frappe.get_all("Address", filters={"supplier": supplier, "is_primary_billing": 1}, fields=["address_line1", "address_line2", "city", "state", "pincode", "country"], limit=1)

    # Format the full address
    full_address = ", ".join(filter(None, [addresses.get("address_line1"), addresses.get("address_line2"), addresses.get("city"), addresses.get("state"), addresses.get("pincode"), addresses.get("country")]))

    return full_address
