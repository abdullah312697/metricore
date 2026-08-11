import express from 'express';
const router = express.Router();
import CustomerOrders from '../models/Order.js';
import { createTransport } from 'nodemailer';
import { format } from 'date-fns';

// add new order <>
router.post("/addNewOrder", async(req,res) => {
    try {
        const allData = req.body;
        if(allData.areaName === "" || allData.block === "" || allData.street === "" ||
            allData.houseNo === "" || allData.fullname === "" || allData.mobilenumber === "" ||
            allData.email === ""
        ){
            res.status(201).json({message:"Field must not be Empty!"})
        }else{
            const uploadData = new CustomerOrders(allData);        
            const savedData = await uploadData.save();
            if(savedData){
                res.status(200).json({message: 'Thanks for Purchase!'});
                const formattedDate = format(savedData.createdAt, 'MMMM do, yyyy, h:mm a');
                const transporter = createTransport({
                    service : "gmail",
                    port:587,
                    secure:false,
                    auth: {
                        user : "metricore.ecommerce@gmail.com",
                        pass : "ugbsamafjwcfkerp"
                    }
                });

                const mailOptions = {
                    from: "metricore.ecommerce@gmail.com",
                    to: savedData.email,
                    subject: "Order Information",
                    html: `
                    <div style="background-color:#011627; max-width:100%; height:auto; padding:30px 0; border-radius:10px; font-family: sans-serif;">
                        <div style="width:100%; height:60px; border-bottom:1px solid #ccc6; text-align:center; color:#ff9900;">
                            <h1 style="color:#ff9900; margin: 0;">metricore</h1>
                        </div>
                        <div style="width: 100%; padding: 40px; color: #ccc9;">
                            <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #ccc6;">
                                <h2 style="color:#ff9900; margin: 0 0 10px 0;">Dear ${savedData.fullname}</h2>
                                <h4 style="margin: 0 0 10px 0; font-size: 18px; color:#ffb100;">Thank you for purchasing from nothun.com</h4>
                                <p style="margin: 0; color: #ccccccc9;">We are delighted to inform you that your order <mark>#${savedData._id}</mark> has been successfully completed.</p>
                            </div>
                            <div style="margin-bottom: 20px; border-bottom: 1px solid #ccc6; padding-bottom: 15px;">
                                <h3 style="margin: 0 0 10px 0; color: rgb(183 120 0);">Order Summary:</h3>
                                <p style="margin: 0 0 10px 0; color:#ffb100; font-size:13px;"><strong style="color:#cccccc;">Order Number:</strong> ${savedData._id}</p>
                                <p style="margin: 0 0 10px 0; color:#ffb100; font-size:13px;"><strong style="color:#cccccc;">Order Date:</strong> ${formattedDate}</p>
                                <div style="margin-top: 15px; width:100%; height:auto; padding-top: 15px; border-top: 1px solid #ccc6;">
                                    <h3 style="margin: 0 0 10px 0; color:#ff9900;">Items Purchased:</h3>
                                <div style="display:flex;align-items:flex-start;flex-flow: wrap;>
                                    ${savedData.colorOfQuentity.map(d => (`
                                        <div style="border:1px solid #ccc3;border-radius: 5px; margin: 0px 10px 10px 10px;">
                                            <div style="display: flex; align-items: flex-start; flex-direction: column; padding: 10px;">
                                                <span style="font-size: 10px; color: #00ff0a; font-weight: 600;">${d.colorQuentity}<sup>X</sup></span>
                                                <img src="${d.colorImg}" alt="product" style="width: 40px; margin-right: 10px;" />
                                                <span style="font-size: 10px; color: #00ff0a; font-weight: 600;">${d.colorName}</span>
                                            </div>
                                            <div>
                                                <h4 style="margin: 10px 0 5px 10px; color: rgb(0, 120, 212);">Sizes:</h4>
                                                ${
                                                    d?.size ? Object.entries(d.size).map(([key, value]) => (`
                                                    <div style="color: #bb8600; border-top: 1px solid #ccc3; padding: 5px 0; font-size: 13px; font-weight: bold; display: flex; align-items: center; justify-content: space-around;">
                                                        <span style="margin-left:10px">${key}:</span> <span style="margin-left:5px">${value}pc</span>
                                                    </div>`
                                                    )).join('') : 
                                                    `<p>One Size</p>`
                                                }
                                            </div>
                                        </div>`
                                    )).join('')}
                                </div>
                                    <p style="margin: 0; font-size: 22px; font-weight: bold; color:#ffb100;"><strong>Total Quantity:</strong> ${savedData.totalQuentity} Pieces</p>
                                    <p style="margin: 0; font-size: 22px; font-weight: bold; color:#ffb100;"><strong>Total Amount:</strong> ${savedData.grandTotal}KD</p>
                                </div>
                            </div>
                            <div style="margin-bottom: 15px; border-bottom: 1px solid #ccc6; padding-bottom: 15px;">
                                <h3 style="margin: 0 0 10px 0; color:#cccccc;">Shipping Information:</h3>
                                <p style="font-weight: bold; color:#ffb100;">${savedData.areaName}, Block: ${savedData.block}, Street: ${savedData.street}, Home no: ${savedData.houseNo}</p>
                            </div>
                            <div style="margin-bottom: 15px; border-bottom: 1px solid #ccc6; padding-bottom: 15px;">
                                <p style="color:#cccccc; font-weight: bold;">You can expect to receive your product within 1/2 days.</p>
                                <p style="color:#ffb100;"><strong style="color: #cccccc;">Customer Support:</strong> If you have any questions, contact us at nothun.ecommerce@gmail.com or <a href="https://www.nothun.com/contact">nothun.com</a></p>
                                <p style="color:#ffb100;"><strong style="color: #cccccc;">Feedback:</strong> We value your feedback. Please share your experience with us.</p>
                                <p style="color:#ffb100;">Thank you again for choosing <a href="http://www.nothun.com">nothun.com</a>. We look forward to serving you again!</p>
                            </div>
                            <div>
                                <p style="color:#cccccc; font-weight: bold;">Best regards,</p>
                                <p style="color:#ffb100;">Mohtasim Rahman</p>
                                <p style="color:#ffb100;">Customer Service Representative</p>
                                <p style="color:#ffb100;">Nothun</p>
                                <p><a href="http://www.nothun.com">nothun.com</a></p>
                            </div>
                        </div>
                        <div style="width:100%; height:60px; border-top:1px solid #ccc6; text-align:center; color:#df8807ba; line-height: 60px;">&copy; 2024 Nothun. All rights reserved.</div>
                    </div>
                    `
                };
            transporter.sendMail(mailOptions, (err) => {
                    if(err){
                        console.log(err);
                    }else{
                        console.log("Email is send succussfully!");
                    }
                });
            }
        }                
    }catch (error) {
        console.log(error);
        return res.status(201).json({message:"Failed to Confirm Order!"});
    }
});
//add new order </>

