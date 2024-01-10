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

frappe.ui.form.on("Purchase Master", {
  refresh: function (frm) {
    frm.set_query("set_warehouse", function () {
      return {
        filters: {
          is_group: 0,
        },
      };
    });

    frm.fields_dict.items.grid.add_custom_button(__("Add Items"), function () {
      var dialog = new frappe.ui.Dialog({
        size: "large",
        title: "Purchase Details",
        fields: [
          {
            label: "Item",
            fieldname: "item_code",
            fieldtype: "Link",
            options: "Item",
            // default: itemDetails && itemDetails.item_code,
            onchange: function () {
              var item_code = dialog.get_value("item_code");
              if (item_code) {
                frappe.call({
                  method:
                    "ez_supermarket.ez_supermarket.doctype.purchase_master.purchase_master.get_item_details",
                  args: {
                    item_code: item_code,
                  },
                  callback: function (r) {
                    if (r.message) {
                      // Set the UOM from the fetched item details
                      dialog.fields_dict.uom.set_value(r.message.uom);
                      dialog.fields_dict.item_group.set_value(
                        r.message.item_group
                      );
                      dialog.fields_dict.shelf_life_in_days.set_value(
                        r.message.shelf_life_in_days
                      );
                      dialog.fields_dict.has_batch_no.set_value(
                        r.message.has_batch_no
                      );
                      dialog.fields_dict.create_new_batch.set_value(
                        r.message.create_new_batch
                      );
                      dialog.fields_dict.gst_hsn_code.set_value(
                        r.message.gst_hsn_code
                      );
                      dialog.fields_dict.tax_rate.set_value(r.message.tax_rate);

                      var hasBatchNo = r.message.has_batch_no;
                      dialog.fields_dict.batch_no.df.read_only = !hasBatchNo;
                      dialog.fields_dict.batch_no.refresh();

                      // Fetch and set the conversion factor here
                      fetchAndSetConversionFactor(
                        item_code,
                        r.message.uom,
                        frm,
                        dialog
                      );

                      // Fetch and set the basic rate here
                      fetchAndSetBasicRate(item_code, frm, dialog);
                    }
                  },
                });
              }
            },
          },
          {
            label: "UOM",
            fieldname: "uom",
            fieldtype: "Data",
            read_only: "1",
            // default: itemDetails && itemDetails.uom,
            onchange: function () {
              var item_code = dialog.get_value("item_code");
              var uom = dialog.get_value("uom");
              if (item_code && uom) {
                // Fetch and set the conversion factor when the UOM changes
                fetchAndSetConversionFactor(item_code, uom, frm, dialog);
              }
            },
          },

          {
            fieldname: "gst_hsn_code",
            fieldtype: "Data",
            label: __("HSN/SAC"),
            // default: r.message.gst_hsn_code,
          },
          {
            fieldname: "tax_rate",
            fieldtype: "Data",
            label: __("Tax Rate"),
            hidden: 1,
          },
          {
            label: "Item Group",
            fieldname: "item_group",
            fieldtype: "Link",
            options: "Item Group",
            hidden: "1",
          },
          {
            label: "Basic Rate",
            fieldname: "basic_rate",
            fieldtype: "Currency",
            // default: itemDetails.rate,
            read_only: "1",
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
            fieldname: "last_purchase_rate",
            fieldtype: "Currency",
            label: __("Last Purchase Rate"),
            read_only: "1",
          },
          {
            fieldname: "column_break",
            fieldtype: "Column Break",
          },
          {
            label: "Quantity",
            fieldname: "qty",
            fieldtype: "Float",
            default: 1,
          },
          {
            fieldname: "rate",
            fieldtype: "Currency",
            label: __("Rate"),
          },
          {
            label: "Shelf Life In Days",
            fieldname: "shelf_life_in_days",
            fieldtype: "Int",
            hidden: "1",
          },

          {
            fieldname: "batch_no",
            fieldtype: "Data",
            label: __("Batch No"),
            description:
              "This field is set Read-Only if you have turned on Auto Batch / No Batch in the Item Master",
          },
          {
            fieldname: "mfg_date",
            fieldtype: "Date",
            label: __("MFG Date"),
          },
          {
            fieldname: "conversion_factor",
            fieldtype: "Data",
            label: __("Conversion Factor"),
            hidden: "1",
          },
          // Fields for item_code, item_name, qty, rate, batch_no, mfg_date...
        ],
        // Use the pre-defined fields
        secondary_action_label: "Add More",
        secondary_action: function () {
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
            child.qty = values.qty;
            child.uom = values.uom;
            child.batch_no = values.batch_no;
            child.mfg_date = values.mfg_date;
            child.rate = values.rate;
            child.amount = values.qty * values.rate;
            child.shelf_life_in_days = values.shelf_life_in_days;
            child.conversion_factor = values.conversion_factor;
            child.item_group = values.item_group;
            child.tax_rate = values.tax_rate;

            frm.refresh_field("items"); // Refresh the child table field
          }
          let grandTotal = frm.doc.items.reduce(function (total, item) {
            return total + (item.amount || 0);
          }, 0);

          frm.set_value("grand_total", grandTotal);

          // frm.refresh_field("grand_total");

          // Clear the dialog fields
          dialog.fields_dict.item_code.set_value("");
          dialog.fields_dict.qty.set_value(1);
          dialog.fields_dict.uom.set_value("");
          dialog.fields_dict.batch_no.set_value("");
          dialog.fields_dict.mfg_date.set_value("");
          dialog.fields_dict.rate.set_value("");
          dialog.fields_dict.conversion_factor.set_value("");
        },

        primary_action_label: "Submit",
        primary_action: function () {
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
            child.qty = values.qty;
            child.uom = values.uom;
            child.batch_no = values.batch_no;
            child.mfg_date = values.mfg_date;
            child.rate = values.rate;
            child.amount = values.qty * values.rate;
            child.shelf_life_in_days = values.shelf_life_in_days;
            child.conversion_factor = values.conversion_factor;
            child.item_group = values.item_group;
            child.tax_rate = values.tax_rate;
            // ... other field assignments ...
          }

          frm.refresh_field("items");
          let grandTotal = frm.doc.items.reduce(function (total, item) {
            return total + (item.amount || 0);
          }, 0);
          frm.set_value("grand_total", grandTotal);

          // Hide the dialog
          dialog.hide();

          console.log("Received Item Code:", values.item_code);
          console.log("Received Barcode:", values.barcode);
        },

        // Move dialog.show() outside of the primary action function
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

      // Function to fetch and set the conversion factor
      function fetchAndSetConversionFactor(item_code, uom, frm, dialog) {
        frappe.call({
          method:
            "ez_supermarket.ez_supermarket.doctype.stock_in.stock_in.get_conversion_factor",
          args: {
            item_code: item_code,
            uom: uom,
          },
          callback: function (r) {
            if (r.message && r.message.conversion_factor) {
              // Set the conversion factor in the dialog
              dialog.fields_dict.conversion_factor.set_value(
                r.message.conversion_factor
              );
            }
          },
        });
      }

      function fetchAndSetBasicRate(item_code, frm, dialog) {
        frappe.call({
          method:
            "ez_supermarket.ez_supermarket.doctype.stock_in.stock_in.get_item_basic_rate",
          args: {
            item_code: item_code,
          },
          callback: function (r) {
            if (r.message && r.message.basic_rate) {
              // Set the conversion factor in the dialog
              dialog.fields_dict.basic_rate.set_value(r.message.basic_rate);
            }
          },
        });
      }
    });

    frm.fields_dict.items.grid.add_custom_button(
      __("Fetch Supplier Items"),
      function () {
        // Get supplier
        var supplier = frm.doc.supplier;

        frappe.call({
          method:
            "ez_supermarket.ez_supermarket.custom.purchase_order.purchase_order.fetch_supplier_items",
          args: {
            supplier: supplier,
          },
          callback: function (r) {
            if (r.message && r.message.length > 0) {
              // Clear existing rows
              frm.doc.items = [];

              // Add fetched items
              $.each(r.message, function (i, item) {
                var child = frm.add_child("items");
                frm.script_manager.trigger(
                  "item_code",
                  child.doctype,
                  child.name
                );
                child.item_code = item.item_code;
                child.qty = 1;
                child.item_name = item.item_name;
                child.description = item.description;
                child.uom = item.uom;
                child.item_tax_template = item.item_tax_template;
                child.rate = item.last_purchase_rate;
                child.amount = child.qty * child.rate;
                // Set other fields
              });

              // Refresh field
              frm.refresh_field("items");
            } else {
              frappe.msgprint("No items found for supplier.");
            }
          },
        });
      }
    );
    frm.add_custom_button(__("Update Prices"), function () {
      // Function to handle the custom dialog
      showItemDialog(frm);
      calculateGrandTotal(frm);
    });
  },

  scan_barcode: function (frm) {
    let barcode = frm.doc.scan_barcode;

    if (barcode) {
      frappe.call({
        method:
          "ez_supermarket.ez_supermarket.doctype.purchase_master.purchase_master.get_item_details_barcode",
        args: {
          barcode: barcode,
        },
        callback: function (r) {
          if (r.message) {
            let d = new frappe.ui.Dialog({
              size: "large",
              title: __("Purchase Details"),
              fields: [
                {
                  fieldname: "item_code",
                  fieldtype: "Data",
                  label: __("Item Code"),
                  default: r.message.item_code,
                },
                {
                  fieldname: "item_name",
                  fieldtype: "Data",
                  label: __("Item Name"),
                  default: r.message.item_name,
                },
                {
                  fieldname: "gst_hsn_code",
                  fieldtype: "Data",
                  label: __("HSN/SAC"),
                  default: r.message.gst_hsn_code,
                },
                {
                  fieldname: "uom",
                  fieldtype: "Data",
                  label: __("UOM"),
                  default: r.message.uom,
                  read_only: "1",
                },
                {
                  label: "Has Batch Number",
                  fieldname: "has_batch_no",
                  fieldtype: "Check",
                  default: r.message.has_batch_no,
                  read_only: "1",
                },

                {
                  label: "Auto Batch Enabled",
                  fieldname: "create_new_batch",
                  fieldtype: "Check",
                  default: r.message.create_new_batch,
                  // hidden: "1",
                  read_only: "1",
                },
                {
                  fieldname: "last_purchase_rate",
                  fieldtype: "Currency",
                  label: __("Last Purchase Rate"),
                  read_only: "1",
                },
                {
                  fieldname: "column_break",
                  fieldtype: "Column Break",
                },
                {
                  fieldname: "qty",
                  fieldtype: "Float",
                  label: __("Quantity"),
                  default: 1, // Set default quantity directly
                },
                {
                  fieldname: "rate",
                  fieldtype: "Currency",
                  label: __("Rate"),
                  default: r.message.rate,
                },
                {
                  fieldname: "batch_no",
                  fieldtype: "Data",
                  label: __("Batch No"),
                  read_only: r.message.has_batch_no === 0,
                  description:
                    "This field is set Read-Only if you have turned on Auto Batch / No Batch in the Item Master",
                },
                {
                  fieldname: "mfg_date",
                  fieldtype: "Date",
                  label: __("MFG Date"),
                },
                {
                  fieldname: "shelf_life_in_days",
                  fieldtype: "Int",
                  label: __("Shelf Life In Days"),
                  default: r.message.shelf_life_in_days,
                  hidden: "1",
                },
                // Fields for item_code, item_name, qty, rate, batch_no, mfg_date...
              ],
              primary_action: function () {
                let item_code = d.get_value("item_code");
                let qty = d.get_value("qty");
                let rate = d.get_value("rate");
                let batch_no = d.get_value("batch_no");
                let mfg_date = d.get_value("mfg_date");
                let gst_hsn_code = d.get_value("gst_hsn_code");
                let shelf_life_in_days = d.get_value("shelf_life_in_days");
                let stock_uom = d.get_value("uom");
                let item_group = d.get_value("item_group");

                frm.doc.items.forEach((item) => {
                  if (item.item_code === item_code) {
                    item.qty = qty;
                    item.rate = rate;
                    item.gst_hsn_code = gst_hsn_code;
                    item.amount = rate * qty;
                    // item.amount = qty * rate;
                    item.batch_no = batch_no;
                    item.mfg_date = mfg_date;
                    item.shelf_life_in_days = shelf_life_in_days;
                    item.stock_uom = stock_uom;
                    item.item_group = item_group;
                    item.expiry_date = frappe.datetime.add_days(
                      mfg_date,
                      r.message.shelf_life_in_days
                    );
                  }
                });

                frm.refresh_field("items");
                let grandTotal = frm.doc.items.reduce(function (total, item) {
                  return total + (item.amount || 0);
                }, 0);
                frm.set_value("grand_total", grandTotal);

                // Refresh the form fields
                frm.refresh_fields();

                d.hide();

                // frm.set_df_property("scan_barcode", "focused", true);
              },
            });
            d.onhide = function () {
              // set focus on scan_barcode field
              $(" [data-fieldname='scan_barcode']").focus();
            }; // Show the dialog box
            d.show();
          }
        },
      });
    }
  },

  individual: function (frm) {
    if (frm.doc.individual) {
      frm.set_value("supplier", "Individual / PTPS Local");
    }
  },

  mode_of_payment: function (frm) {
    // Call the server-side function to get the Cash or Bank account
    frappe.call({
      method:
        "ez_supermarket.ez_supermarket.doctype.purchase_master.purchase_master.get_bank_cash_account",
      args: {
        mode_of_payment: frm.doc.mode_of_payment,
        company: frm.doc.company,
      },
      callback: function (response) {
        // Set the Cash or Bank Account field with the fetched account
        if (response.message && response.message.account) {
          frm.set_value("cash_bank_account", response.message.account);
        }
      },
    });
  },

  before_submit: function (frm) {
    if (frm.doc.update_stock === 1) {
      // Call the 'create_batches' method after saving the document
      frappe.call({
        method:
          "ez_supermarket.ez_supermarket.doctype.purchase_master.purchase_master.create_batches",
        args: {
          name: frm.doc.name,
        },
        callback: function (r) {
          if (r.message) {
            frappe.show_alert(
              {
                message: __("Batches created successfully."),
                indicator: "green",
              },
              5
            );
          }
        },
      });
    } else {
      frappe.msgprint(
        "Please check the <b>'Update Stock'</b> checkbox to create batches."
      );
      frappe.validated = false; // Prevent the document from being submitted
    }
  },
});
frappe.ui.form.on("Purchase Master Items", {
  item_code: function (frm, cdt, cdn) {
    var child = locals[cdt][cdn];
    if (child.item_code) {
      fetchAndSetConversionFactor(child.item_code, child.uom, cdt, cdn);
      fetchAndSetBasicRate(child.item_code, cdt, cdn);
    }
  },

  qty: function (frm, cdt, cdn) {
    var d = locals[cdt][cdn];
    frappe.model.set_value(cdt, cdn, "amount", d.qty * d.rate);
    calculateGrandTotal(frm);
  },

  rate: function (frm, cdt, cdn) {
    var d = locals[cdt][cdn];
    frappe.model.set_value(cdt, cdn, "amount", d.qty * d.rate);
    calculateGrandTotal(frm);
  },
});

