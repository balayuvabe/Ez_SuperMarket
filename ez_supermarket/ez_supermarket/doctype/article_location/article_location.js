// Copyright (c) 2023, Balamurugan and contributors
// For license information, please see license.txt

frappe.ui.form.on("Article Location", {
  refresh(frm) {
    frm.set_query("warehouse", function (frm) {
      return {
        filters: {
          is_group: "0",
        },
      };
    });
  },
});
