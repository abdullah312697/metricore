import { useEffect, useState } from 'react';
import RevenueChart from './RevenueChart';
import {Altaxios} from '../../Altaxios';
import { useParams } from 'react-router-dom';
import GoalList from './GoalList';
import avaterProfiel from '../../../images/profile/male.png';
import { useAuth } from "../../../context/AuthContext";
import GroupChats from './GroupChats';
import { useOnlineUsers } from "../../../hooks/useOnlineUsers";
import EmployeeList from "./EmployeeList";
import ProductList from "./ProductList";

const Main = () => {
  const [currentEmployee,setCurrentEmployee] = useState([]);
  const {user} = useAuth();
  const [todayOverView,setTodayOverView] = useState({
        TotalUnitsSold: 0,
        TotalRevenue: 0,
        EstimatedProfit: 0,
  });
  const { isOnline } = useOnlineUsers();
  const {companyName} = useParams();
 const [currentProducs,setCurrentProducts] = useState([]);



        useEffect(()=>{
            const getAllProducts = async () => {
            try{
              const product = await Altaxios.get("/newproduct/getallProducts/");
            if(product.status === 200){
              setCurrentProducts(product.data.data || []);
            }
          }catch(error){
            if(error.response){
              console.log(error.response.data.message);
            }else{
              console.log(error);
            }
          }
          };
          getAllProducts();
      
        },[]);
  
  useEffect(()=>{
      const getAllEmployee = async () => {
      try{
        const Emplyee = await Altaxios.get("/newemplyee/getallEmployee/");
      if(Emplyee.status === 200){
        setCurrentEmployee(Emplyee.data.data)
      }
    }catch(error){
      if(error.response){
        console.log(error.response.data.message);
      }else{
        console.log(error);
      }
    }
    };
    getAllEmployee();

  },[]);

  useEffect(() => {
    const fetchDailySummary = async () => {
    const res = await Altaxios.get("/chart/dailySummary");
      setTodayOverView(res.data.data);
    };
    fetchDailySummary();
  },[]);
//preview photos  start


  return (
    <div className='MainContainer'>
      <div className='live_msg_and_salse'>
        <div className='live_message_main'>
          <GroupChats/>
        </div>
        <div className='live_salse_main'>
          <div className='live_salse_header'>Today’s Overview</div>
          <div className='live_sales_innerContainer'>
            <div className='live_salesContainerGroup' style={{border:'none',color:'#0af'}}>
              <h2>{todayOverView?.TotalUnitsSold}</h2>
              <h6>Units Sold</h6>
            </div>
            <div className='live_salesContainerGroup' style={{color:'#cd9300'}}>
              <h2>{todayOverView?.TotalRevenue}</h2>
              <h6>Revenue</h6>
            </div>
            <div className='live_salesContainerGroup' style={{color:'#00cbc0'}}>
              <h2>{todayOverView?.EstimatedProfit}</h2>
              <h6>Estimated Profit</h6>
            </div>
          </div>

        </div>
      </div>
      <div className='MainContianerInner'>
        <div className='MainContainerChunk'>
          <RevenueChart/>
        </div>
        <div className='MainContainerChunk'>
          <EmployeeList
            employees={currentEmployee}
            currentUserId={user?.employeeId}
            companyName={user?.companyName || companyName}
            avatar={avaterProfiel}
            isOnline={isOnline}
          />
        </div>
        <div className='MainContainerChunk'>
          <GoalList/>
        </div>
        <div className='MainContainerChunk'>
            <ProductList
              products={currentProducs}
              companyName={user?.companyName || companyName}
            />
        </div>
      </div>
    </div>
  );
};

export default Main;