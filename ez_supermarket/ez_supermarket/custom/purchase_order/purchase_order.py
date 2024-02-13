# Copyright (c) 2023, Balamurugan and contributors
# For license information, please see license.txt

import frappe
from datetime import datetime, timedelta
from frappe.utils import flt
from frappe import _

def get_qty_sold_and_purchased_last_two_months(item_code):
    # Get the first and last day of the current month
    today = datetime.today()
    first_day_of_current_month = datetime(today.year, today.month, 1)
    last_day_of_current_month = (first_day_of_current_month + timedelta(days=32)).replace(day=1) - timedelta(days=1)

    # Make sure the dates cover the entire day
    first_day_of_current_month = first_day_of_current_month.replace(hour=0, minute=0, second=0, microsecond=0)
    last_day_of_current_month = last_day_of_current_month.replace(hour=23, minute=59, second=59, microsecond=999999)

    # Get the first and last day of the last month
    last_day_of_last_month = first_day_of_current_month - timedelta(days=1)
    first_day_of_last_month = last_day_of_last_month.replace(day=1)

    # Get the first and last day of the month before the last month
    last_day_of_month_before_last = first_day_of_last_month - timedelta(days=1)
    first_day_of_month_before_last = last_day_of_month_before_last.replace(day=1)

    # Query Sales Invoices for the given item within the last two months
    qty_sold_last_month = frappe.db.sql("""
        SELECT SUM(sii.qty) as total_qty
        FROM `tabSales Invoice` si
        JOIN `tabSales Invoice Item` sii ON si.name = sii.parent
        WHERE sii.item_code = %s
            AND si.posting_date BETWEEN %s AND %s
            AND si.docstatus = 1
    """, (item_code, first_day_of_last_month, last_day_of_last_month), as_dict=True)[0].get('total_qty') or 0

    qty_sold_previous_month = frappe.db.sql("""
        SELECT SUM(sii.qty) as total_qty
        FROM `tabSales Invoice` si
        JOIN `tabSales Invoice Item` sii ON si.name = sii.parent
        WHERE sii.item_code = %s
            AND si.posting_date BETWEEN %s AND %s
            AND si.docstatus = 1
    """, (item_code, first_day_of_month_before_last, last_day_of_month_before_last), as_dict=True)[0].get('total_qty') or 0

    # Query Sales Invoices for the given item within the current month
    qty_sold_current_month = frappe.db.sql("""
        SELECT SUM(sii.qty) as total_qty
        FROM `tabSales Invoice` si
        JOIN `tabSales Invoice Item` sii ON si.name = sii.parent
        WHERE sii.item_code = %s
            AND si.posting_date BETWEEN %s AND %s
            AND si.docstatus = 1
    """, (item_code, first_day_of_current_month, last_day_of_current_month), as_dict=True)[0].get('total_qty') or 0

    # Query Purchase Invoices for the given item within the last two months
    qty_purchased_last_month = frappe.db.sql("""
        SELECT SUM(pii.qty) as total_qty
        FROM `tabPurchase Invoice` pi
        JOIN `tabPurchase Invoice Item` pii ON pi.name = pii.parent
        WHERE pii.item_code = %s
            AND pi.posting_date BETWEEN %s AND %s
            AND pi.docstatus = 1
    """, (item_code, first_day_of_last_month, last_day_of_last_month), as_dict=True)[0].get('total_qty') or 0

    qty_purchased_previous_month = frappe.db.sql("""
        SELECT SUM(pii.qty) as total_qty
        FROM `tabPurchase Invoice` pi
        JOIN `tabPurchase Invoice Item` pii ON pi.name = pii.parent
        WHERE pii.item_code = %s
            AND pi.posting_date BETWEEN %s AND %s
            AND pi.docstatus = 1
    """, (item_code, first_day_of_month_before_last, last_day_of_month_before_last), as_dict=True)[0].get('total_qty') or 0

    # Query Purchase Invoices for the given item within the current month
    qty_purchased_current_month = frappe.db.sql("""
        SELECT SUM(pii.qty) as total_qty
        FROM `tabPurchase Invoice` pi
        JOIN `tabPurchase Invoice Item` pii ON pi.name = pii.parent
        WHERE pii.item_code = %s
            AND pi.posting_date BETWEEN %s AND %s
            AND pi.docstatus = 1
    """, (item_code, first_day_of_current_month, last_day_of_current_month), as_dict=True)[0].get('total_qty') or 0
    
    lead_time, item_name = frappe.db.get_value("Item", item_code,["custom_purchase_lead_time_in_days", "item_name"])
    average_sales = (qty_sold_last_month + qty_sold_current_month + qty_sold_previous_month ) / 3
    average_purchase = (qty_purchased_last_month + qty_purchased_previous_month + qty_purchased_current_month) / 3
    average_3m = f"{round(average_purchase, 2)} / {round(average_sales, 2)}"
    if lead_time:
        flt_lead_time = float(lead_time)
        eoq = average_sales*(flt_lead_time/30+1)
    else:
        eoq = 0
    average_purchase = frappe.db.sql("""
        SELECT SUM(pii.rate) as total_price
        FROM `tabPurchase Invoice` pi
        JOIN `tabPurchase Invoice Item` pii ON pi.name = pii.parent
        WHERE pii.item_code = %s
            AND pi.posting_date BETWEEN %s AND %s
            AND pi.docstatus = 1
        """, (item_code, first_day_of_current_month,last_day_of_month_before_last), as_dict=True)[0].get('total_price') or 0

    return qty_sold_last_month, qty_sold_previous_month, qty_sold_current_month, qty_purchased_last_month, qty_purchased_previous_month, qty_purchased_current_month, average_3m, eoq, item_name, average_purchase




