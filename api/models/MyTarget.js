import { Schema, model } from "mongoose";

const MyTargets = new Schema({
    targetStartDate : {type:String},
    targetEndDate : {type:String},
    targetAmount: {type:Number},
    targetName : {type:String},
    companyId: { type: Schema.Types.ObjectId, ref: "Companies", required: true},
    },{ timestamps: true });

export default model('MyTarget', MyTargets, 'AllGoleset');
