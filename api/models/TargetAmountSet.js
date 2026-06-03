import { Schema, model } from "mongoose";

const TargetAmountSet = new Schema(
    {
        companyId: { type: Schema.Types.ObjectId, ref: "Companies", required: true},
        ProductId: { type: Schema.Types.ObjectId, ref: "ClientProduct", required: true},
        GoalId: { type: Schema.Types.ObjectId, ref: "MyTarget", required: true},
        TargetAmount: {type:Number, default:0},
        isLock:{type:Boolean, default:false},
    },
    { timestamps: true}
);

TargetAmountSet.index(
  { companyId: 1, GoalId: 1, ProductId: 1 },
  { unique: true }
);

export default model("TargetAmountSet", TargetAmountSet, "TargetAmountSet");