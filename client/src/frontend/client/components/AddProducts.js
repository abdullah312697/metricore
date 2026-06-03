import { useEffect, useState } from "react"
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import {Altaxios} from '../../Altaxios';
import { Link } from "react-router-dom";
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useAuth } from "../../../context/AuthContext";

function AddProduct() {
  const [productImg,setProductImg] = useState("");
  const [productImgFile,setProductImgFile] = useState(null);
  const [resMessage,setResMessage] = useState("");
  const [resMsgStyle,setResMsgStyle] = useState({});
  const [allGoalsData,setAllGoalsData] = useState([]);
 const [checkedGoals, setCheckedGoals] = useState([]);
 const [isEnableBtn,setIsEnableBtn] = useState(true);
 const [currentProducs,setCurrentProducts] = useState([]);
   const [porductInfo,setProductInfo] = useState({
        ProductName:"",
        ProductPrice:"",
        InStockQuentity:"",
  });
    const {user} = useAuth();
  
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
            const product = await Altaxios.get("/newproduct/getallProducts/");
          if(product.status === 200){
            setCurrentProducts(product.data.data || [])
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
  useEffect(() => {
    if(
      porductInfo.ProductName !== "" && 
      porductInfo.ProductPrice !== "" && 
      porductInfo.InStockQuentity !== "" && 
      checkedGoals.length > 0 && 
      productImgFile !== null
    ){
      setIsEnableBtn(false);
    }else{
      setIsEnableBtn(true);
    }
  },[
    porductInfo.ProductName,
    porductInfo.ProductPrice,
    porductInfo.InStockQuentity,
    checkedGoals,
    productImgFile
  ]);

  const uploadReviewPhotos = (e) => {
  setProductImg("");
  setProductImgFile(null);
  let files = e.currentTarget.files[0];
  if(files){
    setProductImgFile(files);
  function readAndPreview(file) {
    if (/\.(jpe?g|png|webp)$/i.test(file.name)) {
      const reader = new FileReader();
      reader.addEventListener(
        "load",
        () => {
          setProductImg(reader.result);
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
 
  const AddProductData = (e) => {
    const name = e.target.name;
    const value = e.target.value;
    setProductInfo({
      ...porductInfo,
      [name] : value
    });
  };

const handleCheck = (id, checked) => {
    setCheckedGoals((prev) =>
      checked ? [...prev, id] : prev.filter((x) => x !== id)
    );
  };

  const AddProductDataNew = async() => {
    try{
    setIsEnableBtn(true);
    const ProductData = new FormData();
    ProductData.append("ProductName",porductInfo.ProductName);
    ProductData.append("ProductPrice",porductInfo.ProductPrice);
    ProductData.append("InStockQuentity",porductInfo.InStockQuentity);
    checkedGoals.forEach(id => {
        ProductData.append("GoalIdentifire[]", id);
    });
    ProductData.append("files",productImgFile);
    const addProduct = await Altaxios.post('/newproduct/addNewProduct',ProductData);
      if(addProduct.status === 200){
        setResMessage(addProduct.data.message);
        setCurrentProducts([...currentProducs,addProduct.data.data]);
        setResMsgStyle({color:"green",opacity:1});
        setProductImgFile(null);
        setProductImg("");
        setCheckedGoals([]);
        setProductInfo({
                  ProductName:"",
                  ProductPrice:"",
                  InStockQuentity:"",
        })
      setTimeout(() => {
          setResMsgStyle({opacity:0});
      },3000);
     }
    }catch(error){
      if(error.response){
      setResMessage(error.response.data.message);
      setResMsgStyle({color:"red",opacity:1})
      setTimeout(() => {
          setResMsgStyle({opacity:0})
      },3000);
      }else{
        setResMessage("Something went wrong!");
        console.log(error);
      }
    }finally{
      setIsEnableBtn(false);
    }
  };


  return (
    <div className="clientAddproductMain">

      <div className="clientAddProductInner">
        <Link to={`/company/${user.companyName}`} style={{left:'5px',top:'5px'}}><ArrowBackIcon/></Link>
        <div className="clientAddProductLeft">
            <h2>Add Product</h2>
            <div className="addProductClientFrom">
              <div className="addProductInputClientMain">
                <label htmlFor="ProductName">Product/Service Name</label>
                <input type="text" id="ProductName" name="ProductName" placeholder="product/service name..." value={porductInfo.ProductName} onChange={AddProductData}/>
              </div>
              <div className="addProductInputClientMain">
                <label htmlFor="ProductPrice">Product/Service Price</label>
                <input type="number" id="ProductPrice" name="ProductPrice" placeholder="product/service price..." value={porductInfo.ProductPrice} onChange={AddProductData}/>
              </div>
              <div className="addProductInputClientMain">
                <span>Product/Service Image</span>
                <div className="productImageClient">
                  <label htmlFor="ProductImage" className="clientAddProductSelectBtn">
                        <AddPhotoAlternateIcon style={{color:`${productImgFile !== null ? '#0078d4' : '#ffb100'}`}}/>
                        <input type="file" id="ProductImage" accept=".jpg,.png,.webp" onChange={uploadReviewPhotos}/>
                  </label>
                  <span style={{width:'162px',marginLeft:'-20px',fontSize:`${productImgFile !== null ? "7px" : '16px'}`,marginRight:'15px'}}>{productImgFile !== null ? productImgFile.name : "Select Image"}</span>
                  {productImgFile !== null ? (
                    <img src={productImg} alt="productImage" width={"70px"} height={"70px"}/>
                    ) : (<></>) }
                </div>
              </div>
              <div className="addProductInputClientMain">
                <label htmlFor="InStockQuentity">Total Quantity</label>
                <input type="number" placeholder="total saleable units..." id="InStockQuentity" name="InStockQuentity" value={porductInfo.InStockQuentity} onChange={AddProductData}/>
              </div>
              <div className="addProductInputClientMain">
                <span>Select Goal</span>
                <div className="clientAddProductGoalSelection">
                  {
                    allGoalsData.length > 0 ? allGoalsData.map((data) => (
                    <div className="GoalSelectionInner" key={data._id} onClick={(e) => {
            if (e.target.tagName !== "INPUT") {
              e.currentTarget.lastElementChild.click();
            }
          }}>
                      <span>{data.targetName}</span> <input type="checkbox" value={data._id} checked={checkedGoals.includes(data._id)} name={data.targetName} onChange={(e) => handleCheck(data._id, e.target.checked)}/>
                    </div>
                    )) : (
                          <div className="GoalSelectionInner">
                            <span>You don't have any goal</span>
                          </div>
                        )
                  }
                </div>
              </div>
              <button className="addClientProdutbtn" onClick={AddProductDataNew} disabled={isEnableBtn}>Add Product</button>
              <div className='showErrorOrSuccess' style={resMsgStyle}>{resMessage}</div>
            </div>
        </div>
        <div className="clientAddProductRight">
          <h2>Product List</h2>
          <div className="ClientProductContainer">
            <div className="clientProductInnerHeader">
              <div className="ProductInnerMainHeadr">
                <div className="clientHeadr__productName">Name</div>
                <div className="clientHeadr__productPrice">Price</div>
                <div className="clientHeadr__productUnite">Units</div>
                <div className="clientHeadr__productImg">Image</div>
                <div className="clientHeadr__productAction">Action</div>
              </div>
            </div>
            <div className="clientProductInnerMain">
              {
                currentProducs.length > 0 ? currentProducs.map((pro, index) => (
                <div  className="clientProductInnerCont" key={pro._id}>
                  <div className="client__productName">{pro.ProductName}</div>
                  <div className="client__productPrice">{pro.ProductPrice}</div>
                  <div className="client__productInStock">{pro.InStockQuentity}</div>
                  <div className="client__productImg"><img src={pro.productImgFile} alt="ProductImg" style={{width:'36px',height:'40px'}}/></div>
                  <Link className="client__productAction" to={`/viewproduct/${pro._id}`}>View</Link>
                </div> 
                ))
                : (<div style={{textAlign:'center',paddingTop:'20px',color:'#ccc'}}>You Don't have any product yet!</div>)
              }

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AddProduct