import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Altaxios } from "../../Altaxios";
import { useAuth } from "../../../context/AuthContext";
import "../../../style/OnboardingPage.css";
import { toDDMMYYYY } from "../../../utils/dateFormat";

// ── Step metadata ────────────────────────────────────────────────
const STEPS = [
  {
    id:      1,
    label:   "Welcome",
    title:   "Welcome to MetriCore.",
    sub:     "Let's get your business set up. This takes about 3 minutes and we'll ask you three things: your goal, your first product, and your daily costs.",
    tip:     "You can edit everything we set up here at any time from inside the app.",
    skippable: false,
  },
  {
    id:      2,
    label:   "Goal",
    title:   "Set your first goal.",
    sub:     "A goal is a revenue target with a start and end date. All your products and daily costs sit beneath it.",
    tip:     "Set an ambitious but realistic target — MetriCore will calculate what you need to hit per day, week, and month.",
    skippable: false,
  },
  {
    id:      3,
    label:   "Product",
    title:   "Add your first product.",
    sub:     "A product is anything you sell. Enter the name and price — we'll track daily sales figures from your goal dashboard.",
    tip:     "You can add more products to this goal later, or create new goals for different product lines.",
    skippable: false,
  },
  {
    id:      4,
    label:   "Costs",
    title:   "Set your daily costs.",
    sub:     "These are the costs attached to each sale. MetriCore uses them to calculate your real profit — not just revenue.",
    tip:     "Not sure of exact numbers yet? Enter rough estimates and refine them as you go. You can update costs any day.",
    skippable: true,
  },
  {
    id:      5,
    label:   "Ready",
    title:   "You're ready.",
    sub:     "Your goal and product are live. Head to your dashboard and start entering today's sales numbers.",
    tip:     null,
    skippable: false,
  },
];

// ── Helpers ──────────────────────────────────────────────────────
// HTML date input gives "yyyy-MM-dd" — convert to "dd/MM/yyyy"

const validateStep2 = (data) => {
  const e = {};
  if (!data.targetName.trim())      e.targetName      = "Goal name is required.";
  if (!data.targetStartDate)        e.targetStartDate = "Start date is required.";
  if (!data.targetEndDate)          e.targetEndDate   = "End date is required.";
  if (data.targetStartDate && data.targetEndDate && data.targetStartDate >= data.targetEndDate)
    e.targetEndDate = "End date must be after start date.";
  if (!data.targetAmount || Number(data.targetAmount) <= 0)
    e.targetAmount = "Enter a revenue target greater than zero.";
  return e;
};

const validateStep3 = (data) => {
  const e = {};
  if (!data.ProductName.trim())                  e.ProductName  = "Product name is required.";
  if (!data.ProductPrice || Number(data.ProductPrice) <= 0) e.ProductPrice = "Enter a selling price greater than zero.";
  return e;
};

// ════════════════════════════════════════════════════════════════
// PROGRESS BAR
// ════════════════════════════════════════════════════════════════
const ProgressBar = ({ current }) => (
  <div className="ob-progress" role="progressbar" aria-valuenow={current} aria-valuemin={1} aria-valuemax={5}>
    {STEPS.map((step, i) => {
      const done    = step.id < current;
      const active  = step.id === current;
      return (
        <div key={step.id} className="ob-progress__item">
          <div className={`ob-node ${done ? "ob-node--done" : active ? "ob-node--active" : "ob-node--future"}`}>
            {done ? "✓" : step.id}
          </div>
          <span className={`ob-progress__label ${active ? "ob-progress__label--active" : ""}`}>
            {step.label}
          </span>
          {i < STEPS.length - 1 && (
            <div className={`ob-progress__line ${done ? "ob-progress__line--done" : ""}`} />
          )}
        </div>
      );
    })}
  </div>
);

// ════════════════════════════════════════════════════════════════
// STEP PANELS
// ════════════════════════════════════════════════════════════════