@frappe.whitelist()
def fetch_supplier_items(supplier):
    items = []
    
    item_defaults = frappe.get_all("Item Default", 
        filters={
            "default_supplier": supplier
        },
        fields=["parent"]
    )
    
    for row in item_defaults:
        item_code = row.parent
        item = frappe.get_doc("Item", item_code)
        
        # Fetch current balance of the item
        # available_qty = get_item_current_balance(item_code)
        
        stall_qty, store_rooms_qty = get_item_current_balance(item_code)
        
        last_month_sales, previous_last_month_sales, current_month_sales, last_month_purchase, previous_last_month_purchase, current_month_purchase, average_3m, eoq, item_name, average_purchase = get_qty_sold_and_purchased_last_two_months(item_code)
        
        # if item.last_purchase_rate == 0:
        #     last_purchase_rate = get_last_purchase_rate_from_item_price(item_code)
        # else:
        #     last_purchase_rate = item.last_purchase_ratem
                                                            
        items.append({
            "item_code": item_code,
            "item_name": item.item_name,
            # "description": item.description,
            "uom": item.stock_uom,
            # "last_purchase_rate": last_purchase_rate,
            # "item_tax_template": get_item_tax_template(item),
            # "buying_price_list": "Standard Buying",
            # "custom_available_qty": available_qty,
            "custom_available_qty": f"{stall_qty} / {store_rooms_qty}",
            "custom_last_month_sales": last_month_sales,
            "custom_previous_last_month_sales": previous_last_month_sales,
            "custom_current_month_sales_2": current_month_sales,
            "custom_last_month_purchase": last_month_purchase,
            "custom_previous_last_month_purchase": previous_last_month_purchase,
            "custom_current_month_purchase": current_month_purchase,
            "custom_average_purchase_sales": average_3m,
            "custom_eoq": eoq,
            "custom_average_purchase_price": average_purchase,
            "custom_tax": item.custom_tax_rate,
            "custom_mrp": item.custom_mrp,
        })

    return items
def get_last_purchase_rate_from_item_price(item_code):
    item_price = frappe.get_all("Item Price",
                                 filters={"item_code": item_code, "price_list": "Standard Buying"},
                                 fields=["price_list_rate"],
                                 order_by="valid_from DESC",
                                 limit=1)

    if item_price:
        return item_price[0].price_list_rate
    else:
        return 0  # Return 0 if no item price is found

def get_item_tax_template(item):
    # Fetch the item's tax template (you may need to adjust the field name)
    return item.get("taxes")[0].get("item_tax_template", "") if item.get("taxes") else ""

# def get_item_current_balance(item_code):

#     bin_docs = frappe.get_all("Bin", filters={"item_code": item_code}, fields=["warehouse", "actual_qty"])

#     total_qty = 0
#     for bin_doc in bin_docs:
#         total_qty += bin_doc.get("actual_qty")

#     return total_qty

def get_item_current_balance(item_code):
    warehouses_to_consider = ["Stall - PTPS", "Store 1 - PTPS"]

    bin_docs = frappe.get_all("Bin",
                              filters={"item_code": item_code, "warehouse": ["in", warehouses_to_consider]},
                              fields=["warehouse", "actual_qty"])

    quantity_by_warehouse = {warehouse: 0 for warehouse in warehouses_to_consider}

    for bin_doc in bin_docs:
        warehouse = bin_doc.get("warehouse")
        actual_qty = bin_doc.get("actual_qty")
        quantity_by_warehouse[warehouse] += actual_qty

    return quantity_by_warehouse["Stall - PTPS"], quantity_by_warehouse["Store 1 - PTPS"]


@frappe.whitelist()
def get_previous_purchase_details(item_code, rate):
    try:
        # Find the previous purchase details
        sql_query = """
            SELECT
                pi.supplier,
                pi.posting_date as date,
                MIN(pi_item.rate) as rate
            FROM
                `tabPurchase Invoice` pi
            JOIN
                `tabPurchase Invoice Item` pi_item ON pi.name = pi_item.parent
            WHERE
                pi_item.item_code = %(item_code)s
                AND pi_item.rate < %(rate)s
            GROUP BY
                pi.supplier,
                pi.posting_date
            ORDER BY
                rate ASC
            LIMIT 1
        """

        result = frappe.db.sql(sql_query, {'item_code': item_code, 'rate': rate}, as_dict=True)

        if result:
            return {
                'supplier': result[0].supplier,
                'date': result[0].date,
                'rate': result[0].rate
            }
        else:
            return _("No previous purchase invoice found for the given criteria.")

    except Exception as e:
        frappe.log_error(f"Error in get_previous_purchase_details: {e}")
        return _("Error occurred while fetching previous purchase details.")


@frappe.whitelist()
def get_tax_rate(item_tax_template):
    tax_rate = frappe.db.get_value('Item Tax Template Detail', {'parent': item_tax_template}, ['tax_rate'])
    print(tax_rate)
    return tax_rate

@frappe.whitelist()
def check_supplier_bill_no(supplier, custom_suppliers_bill_no):
    existing_po = frappe.get_value("Purchase Order", {
        'supplier': supplier,
        'custom_suppliers_bill_no': custom_suppliers_bill_no,
        'docstatus': 1  # Include only submitted Purchase Orders
    }, 'name')

    return {'existing_po': existing_po}