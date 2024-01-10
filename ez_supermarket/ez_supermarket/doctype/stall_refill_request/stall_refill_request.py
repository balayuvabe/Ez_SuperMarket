# Copyright (c) 2023, Balamurugan and contributors
# For license information, please see license.txt

import frappe
import json
from frappe.model.document import Document
from frappe import _
from frappe.utils import nowdate, get_time, get_datetime, today

class StallRefillRequest(Document):
	pass

# @frappe.whitelist()
# def add_timestamp_log(docname):
#     timestamp_log = frappe.get_doc({
#         "doctype": "Timestamp Log",
#         "timestamp": frappe.utils.now(),
#         "parent": docname,
#         "parenttype": "Stall Refill Request",
#         "parentfield": "timestamp_logs",
#     })
#     timestamp_log.insert()


@frappe.whitelist()
def fetch_items_sold_old(posting_date, timestamp, last_fetch_timestamp=None):
    data = []

    # Check if last_fetch_timestamp exists
    if last_fetch_timestamp:
        invoices = frappe.db.sql("""
            SELECT sii.item_code, sii.qty
            FROM `tabSales Invoice Item` sii
            INNER JOIN `tabSales Invoice` si ON sii.parent = si.name
            WHERE
                si.posting_date BETWEEN %s AND %s
                AND si.docstatus = 1
                AND si.modified BETWEEN %s AND %s
        """, (posting_date, timestamp, last_fetch_timestamp, timestamp), as_dict=1)
    else:
        # If last_fetch_timestamp doesn't exist, fetch all
        invoices = frappe.db.sql("""
            SELECT sii.item_code, sii.qty
            FROM `tabSales Invoice Item` sii
            INNER JOIN `tabSales Invoice` si ON sii.parent = si.name
            WHERE
                si.posting_date BETWEEN %s AND %s
                AND si.docstatus = 1
        """, (posting_date, timestamp), as_dict=1)

    items_sold = {}

    for d in invoices:
        item_code = d.item_code
        
        if item_code not in items_sold:
            items_sold[item_code] = {
                "qty": 0
            }

        items_sold[item_code]["qty"] += d.qty

    for item_code, value in items_sold.items():
        item = frappe.get_doc("Item", item_code)

        data.append({
            "item_code": item_code,
            "qty_sold": value["qty"],
            "stall_location": item.custom_stall_location,
            "store_location": item.custom_store_location,
            "max_qty": item.custom_max_qty
        })
             

    return data


# @frappe.whitelist()
# def fetch_items_sold(timestamp):

#   data = []

#   invoices = frappe.db.sql("""
#     SELECT
#       sii.item_code, sii.qty 
#     FROM `tabSales Invoice Item` sii
#     INNER JOIN `tabSales Invoice` si ON sii.parent = si.name
#     WHERE
#       si.posting_date < %s
#       AND si.docstatus = 1
#   """, timestamp, as_dict=1)

#   items_sold = {}

#   for d in invoices:
#     item_code = d.item_code
    
#     if item_code not in items_sold:
#       items_sold[item_code] = {
#         "qty": 0
#       }

#     items_sold[item_code]["qty"] += d.qty

#   for item_code, value in items_sold.items():
  
#     item = frappe.get_doc("Item", item_code)

#     data.append({
#       "item_code": item_code,
#       "qty_sold": value["qty"],
#       "stall_location": item.custom_stall_location,
#       "store_location": item.custom_store_location,
#       "max_qty": item.custom_max_qty
#     })
  
#   return data
# Python Function


@frappe.whitelist()
def fetch_items_sold(posting_date, timestamp, last_fetch_timestamp=None):

  data = [] # Define as list

  if last_fetch_timestamp:

    invoices = frappe.db.sql("""
      SELECT 
        sii.item_code, sii.qty
      FROM `tabSales Invoice Item` sii
      INNER JOIN `tabSales Invoice` si ON sii.parent = si.name
      WHERE
        si.posting_date = %s
        AND si.docstatus = 1
        AND si.creation BETWEEN %s AND %s
    """, (posting_date, last_fetch_timestamp, timestamp), as_dict=1)

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
        AND si.creation BETWEEN %s AND %s
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
    item_data["stall_location"] = item.custom_stall_location 
    item_data["store_location"] = item.custom_store_location
    item_data["max_qty"] = item.custom_max_qty

    data.append(item_data) # Append to list

  return data