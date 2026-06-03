import { useEffect, useState } from "react"
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import {Altaxios} from '../../Altaxios';
import { Link, useParams } from "react-router-dom";
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

function EditProduct() {
  const {productId} = useParams();
  const [productImg,setProductImg] = useState("");
  const [productImgFile,setProductImgFile] = useState(null);
  const [resMessage,setResMessage] = useState("");
  const [resMsgStyle,setResMsgStyle] = useState({});
  const [allGoalsData,setAllGoalsData] = useState([]);
const [checkedGoals, setCheckedGoals] = useState([]);
const [isEnableBtn,setIsEnableBtn] = useState(true);
   const [porductInfo,setProductInfo] = useState({
        ProductName:"",
        ProductPrice:"",
        InStockQuentity:"",
  });
const [currentProducsEX,setCurrentProductsEX] = useState({});

useEffect(()=>{
          const getAllProducts = async () => {
          try{
            const product = await Altaxios.get(`/newproduct/getSingleProduct/${productId}`);
          if(product.status === 200){
            const proData = product.data.data;
            setCurrentProductsEX(proData);
            setProductInfo({
                ProductName:proData?.ProductName,
                ProductPrice:proData?.ProductPrice,
                InStockQuentity:proData?.InStockQuentity,
            });
            setProductImg(proData?.productImgFile);
            // setCheckedGoals(proData?.GoalIdentifire[0].split(",") ?? []);
            setCheckedGoals(proData?.GoalIdentifire ?? []);
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

    useEffect(() => {
      Altaxios.get('/setgole/getGoleData').then((res) => {
        if(res.status === 200){
          setAllGoalsData(res.data);
        }
        })
    },[]);

useEffect(() => {
  const nameChanged =
    (porductInfo.ProductName === "") ? true :
    (porductInfo.ProductName === currentProducsEX?.ProductName);

    const priceChanged =
    (porductInfo.ProductPrice === "") ? true : 
    (Number(porductInfo.ProductPrice) === Number(currentProducsEX?.ProductPrice));

  const stockChanged =
    (porductInfo.InStockQuentity === "") ? true :
    (Number(porductInfo.InStockQuentity) === Number(currentProducsEX?.InStockQuentity));

  const existingGoals = currentProducsEX?.GoalIdentifire !== undefined ? String(currentProducsEX?.GoalIdentifire[0]).split(",").map(s => s.trim()).filter(Boolean) : [];

const goalsChanged =
  checkedGoals.length === 0 ||
  (
    checkedGoals.length === existingGoals.length &&
    existingGoals.every(val => checkedGoals.includes(val))
  );
  const imageChanged = productImgFile === null;
    
  const isChanged = nameChanged && priceChanged && stockChanged && goalsChanged && imageChanged;
  setIsEnableBtn(isChanged);
}, [
  porductInfo.ProductName,
  porductInfo.ProductPrice,
  porductInfo.InStockQuentity,
  currentProducsEX?.ProductName,
  currentProducsEX?.ProductPrice,
  currentProducsEX?.InStockQuentity,
  currentProducsEX?.GoalIdentifire,
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
    if (/\.(jpe?g|png|gif)$/i.test(file.name)) {
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
 
  const updatePorduct = async() => {
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
    const addProduct = await Altaxios.put(`/newproduct/updateProduct/${productId}`,ProductData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
      if(addProduct.status === 200){
        setResMessage(addProduct.data.message);
            const proData = addProduct.data.data;
            setCurrentProductsEX(proData);
            setProductInfo({
                ProductName:proData?.ProductName,
                ProductPrice:proData?.ProductPrice,
                InStockQuentity:proData?.InStockQuentity,
            });
            setProductImg(proData?.productImgFile);
            // setCheckedGoals(proData?.GoalIdentifire[0].split(",") ?? []);
            setCheckedGoals(proData?.GoalIdentifire ?? []);

        setResMsgStyle({color:"green",opacity:1});
        setProductImgFile(null);
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

  const AddProductData = (e) => {
    const name = e.target.name;
    const value = e.target.value;
    setProductInfo({
      ...porductInfo,
      [name] : value
    });
  };

// const handleCheck = (id, checked) => {
//     setCheckedGoals((prev) =>
//       checked ? [...prev, id] : prev.filter((x) => x !== id)
//     );
//   };
const handleCheck = (id, checked) => {
  setCheckedGoals((prev) =>
    checked
      ? prev.includes(id)
        ? prev
        : [...prev, id]
      : prev.filter((x) => x !== id)
  );
};

  return (
    <div className="clientAddproductMain">
      <div className="clientAddProductInner" style={{justifyContent:'center'}}>
                <Link to={`/viewproduct/${productId}`}><ArrowBackIcon/></Link>
        <div className="clientAddProductLeft">
            <h2>Update Product</h2>
            <div className="addProductClientFrom">
              <div className="addProductInputClientMain">
                <label htmlFor="ProductName">Product/Service Name</label>
                <input type="text" id="ProductName" name="ProductName" placeholder="product/service name..." value={porductInfo.ProductName ?? ""} onChange={AddProductData}/>
              </div>
              <div className="addProductInputClientMain">
                <label htmlFor="ProductPrice">Product/Service Price</label>
                <input type="number" id="ProductPrice" name="ProductPrice" placeholder="product/service price..." value={porductInfo.ProductPrice ?? ""} onChange={AddProductData}/>
              </div>
              <div className="addProductInputClientMain">
                <span>Product/Service Image</span>
                <div className="productImageClient">
                  <label htmlFor="ProductImage" className="clientAddProductSelectBtn">
                        <AddPhotoAlternateIcon style={{color:`${productImgFile !== null ? '#0078d4' : '#ffb100'}`}}/>
                        <input type="file" id="ProductImage" accept=".jpg,.png,.webp" onChange={uploadReviewPhotos}/>
                  </label>
                  <span style={{width:'162px',marginLeft:'-20px',fontSize:`${productImgFile !== null ? "7px" : '16px'}`,marginRight:'15px'}}>{productImgFile !== null ? productImgFile.name : "Change Image"}</span>
                  {productImg !== "" ? (
                    <img src={productImg} alt="productImage" width={"70px"} height={"70px"}/>
                    ) : (<></>) }
                </div>
              </div>
              <div className="addProductInputClientMain">
                <label htmlFor="InStockQuentity">Total Quantity</label>
                <input type="number" placeholder="total saleable units..." id="InStockQuentity" name="InStockQuentity" value={porductInfo.InStockQuentity ?? ""} onChange={AddProductData}/>
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
                      <span>{data.targetName}</span> <input type="checkbox" value={data._id ?? ""} checked={checkedGoals.length > 0 ? checkedGoals?.includes(data._id) : false } name={data.targetName} onChange={(e) => handleCheck(data._id, e.target.checked)}/>
                    </div>
                    )) : (
                          <div className="GoalSelectionInner">
                            <span>You don't have any goal</span>
                          </div>
                        )
                  }
                </div>
              </div>
              <button className="addClientProdutbtn" onClick={updatePorduct} disabled={isEnableBtn}>Update</button>
              <div className='showErrorOrSuccess' style={resMsgStyle}>{resMessage}</div>
            </div>
        </div>
      </div>
    </div>
  )
}

export default EditProduct