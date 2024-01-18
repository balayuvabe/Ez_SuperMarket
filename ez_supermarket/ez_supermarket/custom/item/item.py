# Copyright (c) 2023, Balamurugan and contributors
# For license information, please see license.txt

import frappe
import json
from frappe import _
from frappe.utils import add_months, today
from datetime import datetime
from datetime import datetime, timedelta

# Server method
@frappe.whitelist()
def apply_tax_template(doc_json):
    doc = json.loads(doc_json)

    # Clear existing tax rows
    doc["taxes"] = []

    tax_rate = doc.get("custom_tax_rate")
    if tax_rate:
        # Fetch the company name from the 'item_defaults' table
        company = doc.get("item_defaults")[0].get("company") if doc.get("item_defaults") else None

        if company:
            # Fetch the company abbreviation
            company_abbr = frappe.db.get_value("Company", company, "abbr")

            if not company_abbr:
                frappe.throw(_("Could not find abbreviation for company: {0}").format(company))

                    # Create a new row in the taxes child table for In-State tax category
            tax_row_in_state = {
                "item_tax_template": "GST {}% - {}".format(tax_rate, company_abbr),
                "tax_category": "In-State"
            }
            doc["taxes"].append(tax_row_in_state)

            # Create another row in the taxes child table for Out-State tax category
            tax_row_out_state = {
                "item_tax_template": "GST {}% - {}".format(tax_rate, company_abbr),
                "tax_category": "Out-State"
            }
            doc["taxes"].append(tax_row_out_state)

    return doc

from datetime import datetime, timedelta

# @frappe.whitelist()
# def get_qty_purchased_last_two_months(item_code):
#     # Get the first and last day of the current month
#     today = datetime.today()
#     first_day_of_current_month = datetime(today.year, today.month, 1)
#     last_day_of_current_month = (first_day_of_current_month + timedelta(days=32)).replace(day=1) - timedelta(days=1)

#     # Make sure the dates cover the entire day
#     first_day_of_current_month = first_day_of_current_month.replace(hour=0, minute=0, second=0, microsecond=0)
#     last_day_of_current_month = last_day_of_current_month.replace(hour=23, minute=59, second=59, microsecond=999999)

#     # Get the first and last day of the last month
#     last_day_of_last_month = first_day_of_current_month - timedelta(days=1)
#     first_day_of_last_month = last_day_of_last_month.replace(day=1)

#     # Get the first and last day of the month before the last month
#     last_day_of_month_before_last = first_day_of_last_month - timedelta(days=1)
#     first_day_of_month_before_last = last_day_of_month_before_last.replace(day=1)

#     # Query Purchase Invoices for the given item within the last two months
#     qty_purchased_last_month = frappe.db.sql("""
#         SELECT SUM(pii.qty) as total_qty
#         FROM `tabPurchase Invoice` pi
#         JOIN `tabPurchase Invoice Item` pii ON pi.name = pii.parent
#         WHERE pii.item_code = %s
#             AND pi.posting_date BETWEEN %s AND %s
#             AND pi.docstatus = 1
#     """, (item_code, first_day_of_last_month, last_day_of_last_month), as_dict=True)[0].get('total_qty') or 0

#     qty_purchased_previous_month = frappe.db.sql("""
#         SELECT SUM(pii.qty) as total_qty
#         FROM `tabPurchase Invoice` pi
#         JOIN `tabPurchase Invoice Item` pii ON pi.name = pii.parent
#         WHERE pii.item_code = %s
#             AND pi.posting_date BETWEEN %s AND %s
#             AND pi.docstatus = 1
#     """, (item_code, first_day_of_month_before_last, last_day_of_month_before_last), as_dict=True)[0].get('total_qty') or 0

#     # Query Purchase Invoices for the given item within the current month
#     qty_purchased_current_month = frappe.db.sql("""
#         SELECT SUM(pii.qty) as total_qty
#         FROM `tabPurchase Invoice` pi
#         JOIN `tabPurchase Invoice Item` pii ON pi.name = pii.parent
#         WHERE pii.item_code = %s
#             AND pi.posting_date BETWEEN %s AND %s
#             AND pi.docstatus = 1
#     """, (item_code, first_day_of_current_month, last_day_of_current_month), as_dict=True)[0].get('total_qty') or 0

#     return qty_purchased_last_month, qty_purchased_previous_month, qty_purchased_current_month









    
      


    # elif tax_rate == "12%":
    #     # Add tax row for 12%
    #     tax = doc.setdefault("taxes", {}).append({
    #         "item_tax_template": frappe.get_doc("Item Tax Template", {"title": "GST 12%"}).name
    #     })

    # elif tax_rate == "18%":
    #     # Add tax row for 18%
    #     tax = doc.setdefault("taxes", {}).append({
    #         "item_tax_template": frappe.get_doc("Item Tax Template", {"title": "GST 18%"}).name
    #     })

    # elif tax_rate == "28%":
    #     # Add tax row for 28%
    #     tax = doc.setdefault("taxes", {}).append({
    #         "item_tax_template": frappe.get_doc("Item Tax Template", {"title": "GST 28%"}).name
    #     })

    # return doc

# @frappe.whitelist()
# def update_item_history():
#     # Get the date 3 months ago
#     three_months_ago = add_months(today(), -3)

#     # Get all items
#     items = frappe.get_all('Item', fields=['name'])

#     for item in items:
#         # Get all purchase and sales invoices for this item in the past 3 months
#         purchase_invoices = frappe.get_all('Purchase Invoice Item',
#             filters={
#                 'item_code': item.name,
#                 'creation': ['>=', three_months_ago]
#             },
#             fields=['qty', 'amount'])
        
#         sales_invoices = frappe.get_all('Sales Invoice Item',
#             filters={
#                 'item_code': item.name,
#                 'creation': ['>=', three_months_ago]
#             },
#             fields=['qty', 'amount'])

#         # Calculate total quantity purchased and total sales
#         total_qty_purchased = sum([invoice.qty for invoice in purchase_invoices])
#         total_sales = sum([invoice.qty for invoice in sales_invoices])

#         # Update the Item History table
#         item_doc = frappe.get_doc('Item', item.name)
#         custom_item_history = item_doc.append('custom_item_history', {})
#         custom_item_history.month_name = datetime.now().strftime('%B')
#         custom_item_history.total_qty_purchased = total_qty_purchased
#         custom_item_history.total_sales = total_sales
#         item_doc.save()
