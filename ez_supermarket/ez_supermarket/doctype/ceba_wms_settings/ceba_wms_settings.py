# Copyright (c) 2023, Balamurugan and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import nowdate

class CEBAWMSSettings(Document):
    def before_submit(self):
        wms_settings = frappe.db.sql(
            f"""SELECT name
            FROM `tabCEBA WMS Settings`
            WHERE warehouse != '{self.warehouse}'
            AND docstatus = 1
            AND (
                    (start_date BETWEEN '{self.start_date}' AND '{self.end_date}')
                    OR 
                    (end_date BETWEEN '{self.start_date}' AND '{self.end_date}')
                )
            """, as_dict=1
        )

        # if wms_settings:
        #     frappe.throw("WMS Settings already exists for the given dates")
        
        existing_locations = frappe.db.get_list(
            'CEBA WMS Storage Location',
            pluck='name'
        )
        
        for location in self.locations:
            for index in range(location.start_attribute, location.end_attribute + 1, 1):
                ln = f"{location.location_name}{index}"
                if ln in existing_locations: continue
                generate_storage_locations(location.location_name, index, self.warehouse)

def generate_storage_locations(location_name, index_id, warehouse):
    doc = frappe.new_doc('CEBA WMS Storage Location')
    doc.warehouse = warehouse
    doc.location_name = location_name
    doc.index_id = index_id
    doc.location_id = location_name + str(index_id)

    doc.insert()
