import { Schema, model, mongoose } from "mongoose";


const ProductCost = new Schema(
    {
        companyId: { type: Schema.Types.ObjectId, ref: "Companies", required: true},
        ProductId: { type: Schema.Types.ObjectId, ref: "ClientProduct", required: true},
        SoldQuentity:{type:Number, default: 0},
        Return:{type:Number, default: 0},
        AdCost:{type:Number, default: 0},
        OtherCost:{type:Number, default: 0},
        DelibaryCostPersale:{type:Number, default: 0},
        PackgingCost:{type:Number, default: 0},
        PrductBuyingCost:{type:Number, default: 0},
        ShippingCost:{type:Number, default: 0},
        TargetSaleAmount:{type:Number, default: 0},
        extraFields: [
                        {
                            _id: false,
                            configId: { type: Schema.Types.ObjectId, ref: "ExtraFieldConfig", required: true },
                            value: { type: Number, default: 0 }
                        }
                    ]
    },
    { timestamps: true}
);

export default model("ProductsCost", ProductCost, "ProductCost");