// Define a function to fetch and set the conversion factor
function fetchAndSetConversionFactor(item_code, uom, cdt, cdn) {
  frappe.call({
    method:
      "ez_supermarket.ez_supermarket.doctype.stock_in.stock_in.get_conversion_factor",
    args: {
      item_code: item_code,
      uom: uom,
    },
    callback: function (r) {
      if (r.message && r.message.conversion_factor) {
        // Set the conversion factor in the child table
        frappe.model.set_value(
          cdt,
          cdn,
          "conversion_factor",
          r.message.conversion_factor
        );
      }
    },
  });
}

// Define a function to fetch and set the basic rate
function fetchAndSetBasicRate(item_code, cdt, cdn) {
  frappe.call({
    method:
      "ez_supermarket.ez_supermarket.doctype.stock_in.stock_in.get_item_basic_rate",
    args: {
      item_code: item_code,
    },
    callback: function (r) {
      if (r.message && r.message.basic_rate) {
        // Set the basic rate in the child table
        frappe.model.set_value(cdt, cdn, "rate", r.message.basic_rate);
      }
    },
  });
}

// Define a function to calculate the grand total
function calculateGrandTotal(frm) {
  var grandTotal = 0;
  frm.doc.items.forEach(function (item) {
    grandTotal += item.amount;
  });
  frm.set_value("grand_total", grandTotal);
}

