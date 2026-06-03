import { useEffect, useState, useRef, useMemo } from 'react'
import { useParams } from 'react-router-dom';
import ChangeDate from './ChangeDate';
import {Altaxios} from '../../Altaxios';
import './view.css';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined';
import InventoryOutlinedIcon from '@mui/icons-material/InventoryOutlined';
import { useProductMetrics } from "./useProductMetrics";
import { useTotalMetrics } from "./useTotalMetrics";
import { format } from "date-fns";
import ExtraFieldForm from './ExtraFieldForm';
import ExtraFieldUpdate from './ExtraFieldUpdate';
import { useFieldVisibility }      from "./useFieldVisibility";
import { FieldVisibilityManager }  from "./FieldVisibilityManager";
import { DEFAULT_FIELDS }          from "./fieldConfig";
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';

function ViewGoal() {
  const { goalId } = useParams();
  const [viewGoal,setViewGoal] = useState({targetAmount:0,targetEndDate:0,targetName:"",targetStartDate:0,goalLadder:[]});
  const [goalLadder,setGoalLadder] = useState([]);
  const [deffirent,setDeffirent] = useState({year: 0, month: 0, week: 0, day: 0});
  // const [loading, setLoading] = useState(false);
  // const [addingTask, setAddingTask] = useState(false);
  const inputRefs = useRef({});
  // const [errorMsg,setErrorMsg] = useState("");
  // const [errStyle,setErrStyle] = useState({});
  const [currentProductsData,setCurrentProductsData] = useState([]);
  const productMetrics = useProductMetrics(currentProductsData, deffirent);
  const totalMetrics = useTotalMetrics(productMetrics);
  const [eachProductAmount,setEachProductAmount] = useState([]);
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [filterDate, setFilterDate] = useState('today');
  const [editValues, setEditValues] = useState({}); 
  const editKey = (productId, fieldName) => `${productId}_${fieldName}`;
  const allowedFields = [
      "SoldQuentity", "Return", "AdCost",
      "OtherCost", "DelibaryCostPersale", "PackgingCost",
      "PrductBuyingCost", "ShippingCost", "TargetSaleAmount","TargetAmount"
    ];
  const [isOpenExtraField,setIsOpenExtraField] = useState(false);
  const boxRef = useRef(null);
  const ExRef = useRef(null);
  const EXTRA_FIELD_PREFIX = "extraField::";
  const [showManager, setShowManager] = useState(false);
  const [showExUpdate, setShowExUpdate] = useState(false);
  const { visibleFields, toggleField, showAll, hideAll, isVisible } = useFieldVisibility(goalId);
  const [isAddingExtarField,setIsAddingExtraField] = useState(false);
  const [exFieldConfigId,setExFieldConfigId] = useState('');
  const [exProductId,setExProductId] = useState('');
  const [isExbtnEnable,setIsExbtnEnable] = useState(false);
  const [isOpneDelete, setIsOpneDelete] = useState(false);
  const [isClickedDel,setIsClickedDel] = useState(false);

  useEffect(() => {
    try{
      const getProduct = async() => {
        const params = dateRange.start && dateRange.end
        ? { start: dateRange.start.toISOString(), end: dateRange.end.toISOString() }
        : {};
        const prduct = await Altaxios.get(`/productdata/productGoalandData/${goalId}`,
          {params}
        );
        const {mergedSummary} = prduct.data;
        setCurrentProductsData(mergedSummary);
    if (prduct.status === 200) {
        const existingSet = mergedSummary.map(p => p._id.toString());
        const goalTarget = await Altaxios.get(
          `/goalTarget/productTargetAmount`,
          {
            params: {
              GoalId: goalId,
              ProductId: existingSet,
            },
          }
        );  
        if(goalTarget.status === 200){
          setEachProductAmount(goalTarget.data.data)
        }
      }
    }
      getProduct();
    }catch(err){
      console.log(err);
    }
  },[goalId,dateRange?.end,dateRange?.start]);

  useEffect(() => {
    Altaxios.get(`/setgole/getOneGoal/${goalId}`).then(res => {
      if(res.status === 200){
        const targetData = res.data;
        if(targetData){
          setViewGoal({
            targetAmount:targetData.targetAmount,
            targetEndDate:targetData.targetEndDate,
            targetName:targetData.targetName,
            targetStartDate:targetData.targetStartDate,
            goalLadder:targetData.goalLadder
          });
          setGoalLadder(targetData.goalLadder || []);
        }
      }
    })
  },[goalId]);
  
  const AddfieldToDB = async(fieldName) => {
    setIsAddingExtraField(false);
    try{
      const resData = await Altaxios.post('/extrafield/createExtraFieldConfig',{...fieldName,goalId});
      if(resData.status === 201){
        const newAddedField = resData.data.data;
      setCurrentProductsData((prev) =>
        prev.map((item) => ({
          ...item,
          extraFields: [
            ...(item.extraFields || []),
            {
              configId:      newAddedField._id,
              fieldName:     newAddedField.fieldName,
              calculateWith: newAddedField.calculateWith || [],
              total:        0,
            },
          ],
        }))
      );
        setIsOpenExtraField(false);
        setIsAddingExtraField(true);
      }
    }catch(err){
      console.log(err);
    }
  };


const handleChange = (e, productId) => {
  const { name, value } = e.target;

  const isExtraField = name.startsWith(EXTRA_FIELD_PREFIX);
  if (!isExtraField && !allowedFields.includes(name)) return;

  setEditValues((prev) => ({
    ...prev,
    [editKey(productId, name)]: value,
  }));
};

useEffect(() => {
  const lissenIsOpenbox = (e) => {
    if(boxRef.current && !boxRef.current.contains(e.target)){
      setIsOpenExtraField(false);
    }
  }
  document.addEventListener("mousedown",lissenIsOpenbox);
  return() => {document.removeEventListener("mousedown",lissenIsOpenbox);}
},[]);

// ── onBlur → update state + save to DB ───────────────────────────
const handleBlur = async (e, productId) => {
  try {
    const { name, value } = e.target;
    const isExtraField    = name.startsWith(EXTRA_FIELD_PREFIX);

    // 👇 Skip if not a known field
    if (!isExtraField && !allowedFields.includes(name)) return;

    // 👇 Allow 0 — only fallback if empty string
    const numValue = value === "" ? 0 : Number(value);

    // ── Clear local edit value ──────────────────────────────────
    setEditValues((prev) => {
      const updated = { ...prev };
      delete updated[editKey(productId, name)];
      return updated;
    });

    // ── Extra field update ──────────────────────────────────────
    if (isExtraField) {
      const configId = name.replace(EXTRA_FIELD_PREFIX, "");
    if (!configId || configId === "undefined" || configId.length !== 24) {
        console.warn("Invalid configId — skipping update:", configId);
        return;
      }
      // 1. Update local state
      setCurrentProductsData((prev) =>
        prev.map((item) => {
          if (item._id.toString() !== productId.toString()) return item;
          return {
            ...item,
            extraFields: item.extraFields.map((ef) =>
              ef.configId === configId
                ? { ...ef, total: numValue }
                : ef
            ),
          };
        })
      );

      // 2. Save to DB
      const product = currentProductsData.find(
        (item) => item._id.toString() === productId.toString()
      );
      if (product?.costDocId) {
        await Altaxios.patch(
          `/productdata/updateExtraFieldValue/${product.costDocId}`,
          { configId, value: numValue }
        );
      }
      return;
    }

    // ── TargetAmount special case ───────────────────────────────
    if (name === "TargetAmount") {
      const existingSet = currentProductsData.map((p) => p._id.toString());

      const updateProductGoal = await Altaxios.put(
        `/goalTarget/productTargetUpdate`,
        {
          NewTargetAmount:  value,
          totalTarget:      viewGoal?.targetAmount,
          targetProductId:  productId,
        },
        {
          params: {
            GoalId:    goalId,
            ProductId: existingSet,
          },
        }
      );

      if (updateProductGoal.status === 200) {
        setEachProductAmount(updateProductGoal.data.data);
      }
      return;
    }

    // ── Main field update ───────────────────────────────────────
    setCurrentProductsData((prev) =>
      prev.map((item) => {
        if (item._id.toString() !== productId.toString()) return item;
        return { ...item, [name]: numValue };
      })
    );

    const product = currentProductsData.find(
      (item) => item._id.toString() === productId.toString()
    );
    if (product?.costDocId) {
      saveToDb(product.costDocId, name, numValue);
    }

  } catch (err) {
    console.log(err);
  }
};
// ── Direct API call — no debounce needed ─────────────────────────
const saveToDb = async (costDocId, field, value) => {
  try {
    await Altaxios.patch(`/productdata/updateProductCost/${costDocId}`, {
      field,
      value,
    });
  } catch (err) {
    console.error("Save failed:", err);
  }
};

// ── Input display value ───────────────────────────────────────────
const getInputValue = (productId, fieldName, calculatedValue) => {
  const key = editKey(productId, fieldName);
  return key in editValues ? editValues[key] : calculatedValue;
};
//prevent auto scroll for number input <>
const preventScroll = (e) => {
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    e.preventDefault();
    e.stopPropagation();
  }
};

