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
    if (frm.doc.docstatus == 1) {
      frm.page.add_inner_button(
        __("Intiate Quality Check"),

        () => {
          const doc_name = frm.docname;
          const doc_type = frm.doctype;

          frappe.call({
            method:
              "ez_supermarket.ez_supermarket.doctype.quality_check.quality_check.generate_quality_check",
            args: {
              doc_name: doc_name,
              doc_type: doc_type,
            },
            callback: (r) => {
              frappe.set_route("Form", "Quality Check", r.message);
            },
          });
        },
        __("Create")
      );
    }
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

frappe.ui.form.on("Purchase Order Item", {
  item_code: (frm, cdt, cdn) =>{
    add_item(frm, cdt, cdn)
  },
  items_remove: (frm, cdt, cdn) =>{
    let remove = 1
    add_item(frm, cdt, cdn, remove)
  },
});

async function add_item(frm, cdt, cdn, remove) {
  let items_p = [];
  let items_s = [];
  let child_table = locals[cdt][cdn];
  if (frm.doc.items) {
    for (let r of frm.doc.items) {
      if (r.item_code) {
        let item = r.item_code;
        try {
          let res = await new Promise((resolve, reject) => {
            frappe.call({
              method: "ez_supermarket.ez_supermarket.doctype.history_table.history_table.get_item_details",
              args: { item_list: item },
              callback: function (res) {
                if (res.message) {
                  console.log(res.message[9])
                  items_p.push({
                    "item_code": item,
                    "item_name": res.message[8],
                    "current_month": res.message[5],
                    "last_month": res.message[3],
                    "late_last_month": res.message[4],
                  });
                  if(remove == null){
                    if(child_table.custom_average_purchase_sales == null && child_table.idx == r.idx){
                      child_table.custom_average_purchase_sales = res.message[2]+" / "+res.message[0]+" / "+res.message[1]
                    }
                    if(child_table.custom_average_purchase_price == null && child_table.idx == r.idx){
                      child_table.custom_average_purchase_price = res.message[9] || 0;
                    }
                    if(child_table.custom_purchase_history == null && child_table.idx == r.idx){
                      child_table.custom_purchase_history = res.message[5]+" / "+res.message[3]+" / "+res.message[4];
                    }
                    if(child_table.custom_eoq == null && child_table.idx == r.idx){
                      child_table.custom_eoq = res.message[7] || 0;
                    }
                  }
                  frm.refresh_field("items")
                  items_s.push({
                    "item_code": item,
                    "item_name": res.message[8],
                    "current_month": res.message[2],
                    "last_month": res.message[0],
                    "late_last_month": res.message[1],
                  });
                  resolve();
                } else {
                  reject();
                }
              },
            });
          });
        } catch (error) {
          console.error("Error fetching item details");
        }
      }
    }
    frm.set_value("custom_purchase_history_table", items_p);
    frm.set_value("custom_sales_history_table", items_s);
    frm.refresh_field("custom_purchase_history_table");
    frm.refresh_field("custom_sales_history_table");
  }
}

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
          child.custom_average_purchase_sales = item.custom_current_month_sales_2+" / "+item.custom_last_month_sales+" / "+item.custom_previous_last_month_sales;
          child.custom_purchase_history = item.custom_current_month_purchase+" / "+item.custom_last_month_purchase+" / "+item.custom_previous_last_month_purchase;
          child.custom_eoq = item.custom_eoq;
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
