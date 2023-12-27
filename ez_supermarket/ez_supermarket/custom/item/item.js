// Copyright (c) 2023, Balamurugan and contributors
// For license information, please see license.txt

frappe.ui.form.on("Item", {
  custom_tax_rate: function (frm) {
    console.log("Validation of Item Form");

    frappe.call({
      method:
        "ez_supermarket.ez_supermarket.custom.item.item.apply_tax_template",
      args: {
        doc_json: JSON.stringify(frm.doc),
      },
      callback: function (r) {
        console.log("Server response:", r);
        // Update the form with the response
        frm.doc = r.message;
      },
    });
  },
  custom_mrp: function (frm) {
    var value = frm.doc.custom_mrp;
    frm.set_value("standard_rate", value);
    console.log(value);
    // frm.update();
    // frm.refresh_fields();
  },
});

// frappe.ui.form.on("Item", {
//   validate: function (frm) {
//     if (frm.doc.custom_tax_rate === "5%") {
//       const tax_row = frm.add_child("taxes");
//       tax_row.item_tax_template = "GST 5% - PTPS";
//       frm.refresh_field("taxes");
//     }
//   },
// });
