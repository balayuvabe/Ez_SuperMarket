frappe.ui.form.on("Stock Entry Detail", {
  item_code: function (frm, cdt, cdn) {
    var row = locals[cdt][cdn];
    frappe.call({
      method: "frappe.client.get",
      args: {
        doctype: "Item",
        name: row.item_code,
      },
      callback: function (response) {
        var item = response.message;
        frappe.model.set_value(
          cdt,
          cdn,
          "s_warehouse",
          item.custom_default_store_warehouse
        );
        frappe.model.set_value(
          cdt,
          cdn,
          "t_warehouse",
          item.custom_default_stall_warehouse
        );
        frappe.model.set_value(
          cdt,
          cdn,
          "item_location",
          item.custom_default_store_location
        );
        frappe.model.set_value(
          cdt,
          cdn,
          "to_item_location",
          item.custom_default_stall_location
        );
      },
    });
  },
});
