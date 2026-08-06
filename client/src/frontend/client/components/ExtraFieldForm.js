import { useState, forwardRef, useEffect } from "react";
import '../../../style/ExtraFieldForm.css';

const MAIN_FIELDS = [
  "ProductPrice", "SoldAmount", "TargetSaleAmount", "SoldQuentity",
  "TargetQuentity", "Return", "InStockQuentity", "AdCost", "AdCostPerSale",
  "OtherCost", "OtherCostPerSale", "DelibaryCost", "DelibaryCostPersale",
  "Profit", "ProfitPerSale", "TargetProfit", "PackgingCost",
  "PackgingCostPerProduct", "PrductBuyingCost", "BuyingCostPerProduct",
  "ShippingCost", "ShippingCostPerProduct", "TotalProcessingCost",
  "ProcessingCostPerProduct",
];

// const CALC_TYPES = [
//   { value: "plus",     label: "+",  title: "Add",      color: "#22c55e" },
//   { value: "minus",    label: "−",  title: "Subtract", color: "#ef4444" },
//   { value: "multiply", label: "×",  title: "Multiply", color: "#f59e0b" },
//   { value: "divide",   label: "÷",  title: "Divide",   color: "#3b82f6" },
//   { value: "percentage", label: "%", title: "Percentage of", color: "#a855f7" },
// ];
const CALC_TYPES = [
  { value: "plus",       label: "+",  title: "Add",              color: "#22c55e" },
  { value: "minus",      label: "−",  title: "Subtract",         color: "#ef4444" },
  { value: "multiply",   label: "×",  title: "Multiply",         color: "#f59e0b" },
  { value: "divide",     label: "÷",  title: "Divide",           color: "#3b82f6" },
  { value: "percentage", label: "%",  title: "% of (a÷b×100)",  color: "#a855f7" },
  { value: "percentof",  label: "p%", title: "a% of b",         color: "#ec4899" },
];

const buildFormula = (fieldName, calculateWith) => {
  if (!fieldName) return "Field = own value";
  if (!calculateWith.length) return `${fieldName} = own value`;
  const ops = calculateWith.map((c, i) => {
    const op = CALC_TYPES.find((t) => t.value === c.calcType);
    return `${op?.label || "?"} ${c.name || "?"}`;
  });
  return `${fieldName} = own value  ${ops.join("  ")}`;
};

