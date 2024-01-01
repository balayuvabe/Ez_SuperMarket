// frappe.ui.form.on("Stall Refill Request", {
//   refresh: function (frm) {
//     frm.add_custom_button("Get Sales Details", () => {
//       // Call fetch_sales_details method
//       frappe.call({
//         method:
//           "ez_supermarket.ez_supermarket.doctype.stall_refill_request.stall_refill_request.get_sales_data",
//         args: {
//           doc: frm.doc,
//         },
//         callback: function (r) {
//           frm.reload_doc();
//         },
//       });
//     });
//   },
// });
frappe.ui.form.on("Stall Refill Request", {
  refresh: function (frm) {
    frm.add_custom_button("Update Stall Request", function () {
      frappe.call({
        method:
          "ez_supermarket.ez_supermarket.doctype.stall_refill_request.stall_refill_request.update_stall_request", // replace with your Python function's path
        args: {
          docname: cur_frm.doc.name,
        },
        callback: function (response) {
          if (!response.exc) {
            frappe.show_alert(__("Stall Request updated successfully"));
            // Don't reload the document here. You can save and reload it manually after the updates are made.
          }
        },
      });
    });
  },
});
