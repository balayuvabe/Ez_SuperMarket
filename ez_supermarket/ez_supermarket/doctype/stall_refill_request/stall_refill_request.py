# Copyright (c) 2023, Balamurugan and contributors
# For license information, please see license.txt

import frappe
import json
from frappe.model.document import Document
from frappe import _
from frappe.utils import nowdate, get_time, get_datetime

class StallRefillRequest(Document):
	pass

# @frappe.whitelist()
# def get_sales_data(posting_date, posting_time):
#     # Fetch sales data from Sales Invoice
#     sales_data = frappe.get_all(
#         "Sales Invoice",
#         filters={
#             "posting_date": posting_date,
#             "posting_time": posting_time
#         },
#         fields=["item_code", "qty", "total_amount"]  # Specify the fields you want to fetch
#     )

#     # Prepare data for Stall Request Details
#     stall_request_details = []
#     for sale in sales_data:
#         # Fetch current available quantity (you may need to adjust this query based on your warehouse logic)
#         current_qty = frappe.db.get_value(
#             "Stock Ledger Entry",
#             {
#                 "item_code": sale.item_code,
#                 "warehouse": "Your Warehouse",  # Replace with your warehouse
#                 "posting_date": posting_date,
#                 "posting_time": posting_time
#             },
#             "SUM(actual_qty)"
#         ) or 0

#         # Append data to stall_request_details list
#         stall_request_details.append({
#             "item_code": sale.item_code,
#             "qty_sold": sale.qty,
#             "current_qty": current_qty
#         })

#     return stall_request_details


# your_module/doctype/stall_request/stall_request.py

# @frappe.whitelist()
# def fetch_sales_invoices(posting_date, timestamp):
#     # Fetch sales invoices based on posting_date and timestamp
#     invoices = frappe.get_all(
#         'Sales Invoice',
#         filters={
#             'posting_date': posting_date,
#             'timestamp': ('<=', timestamp)
#         },
#         fields=['name', 'item_code', 'qty', 'total', 'location', 'warehouse']
#     )

#     # Prepare a list of dictionaries with required data
#     invoice_list = []
#     for invoice in invoices:
#         invoice_dict = {
#             'item_code': invoice.item_code,
#             'qty_sold': invoice.qty,
#             'total': invoice.total,
#             'location': invoice.location,
#             'warehouse': invoice.warehouse
#         }
#         invoice_list.append(invoice_dict)

#     return invoice_list

@frappe.whitelist()
def update_stall_request(docname):

    # Load the document
    doc = frappe.get_doc('Stall Refill Request', docname)

    # Set up posting date and time in the timestamp field
    timestamp = frappe.utils.now_datetime()
    doc.timestamp = timestamp

    # Get today's date
    date = nowdate()

    # Fetch all the sales invoices for today until the timestamp
    invoices = frappe.get_all('Sales Invoice', filters={'posting_date': ['>=', date], 'posting_date': ['<=', get_datetime(timestamp)]}, fields=['name', 'item_code', 'qty'])

    # Iterate over the fetched invoices and add them to the child table
    for invoice in invoices:
        doc.append('stall_request_details', {
            'item_code': invoice.item_code,
            'qty_sold': invoice.qty
        })

    # Don't save the document here. You can save it manually after the updates are made.
