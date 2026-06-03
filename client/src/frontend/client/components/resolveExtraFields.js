// All supported operations
const OPERATIONS = {
  plus:       (a, b) => a + b,
  minus:      (a, b) => a - b,
  multiply:   (a, b) => a * b,
  divide:     (a, b) => (b !== 0 ? a / b : 0),
  percentage: (a, b) => (b !== 0 ? (a / b) * 100 : 0),
  percentof:  (a, b) => (b / 100) * a,
};

const safe = (n) => (isNaN(n) || !isFinite(n) ? 0 : n);

export const resolveExtraFields = (extraFields = [], baseMetrics = {}) => {

  // ── Step 1: Build a value map from base metrics ──────────────────
  // Keys are field names, values are their computed numbers
  const valueMap = {
    ProductPrice:           baseMetrics.ProductPrice           || 0,
    SoldAmount:             baseMetrics.SoldAmount             || 0,
    TargetSaleAmount:       baseMetrics.TargetSaleAmount       || 0,
    SoldQuentity:           baseMetrics.SoldQuentity           || 0,
    Return:                 baseMetrics.Return                 || 0,
    AdCost:                 baseMetrics.AdCost                 || 0,
    OtherCost:              baseMetrics.OtherCost              || 0,
    DelibaryCost:           baseMetrics.DelibaryCost           || 0,
    PackgingCost:           baseMetrics.PackgingCost           || 0,
    PrductBuyingCost:       baseMetrics.PrductBuyingCost       || 0,
    ShippingCost:           baseMetrics.ShippingCost           || 0,
    ProcessingCost:         baseMetrics.ProcessingCost         || 0,
    Profit:                 baseMetrics.Profit                 || 0,
    ProfitPerSale:          baseMetrics.ProfitPerSale          || 0,
    AdCostPerSale:          baseMetrics.AdCostPerSale          || 0,
    OtherCostPerSale:       baseMetrics.OtherCostPerSale       || 0,
    DelibaryCostPersale:    baseMetrics.DelibaryCostPersale    || 0,
    PackgingCostPerProduct: baseMetrics.PackgingCostPerProduct || 0,
    BuyingCostPerProduct:   baseMetrics.BuyingCostPerProduct   || 0,
    ShippingCostPerProduct: baseMetrics.ShippingCostPerProduct || 0,
  };

  // ── Step 2: Add raw extraField totals into valueMap first ────────
  // So extraFields can also reference OTHER extraFields by name
  extraFields.forEach((field) => {
    valueMap[field.fieldName] = field.total || 0;
  });

  // ── Step 3: Resolve each extraField's final value ─────────────── 
  return extraFields.map((field) => {
    // No calculateWith → just return its stored total as-is
    if (!field.calculateWith?.length) {
      return {
        configId:      field.configId,
        fieldName: field.fieldName,
        total: safe(field.total || 0),
        calculateWith: [],
      };
    }

    // Start with own stored total, then apply each operation
    let result = field.total || 0;

    field.calculateWith.forEach(({ name, calcType }) => {
      const operation = OPERATIONS[calcType];
      if (!operation) {
        console.warn(`Unknown calcType: "${calcType}" on field "${field.fieldName}"`);
        return;
      }

      const refValue = valueMap[name] ?? 0; 
      result = operation(result, refValue);
    });

    return {
      configId:      field.configId,
      fieldName: field.fieldName,
      total: safe(result),
      calculateWith: field.calculateWith,
    };
  });
};