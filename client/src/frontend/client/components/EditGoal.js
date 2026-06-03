import React, { useEffect, useState } from 'react'
import {Altaxios} from '../../Altaxios';
import './view.css';
import numWords from 'num-words';
import { Link, useParams } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useAuth } from "../../../context/AuthContext";

function EditGoal() {
    const { goalId } = useParams();
    const {user} = useAuth();
    const [myTarget,setMyTarget] = useState({
        targetStartDate:"",
        targetEndDate:"",
        targetAmount:"",
        targetName:""
    });
    const [myTargetCurrent,setMyTargetCurrent] = useState({
        targetStartDate:"",
        targetEndDate:"",
        targetAmount:"",
        targetName:""
    });

    const [resMessage,setResMessage] = useState("");
    const [resMsgStyle,setResMsgStyle] = useState({});
    const [loading,setLoading] = useState(false);

let isChangeData = true;



if( myTarget.targetStartDate !== "" && 
    myTarget.targetEndDate !== "" &&
    myTarget.targetAmount !== "" &&
    myTarget.targetName !== "" &&
    (myTarget.targetStartDate !== myTargetCurrent.targetStartDate ||
    myTarget.targetEndDate !== myTargetCurrent.targetEndDate ||
    Number(myTarget.targetAmount) !== myTargetCurrent.targetAmount ||
    myTarget.targetName !== myTargetCurrent.targetName)
){
    isChangeData = false
}else{
    isChangeData = true
}

    const setTargets = (e) => {
        const value = e.target.value;
        const name = e.target.name;
        if(name === "targetAmount"){
            if(value.length <= 17){
                setMyTarget({
                    ...myTarget,
                    [name] : value
                })        
            }
        }else{
            setMyTarget({
                ...myTarget,
                [name] : value,
            })    
        }
    };
     
    useEffect(() => {
        Altaxios.get(`/setgole/getOneGoal/${goalId}`).then(res => {
          if(res.status === 200){
            setMyTargetCurrent({
                targetStartDate:res.data.targetStartDate,
                targetEndDate:res.data.targetEndDate,
                targetAmount:res.data.targetAmount,
                targetName:res.data.targetName,
            });
            setMyTarget({
                targetStartDate:res.data.targetStartDate,
                targetEndDate:res.data.targetEndDate,
                targetAmount:res.data.targetAmount,
                targetName:res.data.targetName,
            })
          }
        })
      },[goalId]);
    
    const updateDataToDatabase = async() => {
        setLoading(true);
        try{
            await Altaxios.put(`/setgole/updateGoles/${goalId}`,myTarget).then((res) => {
                if(res.status === 200){
                    setResMessage(res.data.message);     
                    setResMsgStyle({color:"green",opacity:1,marginTop:"15px"});
                    setLoading(false);
                    const updatedData = res.data.data;
                    setMyTarget({                        
                        targetStartDate: updatedData?.targetStartDate ?? myTargetCurrent.targetStartDate,
                        targetEndDate: updatedData?.targetEndDate ?? myTargetCurrent.targetEndDate,
                        targetAmount: updatedData?.targetAmount ?? myTargetCurrent.targetAmount,
                        targetName: updatedData?.targetName ?? myTargetCurrent.targetName,
                    });
                    setMyTargetCurrent({                        
                        targetStartDate: updatedData?.targetStartDate,
                        targetEndDate: updatedData?.targetEndDate,
                        targetAmount: updatedData?.targetAmount,
                        targetName: updatedData?.targetName,
                    });

                    setTimeout(() => {
                        setResMsgStyle({opacity:0,marginTop:"0px"});
                    },3000);
                }else{
                    setResMessage(res.data);
                    setResMsgStyle({color:"red",opacity:1,marginTop:"15px"});
                    setLoading(false);
                    setMyTarget({                        
                        targetStartDate: myTargetCurrent.targetStartDate,
                        targetEndDate: myTargetCurrent.targetEndDate,
                        targetAmount: myTargetCurrent.targetAmount,
                        targetName: myTargetCurrent.targetName,
                    });
                    setTimeout(() => {
                        setResMsgStyle({opacity:0,marginTop:"0px"});
                    },3000);        
                }
            })
        }catch(e){
            console.log(e)
        };
    };

function formatLargeNumber(number) {
    if (number >= 1e15) {
        return `${(number / 1e15).toFixed(0)} quadrillion`;
      } else if (number >= 1e12) {
        return `${(number / 1e12).toFixed(0)} trillion`;
      } else if (number >= 1e9) {
        return `${(number / 1e9).toFixed(0)} billion`;
      } else if (number >= 1e6) {
        return `${(number / 1e6).toFixed(0)} million`;
      } else if (number >= 1e3) {
        return `${(number / 1e3).toFixed(0)} thousand`;
      } else {
        return `${numWords(number)}`; // For smaller numbers, convert to words
      }
}


  return (
    <div className='setTargetMain'>
        <div className='setTargetInner'>
            <Link to={`/company/${user?.companyName}`} className="backToPrevious"><ArrowBackIcon/></Link>
            <h1>Update Your Target Goal</h1>
            <div className='setCurrentTarget'>
                <div className='setCurrentTargetInner'>
                <div className='setTargetDateInput'>
                    <h2>Update Target Start Date</h2>
                    <input type='date' id="targetStartDate" value={myTarget.targetStartDate} name="targetStartDate" onChange={setTargets}/>
                </div>
                <div className='setTargetDateInput'>
                    <h2>Update Target End Date</h2>
                    <input type='date' id="setTargetDate" value={myTarget.targetEndDate} name="targetEndDate" onChange={setTargets}/>
                </div>
                <div className='setTargetAmountInput'>
                    <div className='setTargetAmountPopup'>
                        <h2>Update Target Amount</h2>
                        <span>{myTarget.targetAmount !== "" ? formatLargeNumber(Number(myTarget.targetAmount)) : ("")}</span>
                    </div>
                    <input type='number' value={myTarget.targetAmount} placeholder='$1,000,000,000,000' id="setTargetAmount" name="targetAmount" onChange={setTargets}/>
                </div>
                <div className='setTargetAmountInput'>
                    <h2>Update Target Name</h2>
                    <input type='text' value={myTarget.targetName} placeholder='set your target name' id="targetName" name="targetName" onChange={setTargets}/>
                </div>
                </div>
                <div className='setTargetButton'>
                    <button onClick={updateDataToDatabase} disabled={isChangeData}> {!loading ? "Update Goal" : "Updating..."}</button>
                </div>
            </div>
            <div className='showErrorOrSuccess' style={resMsgStyle}>{resMessage}</div>
        </div>
    </div>
  )
}

export default EditGoal