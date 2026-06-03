import { useCallback, useEffect, useRef, useState } from 'react';
import RevenueChart from './RevenueChart';
import CloseIcon from '@mui/icons-material/Close';
import {Altaxios} from '../../Altaxios';
import { Link } from 'react-router-dom';
import View from './View';
//import PersonIcon from '@mui/icons-material/Person';
import AddIcon from '@mui/icons-material/Add';
import avaterProfiel from '../../../images/profile/male.png';
import { useAuth } from "../../../context/AuthContext";
import GroupChats from './GroupChats';
import groupIcon from '../../../images/logo/logo192.png'

const Main = () => {
  const [employeePopup,setEmployeePopup] = useState(false);
  const [position, setPosition] = useState({ x: 200, y: 200 });
  const [resMessage,setResMessage] = useState("");
  const [resMsgStyle,setResMsgStyle] = useState({});
  const [isDragging, setIsDragging] = useState(false);
  const offset = useRef({ x: 0, y: 0 });
  const [currentEmployee,setCurrentEmployee] = useState([]);
  const [emplyeeProfile,setEmplyeeProfile] = useState(null);
  const {user} = useAuth();

  const employeeRoal = ["Owner",
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
                ];
  const [emplyeeAddData,setEmployeeData] = useState({
    YemplyeeName:"",
    YemplyeePhone:"",
    YemplyeeEmail:"",
    YemplyeeLeaving:"",
    EmplyeeSellary:"",
    EmplyeeJoinDate:"",
    EmplyeeRoal:""
  });
  const [isFullData,setIsFullData] = useState(true);
  const inputFile = useRef(null);
  const preview = useRef(null);
  const ToggleEmplyeePopup = () => {
    if(employeePopup){
      setEmployeePopup(false)
    }else{
      setEmployeePopup(true)
    }
  }
 const [currentProducs,setCurrentProducts] = useState([]);

  useEffect(() => {
  if(
    emplyeeAddData.YemplyeeName !== "" && 
    emplyeeAddData.YemplyeePhone !== "" && 
    emplyeeAddData.YemplyeeEmail !== "" && 
    emplyeeAddData.YemplyeeLeaving !== "" && 
    emplyeeAddData.EmplyeeSellary !== "" && 
    emplyeeAddData.EmplyeeJoinDate !== "" && 
    emplyeeAddData.EmplyeeRoal !== "" && 
    emplyeeProfile !== null
  ){
    setIsFullData(false);
  }
  },[
    emplyeeAddData.YemplyeeName,
    emplyeeAddData.YemplyeePhone,
    emplyeeAddData.YemplyeeEmail,
    emplyeeAddData.YemplyeeLeaving,
    emplyeeAddData.EmplyeeSellary,
    emplyeeAddData.EmplyeeJoinDate,
    emplyeeAddData.EmplyeeRoal,
    emplyeeProfile
  ]);


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
//preview photos  start
const uploadReviewPhotos = (e) => {
  preview.current.innerHTML = "";
  let files = e.currentTarget.files[0];
  if(files){
    setEmplyeeProfile(files);
  function readAndPreview(file) {
    if (/\.(jpe?g|png|gif)$/i.test(file.name)) {
      const reader = new FileReader();
      reader.addEventListener(
        "load",
        () => {
          const image = new Image();
          image.className = "productPreviwstyle";
          image.title = file.name;
          image.src = reader.result;
          preview.current.appendChild(image);
        },
        false,
      );
      reader.readAsDataURL(file);
  
    }
  }
  readAndPreview(files);
  }
}
//preview photos  end
  const handleMouseDown = (e) => {
    setIsDragging(true);
    offset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    document.body.style.userSelect = "none"; // Prevents text selection
  };
  // Use useCallback to stabilize these functions

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - offset.current.x,
        y: e.clientY - offset.current.y,
      });
    },
    [isDragging] // Dependency array to ensure it updates correctly
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    document.body.style.userSelect = "auto"; // Restore text selection
  }, []);

  // Manage event listeners properly
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]); 

  const setEmplyeeData = (e) => {
    const name = e.target.name;
    const value = e.target.value;
    setEmployeeData({
      ...emplyeeAddData,
      [name] : value
    })
  };

  const AddnewEmplyee = async() => {
    try{
    setIsFullData(true);
    const EmploeeData = new FormData();
    EmploeeData.append("YemplyeeName",emplyeeAddData.YemplyeeName);
    EmploeeData.append("YemplyeePhone",emplyeeAddData.YemplyeePhone);
    EmploeeData.append("YemplyeeEmail",emplyeeAddData.YemplyeeEmail);
    EmploeeData.append("YemplyeeLeaving",emplyeeAddData.YemplyeeLeaving);
    EmploeeData.append("EmplyeeSellary",emplyeeAddData.EmplyeeSellary);
    EmploeeData.append("EmplyeeJoinDate",emplyeeAddData.EmplyeeJoinDate);
    EmploeeData.append("EmplyeeRoal",emplyeeAddData.EmplyeeRoal);
    EmploeeData.append("files",emplyeeProfile);
    const adEmplyees = await Altaxios.post('/newemplyee/addemplyee',EmploeeData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
      if(adEmplyees.status === 200){
        setResMessage(adEmplyees.data.message);
        const newEmployee = adEmplyees.data.data;
        setCurrentEmployee((prev) => [...prev, newEmployee]);
        setResMsgStyle({color:"green",opacity:1,marginTop:"15px"});
        setEmployeeData({
            YemplyeeName:"",
            YemplyeePhone:"",
            YemplyeeEmail:"",
            YemplyeeLeaving:"",
            EmplyeeSellary:"",
            EmplyeeJoinDate:"",
            EmplyeeRoal:""
        });
        setEmplyeeProfile(null);
        inputFile.current.value = "";
        preview.current.innerHTML = "";
      setTimeout(() => {
          setResMsgStyle({opacity:0,marginTop:"0px"});
      },3000);
     }
    }catch(error){
      if(error.response){
      setResMessage(error.response.data.message);
      setResMsgStyle({color:"red",opacity:1,marginTop:"15px",})
      setTimeout(() => {
          setResMsgStyle({opacity:0,marginTop:"0px"})
      },3000);
      setIsFullData(false);
      }else{
        setResMessage("Something went wrong!");
        console.log(error);
      }
    }
    // console.log(addEmply);
  };

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
              <h2>400</h2>
              <h6>Units Sold</h6>
            </div>
            <div className='live_salesContainerGroup' style={{color:'#cd9300'}}>
              <h2>40000</h2>
              <h6>Revenue</h6>
            </div>
            <div className='live_salesContainerGroup' style={{color:'#00cbc0'}}>
              <h2>4000</h2>
              <h6>Estimated Profit</h6>
            </div>
          </div>

        </div>
      </div>
      <div className='addEmplyeePopup' style={{top:`${position.y}px`,left:`${position.x}px`,display: employeePopup ? 'block' : 'none'}}  
      onMouseDown={handleMouseDown}>
        <CloseIcon onClick={ToggleEmplyeePopup}/>
        <div className='addEmplyeeInner'>
          <div className='YemplyeeDataContainer'>
            <div className='newPerentEmployee'>
              <h2>Add New Emplyee</h2>
            </div>
              <div className='inputDataForYemployee'>
                <label htmlFor='yemplyeename__add'>Yemplyee name</label>
                <input type='text' id="yemplyeename__add" name="YemplyeeName"  value={emplyeeAddData.YemplyeeName} placeholder='yemplyee name' onChange={setEmplyeeData}/>
              </div>
              <div className='inputDataForYemployee'>
                <label htmlFor='yemplyeephone__add'>Phone number</label>
                <input type='text' id="yemplyeephone__add" name="YemplyeePhone"  value={emplyeeAddData.YemplyeePhone} placeholder='Phone number' onChange={setEmplyeeData}/>
              </div>
              <div className='inputDataForYemployee'>
                <label htmlFor='yemplyeeemail__add'>Email Address</label>
                <input type='text' id="yemplyeeemail__add" name="YemplyeeEmail" value={emplyeeAddData.YemplyeeEmail} placeholder='Email address' onChange={setEmplyeeData}/>
              </div>
              <div className='inputDataForYemployee'>
                <label htmlFor='yemplyeeleaving__add'>Living Address</label>
                <input type='text' id="yemplyeeleaving__add" name="YemplyeeLeaving" value={emplyeeAddData.YemplyeeLeaving} placeholder='Living address' onChange={setEmplyeeData}/>
              </div>
              <div className='inputDataForYemployee'>
                <label htmlFor='yemplyeesallary__add'>Sellary</label>
                <input type='number' id="yemplyeesallary__add" name="EmplyeeSellary" value={emplyeeAddData.EmplyeeSellary} placeholder='Enter Yemplyee Sellay' onChange={setEmplyeeData}/>
              </div>
              <div className='inputDataForYemployee'>
                <label htmlFor='yemplyeejoindate__add'>Joining date</label>
                <input type='date' style={{colorScheme:"auto",fontSize:'16px',cursor:'pointer',filter:'invert(1)',color:'#000000e3',border:'1px solid #00000061'}} id="yemplyeejoindate__add" name="EmplyeeJoinDate" value={emplyeeAddData.EmplyeeJoinDate} placeholder='Joining date' onChange={setEmplyeeData}/>
              </div>
              <div className='inputDataForYemployeeRoal'>
                <h4>Yemplyee Roal</h4>
                <div className='yemplyeeRadioContianer'>
                  {
                    employeeRoal.map((d) => (
                      <div className='YemplyeeroalContainer' key={d}>
                        <label htmlFor={`yemplyeeroal__${d}`}>{d}</label>
                        <input type='radio' id={`yemplyeeroal__${d}`} name="EmplyeeRoal" value={d} checked={emplyeeAddData.EmplyeeRoal === d} onChange={setEmplyeeData}/>
                      </div>
                    ))
                  }
              </div>
              </div>
              <div className='inputDataForYemployee'>
                  <label htmlFor='yemplyee__Profile'>Select Profile</label>
                  <input type='file' id="yemplyee__Profile" name="EmplyeeProfile" multiple={false} onChange={uploadReviewPhotos} ref={inputFile}/>
              </div>
              <div id="imageViewrlist" style={{width:'150px',marginTop:'10px'}} ref={preview}></div>
              <button onClick={AddnewEmplyee} disabled={isFullData}>Submit</button>
              <div className='showErrorOrSuccess' style={resMsgStyle}>{resMessage}</div>
          </div>
        </div>
      </div>
      <div className='MainContianerInner'>
        <div className='MainContainerChunk'>
          <RevenueChart/>
        </div>
        <div className='MainContainerChunk'>
          <div className='employeeTopHeader'>
            {currentEmployee?.length > 0 && (<span>Total Emplyee <strong>({currentEmployee?.length - 1})</strong></span>)}
            <button onClick={ToggleEmplyeePopup}>Add Emplyee</button>
          </div>
          <div className='mainInnerEmployee'>
            <div className='EmployeeHeader'>
              <ul>
                <li>Profile</li>
                <li>Name</li>
                <li>Roal</li>
                <li>Active</li>
                <li>Sellary</li>
                <li>Action</li>
              </ul>
            </div>
            <div className='EmplyeeListContainer'>
              {
                currentEmployee?.length > 0 ? currentEmployee.filter(emp => emp._id !== user?.employeeId).map(Employee => (
            <ul key={Employee?._id}>
                <li><img src={Employee?.EmplyeeProfile ?? avaterProfiel} alt="Employee Profile" width="40px" height="40px" style={{borderRadius:'4px'}}/></li>
                <li>{Employee?.YemplyeeName ?? "Admin"}</li>
                <li>{Employee?.EmplyeeRoal ?? "Admin"}</li>
                <li>{Employee?.activeStatus ? "Active" : "InActive"}</li>
                <li>{Employee?.EmplyeeSellary ?? "0,0000"}</li>
                <li><Link to={`/theemployee/${Employee?._id}`}>View</Link></li>
              </ul>
                ))
                : (
                          <div className='ProductAddInner' style={{cursor:'pointer'}}>            
                            <div className='PorductAddInnerContainer' onClick={ToggleEmplyeePopup}>
                              <h4>Add Employee</h4>
                              <AddIcon/>
                            </div>
                          </div>
                          )
              }
            </div>
          </div>
        </div>
        <div className='MainContainerChunk'>
          <View/>
        </div>
        <div className='MainContainerChunk'>
                    <div className='cashFlowHeading'>
                      <h1 className='biusinness__cashflowheading'>Porduct ({currentProducs.length || 0})</h1>
                      <Link to="/addproduct">Add Product</Link>
                    </div>
                    <div className="ClientProductContainer">
                      <div className="clientProductInnerHeader" style={{height:'32px',padding:'0px'}}>
                        <div className="ProductInnerMainHeadr">
                          <div className="clientHeadr__productName" style={{left:'58px',top:'8px',fontSize:'14px'}}>Name</div>
                          <div className="clientHeadr__productPrice" style={{left:'224px',top:'8px',fontSize:'14px'}}>Price</div>
                          <div className="clientHeadr__productUnite" style={{left:'361px',top:'8px',fontSize:'14px'}}>Units</div>
                          <div className="clientHeadr__productImg" style={{left:'459px',top:'8px',fontSize:'14px'}}>Image</div>
                          <div className="clientHeadr__productAction" style={{left:'540px',top:'8px',fontSize:'14px'}}>Action</div>
                        </div>
                      </div>
                      <div className="clientProductInnerMain" style={{height:'223px'}}>
                        {
                          currentProducs.length > 0 ? currentProducs.map((pro, index) => (
                          <div  className="clientProductInnerCont" key={pro._id}>
                            <div className="client__productName" style={{left:'6px',width:'160px'}}>{pro.ProductName}</div>
                            <div className="client__productPrice" style={{left:'195px'}}>{pro.ProductPrice}</div>
                            <div className="client__productInStock" style={{left:'331px'}}>{pro.InStockQuentity}</div>
                            <div className="client__productImg" style={{left:'465px'}}><img src={pro.productImgFile} alt="ProductImg" style={{width:'36px',height:'40px'}}/></div>
                            <Link className="client__productAction" to={`/viewproduct/${pro._id}`} style={{left:'540px'}}>View</Link>
                          </div> 
                          ))
                          : (
                          <div className='ProductAddInner'>
                            <Link to="/addproduct">
                            <div className='PorductAddInnerContainer'>
                              <h4>Add Product</h4>
                              <AddIcon/>
                            </div>
                            </Link>
                          </div>
                          )
                        }
                      </div>
                    </div>
        </div>
      </div>
    </div>
  );
};

export default Main;