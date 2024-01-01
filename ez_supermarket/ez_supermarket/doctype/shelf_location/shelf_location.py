# Copyright (c) 2023, Balamurugan and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import nowdate

class ShelfLocation(Document):
	pass

@frappe.whitelist()
def update_index_id(location_name):
	latest_index = get_latest_index(location_name)
	return latest_index

def get_latest_index(location_name):
    latest_index = frappe.db.sql(
        f"""SELECT MAX(index_id) as latest_index
            FROM `tabCEBA WMS Storage Location`
            WHERE location_name = '{location_name}'""", as_dict=1
    )

    return (latest_index[0].latest_index + 1) if latest_index and latest_index[0].latest_index is not None else 1