// ── Step 1: Welcome ──────────────────────────────────────────────
const Step1 = ({ onNext }) => (
  <div className="ob-step">
    <div className="ob-step__left">
      <div className="ob-ghost-num">01</div>
      <div className="ob-step__context">
        <span className="ob-step__eyebrow">Getting started</span>
        <h2 className="ob-step__title">Welcome to MetriCore.</h2>
        <p  className="ob-step__sub">
          Let's get your business set up in about 3 minutes.
          We'll ask for your goal, your first product, and your
          cost structure — then your dashboard is live.
        </p>
        <div className="ob-tip">
          <span className="ob-tip__icon">💡</span>
          <p>Everything you set up here can be edited later from inside the app.</p>
        </div>
      </div>
    </div>

    <div className="ob-step__right ob-step__right--welcome">
      <div className="ob-welcome-steps">
        {[
          { n: "01", label: "Set a revenue goal",   desc: "Name it, date it, target it." },
          { n: "02", label: "Add a product",         desc: "Name and price — that's all we need." },
          { n: "03", label: "Enter your daily costs",desc: "Ads, delivery, packaging, buying, shipping." },
        ].map((s) => (
          <div className="ob-welcome-step" key={s.n}>
            <span className="ob-welcome-step__n ob-mono">{s.n}</span>
            <div>
              <div className="ob-welcome-step__label">{s.label}</div>
              <div className="ob-welcome-step__desc">{s.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="ob-actions ob-actions--right">
        <button className="ob-btn ob-btn--primary ob-btn--lg" onClick={onNext}>
          Start setup →
        </button>
      </div>
    </div>
  </div>
);

// ── Step 2: Goal ─────────────────────────────────────────────────
const Step2 = ({ data, setData, errors, onNext, onBack }) => (
  <div className="ob-step">
    <div className="ob-step__left">
      <div className="ob-ghost-num">02</div>
      <div className="ob-step__context">
        <span className="ob-step__eyebrow">Step 2 of 5</span>
        <h2 className="ob-step__title">Set your first goal.</h2>
        <p  className="ob-step__sub">
          A goal is a revenue target with a timeframe. All your
          products and daily cost records sit beneath it.
        </p>
        <div className="ob-tip">
          <span className="ob-tip__icon">💡</span>
          <p>MetriCore will calculate how much you need to earn per day to hit your target — automatically.</p>
        </div>
      </div>
    </div>

    <div className="ob-step__right">
      <div className="ob-form">

        <div className="ob-field">
          <label className="ob-label" htmlFor="ob-goalName">Goal name</label>
          <input
            id="ob-goalName"
            type="text"
            className={`ob-input ${errors.targetName ? "ob-input--error" : ""}`}
            placeholder='e.g. "Q3 Revenue Target" or "Summer Product Drive"'
            value={data.targetName}
            onChange={(e) => setData({ ...data, targetName: e.target.value })}
            autoFocus
          />
          {errors.targetName && <span className="ob-error">{errors.targetName}</span>}
        </div>

        <div className="ob-form__row">
          <div className="ob-field">
            <label className="ob-label" htmlFor="ob-startDate">Start date</label>
            <input
              id="ob-startDate"
              type="date"
              className={`ob-input ${errors.targetStartDate ? "ob-input--error" : ""}`}
              value={data.targetStartDate}
              onChange={(e) => setData({ ...data, targetStartDate: e.target.value })}
            />
            {errors.targetStartDate && <span className="ob-error">{errors.targetStartDate}</span>}
          </div>

          <div className="ob-field">
            <label className="ob-label" htmlFor="ob-endDate">End date</label>
            <input
              id="ob-endDate"
              type="date"
              className={`ob-input ${errors.targetEndDate ? "ob-input--error" : ""}`}
              value={data.targetEndDate}
              onChange={(e) => setData({ ...data, targetEndDate: e.target.value })}
            />
            {errors.targetEndDate && <span className="ob-error">{errors.targetEndDate}</span>}
          </div>
        </div>

        <div className="ob-field">
          <label className="ob-label" htmlFor="ob-target">
            Revenue target
            <span className="ob-label__hint">Total amount you want to earn in this period</span>
          </label>
          <div className="ob-input-prefix">
            <span className="ob-input-prefix__sym">$</span>
            <input
              id="ob-target"
              type="number"
              min="1"
              className={`ob-input ob-input--prefixed ${errors.targetAmount ? "ob-input--error" : ""}`}
              placeholder="10000"
              value={data.targetAmount}
              onChange={(e) => setData({ ...data, targetAmount: e.target.value })}
            />
          </div>
          {errors.targetAmount && <span className="ob-error">{errors.targetAmount}</span>}
        </div>

      </div>

      <div className="ob-actions">
        <button className="ob-btn ob-btn--ghost" onClick={onBack}>← Back</button>
        <button className="ob-btn ob-btn--primary" onClick={onNext}>Save & continue →</button>
      </div>
    </div>
  </div>
);

// ── Step 3: Product ───────────────────────────────────────────────
const Step3 = ({ data, setData, errors, onNext, onBack, saving }) => {
  const fileRef    = useRef(null);
  const [preview, setPreview] = useState(null);

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setData({ ...data, productImgFile: file });
    setPreview(URL.createObjectURL(file));
  };

  return (
    <div className="ob-step">
      <div className="ob-step__left">
        <div className="ob-ghost-num">03</div>
        <div className="ob-step__context">
          <span className="ob-step__eyebrow">Step 3 of 5</span>
          <h2 className="ob-step__title">Add your first product.</h2>
          <p  className="ob-step__sub">
            A product is anything you sell. You can add more products
            to this goal later, or create new goals for different
            product lines.
          </p>
          <div className="ob-tip">
            <span className="ob-tip__icon">💡</span>
            <p>The selling price is used to calculate your total revenue from units sold each day.</p>
          </div>
        </div>
      </div>

      <div className="ob-step__right">
        <div className="ob-form">

          {/* Image upload */}
          <div className="ob-field">
            <label className="ob-label">
              Product image
              <span className="ob-label__hint">Optional</span>
            </label>
            <div
              className="ob-img-drop"
              onClick={() => fileRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
            >
              {preview ? (
                <img src={preview} alt="Preview" className="ob-img-preview" />
              ) : (
                <div className="ob-img-placeholder">
                  <span className="ob-img-placeholder__icon">📷</span>
                  <span className="ob-img-placeholder__text">Click to upload an image</span>
                  <span className="ob-img-placeholder__hint">JPG, PNG, WEBP — max 5MB</span>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="ob-file-hidden"
              onChange={handleImage}
            />
            {preview && (
              <button
                className="ob-img-remove"
                onClick={() => { setData({ ...data, productImgFile: null }); setPreview(null); }}
              >
                Remove image
              </button>
            )}
          </div>

          <div className="ob-field">
            <label className="ob-label" htmlFor="ob-productName">Product name</label>
            <input
              id="ob-productName"
              type="text"
              className={`ob-input ${errors.ProductName ? "ob-input--error" : ""}`}
              placeholder='e.g. "Wireless Earbuds" or "Organic Cotton T-Shirt"'
              value={data.ProductName}
              onChange={(e) => setData({ ...data, ProductName: e.target.value })}
            />
            {errors.ProductName && <span className="ob-error">{errors.ProductName}</span>}
          </div>

          <div className="ob-form__row">
            <div className="ob-field">
              <label className="ob-label" htmlFor="ob-price">
                Selling price
                <span className="ob-label__hint">Per unit</span>
              </label>
              <div className="ob-input-prefix">
                <span className="ob-input-prefix__sym">$</span>
                <input
                  id="ob-price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  className={`ob-input ob-input--prefixed ${errors.ProductPrice ? "ob-input--error" : ""}`}
                  placeholder="45.00"
                  value={data.ProductPrice}
                  onChange={(e) => setData({ ...data, ProductPrice: e.target.value })}
                />
              </div>
              {errors.ProductPrice && <span className="ob-error">{errors.ProductPrice}</span>}
            </div>

            <div className="ob-field">
              <label className="ob-label" htmlFor="ob-stock">
                In-stock quantity
                <span className="ob-label__hint">Optional</span>
              </label>
              <input
                id="ob-stock"
                type="number"
                min="0"
                className="ob-input"
                placeholder="0"
                value={data.InStockQuentity}
                onChange={(e) => setData({ ...data, InStockQuentity: e.target.value })}
              />
            </div>
          </div>

        </div>

        <div className="ob-actions">
          <button className="ob-btn ob-btn--ghost" onClick={onBack} disabled={saving}>← Back</button>
          <button className="ob-btn ob-btn--primary" onClick={onNext} disabled={saving}>
            {saving ? <><span className="ob-spinner" /> Saving…</> : "Save & continue →"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Step 4: Costs ─────────────────────────────────────────────────
const COST_FIELDS = [
  { key: "AdCost",              label: "Daily ad cost",          hint: "Total ad spend for this product today",   prefix: "$" },
  { key: "OtherCost",           label: "Other cost",             hint: "Any other daily cost not listed here",    prefix: "$" },
  { key: "DelibaryCostPersale", label: "Delivery cost per sale", hint: "What delivery costs you per unit sold",   prefix: "$" },
  { key: "PackgingCost",        label: "Packaging cost",         hint: "Packaging material cost per unit",        prefix: "$" },
  { key: "PrductBuyingCost",    label: "Product buying cost",    hint: "What you paid per unit to your supplier", prefix: "$" },
  { key: "ShippingCost",        label: "Shipping cost",          hint: "Shipping from supplier to you per unit",  prefix: "$" },
];

const Step4 = ({ data, setData, onNext, onBack, onSkip, saving }) => (
  <div className="ob-step">
    <div className="ob-step__left">
      <div className="ob-ghost-num">04</div>
      <div className="ob-step__context">
        <span className="ob-step__eyebrow">Step 4 of 5</span>
        <h2 className="ob-step__title">Set your daily costs.</h2>
        <p  className="ob-step__sub">
          These costs are used to calculate your real profit
          per sale — not just your revenue. Even rough numbers
          give you a much clearer picture than none.
        </p>
        <div className="ob-tip">
          <span className="ob-tip__icon">💡</span>
          <p>Every cost field can be updated directly from your goal dashboard on any day.</p>
        </div>
      </div>
    </div>

    <div className="ob-step__right">
      <div className="ob-form">
        <div className="ob-form__grid">
          {COST_FIELDS.map((f) => (
            <div className="ob-field" key={f.key}>
              <label className="ob-label" htmlFor={`ob-${f.key}`}>
                {f.label}
                <span className="ob-label__hint">{f.hint}</span>
              </label>
              <div className="ob-input-prefix">
                <span className="ob-input-prefix__sym">{f.prefix}</span>
                <input
                  id={`ob-${f.key}`}
                  type="number"
                  min="0"
                  step="0.01"
                  className="ob-input ob-input--prefixed"
                  placeholder="0.00"
                  value={data[f.key]}
                  onChange={(e) => setData({ ...data, [f.key]: e.target.value })}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="ob-actions ob-actions--three">
        <button className="ob-btn ob-btn--ghost" onClick={onBack} disabled={saving}>← Back</button>
        <button className="ob-skip" onClick={onSkip} disabled={saving}>
          Set costs later
        </button>
        <button className="ob-btn ob-btn--primary" onClick={onNext} disabled={saving}>
          {saving ? <><span className="ob-spinner" /> Saving…</> : "Save & finish →"}
        </button>
      </div>
    </div>
  </div>
);

// ── Step 5: Done ──────────────────────────────────────────────────
const Step5 = ({ goalData, productData, finishing, onFinish }) => (
  <div className="ob-step ob-step--done">
    <div className="ob-step__left">
      <div className="ob-ghost-num">✓</div>
      <div className="ob-step__context">
        <span className="ob-step__eyebrow">You're all set</span>
        <h2 className="ob-step__title">Your dashboard is live.</h2>
        <p  className="ob-step__sub">
          Your goal and product are set up. Head to your dashboard
          and start entering today's numbers — MetriCore will handle
          all the calculations.
        </p>
      </div>
    </div>

    <div className="ob-step__right">

      {/* Summary card */}
      <div className="ob-summary">
        <div className="ob-summary__header">
          <span className="ob-summary__label ob-mono">What we set up</span>
        </div>

        <div className="ob-summary__section">
          <span className="ob-summary__section-label ob-mono">GOAL</span>
          <div className="ob-summary__row">
            <span className="ob-summary__key">Name</span>
            <span className="ob-summary__val">{goalData.targetName || "—"}</span>
          </div>
          <div className="ob-summary__row">
            <span className="ob-summary__key">Period</span>
            <span className="ob-summary__val ob-mono">
              {toDDMMYYYY(goalData.targetStartDate)} → {toDDMMYYYY(goalData.targetEndDate)}
            </span>
          </div>
          <div className="ob-summary__row">
            <span className="ob-summary__key">Target</span>
            <span className="ob-summary__val ob-mono ob-amber">
              ${Number(goalData.targetAmount || 0).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="ob-summary__divider" />

        <div className="ob-summary__section">
          <span className="ob-summary__section-label ob-mono">PRODUCT</span>
          <div className="ob-summary__row">
            <span className="ob-summary__key">Name</span>
            <span className="ob-summary__val">{productData.ProductName || "—"}</span>
          </div>
          <div className="ob-summary__row">
            <span className="ob-summary__key">Price</span>
            <span className="ob-summary__val ob-mono ob-amber">
              ${Number(productData.ProductPrice || 0).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <div className="ob-actions ob-actions--right">
        <button
          className="ob-btn ob-btn--primary ob-btn--lg"
          onClick={onFinish}
          disabled={finishing}
        >
          {finishing
            ? <><span className="ob-spinner" /> Opening dashboard…</>
            : "Go to my dashboard →"
          }
        </button>
      </div>

    </div>
  </div>
);

// ════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════
export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user  } = useAuth(); // expects user.companyName

  const [step,    setStep]    = useState(1);
  const [dir,     setDir]     = useState("forward"); // "forward" | "back"
  const [saving,  setSaving]  = useState(false);
  const [errors,  setErrors]  = useState({});

  // Per-step form data
  const [goalData, setGoalData] = useState({
    targetName:      "",
    targetStartDate: "",
    targetEndDate:   "",
    targetAmount:    "",
  });

  const [productData, setProductData] = useState({
    ProductName:     "",
    ProductPrice:    "",
    InStockQuentity: "",
    productImgFile:  null,
  });

  const [costData, setCostData] = useState({
    AdCost:              "",
    OtherCost:           "",
    DelibaryCostPersale: "",
    PackgingCost:        "",
    PrductBuyingCost:    "",
    ShippingCost:        "",
  });

  // IDs created during the flow
  const [createdGoalId,    setCreatedGoalId]    = useState(null);
  const [createdProductId, setCreatedProductId] = useState(null);

  // ── Navigation ─────────────────────────────────────────────────
  const goTo = (n, direction = "forward") => {
    setDir(direction);
    setErrors({});
    // Small delay so CSS transition class is set before step changes
    setTimeout(() => setStep(n), 20);
  };

  // ── Step 2: Save goal ──────────────────────────────────────────
  const handleGoalNext = async () => {
    const errs = validateStep2(goalData);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      const res = await Altaxios.post("/setgole/addNewGoles", {
        targetName:      goalData.targetName.trim(),
        targetStartDate: toDDMMYYYY(goalData.targetStartDate),
        targetEndDate:   toDDMMYYYY(goalData.targetEndDate),
        targetAmount:    Number(goalData.targetAmount),
      });
      setCreatedGoalId(res.data._id || res.data.data?._id);
      goTo(3);
    } catch (err) {
      console.error(err);
      setErrors({ targetName: "Failed to save goal. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  // ── Step 3: Save product ───────────────────────────────────────
  const handleProductNext = async () => {
    const errs = validateStep3(productData);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("ProductName",     productData.ProductName.trim());
      fd.append("ProductPrice",    Number(productData.ProductPrice));
      fd.append("InStockQuentity", Number(productData.InStockQuentity) || 0);
      fd.append("GoalIdentifire",  createdGoalId);
      if (productData.productImgFile) {
        fd.append("files", productData.productImgFile);
      }
      const res = await Altaxios.post("/newproduct/addNewProduct", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setCreatedProductId(res.data._id || res.data.data?._id);
      goTo(4);
    } catch (err) {
      console.error(err);
      setErrors({ ProductName: "Failed to save product. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  // ── Step 4: Save costs (or skip) ──────────────────────────────
  const saveCosts = async () => {
    if (!createdProductId) return;
    await Altaxios.post("/productdata/createInitialCost", {
      productId: createdProductId,
      goalId:    createdGoalId,
      AdCost:              Number(costData.AdCost)              || 0,
      OtherCost:           Number(costData.OtherCost)           || 0,
      DelibaryCostPersale: Number(costData.DelibaryCostPersale) || 0,
      PackgingCost:        Number(costData.PackgingCost)        || 0,
      PrductBuyingCost:    Number(costData.PrductBuyingCost)    || 0,
      ShippingCost:        Number(costData.ShippingCost)        || 0,
    });
  };

  const handleCostsNext = async () => {
    setSaving(true);
    try {
      await saveCosts();
      goTo(5);
    } catch (err) {
      console.error(err);
      goTo(5); // non-blocking — costs can be set later
    } finally {
      setSaving(false);
    }
  };

  const handleCostsSkip = () => goTo(5);

  // ── Step 5: Finish ─────────────────────────────────────────────
  const [finishing, setFinishing] = useState(false);

  const handleFinish = async () => {
    setFinishing(true);
    try {
      await Altaxios.patch("/newemplyee/completeOnboarding");
      navigate(`/company/${user?.companyName}`);
    } catch (err) {
      console.error(err);
      navigate(`/company/${user?.companyName}`); // navigate anyway
    } finally {
      setFinishing(false);
    }
  };

  // ════════════════════════════════════════════════════════════════
  return (
    <div className="ob-root">

      {/* ── Top bar: logo + step count ─────────────────────────── */}
      <div className="ob-topbar">
        <div className="ob-topbar__logo">
          <span className="ob-logo__mark">M</span>
          <span className="ob-logo__name">MetriCore</span>
        </div>
        <span className="ob-topbar__step ob-mono">
          {step < 5 ? `Step ${step} of 5` : "Setup complete"}
        </span>
      </div>

      {/* ── Progress bar ───────────────────────────────────────── */}
      <div className="ob-progress-wrap">
        <ProgressBar current={step} />
      </div>

      {/* ── Step panel ─────────────────────────────────────────── */}
      <div className={`ob-panel ob-panel--${dir}`} key={step}>

        {step === 1 && (
          <Step1 onNext={() => goTo(2)} />
        )}

        {step === 2 && (
          <Step2
            data={goalData}
            setData={setGoalData}
            errors={errors}
            onNext={handleGoalNext}
            onBack={() => goTo(1, "back")}
          />
        )}

        {step === 3 && (
          <Step3
            data={productData}
            setData={setProductData}
            errors={errors}
            onNext={handleProductNext}
            onBack={() => goTo(2, "back")}
            saving={saving}
          />
        )}

        {step === 4 && (
          <Step4
            data={costData}
            setData={setCostData}
            onNext={handleCostsNext}
            onBack={() => goTo(3, "back")}
            onSkip={handleCostsSkip}
            saving={saving}
          />
        )}

        {step === 5 && (
          <Step5
            goalData={goalData}
            productData={productData}
            finishing={finishing}
            onFinish={handleFinish}
          />
        )}

      </div>

    </div>
  );
}