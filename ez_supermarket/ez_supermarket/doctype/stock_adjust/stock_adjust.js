// Copyright (c) 2023, Balamurugan and contributors
// For license information, please see license.txt

erpnext.stock.StockEntry = class StockEntry extends (
  erpnext.stock.StockController
) {
  scan_barcode() {
    const barcode_scanner = new erpnext.utils.BarcodeScanner({
      frm: this.frm,
    });
    barcode_scanner.process_scan();
  }
};
extend_cscript(
  cur_frm.cscript,
  new erpnext.stock.StockEntry({
    frm: cur_frm,
  })
);

frappe.ui.form.on("Stock Adjust", {
  refresh: function (frm) {
    frm.set_query("set_warehouse", function () {
      return {
        filters: {
          is_group: 0,
        },
      };
    });

    frm.fields_dict.items.grid.add_custom_button(
      __("Add Multiple Items"),
      function () {
        var dialog = new frappe.ui.Dialog({
          size: "large",
          title: "Update Stock Details",
          fields: [
            {
              label: "Item Code",
              fieldname: "item_code",
              fieldtype: "Link",
              options: "Item",
              onchange: function () {
                var item_code = dialog.get_value("item_code");
                if (item_code) {
                  frappe.call({
                    method:
                      "easyerpnext.easyerpnext.doctype.stock_adjust.stock_adjust.get_item_details",
                    args: {
                      item_code: item_code,
                    },
                    callback: function (r) {
                      if (r.message) {
                        // Set the UOM from the fetched item details
                        dialog.fields_dict.uom.set_value(r.message.uom);
                        dialog.fields_dict.custom_article_code.set_value(
                          r.message.custom_article_code
                        );
                        dialog.fields_dict.gst_hsn_code.set_value(
                          r.message.gst_hsn_code
                        );
                        dialog.fields_dict.item_name.set_value(
                          r.message.item_name
                        );
                        dialog.fields_dict.valuation_rate.set_value(
                          r.message.valuation_rate
                        );
                        dialog.fields_dict.has_batch_no.set_value(
                          r.message.has_batch_no
                        );
                        dialog.fields_dict.create_new_batch.set_value(
                          r.message.create_new_batch
                        );
                        // dialog.fields_dict.shelf_life_in_days.set_value(
                        //   r.message.shelf_life_in_days
                        // );

                        var hasBatchNo = r.message.has_batch_no;
                        dialog.fields_dict.batch_number.df.read_only =
                          !hasBatchNo;
                        dialog.fields_dict.batch_number.refresh();
                      }
                    },
                  });
                }
              },
            },
            {
              label: "Article Code",
              fieldname: "custom_article_code",
              fieldtype: "Data",
              read_only: "1",
            },
            {
              fieldname: "item_name",
              fieldtype: "Data",
              label: __("Item Name"),
              read_only: "1",
            },
            {
              label: "HSN Code",
              fieldname: "gst_hsn_code",
              fieldtype: "Link",
              options: "GST HSN Code",
              read_only: "1",
            },
            {
              label: "UOM",
              fieldname: "uom",
              fieldtype: "Link",
              options: "UOM",
              read_only: "1",
            },
            // {
            //   label: "Shelf Life In Days",
            //   fieldname: "shelf_life_in_days",
            //   fieldtype: "Int",
            //   read_only: "1",
            // },
            {
              fieldname: "column_break",
              fieldtype: "Column Break",
            },
            {
              label: "Valuation Rate",
              fieldname: "valuation_rate",
              fieldtype: "Currency",
              read_only: 1,
            },
            {
              fieldname: "warehouse",
              fieldtype: "Link",
              label: __("Warehouse"),
              options: "Warehouse",
              get_query: function () {
                return {
                  filters: {
                    is_group: 0,
                  },
                };
              },

              onchange: function () {
                let has_batch = dialog.get_value("has_batch_no");
                let item_code = dialog.get_value("item_code");
                let warehouse = dialog.get_value("warehouse");

                dialog.set_value("available_qty", "");

                if (!has_batch) {
                  frappe.call({
                    method:
                      "easyerpnext.easyerpnext.doctype.stock_adjust.stock_adjust.get_available_qty",
                    args: {
                      item_code: item_code,
                      warehouse: warehouse,
                    },
                    callback: function (r) {
                      if (!r.exc && r.message) {
                        let qty = r.message;
                        dialog.set_value("available_qty", qty);
                      }
                    },
                  });
                }
              },
            },

            {
              label: "Has Batch Number",
              fieldname: "has_batch_no",
              fieldtype: "Check",
              // hidden: "1",
              read_only: "1",
            },

            {
              label: "Auto Batch Enabled",
              fieldname: "create_new_batch",
              fieldtype: "Check",
              // hidden: "1",
              read_only: "1",
            },
            {
              fieldname: "batch_number",
              fieldtype: "Link",
              label: __("Batch Number"),
              options: "Batch",
              get_query: function () {
                var item_code = dialog.get_value("item_code");
                return {
                  filters: {
                    item: item_code,
                  },
                };
              },
              onchange: function () {
                let has_batch = dialog.get_value("has_batch_no");
                let item_code = dialog.get_value("item_code");
                let warehouse = dialog.get_value("warehouse");

                dialog.set_value("available_qty", "");

                if (has_batch) {
                  let batch_no = dialog.get_value("batch_number");

                  frappe.call({
                    method:
                      "easyerpnext.easyerpnext.doctype.stock_adjust.stock_adjust.get_batch_available_qty",
                    args: {
                      warehouse: warehouse,
                      item_code: item_code,
                      batch_no: batch_no,
                    },
                    callback: function (r) {
                      if (!r.exc) {
                        let qty = r.message;

                        if (qty === 0) {
                          // If no available qty, clear batch selection
                          dialog.set_value("batch_number", "");

                          frappe.msgprint(
                            __(
                              "Selected batch not available for this item and warehouse"
                            ),
                            __("No Quantity"),
                            "red"
                          );
                        } else {
                          dialog.set_value("available_qty", qty);
                        }
                      }
                    },
                  });
                }
              },
            },

            {
              label: "Available Qty",
              fieldname: "available_qty",
              fieldtype: "Int",
              read_only: "1",
            },
            {
              fieldname: "new_qty",
              fieldtype: "Int",
              label: __("New Quantity"),
            },
          ],
          primary_action_label: "Add More",
          primary_action: function () {
            var values = dialog.get_values();
            if (!values || !values.item_code) {
              // dialog.hide();
              return;
            }
            // Check if the child table exists and if there are existing rows
            if (!frm.doc.items) {
              frm.doc.items = [];
            }
            // Remove the first empty row if it exists
            frm.doc.items = remove_empty_first_row(frm, "items");

            var existingRow = frm.doc.items.find(function (row) {
              return (
                row.item_code === values.item_code &&
                row.batch_no === values.batch_no
              );
            });

            if (existingRow) {
              // If an existing row is found, update its fields instead of adding a new row
              frappe.model.set_value(
                existingRow.doctype,
                existingRow.name,
                "qty",
                parseFloat(existingRow.qty) + parseFloat(values.qty)
              );
              frappe.model.set_value(
                existingRow.doctype,
                existingRow.name,
                "uom",
                values.uom
              );
              // ... update other fields as needed
            } else {
              // If no existing row is found, add a new row to the child table
              var child = frm.add_child("items");
              child.item_code = values.item_code;
              child.qty = values.new_qty;
              child.uom = values.uom;
              child.batch_no = values.batch_number;
              child.valuation_rate = values.valuation_rate;
              child.item_name = values.item_name;
              child.t_warehouse = values.warehouse;
            }
            // Refresh the child table field
            frm.refresh_field("items");
            // Clear the dialog fields
            dialog.fields_dict.item_code.input.focus();

            dialog.fields_dict.item_code.set_value("");
            dialog.fields_dict.custom_article_code.set_value("");
            dialog.fields_dict.item_name.set_value("");
            dialog.fields_dict.gst_hsn_code.set_value("");
            dialog.fields_dict.has_batch_no.set_value("");
            dialog.fields_dict.new_qty.set_value("");
            dialog.fields_dict.uom.set_value("");
            dialog.fields_dict.batch_number.set_value("");
            dialog.fields_dict.warehouse.set_value("");
            dialog.fields_dict.available_qty.set_value("");
            dialog.fields_dict.valuation_rate.set_value("");
          },

          secondary_action_label: "Submit",
          secondary_action: function () {
            var values = dialog.get_values();
            if (!values || !values.item_code) {
              dialog.hide();
              return;
            }

            // Check if the child table exists and if there are existing rows
            if (!frm.doc.items) {
              frm.doc.items = [];
            }

            // Remove the first empty row if it exists
            frm.doc.items = remove_empty_first_row(frm, "items");

            var existingRow = frm.doc.items.find(function (row) {
              return (
                row.item_code === values.item_code &&
                row.batch_no === values.batch_no
              );
            });

            if (existingRow) {
              frappe.model.set_value(
                existingRow.doctype,
                existingRow.name,
                "qty",
                parseFloat(existingRow.qty) + parseFloat(values.qty)
              );
              frappe.model.set_value(
                existingRow.doctype,
                existingRow.name,
                "uom",
                values.uom
              );
            } else {
              var child = frm.add_child("items");
              child.item_code = values.item_code;
              child.qty = values.new_qty;
              child.uom = values.uom;
              child.batch_no = values.batch_number;
              child.valuation_rate = values.valuation_rate;
              child.item_name = values.item_name;
              child.t_warehouse = values.warehouse;
              // ... other field assignments ...
            }

            // Refresh the child table field
            frm.refresh_field("items");

            // Hide the dialog
            dialog.hide();

            console.log("Received Item Code:", values.item_code);
            // console.log("Received Barcode:", values.barcode);
          },
        });
        dialog.show();

        function remove_empty_first_row(frm, child_table_name) {
          const rows = frm.doc[child_table_name];
          if (first_row_is_empty(rows)) {
            return rows.slice(1); // Remove the first row
          }
          return rows;
        }
        // Function to check if the first row in the child table is empty
        function first_row_is_empty(rows) {
          if (rows.length > 0) {
            const firstRow = rows[0];
            // Check if the item_code field in the first row is empty (you can modify this condition as needed)
            return !firstRow.item_code;
          }
          return false;
        }
      }
    );
  },
});
frappe.ui.form.on("Stock Adjust Details", {
  item_code: function (frm, cdt, cdn) {
    var row = locals[cdt][cdn];

    // Check if both t_warehouse and item_code are selected
    if (row.t_warehouse && row.item_code) {
      frappe.call({
        method:
          "easyerpnext.easyerpnext.doctype.stock_adjust.stock_adjust.get_available_qty",
        args: {
          warehouse: row.t_warehouse,
          item_code: row.item_code,
        },
        callback: function (r) {
          if (r.message) {
            frappe.model.set_value(cdt, cdn, "total_qty_available", r.message);
          }
        },
      });
    }
  },

  t_warehouse: function (frm, cdt, cdn) {
    // Reset available_qty when t_warehouse changes
    frappe.model.set_value(cdt, cdn, "total_qty_available", 0);
  },
});
