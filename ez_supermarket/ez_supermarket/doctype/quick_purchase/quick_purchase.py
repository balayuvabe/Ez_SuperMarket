# Copyright (c) 2024, Balamurugan and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import add_days, cint, cstr, flt, formatdate, get_link_to_form, getdate, nowdate
from frappe import _

class QuickPurchase(Document):
	pass

@frappe.whitelist()
def create_batches(name):
    quick_purchase = frappe.get_doc("Quick Purchase", name)
    
    if quick_purchase.update_stock:
        batch = frappe.new_doc("Batch")

        for item in quick_purchase.items:
            item_doc = frappe.get_doc("Item", item.item_code)
            if item_doc.has_batch_no:
                try: 
                    batch.batch_id = item.batch_no
                    batch.item = item.item_code
                    batch.batch_qty = item.qty
                    batch.manufacturing_date = item.mfg_date
                    # batch.expiry_date = item.expiry_date
                    batch.reference_doctype = "Quick Purchase"
                    batch.reference_name = quick_purchase.name

                    batch.insert()
                    batch.submit()

                except Exception as e:
                    frappe.log_error(str(e), f"Failed to create batch for {item.name}")

        # frappe.msgprint(f"Batches created for {quick_purchase.name}")
    
    return name

# @frappe.whitelist()
# def on_update(doc, method):
#     create_batches(doc.name)


@frappe.whitelist()
def create_purchase_invoice(quick_purchase):
    quick_purchase = frappe.get_doc("Quick Purchase", quick_purchase)

    purchase_invoice = frappe.new_doc("Purchase Invoice")

    purchase_invoice.supplier = quick_purchase.supplier
    purchase_invoice.custom_payment_made_to = quick_purchase.payment_made_to
    purchase_invoice.posting_date = quick_purchase.posting_date
    purchase_invoice.set_posting_time = 1
    
    if quick_purchase.paid == 'Yes':
        purchase_invoice.is_paid = 1
    else:
        purchase_invoice.is_paid = 0
    purchase_invoice.mode_of_payment = quick_purchase.mode_of_payment
    purchase_invoice.cash_bank_account = quick_purchase.cash_bank_account
    purchase_invoice.update_stock = quick_purchase.update_stock
    purchase_invoice.set_warehouse = quick_purchase.set_warehouse
    purchase_invoice.custom_document_type = "Quick Purchase"
    purchase_invoice.custom_reference_document = quick_purchase.name

    for item in quick_purchase.items:
        purchase_invoice.append("items", {
            "item_code": item.item_code,
            "qty": item.qty,
            "rate": item.rate,
            "amount": item.amount,
            "batch_no": item.batch_no,
        })

    purchase_invoice.insert()
    purchase_invoice.submit()

    msg = f"Purchase Invoice <b>{purchase_invoice.name}</b> has been created successfully!!!" 
    link = f"<b><a href='/app/purchase-invoice/{purchase_invoice.name}'>{purchase_invoice.name}</a></b>"
    full_msg = _(msg + ". " + link)
    frappe.msgprint(full_msg)
    
    return purchase_invoice

@frappe.whitelist()
def get_bank_cash_account(mode_of_payment, company):
	account = frappe.db.get_value(
		"Mode of Payment Account", {"parent": mode_of_payment, "company": company}, "default_account"
	)
	if not account:
		frappe.throw(
			_("Please set default Cash or Bank account in Mode of Payment {0}").format(
				get_link_to_form("Mode of Payment", mode_of_payment)
			),
			title=_("Missing Account"),
		)
	return {"account": account}


@frappe.whitelist()
def on_submit(doc, method):
  create_purchase_invoice(doc.name)
  
  
@frappe.whitelist()
def get_item_details_barcode(barcode):

  # Get item from Item Barcode table
  item_barcode = frappe.get_doc("Item Barcode", {"parent": ["!=", ""], "barcode": barcode})
  if not item_barcode:
    frappe.throw("Item not found for barcode {}".format(barcode))

  # Get item details 
  item_code = item_barcode.parent
  item_doc = frappe.get_doc("Item", item_code)
  if not item_doc:
    frappe.throw("Invalid item code {}".format(item_code))

  last_purchase_rate = item_doc.last_purchase_rate
  gst_hsn_code = item_doc.gst_hsn_code
  shelf_life_in_days = item_doc.shelf_life_in_days

  # Extract rate or set default
  if not last_purchase_rate: 
      last_purchase_rate = 0

  return {
    "item_code": item_doc.name,
    "item_name": item_doc.item_name,
    "item_group": item_doc.item_group,  
    "rate": last_purchase_rate,
    "gst_hsn_code": gst_hsn_code,
    "shelf_life_in_days": shelf_life_in_days,
    "uom": item_doc.stock_uom,
    "has_batch_no": item_doc.has_batch_no,
    "create_new_batch": item_doc.create_new_batch,
    "tax_rate": item_doc.custom_tax_rate,
  }
  
@frappe.whitelist()
def get_item_details(item_code):
  item = frappe.get_doc("Item", item_code)
  if item:
    return {
      "uom": item.stock_uom,
      "item_group": item.item_group,
      "rate": item.valuation_rate,
      "shelf_life_in_days": item.shelf_life_in_days,
      "has_batch_no": item.has_batch_no,
      "create_new_batch": item.create_new_batch,
      "gst_hsn_code": item.gst_hsn_code,
      "tax_rate": item.custom_tax_rate,
    }
  else:
    return {}

@frappe.whitelist()
def get_item_basic_rate(item_code):

  basic_rate = 0
  
  item = frappe.get_doc("Item", item_code)

  if item.standard_rate:
    basic_rate = item.standard_rate

  else:
    price_list_rate = frappe.db.get_value("Item Price", 
      {"item_code": item_code, "buying": 1}, "price_list_rate")
    
    if price_list_rate:
      basic_rate = price_list_rate

  return {"basic_rate": basic_rate}