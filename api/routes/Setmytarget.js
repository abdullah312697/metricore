import express from 'express';
const router = express.Router();
import MyTargetGoles from '../models/MyTarget.js';

// setMy gole <>
router.post("/addNewGoles", async(req,res) => {
    try {
        const allData = req.body;
        if(allData.targetStartDate === "" || allData.targetEndDate === "" || 
            allData.targetAmount === "" || allData.targetName === ""
        ){
            res.status(201).json("Field must not be Empty!")
        }else{
            const updatedGoal = new MyTargetGoles({
                targetStartDate: allData.targetStartDate,
                targetEndDate: allData.targetEndDate,
                targetAmount: allData.targetAmount,
                targetName: allData.targetName,
            });
            await updatedGoal.save();
            res.status(200).json("Your gole set Successfully")
        }
    }catch (error) {
        console.log(error);
        return res.status(201).json("Failed to set Gole data!");
    }
});
//setMy gole </>

// getMy gole <>
router.get("/getGoleData", async(req,res) => {
    try {
        const getAllData = await MyTargetGoles.find({});
        if(getAllData){
            res.status(200).json(getAllData);
        }else{
            res.status(201).json("faild to get data!");
        }
    }catch (error) {
        console.log(error);
        return res.status(201).json("Failed to retrive data!");
    }
});
//getMy gole </>

//get one goal <>
router.get("/getOneGoal/:goalId", async(req, res) => {
    try {
        const { goalId } = req.params;
        const getViewGoal = await MyTargetGoles.findById(goalId);
            if(getViewGoal){
                res.status(200).json(getViewGoal);
            }else{
                res.status(201).json("data not found");
            }
    }catch (error) {
        console.log(error);
        return res.status(201).json("Failed to get data!");
    }
})
//get one goal </>

// update goal <>
router.put("/updateGoles/:goalId", async(req, res) => {
    try {
        const { goalId } = req.params;
        const getViewGoal = await MyTargetGoles.findByIdAndUpdate(goalId, {$set:req.body}, {new:true,upsert:true});
            if(getViewGoal){
                res.status(200).json({data:getViewGoal, message:"Goal update Successfully!"});
            }else{
                res.status(201).json("Sorry! something wrong!");
            }
    }catch (error) {
        console.log(error);
        return res.status(201).json("Failed to Update Goal!");
    }
})
//update goal </>

//delete goal <>
router.delete("/deleteGoal/:deleteId", async(req, res) => {
    try {
        const { deleteId } = req.params;
        const getViewGoal = await MyTargetGoles.findByIdAndDelete(deleteId);
            if(getViewGoal){
                res.status(200).json(getViewGoal);
            }else{
                res.status(201).json("Sorry! something wrong!");
            }
    }catch (error) {
        console.log(error);
        return res.status(201).json("Failed to Delete Goal!");
    }
})
//delete goal </>

export default router;