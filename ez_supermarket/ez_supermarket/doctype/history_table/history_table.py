# Copyright (c) 2024, Balamurugan and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from ez_supermarket.ez_supermarket.custom.purchase_order.purchase_order import get_qty_sold_and_purchased_last_two_months


class HistoryTable(Document):
	pass

@frappe.whitelist()
def get_item_details(item_list):
    return get_qty_sold_and_purchased_last_two_months(item_list)