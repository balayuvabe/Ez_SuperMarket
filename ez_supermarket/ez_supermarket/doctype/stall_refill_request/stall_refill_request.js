// JavaScript Code
frappe.ui.form.on("Stall Refill Request", {
  refresh: function (frm) {
    frm.add_custom_button("Fetch Items Sold", function () {
      // Set posting_date and timestamp fields
      frm.set_value("posting_date", frappe.datetime.now_date());
      frm.set_value("timestamp", frappe.datetime.now_datetime());

      // Call method with correct argument order and passing 'frm'
      fetch_items_sold(frm, frm.doc.posting_date, frm.doc.timestamp);
    });
  },
});

function fetch_items_sold(frm, posting_date, timestamp) {
  frappe.call({
    method:
      "ez_supermarket.ez_supermarket.doctype.stall_refill_request.stall_refill_request.fetch_items_sold",
    args: {
      posting_date: posting_date,
      timestamp: timestamp,
    },
    callback: function (r) {
      if (r.message) {
        frm.doc.stall_request_details = [];
        for (var i = 0; i < r.message.length; i++) {
          var d = frm.add_child("stall_request_details");
          d.item_code = r.message[i].item_code;
          d.qty_sold = r.message[i].qty_sold;
          d.stall_location = r.message[i].stall_location;
          d.max_qty = r.message[i].max_qty;
        }
        frm.refresh_field("stall_request_details");
      }
    },
  });
}