const ExtraFieldForm =  forwardRef(({ existingExtraFields = [], isClicked, onSubmit, onClose, setbtnDisable }, ref) => {
  const [fieldName, setFieldName] = useState("");
  const [calculateWith, setCalculateWith] = useState([]);
  const [error, setError] = useState("");
  const [fieldValue, setFieldValue] = useState("");


  const addRow = () => {
    setCalculateWith((prev) => [...prev, { name: "", calcType: "plus" }]);
  };

  const removeRow = (index) => {
    setCalculateWith((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRow = (index, key, value) => {
    setCalculateWith((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [key]: value } : row))
    );
  };

  const moveRow = (from, to) => {
    if (to < 0 || to >= calculateWith.length) return;
    const updated = [...calculateWith];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    setCalculateWith(updated);
  };

  const handleSubmit = () => {
    isClicked(true);
    if (!fieldName.trim()) return setError("Field name is required");
    const incomplete = calculateWith.some((c) => !c.name || !c.calcType);
    if (incomplete) return setError("Complete all calculation rows or remove incomplete ones");
    setError("");
    onSubmit?.({ fieldName: fieldName.trim(), calculateWith, value: fieldValue });
  };

  useEffect(() => {
    if(fieldName !== ""){
      isClicked(true)
    }else{
      isClicked(false)
    }
  },[fieldName, isClicked]);

  return (
  <div className="overlay" ref={ref}>
    <div className="modal">

      {/* ── Header ─────────────────────────────── */}
      <div className="header">
        <div>
          <div className="headerLabel">EXTRA FIELD</div>
          <div className="headerTitle">Configure New Field</div>
        </div>

        <button
          className="closeBtn"
          onClick={() => { onClose((p) => !p); }}
        >
          ✕
        </button>
      </div>

      {/* ── Field Name ─────────────────────────── */}
      <div className="section">
        <label className="label">FIELD NAME</label>
        <input
          className="input"
          placeholder="e.g. Tax, NetProfit, CustomFee"
          value={fieldName}
          onChange={(e) => {
            setFieldName(e.target.value);
            setError("");
          }}
        />
      </div>
      <div className="section">
        <label className="label">FIELD VALUE</label>
        <input
          className="input"
          placeholder="Field value..."
          value={fieldValue ?? 0}
          onChange={(e) => {
            setFieldValue(e.target.value);
            setError("");
          }}
        />
      </div>

      {/* ── Formula ────────────────────────────── */}
      <div className="formulaBox">
        <div className="formulaLabel">LIVE FORMULA PREVIEW</div>
        <div className="formula">
          {buildFormula(fieldName, calculateWith)}
        </div>
      </div>

      {/* ── Calculate With ─────────────────────── */}
      <div className="section">
        <div className="sectionHeader">
          <label className="label">CALCULATE WITH</label>

          <button className="addRowBtn" onClick={addRow}>
            + Add Step
          </button>
        </div>

        {calculateWith.length === 0 && (
          <div className="emptyRows">
            No calculations added — field will show its own stored value.
          </div>
        )}

        {calculateWith.map((row, index) => (
          <div key={index} className="row">

            <div className="stepNum">{index + 1}</div>

            <div className="calcTypeGroup">
              {CALC_TYPES.map((type) => (
                <button
                  key={type.value}
                  title={type.title}
                  className={`calcTypeBtn ${
                    row.calcType === type.value ? "active" : ""
                  }`}
                  style={
                    row.calcType === type.value
                      ? { background: type.color, borderColor: type.color, color: "#fff" }
                      : undefined
                  }
                  onClick={() =>
                    updateRow(index, "calcType", type.value)
                  }
                >
                  {type.label}
                </button>
              ))}
            </div>

            <select
              className="select"
              value={row.name}
              name="CalculateWith Field"
              onChange={(e) =>
                updateRow(index, "name", e.target.value)
              }
            >
              <option value="" style={{background:'#011626'}}>Select field…</option>

              <optgroup label="Main Fields" style={{background:'#011626'}}>
                {MAIN_FIELDS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </optgroup>

              {existingExtraFields.length > 0 && (
                <optgroup label="Extra Fields" style={{background:'#011626'}}>
                  {existingExtraFields.map((f) => (
                    <option key={f.fieldName} value={f.fieldName}>
                      {f.fieldName}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>

            <div className="moveGroup">
              <button
                className="moveBtn"
                onClick={() => moveRow(index, index - 1)}
                disabled={index === 0}
              >
                ↑
              </button>

              <button
                className="moveBtn"
                onClick={() => moveRow(index, index + 1)}
                disabled={index === calculateWith.length - 1}
              >
                ↓
              </button>
            </div>

            <button
              className="removeBtn"
              onClick={() => removeRow(index)}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* ── Order Note ─────────────────────────── */}
      {calculateWith.length > 1 && (
        <div className="orderNote">
          ↕ Order matters — calculations run top to bottom. Use arrows to reorder.
        </div>
      )}

      {/* ── Error ──────────────────────────────── */}
      {error && <div className="error">{error}</div>}

      {/* ── Actions ────────────────────────────── */}
      <div className="actions">
        <button
          className="cancelBtn"
          onClick={() => onClose((p) => !p)}
        >
          Cancel
        </button>

        <button
          className="submitBtn"
          disabled={!setbtnDisable}
          onClick={handleSubmit}
        >
          Save Field
        </button>
      </div>

    </div>
  </div>
);
});
export default ExtraFieldForm;
