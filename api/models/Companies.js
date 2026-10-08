import { Schema, model } from "mongoose";

const CompanySchema = new Schema(
    {
        companyEmail: {type:String,unique:true},
        companyPassword: {type:String},
        companyLogo:{type:String},
        CloudinaryPublicId:{type:String},
        verifyCode:{type:Number},
        isVerify:{
            type:Boolean,
            default:false
        },
        companyName:{type:String},
        industry:{type:String},
        numberofEmployees:{type:String},
        isOnboarded: { type: Boolean, default: false },
        resetPasswordToken:   { type: String },
        resetPasswordExpires: { type: Date },
        stripeCustomerId:   { type: String },
        subscriptionStatus: { type: String, default: "none" },
        planId:             { type: String, default: null },
        billingInterval:    { type: String, default: null },
        currentPeriodEnd:   { type: Date },
        trialEndsAt:        { type: Date },
        paddleCustomerId:     { type: String },
        paddleSubscriptionId: { type: String },
    },

    {timestamps:true},
);

export default model("Companies", CompanySchema, "Companies");

