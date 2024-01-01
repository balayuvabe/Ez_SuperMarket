# Copyright (c) 2023, Balamurugan and contributors
# For license information, please see license.txt


import frappe
from frappe import _
from frappe import get_doc
from frappe.model.document import Document
from frappe.utils import nowdate


class PurchaseReceipt(Document):
	pass

def create_serial_and_batch_bundle_entry(item, parent_doc):
    # Create Serial and Batch Bundle document
    serial_and_batch_bundle_doc = get_doc({
        "doctype": "Serial and Batch Bundle",
        "item_code": item.item_code,
        "type_of_transaction": "Inward",
        "posting_date": parent_doc.posting_date,
        "posting_time": parent_doc.posting_time,
        "voucher_type": "Purchase Receipt",
        "voucher_no": parent_doc.name,
        "warehouse": item.warehouse,
        "entries": [
            {
                "batch_no": item.custom_batch_number,
                "qty": item.qty,
                "warehouse": item.warehouse
            }
        ]
    })
    serial_and_batch_bundle_doc.insert()

    # Set the Serial and Batch Bundle document name in the child table (entries)
    item.serial_and_batch_bundle = serial_and_batch_bundle_doc.name

def create_serial_and_batch_bundle(parent_doc):
    if parent_doc.docstatus == 1:  # Check if the document is being submitted
        for item in parent_doc.items:
            create_serial_and_batch_bundle_entry(item, parent_doc)

@frappe.whitelist()
def before_submit(doc, method):
    create_serial_and_batch_bundle(doc)


def create_item_prices(doc):
    for item in doc.items:
        if not item.custom_batch_number:
            # Generate a unique batch ID using item code and current date
            batch_id = f"{item.item_code}-{nowdate()}"
        else:
            batch_id = item.custom_batch_number

        # Check if the item price already exists
        existing_item_price = frappe.get_all("Item Price", filters={"item_code": item.item_code, "price_list": doc.buying_price_list, "batch_no": batch_id}, fields=["name"])

        if not existing_item_price:
            # Create a new Item Price entry
            item_price = frappe.get_doc({
                "doctype": "Item Price",
                "item_code": item.item_code,
                "price_list": "Standard Selling",
                "selling": 1,
                "price_list_rate": item.custom_selling_price,
                "batch_no": batch_id
            })

            item_price.insert()

def on_submit(doc, method):
    create_item_prices(doc)