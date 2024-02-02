# Copyright (c) 2023, Balamurugan and contributors
# For license information, please see license.txt


import frappe
from frappe import _
from frappe import get_doc
from frappe.model.document import Document
from frappe.utils import nowdate
import json
from datetime import datetime

class PurchaseReceipt(Document):
	pass

@frappe.whitelist()
def update_item_lead_time(items, pr_date):
  date_format = '%Y-%m-%d'
  pr_date = datetime.strptime(pr_date, date_format).date()
  items = json.loads(items)

  items = list(filter(lambda x: x.get("purchase_order"), items))

  updated_lead_time_days = []
  for item in items:
    po_date = frappe.db.get_value("Purchase Order", item["purchase_order"], "transaction_date")
    lead_time_days = (pr_date - po_date).days
    
    if lead_time_days > 0:
      frappe.db.set_value('Item', item["item_code"], 'lead_time_days', lead_time_days)
      msg = f'Updated Item Code {item["item_code"]} Lead Time Days {lead_time_days}d'
      updated_lead_time_days.append(msg)

  return updated_lead_time_days 

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
  return
  if doc.doctype == "Purchase Receipt" and doc.docstatus == 1:
    # Get all items 
    items = doc.items
    
    for item in items:
      # Get custom_expiry_date for this item
      expiry_date = item.custom_expiry_date
      
      # Find batches for this item
      batches = frappe.get_list("Batch", {"item": item.item_code, "reference_name": doc.name})
      
      for batch in batches:
        # Update expiry date
        frappe.db.set_value("Batch", batch.name, "expiry_date", expiry_date)

def on_submit(doc, method):
    update_batch_expiry_after_submit(doc, method)
    update_item_prices(doc, method)
 

