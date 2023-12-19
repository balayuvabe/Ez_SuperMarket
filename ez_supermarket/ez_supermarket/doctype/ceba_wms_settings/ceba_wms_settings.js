// Copyright (c) 2023, Balamurugan and contributors
// For license information, please see license.txt

frappe.ui.form.on("CEBA WMS Settings", {
  start_date: function (frm) {
    const start_date = frm.doc.start_date;
    const end_date = frm.doc.end_date;

    if (end_date && start_date > end_date) {
      frappe.msgprint(__("End date should be greater than start date"));
      frappe.model.set_value(frm.doctype, frm.docname, "start_date", null);
    }
  },

  end_date: function (frm) {
    const start_date = frm.doc.start_date;
    const end_date = frm.doc.end_date;

    if (start_date && end_date < start_date) {
      frappe.msgprint(__("Start date should be lesser than end date"));
      frappe.model.set_value(frm.doctype, frm.docname, "end_date", null);
    }
  },

  refresh: function (frm) {
    const locations = frm.doc.locations;

    if (locations.length) {
      console.log(locations);
    }
  },
});
