# Copyright (c) 2023, Balamurugan and contributors
# For license information, please see license.txt

import frappe
import json
from frappe.model.document import Document
from frappe import _
from frappe.utils import nowdate, get_time, get_datetime, today

class StallRefillRequest(Document):
	pass

@frappe.whitelist()
def set_timestamps(doc_str):
    # Convert doc string to dict
    doc = frappe.parse_json(doc_str)

    now = frappe.utils.now_datetime()

    existing_doc = frappe.get_value(
        "Stall Refill Request",
        {
            "posting_date": doc.posting_date,
            "docstatus": 1,
        },
        ["name", "timestamp"],
        as_dict=True
    )

    if existing_doc:
        # Create a new document with updated timestamps
        updated_doc = frappe.get_doc({
            "doctype": "Stall Refill Request",
            "name": existing_doc.name,
            "timestamp": now,
            "last_fetch_timestamp": existing_doc.timestamp
        })

        return updated_doc
    else:
        doc = frappe.get_doc(doc)
        doc.timestamp = now
        doc.last_fetch_timestamp = f"{doc.posting_date} 00:00:00"

        return doc


@frappe.whitelist()
def fetch_items_sold(posting_date, timestamp, last_fetch_ts=None):
    data = []  # Define as list

    if last_fetch_ts:
        invoices = frappe.db.sql("""
          SELECT 
            sii.item_code, sii.qty
          FROM `tabSales Invoice Item` sii
          INNER JOIN `tabSales Invoice` si ON sii.parent = si.name
          WHERE
            si.posting_date = %s
            AND si.docstatus = 1
            AND si.posting_time BETWEEN %s AND %s
        """, (posting_date, last_fetch_ts, timestamp), as_dict=1)
    else:
        start_time = posting_date + " 00:00:00"
        invoices = frappe.db.sql("""
          SELECT 
            sii.item_code, sii.qty  
          FROM `tabSales Invoice Item` sii
          INNER JOIN `tabSales Invoice` si ON sii.parent = si.name
          WHERE
            si.posting_date = %s
            AND si.docstatus = 1
            AND si.posting_time BETWEEN %s AND %s
        """, (posting_date, start_time, timestamp), as_dict=1)

    items_sold = {}

    for d in invoices:
        item_code = d.item_code
        if item_code not in items_sold:
            items_sold[item_code] = {"qty": 0}
        items_sold[item_code]["qty"] += d.qty

    for item_code, item_data in items_sold.items():
        item = frappe.get_doc("Item", item_code)
        item_data["item_code"] = item_code
        item_data["qty_sold"] = items_sold[item_code]["qty"]
        item_data["stall_location"] = item.custom_default_stall_location
        item_data["store_location"] = item.custom_default_store_location
        item_data["max_qty"] = item.custom_max_qty
        item_data["warehouse"] = item.custom_default_store_warehouse

        data.append(item_data)  # Append to list

    return data