const preventScrollWheel = (e) => {
  if (e.type === 'wheel') {
    e.preventDefault();
    e.stopPropagation();
  }
};

useEffect(() => {
  const currentRefs = Object.values(inputRefs.current);
  currentRefs.forEach((input) => {
    if (input) {
      input.addEventListener('wheel', preventScrollWheel, { passive: false });
      input.addEventListener('keydown', preventScroll);
      input.addEventListener('touchmove', preventScrollWheel, { passive: false });
    }
  });
  return () => {
    currentRefs.forEach((input) => {
      if (input) {
        input.removeEventListener('wheel', preventScrollWheel);
        input.removeEventListener('touchmove', preventScrollWheel);
        input.removeEventListener('keydown', preventScroll);
      }
    });
  };
}, [goalLadder]);

const setInputRef = (el, index) => {
  inputRefs.current[index] = el;
};


const compressString = (value) => {
    if (typeof value !== "string") return value;
    return value
        .trim()
        .split(/\s+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join("");
};

  const RefineFilterDate = (filterName) => {
    switch(filterName){
      case 'today':
        return 'Today';
      case 'week':
        return 'Last Week';
      case 'month':
        return 'Last Month';
      case 'year':
        return 'Last Year';
      case 'full':
        return 'Full Target';
      case 'custom':
        return 'Custom';
      default:
        return 'Today'
    } 
  };

  useEffect(() => {
  setCurrentProductsData((prev) =>
    prev.map((item) => {
      const matchedProduct = eachProductAmount.find(
        (fn) => fn.ProductId === item._id
      );

      return matchedProduct
        ? {
            ...item,
            TargetAmount: Math.round(matchedProduct.TargetAmount),
            isLock:matchedProduct.isLock
          }
        : item;
    })
  );
}, [eachProductAmount]);

const isEditable = RefineFilterDate(filterDate)?.trim() === "Today";

const updateLockIsUnlock = async(proTargetId, isLock) => {
  try{
    const isUpdateLock = await Altaxios.patch("/goalTarget/ProductTargetIslock",{isLock},
      {
            params: {
              GoalId: goalId,
              ProductId: proTargetId,
            },
          }
    );
    const updatedDoc = isUpdateLock.data.data;

    setEachProductAmount((prev) =>
      prev.map((item) =>
        item._id === updatedDoc._id
          ? { ...item, isLock: updatedDoc.isLock }
          : item
      )
    );
  
  }catch(err){
    console.log(err);
  }
};

const handleUpdateExtraField = async ({ fieldId, fieldName, calculateWith, fieldValue }) => {
  try {
    const response = await Altaxios.put(
      `/extrafield/updateExtraFieldConfig/${fieldId}`,
      {
        fieldName,
        calculateWith,
        goalId,                   // from component scope
        productId: exProductId,   // from component scope
        fieldValue,
      }
    );

if (response.status === 200) {
  const { fieldName, calculateWith, todayValue } = response.data.data;
  const isSelected = (id) => id.toString() === exProductId;

  setCurrentProductsData((prev) =>
    prev.map((item) => ({
      ...item,
      extraFields: item.extraFields.map((ef) =>
        ef.configId !== fieldId ? ef : {
          ...ef,
          fieldName,
          calculateWith,
          ...(isSelected(item._id) && {
            total: todayValue ?? ef.total,
          }),
        }
      ),
    }))
  );
  setShowExUpdate(false);
}
  } catch (err) {
    console.error("Update extra field failed:", err);
  }
};

  const percentage = useMemo(() => {
  const sold = Number(totalMetrics?.SoldAmount || 0);
  const target = Number(viewGoal?.targetAmount || 0);
  if (!sold || !target) return 0;
  const raw = (sold / target) * 100;
  return Math.min(100, Math.max(0, Number(raw.toFixed(5))));
}, [totalMetrics?.SoldAmount, viewGoal?.targetAmount]);

const handleDeleteExtraField = async () => {
  try {
    setIsClickedDel(true);
    const res = await Altaxios.delete(
      `/extrafield/deleteExtraFieldConfig/${exFieldConfigId}`,
      { data: { goalId } }
    );

    if (res.status === 200) {
      setCurrentProductsData((prev) =>
        prev.map((item) => ({
          ...item,
          extraFields: item.extraFields.filter(
            (ef) => ef.configId !== exFieldConfigId 
          ),
        }))
      );
      setIsOpneDelete(!isOpneDelete);
    }
  } catch (err) {
    console.error(err);
  }
};

  return (
    <div className='viewGoalMain'>
      {/* {addingTask && <div className='addStepSpinner'>
        <div className='spinnerAdding'></div>
        </div>
        } */}

      <div className='viewGaolaTop'>
        <ChangeDate currentViewGoal={viewGoal} AddStepnOpen={setIsOpenExtraField} setDateRange={setDateRange} filterdate={setFilterDate} deffirentInDays={setDeffirent} isClicked={setIsAddingExtraField} progressState={percentage}/>
      </div>
      <div className="viewGoalsMiancontainer">
        <div className="viewGoalHeaderPart">
          <h3 style={{width:'100%',textAlign:'center',fontSize:'16px',color:'#ffbc00'}}>Calculated Data Report <span style={{color:'#ccc'}}>(</span> {RefineFilterDate(filterDate)} <span style={{color:'#ccc'}}>)</span></h3>
           <button onClick={() => setShowManager(true)} style={{
            background: 'transparent',
            cursor: 'pointer',
            border: '1px solid #ccc3',
            borderRadius: '5px',
            padding: '8px',
            width: '172px',
            fontSize: '13px',
            fontWeight: 'bold',
            color: '#ffb700'
    }}>
              ⚙ Manage Fields ({visibleFields.size})
          </button>
        </div>
        {
      <div className="deleteConfirmOverlay" style={{display: `${isOpneDelete ? 'flex' : 'none'}`}}>
      <div className="deleteConfirmBox">
        <h3 className="deleteConfirmTitle">Delete Confirmation</h3>
        <p className="deleteConfirmText">
          Are you sure you want to delete this item?
        </p>
        <div className="deleteConfirmButtons">
          <button
            className="deleteConfirmBtn deleteConfirmYes"
            onClick={handleDeleteExtraField}
            disabled={isClickedDel}
          >
            Yes
          </button>
          <button
            className="deleteConfirmBtn deleteConfirmNo"
            onClick={() => {setIsOpneDelete(!isOpneDelete);}}
          >
            No
          </button>
        </div>
      </div>
    </div>
    }
        {showExUpdate && 
        <ExtraFieldUpdate 
            onClose={setShowExUpdate} 
            existingExtraFields={productMetrics[0]?.extraFields ?? []}
            onSubmit={handleUpdateExtraField}
            updateConfigId={exFieldConfigId}
            updateProId={exProductId}
            upGoalId={goalId}
            isExbtnEnable = {isExbtnEnable}
            setIsExbtnEnable = {setIsExbtnEnable}
            ref={ExRef}/>
       }

        {isOpenExtraField &&
          <ExtraFieldForm onClose={setIsOpenExtraField} existingExtraFields={productMetrics[0]?.extraFields ?? []} setbtnDisable={isAddingExtarField}  isClicked={setIsAddingExtraField} onSubmit={AddfieldToDB} ref={boxRef}/>
        }
        {showManager && (
        <FieldVisibilityManager
          visibleFields={visibleFields}
          toggleField={toggleField}
          showAll={showAll}
          hideAll={hideAll}
          onClose={() => setShowManager(false)}
        />
      )}
      <div className='viewGoalsInner'>
        {/* <div className='shwoCalculateErrorMsg' style={errStyle}>{errorMsg}</div> */}
        {productMetrics.length > 0 ? productMetrics.map((metrics, index) => (
        <div className='viewGolasInnerTask' key={`${metrics._id}_${index}`}>
        <div className='viewGoalsTaskContainer'>
          <div className='taskGoalInner'>
            <img src={metrics.productImgFile} alt="porduct view" style={{width:'40px',height:'40px',marginBottom:'-10px',borderRadius:'5px'}}/>
          </div>
          <div className='taskGoalInner'>
              <label htmlFor={`${metrics._id}_AssignDate`}>Assigned Date</label>
              <input type='text'  id={`${metrics._id}_AssignDate`} name="AssignDate" readOnly  value={format(metrics.createdAt, "d MMM yyyy") ?? ""} ref={(el) => setInputRef(el, "AssignDate")}/>
            </div>
          <div className='taskGoalInner'>
              <label htmlFor={`${metrics._id}_ProductName`}>Product Name</label>
              <input type='text' style={{fontSize:'12px',padding:'7px',textOverflow:'ellipsis'}}  id={`${metrics._id}_ProductName`} name="ProductName" readOnly  value={metrics.ProductName ?? ""} ref={(el) => setInputRef(el, "ProductName")}/>
            </div>
            {
  DEFAULT_FIELDS.map((field,index) =>
    isVisible(field.key) ? (
      field.key === "TargetAmount" ? (
        <div className='taskGoalInner' key={`${metrics._id}_${field.key}_${index}`}>
          <label htmlFor={`${metrics._id}_${field.key}`}>
            {field.label}
          </label>

          <input
            type='number'
            id={`${metrics._id}_${field.key}`}
            name={field.key}
            value={
              getInputValue(
                metrics._id,
                field.key,
                metrics[field.key]
              ) ?? 0
            }
            readOnly={!isEditable || metrics.isLock === true}
            onChange={(e) => handleChange(e, metrics._id)}
            onBlur={(e) => handleBlur(e, metrics._id)}
            ref={(el) => setInputRef(el, field.key)}
          />

          <div className='targetLockUnlock'>
            {
              metrics.isLock === false ? (
                <div className='lockUnlockInner'>
                  <LockOpenOutlinedIcon
                    className="targetUnlock"
                    onClick={() => {
                      updateLockIsUnlock(metrics._id, true)
                    }}
                  />

                  <div className='lockunlocktitle'>
                    Click to Lock
                  </div>
                </div>
              ) : (
                <div className='lockUnlockInner'>
                  <LockOutlinedIcon
                    className='targetLock'
                    onClick={() => {
                      updateLockIsUnlock(metrics._id, false)
                    }}
                  />
                  <div className='lockunlocktitle'>
                    Click to UnLock
                  </div>
                </div>
              )
            }
          </div>
        </div>
      ) : field.editable === true ? (
              <div className='taskGoalInner' key={`${metrics._id}_${field.key}_${index}`}>
              <label htmlFor={`${metrics._id}_${field.key}`}>{field.label}</label>
              <input type='number' id={`${metrics._id}_${field.key}`} name={field.key}
                value={getInputValue(metrics._id, field.key, metrics[field.key]) ?? 0}
                onChange={(e) => handleChange(e, metrics._id)}
                onBlur={(e) => handleBlur(e, metrics._id)}
                ref={(el) => setInputRef(el, field.key)}
                readOnly={!isEditable}
                />
          </div>

      ) : (
        <div className='taskGoalInner' key={`${metrics._id}_${field.key}_${index}`}>
          <label htmlFor={`${metrics._id}_${field.key}`}>
            {field?.label}
          </label>

          <input
            type='number'
            id={`${metrics._id}_${field.key}`}
            name={field.key}
            readOnly
            value={metrics[field.key] ?? 0}
            ref={(el) => setInputRef(el, field.key)}
          />
        </div>
      )
    ) : null
  )
}
{metrics?.extraFields?.length > 0 &&
  metrics.extraFields.map((field, index) => {
    const inputName = `extraField::${field.configId}`;
    const inputId   = `${metrics._id}_extra_${index}`;
    const exKey = `${field.configId}_${index}`;
    const lastCalc     = field.calculateWith?.[field.calculateWith.length - 1];
    const lastCalcType = lastCalc?.calcType ?? "";
    const suffix =
      lastCalcType === "percentage" ? "%" :
      lastCalcType === "percentof"  ? "p%" : "";

      return (
      <div className='taskGoalInner' key={exKey}>
        <label htmlFor={inputId}>{field.fieldName}</label>
        <div className="extraFieldEditAndDelete">
          <DeleteOutlineOutlinedIcon className="extraFieldDeleteIcon" onClick={() => {setIsOpneDelete(!isOpneDelete); setExFieldConfigId(field.configId); setIsClickedDel(false)}}/>
          <EditIcon className="extraFieldEditIcon" 
          onClick={() => {
            setShowExUpdate(!showExUpdate);
            setExFieldConfigId(field.configId);
            setExProductId(metrics._id);
            setIsExbtnEnable(false);
            }}/>
        </div>
        <div className="tg-input-wrap">
        <input
          type='number'
          id={inputId}
          name={inputName}
          value={field.total ?? 0}
          ref={(el) => setInputRef(el, compressString(field.fieldName))}
          readOnly
          className={suffix ? "tg-input tg-has-suffix" : "tg-input"}
        />
        {suffix && (
            <span className="tg-suffix">{suffix}</span>
          )}
        </div>
      </div>
    );
  })
}
          </div>
        </div>
)) : (<div className='addLadderNoData'>No metrics Available</div>)
}
{totalMetrics !== null &&
   (<div className='viewGolasInnerTaskResult'>
    <div className='viewGoalsTaskContainer'>
    <div className='taskGoalInnerResult'>
      <InventoryOutlinedIcon style={{fontSize:'40px',marginBottom:'-13px',color:'#0078d4'}}/>
      <span className="productMetricLength">{productMetrics.length ?? 0}</span>
    </div>
    <div className='taskGoalInnerResult'>
        <label htmlFor='ResultDate'>Today Date</label>
        <input type='text'  id="ResultDate" name="ResultDate" readOnly  value={format(new Date(), "d MMM yyyy") ?? ""}/>
      </div>
     <div className='taskGoalInnerResult'>
        <label htmlFor='totlaSum'>Total Product Value</label>
        <input type='text'  id="totlaSum" name="totlaSum" readOnly value="Total Product Value"/>
      </div>
      {DEFAULT_FIELDS.map((field, index) =>
      isVisible(field.key)? (
        field.key === "TargetAmount" ? (
        <div className='taskGoalInnerResult' key={`${field.key}_${index}`}>
          <label htmlFor='TotalMainTargetSaleAmount'>Total Main Target Sale Amount</label>
          <input type='number' id="TotalMainTargetSaleAmount" name="TotalMainTargetSaleAmount" readOnly  value={viewGoal?.targetAmount ?? 0}/>
        </div>
        ) : 
      (<div className='taskGoalInnerResult' key={`${field.key}_${index}`}>
        <label htmlFor={`${field.key}_${index}`}>{`Total ${field.label}`}</label>
        <input type='number' id={`${field.key}_${index}`} name={field.key}  readOnly value={totalMetrics[field.key] ?? 0}/>
      </div>)
    ) : null )}
      {totalMetrics.extraFields.map((extraItem, index) => {
            const lastCalc     = extraItem.calculateWith?.[extraItem.calculateWith.length - 1];
            const lastCalcType = lastCalc?.calcType ?? "";
            const suffix =
              lastCalcType === "percentage" ? "%" :
              lastCalcType === "percentof"  ? "p%" : "";

        return(
          <div className='taskGoalInnerResult' key={`${extraItem.fieldName}_${index}`}>
            <label htmlFor={compressString(extraItem.fieldName + index)}>
             Total {extraItem.fieldName}
            </label>
            <div className="tg-input-wrap">
            <input
              type='number'
              id={compressString(extraItem.fieldName + index)}
              name={compressString(extraItem.fieldName + index)}
              readOnly
              value={extraItem.total ?? 0}
              className={suffix ? "tg-input tg-has-suffix tginputResult" : "tg-input tginputResult"}
            />
            {suffix && (
                <span className="tg-suffix"style={{color:'#fc0'}} >{suffix}</span>
              )}
            </div>
          </div>
)})}
  
    </div>
  </div>
  )
}
      </div>
      </div>
    </div>
  )
}

export default ViewGoal