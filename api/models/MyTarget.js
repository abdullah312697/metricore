import mongoose from "mongoose";


// const GoalLadderSchema = new mongoose.Schema({
//     AssignDate:{type:String},
//     ProductName:{type:String},
//     ProductPrice:{type:Number},
//     TotalSoldAmount:{type:Number},
//     TodaySoldAmount:{type:Number},
//     TodayTargetSaleAmount:{type:Number},
//     TotalTargetSaleAmount:{type:Number},
//     TotalSoldQuentity:{type:Number},
//     TodaySoldQuentity:{type:Number},
//     TodayTargetQuentity:{type:Number},
//     TotalTargetQuentity:{type:Number},
//     TodayReturn:{type:Number},
//     TotalReturn:{type:Number},
//     InStockQuentity:{type:Number},
//     InStockAvailableQuentity:{type:Number},
//     TodayTotaladCost:{type:Number},
//     TodayadCostPerSale:{type:Number},
//     TotalAdCostPerSale:{type:Number},
//     TotalAdCost:{type:Number},
//     TodayOtherCost:{type:Number},
//     TodayOtherCostPerSale:{type:Number},
//     TotalOtherCostPerSale:{type:Number},
//     TotalOtherCost:{type:Number},
//     TodayDelibaryCost:{type:Number},
//     TodayDelibaryCostPersale:{type:Number},
//     TotalDelibaryCostPersale:{type:Number},
//     TotalDelibaryCost:{type:Number},
//     TodayTotalProfit:{type:Number},
//     TodayProfitPerSale:{type:Number},
//     TotalProfitPerSale:{type:Number},
//     TotalProfit:{type:Number},
//     TodayTargetProfit:{type:Number},
//     TotalTargetProfit:{type:Number},
//     TotalPackgingCost:{type:Number},
//     PackgingCostPerProduct:{type:Number},
//     TotalPrductBuyingCost:{type:Number},
//     BuyingCostPerProduct:{type:Number},
//     TotalShippingCost:{type:Number},
//     ShippingCostPerProduct:{type:Number},
//     TotalProcessingCost:{type:Number},
//     ProcessingCostPerProduct:{type:Number},
//     isLock:{type:Boolean,default:false}
//   });

const MyTargets = new mongoose.Schema({
    targetStartDate : {type:String},
    targetEndDate : {type:String},
    targetAmount: {type:Number},
    targetName : {type:String}
    },{ timestamps: true });

const MyTargetGoles = mongoose.model('MyTarget', MyTargets, 'AllGoleset');
export default MyTargetGoles;