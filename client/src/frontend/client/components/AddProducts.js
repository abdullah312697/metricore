import { useState, useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import ArrowBackIcon        from "@mui/icons-material/ArrowBack";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import { Altaxios } from "../../Altaxios";
import "../../../style/AddProduct.css";
import { useAuth }  from "../../../context/AuthContext";

export default function AddProduct() {
  const { companyName } = useParams();
  const { user } = useAuth();

  const [form, setForm] = useState({
    ProductName:     "",
    sku:             "",
    ProductPrice:    "",
    InStockQuentity: "",
  });

  const [imgFile,    setImgFile]    = useState(null);
  const [imgPreview, setImgPreview] = useState("");

  const [goals,        setGoals]        = useState([]);
  const [checkedGoals, setCheckedGoals] = useState([]);
  const [products,     setProducts]     = useState([]);

  const [errors,      setErrors]      = useState({});
  const [serverError, setServerError] = useState("");
  const [saving,      setSaving]      = useState(false);
  const [savedFlash,  setSavedFlash]  = useState(false);

  // ── Load goals + existing products ──────────────────────────────
  useEffect(() => {
    Altaxios.get("/setgole/getGoleData")
      .then((res) => setGoals(res.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    Altaxios.get("/newproduct/getallProducts/")
      .then((res) => setProducts(res.data.data || []))
      .catch(() => {});
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: "" }));
    if (serverError)  setServerError("");
  };

  // ── Image pick + preview ────────────────────────────────────────
  const pickImage = (e) => {
    const f = e.currentTarget.files[0];
    if (!f) return;
    if (!/\.(jpe?g|png|webp)$/i.test(f.name)) {
      setErrors((p) => ({ ...p, image: "Use a JPG, PNG or WEBP image." }));
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setErrors((p) => ({ ...p, image: "Image must be under 5MB." }));
      return;
    }
    setErrors((p) => ({ ...p, image: "" }));
    setImgFile(f);
    setImgPreview(URL.createObjectURL(f));
  };

  const clearImage = () => {
    setImgFile(null);
    setImgPreview("");
  };

  const toggleGoal = (id) =>
    setCheckedGoals((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  // ── Validation ──────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.ProductName.trim())     e.ProductName     = "Product name is required.";
    if (form.ProductPrice === "" || Number(form.ProductPrice) < 0)
      e.ProductPrice = "Enter a valid price.";
    if (form.InStockQuentity === "" || Number(form.InStockQuentity) < 0)
      e.InStockQuentity = "Enter available quantity.";
    if (!checkedGoals.length)         e.goals           = "Attach the product to at least one goal.";
    if (!imgFile)                     e.image           = "A product image is required.";
    return e;
  };

  const canSubmit = useMemo(
    () =>
      form.ProductName.trim() &&
      form.ProductPrice !== "" &&
      form.InStockQuentity !== "" &&
      checkedGoals.length > 0 &&
      imgFile,
    [form, checkedGoals, imgFile]
  );

  // ── Submit ──────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    setServerError("");
    try {
      const fd = new FormData();
      fd.append("ProductName",     form.ProductName.trim());
      fd.append("sku",             form.sku.trim());          // 👈 optional SKU
      fd.append("ProductPrice",    form.ProductPrice);
      fd.append("InStockQuentity", form.InStockQuentity);
      checkedGoals.forEach((id) => fd.append("GoalIdentifire[]", id));
      fd.append("files", imgFile);

      const res = await Altaxios.post("/newproduct/addNewProduct", fd);

      setProducts((prev) => [...prev, res.data.data]);
      setForm({ ProductName: "", sku: "", ProductPrice: "", InStockQuentity: "" });
      setCheckedGoals([]);
      clearImage();

      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2500);
    } catch (err) {
      setServerError(err.response?.data?.message || "Failed to add product. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ap-root">
      <div className="ap-container">

        {/* ── Top bar ─────────────────────────────────────────── */}
        <div className="ap-topbar">
          <Link to={`/company/${companyName}`} className="ap-back" aria-label="Back to dashboard">
            <ArrowBackIcon style={{ fontSize: 22 }} />
          </Link>
          <span className="ap-eyebrow ap-mono">Products</span>
          <span className={`ap-saved-flash ${savedFlash ? "ap-saved-flash--show" : ""}`}>
            ✓ Product added
          </span>
        </div>

        <div className="ap-grid">

          {/* ══ LEFT — form ════════════════════════════════════ */}
          <div className="ap-form-card">
            <h1 className="ap-title">Add a product</h1>
            <p className="ap-sub">
              Products carry the costs you track. Attach each one to a goal
              so its sales count toward that target.
            </p>

            <div className="ap-field">
              <label className="ap-label" htmlFor="ap-name">Product / service name</label>
              <input
                id="ap-name"
                name="ProductName"
                type="text"
                className={`ap-input ${errors.ProductName ? "ap-input--error" : ""}`}
                placeholder="e.g. Classic Tote Bag"
                value={form.ProductName}
                onChange={handleChange}
                maxLength={100}
              />
              {errors.ProductName && <span className="ap-error">{errors.ProductName}</span>}
            </div>

            <div className="ap-field">
              <label className="ap-label" htmlFor="ap-sku">
                SKU
                <span className="ap-label__hint">Optional — a stable code your systems use to push data (e.g. TOTE-01)</span>
              </label>
              <input
                id="ap-sku"
                name="sku"
                type="text"
                className="ap-input ap-mono"
                placeholder="TOTE-01"
                value={form.sku}
                onChange={handleChange}
                maxLength={40}
              />
            </div>

            <div className="ap-row">
              <div className="ap-field">
                <label className="ap-label" htmlFor="ap-price">Price</label>
                <div className="ap-prefix-wrap">
                  <span className="ap-prefix ap-mono">$</span>
                  <input
                    id="ap-price"
                    name="ProductPrice"
                    type="number"
                    min="0"
                    className={`ap-input ap-input--prefixed ${errors.ProductPrice ? "ap-input--error" : ""}`}
                    placeholder="0.00"
                    value={form.ProductPrice}
                    onChange={handleChange}
                  />
                </div>
                {errors.ProductPrice && <span className="ap-error">{errors.ProductPrice}</span>}
              </div>

              <div className="ap-field">
                <label className="ap-label" htmlFor="ap-stock">Available quantity</label>
                <input
                  id="ap-stock"
                  name="InStockQuentity"
                  type="number"
                  min="0"
                  className={`ap-input ${errors.InStockQuentity ? "ap-input--error" : ""}`}
                  placeholder="Saleable units"
                  value={form.InStockQuentity}
                  onChange={handleChange}
                />
                {errors.InStockQuentity && <span className="ap-error">{errors.InStockQuentity}</span>}
              </div>
            </div>

            {/* Image */}
            <div className="ap-field">
              <label className="ap-label">Product image</label>
              {!imgPreview ? (
                <label className={`ap-drop ${errors.image ? "ap-drop--error" : ""}`}>
                  <AddPhotoAlternateIcon style={{ fontSize: 24, color: "#ffb100" }} />
                  <span className="ap-drop__text">Click to upload an image</span>
                  <input type="file" accept=".jpg,.jpeg,.png,.webp" className="ap-file-hidden" onChange={pickImage} />
                </label>
              ) : (
                <div className="ap-img-preview">
                  <img src={imgPreview} alt="Product preview" />
                  <div className="ap-img-preview__meta">
                    <span className="ap-img-preview__name ap-mono">{imgFile?.name}</span>
                    <button type="button" className="ap-img-remove" onClick={clearImage}>Remove</button>
                  </div>
                </div>
              )}
              {errors.image && <span className="ap-error">{errors.image}</span>}
            </div>

            {/* Goals */}
            <div className="ap-field">
              <label className="ap-label">Attach to goal(s)</label>
              {goals.length > 0 ? (
                <div className="ap-goals">
                  {goals.map((g) => {
                    const on = checkedGoals.includes(g._id);
                    return (
                      <button
                        type="button"
                        key={g._id}
                        className={`ap-goal ${on ? "ap-goal--on" : ""}`}
                        onClick={() => toggleGoal(g._id)}
                      >
                        <span className={`ap-goal__check ${on ? "ap-goal__check--on" : ""}`}>
                          {on ? "✓" : ""}
                        </span>
                        {g.targetName}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="ap-no-goals">
                  <span>You don't have any goals yet.</span>
                  <Link to={`/company/${companyName}/creategoal`} className="ap-link">Create your first goal →</Link>
                </div>
              )}
              {errors.goals && <span className="ap-error">{errors.goals}</span>}
            </div>

            {serverError && <div className="ap-server-error" role="alert">{serverError}</div>}

            <button className="ap-btn ap-btn--primary" onClick={handleSubmit} disabled={!canSubmit || saving}>
              {saving && <span className="ap-spinner" />}
              Add product
            </button>
          </div>

          {/* ══ RIGHT — product list ═══════════════════════════ */}
          <aside className="ap-list-card">
            <div className="ap-list-head">
              <h2 className="ap-list-title">Your products</h2>
              <span className="ap-count ap-mono">{products.length}</span>
            </div>

            {products.length > 0 ? (
              <div className="ap-list">
                {products.map((p) => (
                  <div className="ap-prod" key={p._id}>
                    <img
                      className="ap-prod__img"
                      src={p.productImgFile}
                      alt={p.ProductName}
                    />
                    <div className="ap-prod__info">
                      <span className="ap-prod__name">{p.ProductName}</span>
                      <span className="ap-prod__meta ap-mono">
                        {p.sku ? `${p.sku} · ` : ""}${p.ProductPrice} · {p.InStockQuentity} units
                      </span>
                    </div>
                    <Link className="ap-prod__view" to={`/company/${user?.companyName || companyName}/viewproduct/${p._id}`}>View</Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="ap-empty">
                <span className="ap-empty__icon">📦</span>
                <p>No products yet. Add your first one on the left.</p>
              </div>
            )}
          </aside>

        </div>
      </div>
    </div>
  );
}