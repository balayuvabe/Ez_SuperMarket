// JavaScript Code
// function get_last_fetch_timestamp(posting_date, callback) {
//   // Fetch the name and timestamp from the previous document with the same posting date
//   frappe.call({
//     method: "frappe.client.get_value",
//     args: {
//       doctype: "Stall Refill Request",
//       filters: {
//         docstatus: 1,
//         posting_date: posting_date,
//       },
//       fieldname: ["name", "timestamp"],
//     },
//     callback: function (r) {
//       callback(r.message.name, r.message.timestamp);
//     },
//   });
// }

// frappe.ui.form.on("Stall Refill Request", {
//   refresh: function (frm) {
//     frm.add_custom_button("Fetch Items Sold", function () {
//       // Check if the document is new and has the same posting date
//       if (frm.is_new() && frm.doc.posting_date == frappe.datetime.now_date()) {
//         // Set timestamp from the previous document as last_fetch_timestamp
//         get_last_fetch_timestamp(
//           frm.doc.posting_date,
//           function (docname, timestamp) {
//             frm.set_value("last_fetch_timestamp", timestamp);
//             console.log(
//               "Last fetch timestamp set to previous timestamp:",
//               frm.doc.last_fetch_timestamp
//             );

//             // Log the name and timestamp from the previous document
//             console.log("Previous document name:", docname);
//             console.log("Previous document timestamp:", timestamp);
//           }
//         );
//       }

//       // Set posting_date and timestamp fields
//       frm.set_value("timestamp", frappe.datetime.now_datetime());

//       // Call method with correct argument order and passing 'frm'
//       fetch_items_sold(
//         frm,
//         frm.doc.posting_date,
//         frm.doc.timestamp,
//         frm.doc.last_fetch_timestamp
//       );
//     });
//   },
// });

// function fetch_items_sold(frm, posting_date, timestamp) {
//   frappe.call({
//     method:
//       "ez_supermarket.ez_supermarket.doctype.stall_refill_request.stall_refill_request.fetch_items_sold",
//     args: {
//       posting_date: posting_date,
//       timestamp: timestamp,
//     },
//     callback: function (r) {
//       if (r.message) {
//         frm.doc.stall_request_details = [];
//         for (var i = 0; i < r.message.length; i++) {
//           var d = frm.add_child("stall_request_details");
//           d.item_code = r.message[i].item_code;
//           d.qty_sold = r.message[i].qty_sold;
//           d.stall_location = r.message[i].stall_location;
//           d.max_qty = r.message[i].max_qty;
//         }
//         frm.refresh_field("stall_request_details");
//       }
//     },
//   });
// }

// function get_last_fetch_timestamp(posting_date, callback) {
//   // Fetch the timestamp from the previous document with the same posting date
//   frappe.call({
//     method: "frappe.client.get_value",
//     args: {
//       doctype: "Stall Refill Request",
//       filters: {
//         docstatus: 1,
//         posting_date: posting_date,
//       },
//       fieldname: ["timestamp"],
//     },
//     callback: function (r) {
//       callback(r.message.timestamp);
//     },
//   });
// }

// frappe.ui.form.on("Stall Refill Request", {
//   refresh: function (frm) {
//     frm.add_custom_button("Fetch Items Sold", function () {
//       // Set posting_date, timestamp, and last fetch timestamp fields
//       frm.set_value("posting_date", frappe.datetime.now_date());

//       // Fetch the timestamp of the previous document with the same posting date
//       get_last_fetch_timestamp(frm.doc.posting_date, function (timestamp) {
//         // Set current timestamp and last fetch timestamp based on the availability of the previous document
//         if (!timestamp) {
//           // No previous document, set today's timestamp as both current and last fetch timestamp
//           frm.set_value("timestamp", frappe.datetime.now_datetime());
//           frm.set_value("last_fetch_timestamp", frappe.datetime.now_datetime());
//         } else {
//           // Previous document exists, set today's timestamp as current timestamp
//           // and use the last fetch timestamp from the previous document
//           frm.set_value("timestamp", frappe.datetime.now_datetime());
//           frm.set_value("last_fetch_timestamp", timestamp);
//         }

//         console.log("Timestamp set to:", frm.doc.timestamp);
//         console.log(
//           "Last fetch timestamp set to:",
//           frm.doc.last_fetch_timestamp
//         );

//         // Call method with correct argument order and passing 'frm'
//         fetch_items_sold(
//           frm,
//           frm.doc.posting_date,
//           frm.doc.timestamp,
//           frm.doc.last_fetch_timestamp
//         );
//       });
//     });
//   },
// });

// function fetch_items_sold(frm, posting_date, timestamp, last_fetch_timestamp) {
//   frappe.call({
//     method:
//       "ez_supermarket.ez_supermarket.doctype.stall_refill_request.stall_refill_request.fetch_items_sold_new",
//     args: {
//       posting_date: posting_date,
//       timestamp: timestamp,
//       last_fetch_timestamp: last_fetch_timestamp,
//     },
//     callback: function (r) {
//       if (r.message) {
//         frm.doc.stall_request_details = [];
//         for (var i = 0; i < r.message.length; i++) {
//           var d = frm.add_child("stall_request_details");
//           d.item_code = r.message[i].item_code;
//           d.qty_sold = r.message[i].qty_sold;
//           d.stall_location = r.message[i].stall_location;
//           d.max_qty = r.message[i].max_qty;
//         }
//         frm.refresh_field("stall_request_details");
//       }
//     },
//   });
// }
frappe.ui.form.on("Stall Refill Request", {
  refresh: function (frm) {
    // Add custom button
    frm.add_custom_button("Fetch Items Sold", () => {
      get_last_fetch_timestamp(frm);

      set_timestamps(frm);

      fetch_items_sold(frm);
    });
  },
});

// Fetch last timestamp for posting date
function get_last_fetch_timestamp(frm) {
  let posting_date = frm.doc.posting_date;

  let last_ts = frappe.db.get_value(
    "Stall Refill Request",
    {
      posting_date: posting_date,
      docstatus: 1,
    },
    "last_fetch_timestamp"
  );

  frm.last_fetch_timestamp = last_ts;
}

// Set timestamp and last fetch timestamp
function set_timestamps(frm) {
  let now = frappe.datetime.now_datetime();

  if (frm.is_new()) {
    frm.set_value("timestamp", now);
    frm.set_value("last_fetch_timestamp", now);
  } else {
    frm.set_value("timestamp", now);
    frm.set_value("last_fetch_timestamp", frm.last_fetch_timestamp);
  }
}
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
          d.max_qty = r.message[i].max_qty;
        }
        frm.refresh_field("stall_request_details");
      }
    },
  });
}
