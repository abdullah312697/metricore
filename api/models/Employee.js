import { Schema, model } from "mongoose";

 const EmplyeeSchima = new Schema({
    companyId: { type: Schema.Types.ObjectId, ref: "Companies", required: true },
    EmplyeeProfile:{type:String},
    CloudinaryPublicId:{type:String},
    YemplyeeName:{type:String},
    employeePosition:{type:String},
    YemplyeeEmail:{
      type:      String,
      required:  true,
      unique:    true,
      lowercase: true,
      trim:      true,
    },
    YemplyeePhone:{type:String},
    YemplyeeLeaving:{type:String},
    EmplyeeJoinDate:{type:String},
    EmplyeeRoal:{type:String,
                enum: [
                    "Owner",
                    "Admin",
                    "CEO",
                    "Manager",
                    "Supervisor",
                    "HR",
                    "Finance",
                    "Accountant",
                    "Sales",
                    "Marketing",
                    "Engineer",
                    "Technician",
                    "Driver",
                    "Worker",
                    "Support",
                    "Guest"
                ],
                default: "Owner"
    },
    employeeAccessPassword:{
        type:String,
        select: false,
    },
    currency:{type:String},
    EmplyeeSellary:{type:Number},
    FirstSelarry:{type:Number},
    lsatPaid:{type:String},
    savingsTotalMonth:{type:String},
    savingsPercentige:{type:String},
    TotalSeavings:{type:String},
    activeStatus:{type:Boolean, default:true},
    EmployeeProfileStatus: {
        type: String,
        enum: ["Active", "Suspended", "Warned", "Blocked", "Cancel"],
        default: "Active"
        },
    about: { type: String, default: "" },
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
    deviceTokens: [{ type: String }],
    isSuspended: { type: Boolean, default: false },
},{timestamps:true});

export default model("Employee", EmplyeeSchima, "Employee");