//retrive orders<>
router.get("/retriveOrder",async(req,res) => {
    try{
        const { page = 1, limit = 50, sort = '-createdAt' } = req.query;
        const orders = await CustomerOrders.find()
          .sort(sort)
          .limit(parseInt(limit))
          .skip((parseInt(page) - 1) * parseInt(limit));
    
        const total = await CustomerOrders.countDocuments();
    
        res.status(200).json({ orders, total });
        }catch(error){
        console.log(error);
        return res.status(201).json("Faild to retrive order data!");
    }
});
//retrive orders</>
// Define the next status mapping
const nextStatusMapping = {
    'Pending': ['Processing'],
    'Processing': ['UnderDelivery'],
    'UnderDelivery': ['Completed'],
    'Completed': []
};
//update order status by QR code<>
router.put("/updateOrderStatusbyQr/:orderId/:status",async(req,res) => {
    try{
        const { orderId, status } = req.params;
            const order = await CustomerOrders.findById(orderId);
            if(!order) {
                return res.status(404).json('Order not found');
            }
            const validNextStatuses = nextStatusMapping[order.orderStatus];
            if (!validNextStatuses.includes(status)) {
                return res.status(400).json(`Cannot update status from ${order.status} to ${status}`);
            }
            const setStatus = await CustomerOrders.findByIdAndUpdate(orderId,
                {$set: {orderStatus:status}},{new:true});
                if(setStatus){
                    res.status(200).json(setStatus);
                }    
    }catch(error){
        console.log(error);
        return res.status(201).json("Faild to Change order status!");
    }
});
//update order status  by QR code</>
//update order status<>
router.put("/updateOrderStatus/:orderId/:status",async(req,res) => {
    try{
        const { orderId, status } = req.params;
        const feedback = req.body.FeedBack;
        if(feedback !== undefined && feedback !== ""){
            const setStatus = await CustomerOrders.findByIdAndUpdate(orderId,
                {$set: {orderStatus:status,FeedBack:feedback}},{new:true});
                if(setStatus){
                    res.status(200).json(setStatus);
                }
        }else{
            const order = await CustomerOrders.findById(orderId);
            if(!order) {
                return res.status(404).json('Order not found');
            }
            const setStatus = await CustomerOrders.findByIdAndUpdate(orderId,
                {$set: {orderStatus:status}},{new:true});
                if(setStatus){
                    res.status(200).json(setStatus);
                }    
        }
    }catch(error){
        console.log(error);
        return res.status(201).json("Faild to Change order status!");
    }
});
//update order status</>

//delete order<>
router.delete("/deleteOrderStatus/:orderId",async(req,res) => {
    try{
        const { orderId } = req.params;
        const setStatus = await CustomerOrders.findByIdAndDelete(orderId);
            if(setStatus){
                res.status(200).json(setStatus);
            }
    }catch(error){
        console.log(error);
        return res.status(201).json("Faild to Change order status!");
    }
});
//delete order</>
//get single order<>
router.get("/getOneOrderStatus/:orderId",async(req,res) => {
    try{
        const { orderId } = req.params;
        const setStatus = await CustomerOrders.findById(orderId);
            if(setStatus){
                res.status(200).json(setStatus);
            }else{
                res.status(201).json("data not found");
            }
    }catch(error){
        console.log(error);
        return res.status(201).json("Faild to Change order status!");
    }
});
//get single order</>
export default router;