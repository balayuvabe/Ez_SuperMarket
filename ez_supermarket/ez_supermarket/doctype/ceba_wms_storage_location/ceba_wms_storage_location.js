// Copyright (c) 2023, Balamurugan and contributors
// For license information, please see license.txt

frappe.ui.form.on("CEBA WMS Storage Location", {
  location_name: function (frm) {
    const location_name = frm.doc.location_name;

    if (location_name) {
      frappe.call({
        method:
          "ceba_utilities.ceba_utilities.doctype.ceba_wms_storage_location.ceba_wms_storage_location.update_index_id",
        args: { location_name: frm.doc.location_name },
        callback: (r) => {
          if (r.exc) {
            frappe.msgprint(__("Failed to generate location index id"));
            frappe.model.set_value(
              frm.doctype,
              frm.docname,
              "location_name",
              null
            );
          }

          frappe.model.set_value(
            frm.doctype,
            frm.docname,
            "index_id",
            r.message
          );
        },
      });
    }
  },
});
