import { useMemo } from "react";
import { resolveExtraFields } from "./resolveExtraFields";

const safe = (n) => (isNaN(n) || !isFinite(n) ? 0 : n);

const calculateMetrics = (data, dateTime) => {
  if (!data) return null;
  // ── From merged object (both product + cost fields) ──────────────
  const TargetAmount = data.TargetAmount || 0;
  const ProductPrice     = data.ProductPrice     || 0;
  const InStockQuentity  = data.InStockQuentity  || 0;
  const TargetQuentity   =   safe((TargetAmount / ProductPrice) / dateTime.day);
  const Return           = data.Return           || 0;
  const SoldQuentity     = safe(data.SoldQuentity - Return);
  const AdCost           = data.AdCost           || 0;
  const OtherCost        = data.OtherCost        || 0;
  const DelibaryCostPersale = data.DelibaryCostPersale || 0;
  const PackgingCost     = data.PackgingCost     || 0;
  const PrductBuyingCost = data.PrductBuyingCost || 0;
  const ShippingCost     = data.ShippingCost     || 0;
  const TargetSaleAmount = safe(TargetAmount / dateTime.day);

  // ── Derived calculations ──────────────────────────────────────────
  const DelibaryCost = safe(DelibaryCostPersale * SoldQuentity);
  const SoldAmount               = safe(SoldQuentity * ProductPrice);
  const ProcessingCost           = safe(AdCost + OtherCost + DelibaryCost + PackgingCost + PrductBuyingCost + ShippingCost);
  const Profit                   = safe(SoldAmount - ProcessingCost);
  const TargetProfit             = safe(TargetSaleAmount - ProcessingCost);
  const AdCostPerSale            = safe(AdCost           / SoldQuentity);
  const OtherCostPerSale         = safe(OtherCost        / SoldQuentity);
  const PackgingCostPerProduct   = safe(PackgingCost     / SoldQuentity);
  const BuyingCostPerProduct     = safe(PrductBuyingCost / SoldQuentity);
  const ShippingCostPerProduct   = safe(ShippingCost     / SoldQuentity);
  const ProcessingCostPerProduct = safe(ProcessingCost / SoldQuentity);
  const ProfitPerSale            = safe(Profit           / SoldQuentity);

  const baseMetrics = {
    ProductPrice,
    InStockQuentity,
    TargetQuentity,
    SoldQuentity,
    Return,
    AdCost,
    OtherCost,
    DelibaryCost,
    PackgingCost,
    PrductBuyingCost,
    ShippingCost,
    TargetSaleAmount,
    SoldAmount,
    ProcessingCost,
    Profit,
    TargetProfit,
    AdCostPerSale,
    OtherCostPerSale,
    DelibaryCostPersale,
    PackgingCostPerProduct,
    BuyingCostPerProduct,
    ShippingCostPerProduct,
    ProcessingCostPerProduct,
    ProfitPerSale,
  };

  const roundedMetrics = Object.fromEntries(
    Object.entries(baseMetrics).map(([key, val]) => [key, Number(val.toFixed(4))])
  );

  const extraFields = resolveExtraFields(data.extraFields || [], baseMetrics);

  const roundedExtraFields = extraFields.map((field) => ({
    ...field,
    total: Number(field.total.toFixed(4)),
  }));

  return {
    ...data,
    ...roundedMetrics,
    extraFields: roundedExtraFields,
  };

};
export const useProductMetrics = (mergedSummary, getDateTime) => {
  return useMemo(() => {
    if (!mergedSummary?.length) return [];
    return mergedSummary.map((item) => (calculateMetrics(item, getDateTime)));
  }, [mergedSummary, getDateTime]);
};
