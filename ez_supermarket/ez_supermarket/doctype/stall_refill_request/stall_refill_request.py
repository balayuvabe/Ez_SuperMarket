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
def fetch_items_sold(posting_date, timestamp):
    data = []

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
