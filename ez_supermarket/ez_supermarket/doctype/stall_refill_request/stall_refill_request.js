frappe.ui.form.on("Stall Refill Request", {
  refresh: function (frm) {
    // Add custom button
    frm.add_custom_button("Fetch Items Sold", () => {
      frm.set_value("request_raised_by", frappe.session.user);
      console.log("Button clicked"); // Log that the button was clicked

      // Stringify the doc
      let doc_str = JSON.stringify(frm.doc);

      frappe.call({
        method:
          "ez_supermarket.ez_supermarket.doctype.stall_refill_request.stall_refill_request.set_timestamps",
        args: { doc_str: doc_str }, // Pass stringified doc
        callback: function (r) {
          console.log("Callback received", r); // Log the callback response
          if (r.message) {
            let updatedDoc = r.message;

            // Explicitly set values in the form
            frm.set_value("timestamp", updatedDoc.timestamp);
            frm.set_value(
              "last_fetch_timestamp",
              updatedDoc.last_fetch_timestamp
            );

            // Refresh the form to reflect the changes
            frm.refresh();

            fetch_items_sold(frm);
          }
        },
      });
    });
  },
});

function fetch_items_sold(frm) {
  let posting_date = frm.doc.posting_date;
  let timestamp = frm.doc.timestamp;
  let last_fetch_ts = frm.doc.last_fetch_timestamp;

  frappe.call({
    method:
      "ez_supermarket.ez_supermarket.doctype.stall_refill_request.stall_refill_request.fetch_items_sold",
    args: {
      posting_date: posting_date,
      timestamp: timestamp,
      last_fetch_ts: last_fetch_ts,
    },
    callback: function (r) {
      if (r.message) {
        frm.doc.stall_request_details = [];
        for (var i = 0; i < r.message.length; i++) {
          var d = frm.add_child("stall_request_details");
          d.item_code = r.message[i].item_code;
          d.qty_sold = r.message[i].qty_sold;
          d.stall_location = r.message[i].stall_location;
          d.store_location = r.message[i].store_location;
          d.max_qty = r.message[i].max_qty;
          d.store_warehouse = r.message[i].warehouse;
          d.refill_qty = r.message[i].max_qty - r.message[i].qty_sold;
        }
        frm.refresh_field("stall_request_details");
      }
    },
  });
}