function showItemDialog(frm) {
  // Fetch items from the Purchase Order
  var items = frm.doc.items || [];

  // Index to keep track of the current item being displayed
  var currentIndex = 0;

  var dialog;

  // Function to update the dialog content
  function updateDialogContent() {
    dialog = frappe.prompt(
      [
        {
          fieldname: "item_code",
          label: "Item Code",
          fieldtype: "Data",
          reqd: 1,
          default: items[currentIndex].item_code,
          read_only: 1,
        },
        {
          fieldname: "mrp_rate",
          label: "MRP Rate",
          fieldtype: "Currency",
        },
        {
          fieldname: "buying_price",
          label: "Buying Price",
          fieldtype: "Currency",
          reqd: 1,
          onchange: function () {
            calculatesellingcost(dialog);
          },
        },
        {
          fieldname: "margin",
          label: "Margin %",
          fieldtype: "Currency",
          onchange: function () {
            calculatesellingcost(dialog);
          },
        },
        {
          fieldname: "tax_rate",
          label: "Tax Rate",
          fieldtype: "Data",
          read_only: 1,
          default: items[currentIndex].tax_rate,
          // default: items[currentIndex].rate,
        },
        {
          fieldname: "selling_price_wo_taxes",
          label: "Selling Price without Taxes",
          fieldtype: "Currency",
        },
        {
          fieldname: "selling_price_with_taxes",
          label: "Selling Price with Taxes",
          fieldtype: "Currency",
        },
        // Add more fields as needed
      ],
      function (values) {
        // Iterate through existing items to find and update the matching row
        for (var i = 0; i < frm.doc.items.length; i++) {
          if (frm.doc.items[i].item_code === items[currentIndex].item_code) {
            frm.doc.items[i].item_code = values.item_code;
            frm.doc.items[i].rate = values.buying_price;
            frm.doc.items[i].amount =
              values.buying_price * frm.doc.items[i].qty;
            frm.doc.items[i].selling_price_wo_taxes =
              values.selling_price_wo_taxes;
            frm.doc.items[i].selling_price_with_taxes =
              values.selling_price_with_taxes;
            frm.doc.items[i].mrp_rate = values.mrp_rate;
            frm.doc.items[i].margin = values.margin;
            // Update other fields as needed
            break; // Exit the loop once the update is done
          }
        }

        // Refresh the items table to reflect the changes
        frm.fields_dict["items"].grid.refresh();

        // Increment the index for the next item
        currentIndex++;

        // Check if there are more items to display
        if (currentIndex < items.length) {
          // If yes, update the dialog content again
          updateDialogContent();
        } else {
          // If no more items, close the dialog or perform any other actions
          frappe.msgprint("Prices updated successfully");

          calculateGrandTotal(frm);
          frm.save();
        }
      },
      "Update Prices",
      "Update"
    );
  }
  function calculatesellingcost(dialog) {
    var buying_price = dialog.get_value("buying_price") || 0;
    var margin_percent = dialog.get_value("margin") || 0;
    var tax_rate = dialog.get_value("tax_rate") || 0;

    var selling_price_wo_taxes = (
      buying_price *
      (1 + margin_percent / 100)
    ).toFixed(2);
    var selling_price_with_taxes = (
      selling_price_wo_taxes *
      (1 + tax_rate / 100)
    ).toFixed(2);

    dialog.set_value("selling_price_wo_taxes", selling_price_wo_taxes);
    dialog.set_value("selling_price_with_taxes", selling_price_with_taxes);
  }

  // Start the dialog with the first item
  updateDialogContent();
}
