frappe.ui.form.on("Material Request", {
  refresh: function (frm) {
    // Add a new button in the toolbar
    frm.page.add_inner_button(__("Get Sold Items"), function () {
      // Get the current timestamp
      var currentTimestamp = frappe.datetime.now_datetime();

      // Retrieve the timestamp of the last button click from the form
      var lastButtonClickTimestamp = frm.doc.custom_last_button_click_timestamp;

      frappe.call({
        method:
          "ez_supermarket.ez_supermarket.custom.material_request.material_request.get_data",
        args: {
          filters: {
            date: frm.doc.transaction_date, // Assuming transaction_date is the date you want to use
            custom_last_button_click_timestamp: lastButtonClickTimestamp,
          },
        },
        callback: function (response) {
          var items = response.message;

          // Clear existing items in the child table
          frm.clear_table("items");

          // Add each item to the items child table
          for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var child = frm.add_child("items");
            frappe.model.set_value(
              child.doctype,
              child.name,
              "item_code",
              item.item_code
            );
            frappe.model.set_value(
              child.doctype,
              child.name,
              "qty",
              item.qty_to_be_refilled
            );
          }

          // Refresh the form to show the new items
          frm.refresh_field("items");

          // Save the current timestamp as the last button click timestamp
          frm.set_value("custom_last_button_click_timestamp", currentTimestamp);
          frm.set_value("material_request_type", "Material Transfer");

          // Show a success message
          frappe.msgprint({
            title: __("Success"),
            message: __("Items added successfully."),
            indicator: "green",
          });
        },
      });
    });
  },
});
