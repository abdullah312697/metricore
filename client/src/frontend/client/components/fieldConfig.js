// fieldConfig.js

export const GROUPS = ["Product", "Sales", "Costs", "Summary"];

// editable: true  → toggles with isEditable (today only)
// editable: false → always readOnly (calculated fields)
export const DEFAULT_FIELDS = [
  { key: "ProductPrice",             label: "Product Price",               group: "Product",  editable: false },
  { key: "SoldAmount",               label: "Sold Amount",                 group: "Sales",    editable: false },
  { key: "TargetAmount",             label: "Total Target Sale Amount",    group: "Sales",    editable: true  },
  { key: "TargetSaleAmount",         label: "Current Target Sale Amount",  group: "Sales",    editable: true  },
  { key: "SoldQuentity",             label: "Sold Quantity",               group: "Sales",    editable: true  },
  { key: "TargetQuentity",           label: "Target Quantity",             group: "Sales",    editable: false },
  { key: "Return",                   label: "Return",                      group: "Sales",    editable: true  },
  { key: "InStockQuentity",          label: "In Stock Quantity",           group: "Product",  editable: false },
  { key: "AdCost",                   label: "Ad Cost",                     group: "Costs",    editable: true  },
  { key: "AdCostPerSale",            label: "Ad Cost Per Sale",            group: "Costs",    editable: false },
  { key: "OtherCost",                label: "Other Cost",                  group: "Costs",    editable: true  },
  { key: "OtherCostPerSale",         label: "Other Cost Per Sale",         group: "Costs",    editable: false },
  { key: "DelibaryCost",             label: "Delivery Cost",               group: "Costs",    editable: false },
  { key: "DelibaryCostPersale",      label: "Delivery Cost Per Sale",      group: "Costs",    editable: true  },
  { key: "Profit",                   label: "Profit",                      group: "Summary",  editable: false },
  { key: "ProfitPerSale",            label: "Profit Per Sale",             group: "Summary",  editable: false },
  { key: "TargetProfit",             label: "Target Profit",               group: "Summary",  editable: false },
  { key: "PackgingCost",             label: "Packaging Cost",              group: "Costs",    editable: true  },
  { key: "PackgingCostPerProduct",   label: "Packaging Cost Per Product",  group: "Costs",    editable: false },
  { key: "PrductBuyingCost",         label: "Product Buying Cost",         group: "Costs",    editable: true  },
  { key: "BuyingCostPerProduct",     label: "Buying Cost Per Product",     group: "Costs",    editable: false },
  { key: "ShippingCost",             label: "Shipping Cost",               group: "Costs",    editable: true  },
  { key: "ShippingCostPerProduct",   label: "Shipping Cost Per Product",   group: "Costs",    editable: false },
  { key: "ProcessingCost",           label: "Processing Cost",             group: "Summary",  editable: false },
  { key: "ProcessingCostPerProduct", label: "Processing Cost Per Product", group: "Summary",  editable: false },
];