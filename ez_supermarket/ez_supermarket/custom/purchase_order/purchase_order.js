// Copyright (c) 2023, Balamurugan and contributors
// For license information, please see license.txt

frappe.ui.form.on("Purchase Order", {
  custom_suppliers_bill_no: function (frm) {
    frappe.call({
      method:
        "ez_supermarket.ez_supermarket.custom.purchase_order.purchase_order.check_supplier_bill_no",
      args: {
        supplier: frm.doc.supplier,
        custom_suppliers_bill_no: frm.doc.custom_suppliers_bill_no,
      },
      callback: function (r) {
        if (r.message && r.message.existing_po) {
          let poLink = frappe.utils.get_form_link(
            "Purchase Order",
            r.message.existing_po
          );
          let errorMessage = `Supplier Bill Number '<b>${frm.doc.custom_suppliers_bill_no}</b>' already exists in a previous Purchase Order. <a href="${poLink}" target="_blank"><b>${r.message.existing_po}<b></a>`;

          frappe.msgprint({
            title: __("Duplicate Supplier Bill Number"),
            indicator: "red",
            message: errorMessage,
          });

          frappe.validated = false;
        }
      },
    });
  },
  refresh: function (frm) {
    frm.fields_dict.items.grid.add_custom_button(
      __("Fetch Supplier Items"),
      function () {
        fetchSupplierItems(frm);
      }
    );
    frm.add_custom_button(__("Check Prices"), function () {
      checkPrices(frm);
    });
  },
});
function checkPrices(frm) {
  var items = frm.doc.items || [];
  var rows = [];

  function getNextItem(index) {
    if (index < items.length) {
      getPreviousPurchaseDetails(items[index], rows, function () {
        getNextItem(index + 1);
      });
    } else {
      showPurchaseDetailsDialog(rows);
    }
  }

  getNextItem(0);
}

function getPreviousPurchaseDetails(item, rows, callback) {
  frappe.call({
    method:
      "ez_supermarket.ez_supermarket.custom.purchase_order.purchase_order.get_previous_purchase_details",
    args: {
      item_code: item.item_code,
      rate: item.rate,
      base_rate: item.base_rate,
    },
    callback: function (response) {
      if (response.message && response.message.rate < item.rate) {
        rows.push({
          item_code: item.item_code,
          supplier: response.message.supplier,
          date: response.message.date,
          rate: response.message.rate,
        });
      }
      callback();
    },
  });
}

function showPurchaseDetailsDialog(rows) {
  frappe.prompt(
    [
      {
        label: __("Previous Purchase Details"),
        fieldname: "table",
        fieldtype: "Table",
        options: "Purchase Order Item",
        fields: [
          {
            label: __("Item Code"),
            fieldname: "item_code",
            fieldtype: "Data",
            in_list_view: 1,
          },
          {
            label: __("Supplier"),
            fieldname: "supplier",
            fieldtype: "Data",
            in_list_view: 1,
          },
          {
            label: __("Transaction Date"),
            fieldname: "date",
            fieldtype: "Data",
            in_list_view: 1,
          },
          {
            label: __("Rate"),
            fieldname: "rate",
            fieldtype: "Currency",
            in_list_view: 1,
          },
        ],
        data: rows,
      },
    ],
    function (values) {},
    __("Are you sure? Because i found these Suppliers with Low Price.!"),
    "Submit"
  );
}
// Function to fetch supplier items
function fetchSupplierItems(frm) {
  // Get supplier
  var supplier = frm.doc.supplier;
  var schedule_date = frappe.datetime.add_days(frm.doc.schedule_date, 12);
  frm.set_value("schedule_date", schedule_date);

  // console.log("Fetching supplier items for:", supplier);

  frappe.call({
    method:
      "ez_supermarket.ez_supermarket.custom.purchase_order.purchase_order.fetch_supplier_items",
    args: {
      supplier: supplier,
    },
    callback: function (r) {
      // console.log("Response from server:", r);

      if (r.message && r.message.length > 0) {
        // Clear existing rows
        frm.doc.items = [];

        // Add fetched items
        $.each(r.message, function (i, item) {
          // console.log("Processing item:", item);

          var child = frm.add_child("items");
          child.item_code = item.item_code;
          frm.script_manager.trigger("item_code", child.doctype, child.name);

          child.buying_price_list = frm.doc.buying_price_list;
          child.custom_available_qty = item.custom_available_qty;
          child.custom_last_month_sales = item.custom_last_month_sales;
          child.custom_tax = item.custom_tax;
          child.custom_mrp = item.custom_mrp;
          child.custom_previous_last_month_sales =
            item.custom_previous_last_month_sales;
          child.custom_current_month_sales_2 =
            item.custom_current_month_sales_2;
          child.custom_current_month_purchase =
            item.custom_current_month_purchase;
          child.custom_last_month_purchase = item.custom_last_month_purchase;
          child.custom_previous_last_month_purchase =
            item.custom_previous_last_month_purchase;
          child.custom_average_sales_last_3_months =
            (item.custom_last_month_sales +
              item.custom_previous_last_month_sales +
              item.custom_current_month_sales_2) /
            3;
          child.custom_average_purchase_last_3_months =
            (item.custom_current_month_purchase +
              item.custom_last_month_purchase +
              item.custom_previous_last_month_purchase) /
            3;
          // Calculate and set custom_forecasted_sales and custom_forecasted_purchase using exponential smoothing
          var alpha = 0.2; // Define the smoothing factor
          child.custom_forecasted_sales_quantity =
            calculate_exponential_smoothing(
              item.custom_current_month_sales_2,
              item.custom_last_month_sales,
              alpha // Pass the smoothing factor to the function
            );

          child.custom_forecasted_purchase_quantity =
            calculate_exponential_smoothing(
              item.custom_current_month_purchase,
              item.custom_last_month_purchase,
              alpha // Pass the smoothing factor to the function
            );
        });

        frm.refresh_field("buying_price_list");
        frm.refresh_field("items");
      } else {
        frappe.msgprint("No items found for supplier.");
      }
    },
  });
}

function calculate_exponential_smoothing(yt, st_minus_1, alpha) {
  console.log("yt:", yt);
  console.log("st_minus_1:", st_minus_1);
  console.log("alpha:", alpha);
  // Calculate the forecast using exponential smoothing
  const forecast = alpha * yt + (1 - alpha) * st_minus_1;

  return forecast;
}
