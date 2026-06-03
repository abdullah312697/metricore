import { useEffect, useState } from "react"
import {Altaxios} from '../../Altaxios';
import { Link, useNavigate, useParams } from "react-router-dom";
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

function ViewProduct() {
    const [allGoalsData,setAllGoalsData] = useState([]);
    const [currentProducs,setCurrentProducts] = useState({});
    const {productId} = useParams();
    const [isOpend,setIsOpend] = useState(false);
    const goback = useNavigate();
    useEffect(() => {
      Altaxios.get('/setgole/getGoleData').then((res) => {
        if(res.status === 200){
          setAllGoalsData(res.data);
        }
        })
    },[]);

      useEffect(()=>{
          const getAllProducts = async () => {
          try{
            const product = await Altaxios.get(`/newproduct/getSingleProduct/${productId}`);
          if(product.status === 200){
            setCurrentProducts(product.data.data)
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
    
      },[productId]);

      
      const findGola = currentProducs?.GoalIdentifire !== null && currentProducs?.GoalIdentifire !== undefined ? 
        currentProducs?.GoalIdentifire : [];
      const finalGolaData = allGoalsData.filter((goal) => (
        findGola.includes(goal._id)
      ));

      const DeletePorduct = async() => {
          try{
          const product = await Altaxios.delete(`/newproduct/deleteProduct/${productId}`,{
            withCredentials: true,
          });
          if(product.status === 200){
            goback("/addproduct");
            setIsOpend(false);
          }
        }catch(error){
          if(error.response){
            console.log(error.response.data.message);
          }else{
            console.log(error);
          }
        }
      }

    const PredeltePopup = () => {
      setIsOpend(true)
    };

    const cencelPopup = () => {
        setIsOpend(false)
    }


  return (
    <div className="clientAddproductMain">
      <div className="clientAddProductInner" style={{justifyContent:'center'}}>
  <div className='preDeletebtnContainer' style={{display:`${!isOpend ? 'none' : 'block'}`,left:'455px'}}>
    <div className="preDeletePopup">
        <h6>Are you sure to Delete!?</h6>
        <div className='deleteornotbutton'>
            <button className='nextnotsupportbtn' onClick={cencelPopup}>No</button>
            <button className='nextsupportbtn' onClick={DeletePorduct}>Yes</button>
        </div>
    </div>
    </div>

        <Link to="/addproduct"><ArrowBackIcon/></Link>
        <div className="clientAddProductLeft" style={{height:'560px'}}>
            <div className="addProductClientFrom">
              <div className="addProductInputClientMainInView">
                <div className="inputAllClientTitle InputClientMainInViewNameTitle">Product/Service Name:</div>
                <div className="inputAllClientInput InputClientMainInViewName">{currentProducs?.ProductName}</div>
              </div>
              <div className="addProductInputClientMainInView">
                <div className="inputAllClientTitle InputClientMainInViewPriceTitle">Product/Service Price:</div>
                <div className="inputAllClientInput InputClientMainInViewPrice">{currentProducs?.ProductPrice}</div>
              </div>
              <div className="addProductInputClientMainInView">
                <div className="inputAllClientTitle InputClientMainInViewImageTitle">Product/Service Image:</div>
                <img src={currentProducs?.productImgFile}  className="InputClientMainInViewImage" alt="productImage" />
              </div>
              <div className="addProductInputClientMainInView">
                <div className="inputAllClientTitle InputClientMainInViewQtyTitle">Total Quantity:</div>
                <div className="inputAllClientInput InputClientMainInViewQty">{currentProducs?.InStockQuentity}</div>
              </div>
              <div className="addProductInputClientMainInView">
                <div className="inputAllClientTitle InputClientMainInViewGolaTitle">Selected Goal:</div>
              <div className="clientAddProductGoalSelection" style={{margin:'15px 0px'}}>
                  {
                    finalGolaData.length > 0 ? finalGolaData.map((data) => (
                    <div className="GoalSelectionInner" key={data._id}>
                      <span style={{fontSize:'14px'}}>{data.targetName}</span>
                    </div>
                    )) : (
                          <div className="GoalSelectionInner">
                            <span>You don't have any goal</span>
                          </div>
                        )
                  }
                </div>
              </div>
            </div>
            <div className="ClientAddProductEditandDeletSection">
              <Link to={`/editproduct/${productId}`} style={{textDecoration:'none'}}><button style={{borderColor:'#ffb700',color:'#ffd400'}}>Edit</button></Link>
              <button style={{borderColor:'#be1080',color:'#ff00f5'}} onClick={PredeltePopup}>Delete</button>
            </div>
        </div>
      </div>
    </div>
  )
}

export default ViewProduct