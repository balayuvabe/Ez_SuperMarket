# Copyright (c) 2023, Balamurugan and contributors
# For license information, please see license.txt


import frappe
from frappe import _
from frappe import get_doc
from frappe.model.document import Document
from frappe.utils import nowdate


class PurchaseReceipt(Document):
	pass

# def create_serial_and_batch_bundle_entry(item, parent_doc):
#     # Create Serial and Batch Bundle document
#     serial_and_batch_bundle_doc = get_doc({
#         "doctype": "Serial and Batch Bundle",
#         "item_code": item.item_code,
#         "type_of_transaction": "Inward",
#         "posting_date": parent_doc.posting_date,
#         "posting_time": parent_doc.posting_time,
#         "voucher_type": "Purchase Receipt",
#         "voucher_no": parent_doc.name,
#         "warehouse": item.warehouse,
#         "entries": [
#             {
#                 "batch_no": item.custom_batch_number,
#                 "qty": item.qty,
#                 "warehouse": item.warehouse
#             }
#         ]
#     })
#     serial_and_batch_bundle_doc.insert()

#     # Set the Serial and Batch Bundle document name in the child table (entries)
#     item.serial_and_batch_bundle = serial_and_batch_bundle_doc.name

# def create_serial_and_batch_bundle(parent_doc):
#     if parent_doc.docstatus == 1:  # Check if the document is being submitted
#         for item in parent_doc.items:
#             create_serial_and_batch_bundle_entry(item, parent_doc)

# @frappe.whitelist()
# def before_submit(doc, method):
#     create_serial_and_batch_bundle(doc)

def update_item_prices(doc, method):
    for item in doc.items:
        # Get the batch_id from Batch with reference to Purchase Receipt and name
        batch_id = frappe.get_value("Batch", {"reference_doctype": doc.doctype, "reference_name": doc.name}, "batch_id")

        # If batch_id is not empty, proceed to create a new Item Price
        if batch_id:
            # Create a new Item Price entry
            new_item_price = frappe.get_doc({
                "doctype": "Item Price",
                "item_code": item.item_code,
                "price_list": "Standard Selling",  # Use the selling price list
                "price_list_rate": item.custom_selling_price,  # You may adjust this based on your requirements
                "batch_no": batch_id
            })

            new_item_price.insert()

def update_batch_expiry_after_submit(doc, method):
    if doc.doctype == "Purchase Receipt" and doc.docstatus == 1:
        # Find the batches created by this Purchase Receipt
        batches = frappe.get_list("Batch", filters={"reference_doctype": "Purchase Receipt", "reference_name": doc.name})
        
        for batch in batches:
            # Get the custom_expiry_date from the Purchase Receipt
            expiry_date = frappe.get_value("Purchase Receipt Item", {"parent": doc.name}, "custom_expiry_date")

            # Update Batch Expiry Date
            frappe.db.set_value("Batch", batch.name, "expiry_date", expiry_date)

def on_submit(doc, method):
    update_batch_expiry_after_submit(doc, method)
    update_item_prices(doc, method)
    

