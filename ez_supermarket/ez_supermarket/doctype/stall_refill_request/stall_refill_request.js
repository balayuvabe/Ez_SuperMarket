frappe.ui.form.on("Stall Refill Request", {
  refresh: function (frm) {
    frm.add_custom_button("Get Sales Details", () => {
      // Call fetch_sales_details method
      frappe.call({
        method:
          "ez_supermarket.ez_supermarket.doctype.stall_refill_request.stall_refill_request.get_sales_data",
        args: {
          doc: frm.doc,
        },
        callback: function (r) {
          frm.reload_doc();
        },
      });
    });
  },
});
