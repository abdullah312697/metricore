// // useTotalMetrics.js

import { useMemo } from "react";

export const useTotalMetrics = (productMetrics) => {
  return useMemo(() => {
    if (!productMetrics?.length) return null;

    const total = productMetrics.reduce((acc, item) => ({
      ProductPrice:             acc.ProductPrice             + (item.ProductPrice             || 0),
      SoldAmount:               acc.SoldAmount               + (item.SoldAmount               || 0),
      TargetSaleAmount:         acc.TargetSaleAmount         + (item.TargetSaleAmount         || 0),
      SoldQuentity:             acc.SoldQuentity             + (item.SoldQuentity             || 0),
      TargetQuentity:           acc.TargetQuentity           + (item.TargetQuentity           || 0),
      Return:                   acc.Return                   + (item.Return                   || 0),
      InStockQuentity:          acc.InStockQuentity          + (item.InStockQuentity          || 0),
      AdCost:                   acc.AdCost                   + (item.AdCost                   || 0),
      AdCostPerSale:            acc.AdCostPerSale            + (item.AdCostPerSale            || 0),
      OtherCost:                acc.OtherCost                + (item.OtherCost                || 0),
      OtherCostPerSale:         acc.OtherCostPerSale         + (item.OtherCostPerSale         || 0),
      DelibaryCost:             acc.DelibaryCost             + (item.DelibaryCost             || 0),
      DelibaryCostPersale:      acc.DelibaryCostPersale      + (item.DelibaryCostPersale      || 0),
      PackgingCost:             acc.PackgingCost             + (item.PackgingCost             || 0),
      PackgingCostPerProduct:   acc.PackgingCostPerProduct   + (item.PackgingCostPerProduct   || 0),
      PrductBuyingCost:         acc.PrductBuyingCost         + (item.PrductBuyingCost         || 0),
      BuyingCostPerProduct:     acc.BuyingCostPerProduct     + (item.BuyingCostPerProduct     || 0),
      ShippingCost:             acc.ShippingCost             + (item.ShippingCost             || 0),
      ShippingCostPerProduct:   acc.ShippingCostPerProduct   + (item.ShippingCostPerProduct   || 0),
      ProcessingCost:           acc.ProcessingCost      + (item.ProcessingCost      || 0),
      ProcessingCostPerProduct: acc.ProcessingCostPerProduct + (item.ProcessingCostPerProduct || 0),
      Profit:                   acc.Profit                   + (item.Profit                   || 0),
      ProfitPerSale:            acc.ProfitPerSale            + (item.ProfitPerSale            || 0),
      TargetProfit:             acc.TargetProfit             + (item.TargetProfit             || 0),
    }), {
      ProductPrice: 0, SoldAmount: 0, TargetSaleAmount: 0,
      SoldQuentity: 0, TargetQuentity: 0, Return: 0, InStockQuentity: 0,
      AdCost: 0, AdCostPerSale: 0, OtherCost: 0, OtherCostPerSale: 0,
      DelibaryCost: 0, DelibaryCostPersale: 0, PackgingCost: 0,
      PackgingCostPerProduct: 0, PrductBuyingCost: 0, BuyingCostPerProduct: 0,
      ShippingCost: 0, ShippingCostPerProduct: 0, ProcessingCost: 0,
      ProcessingCostPerProduct: 0, Profit: 0, ProfitPerSale: 0, TargetProfit: 0,
    });

    // ── ExtraFields: sum totals + carry calculateWith ─────────────
    const extraFieldsMap  = {};
    const extraCalcWithMap = {}; // 👈 store calculateWith per fieldName

    productMetrics.forEach((item) => {
      (item.extraFields || []).forEach(({ fieldName, total, calculateWith }) => {
        extraFieldsMap[fieldName] = (extraFieldsMap[fieldName] || 0) + (total || 0);

        // 👇 Same calculateWith for all products — grab from first occurrence
        if (!extraCalcWithMap[fieldName] && calculateWith?.length) {
          extraCalcWithMap[fieldName] = calculateWith;
        }
      });
    });

    const extraFields = Object.entries(extraFieldsMap).map(([fieldName, total]) => ({
      fieldName,
      total:         Math.round(total),
      calculateWith: extraCalcWithMap[fieldName] || [], // 👈 carry through
    }));

    const rounded = Object.fromEntries(
      Object.entries(total).map(([key, val]) => [key, Number(val.toFixed(4))])
    );

    return { ...rounded, extraFields };

  }, [productMetrics]);
};