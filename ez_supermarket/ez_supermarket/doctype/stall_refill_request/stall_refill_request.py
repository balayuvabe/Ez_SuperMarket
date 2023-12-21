# Copyright (c) 2023, Balamurugan and contributors
# For license information, please see license.txt

import frappe
import json
from frappe.model.document import Document
from frappe import _

class StallRefillRequest(Document):
	pass

@frappe.whitelist()
def get_sales_data(posting_date, posting_time):
    # Fetch sales data from Sales Invoice
    sales_data = frappe.get_all(
        "Sales Invoice",
        filters={
            "posting_date": posting_date,
            "posting_time": posting_time
        },
        fields=["item_code", "qty", "total_amount"]  # Specify the fields you want to fetch
    )

    # Prepare data for Stall Request Details
    stall_request_details = []
    for sale in sales_data:
        # Fetch current available quantity (you may need to adjust this query based on your warehouse logic)
        current_qty = frappe.db.get_value(
            "Stock Ledger Entry",
            {
                "item_code": sale.item_code,
                "warehouse": "Your Warehouse",  # Replace with your warehouse
                "posting_date": posting_date,
                "posting_time": posting_time
            },
            "SUM(actual_qty)"
        ) or 0

        # Append data to stall_request_details list
        stall_request_details.append({
            "item_code": sale.item_code,
            "qty_sold": sale.qty,
            "current_qty": current_qty
        })

    return stall_request_details