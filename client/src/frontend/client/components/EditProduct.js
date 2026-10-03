import { useState, useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import ArrowBackIcon        from "@mui/icons-material/ArrowBack";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import { Altaxios } from "../../Altaxios";
import "../../../style/AddProduct.css";   // reuses the ap- brand styles
import "../../../style/EditProduct.css";  // + a few edit-only additions

// arrays equal regardless of order
const sameSet = (a, b) =>
  a.length === b.length && a.every((x) => b.includes(x));

export default function EditProduct() {

  const { productId, companyName } = useParams();
  const [original, setOriginal] = useState(null); // server copy
  const [form, setForm] = useState({
    ProductName: "", sku: "", ProductPrice: "", InStockQuentity: "",
  });
  const [checkedGoals, setCheckedGoals] = useState([]);
  const [goals,        setGoals]        = useState([]);

  const [imgFile,     setImgFile]     = useState(null);   // new upload (null = keep existing)
  const [imgPreview,  setImgPreview]  = useState("");     // shown image (existing or new)

  const [loading,     setLoading]     = useState(true);
  const [loadError,   setLoadError]   = useState("");
  const [errors,      setErrors]      = useState({});
  const [serverError, setServerError] = useState("");
  const [saving,      setSaving]      = useState(false);
  const [savedFlash,  setSavedFlash]  = useState(false);

  // ── Load product + goals ────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    Altaxios.get(`/newproduct/getSingleProduct/${productId}`)
      .then((res) => {
        const p = res.data.data;
        setOriginal(p);
        setForm({
          ProductName:     p.ProductName     ?? "",
          sku:             p.sku             ?? "",
          ProductPrice:    p.ProductPrice    ?? "",
          InStockQuentity: p.InStockQuentity ?? "",
        });
        setCheckedGoals(Array.isArray(p.GoalIdentifire) ? p.GoalIdentifire : []);
        setImgPreview(p.productImgFile || "");
      })
      .catch((err) => setLoadError(err.response?.data?.message || "Failed to load this product"))
      .finally(() => setLoading(false));
  }, [productId]);

  useEffect(() => {
    Altaxios.get("/setgole/getGoleData")
      .then((res) => setGoals(res.data || []))
      .catch(() => {});
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: "" }));
    if (serverError)  setServerError("");
  };

  // ── Image ───────────────────────────────────────────────────────
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

  const revertImage = () => {
    setImgFile(null);
    setImgPreview(original?.productImgFile || "");
  };

  const toggleGoal = (id) =>
    setCheckedGoals((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  // ── Dirty tracking — clean, correct comparison against server copy ─
  // (Your old version had a bug: existingGoals was derived from
  //  GoalIdentifire[0].split(",") — but GoalIdentifire is already an
  //  array, so that produced wrong comparisons. This compares arrays
  //  directly.)
  const isDirty = useMemo(() => {
    if (!original) return false;
    return (
      form.ProductName.trim()       !== (original.ProductName ?? "")            ||
      (form.sku.trim() || "")       !== (original.sku ?? "")                    ||
      Number(form.ProductPrice)     !== Number(original.ProductPrice)           ||
      Number(form.InStockQuentity)  !== Number(original.InStockQuentity)        ||
      !sameSet(checkedGoals, Array.isArray(original.GoalIdentifire) ? original.GoalIdentifire : []) ||
      imgFile !== null
    );
  }, [form, checkedGoals, imgFile, original]);

  const validate = () => {
    const e = {};
    if (!form.ProductName.trim()) e.ProductName = "Product name is required.";
    if (form.ProductPrice === "" || Number(form.ProductPrice) < 0) e.ProductPrice = "Enter a valid price.";
    if (form.InStockQuentity === "" || Number(form.InStockQuentity) < 0) e.InStockQuentity = "Enter available quantity.";
    if (!checkedGoals.length) e.goals = "Attach the product to at least one goal.";
    return e;
  };

  // ── Submit ──────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    setServerError("");
    try {
      const fd = new FormData();
      fd.append("ProductName",     form.ProductName.trim());
      fd.append("sku",             form.sku.trim());
      fd.append("ProductPrice",    form.ProductPrice);
      fd.append("InStockQuentity", form.InStockQuentity);
      checkedGoals.forEach((id) => fd.append("GoalIdentifire[]", id));
      if (imgFile) fd.append("files", imgFile);   // only send image if changed

      const res = await Altaxios.put(`/newproduct/updateProduct/${productId}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // Re-sync from the server's response
      const p = res.data.data;
      setOriginal(p);
      setForm({
        ProductName:     p.ProductName     ?? "",
        sku:             p.sku             ?? "",
        ProductPrice:    p.ProductPrice    ?? "",
        InStockQuentity: p.InStockQuentity ?? "",
      });
      setCheckedGoals(Array.isArray(p.GoalIdentifire) ? p.GoalIdentifire : []);
      setImgPreview(p.productImgFile || "");
      setImgFile(null);

      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2500);
    } catch (err) {
      setServerError(err.response?.data?.message || "Failed to update product. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  /* ═══════════════════════════════════════════════════════════════ */
  if (loading) {
    return (
      <div className="ap-root">
        <div className="ap-container"><p className="ap-mono" style={{ padding: "90px 0", textAlign: "center", color: "#4d6070", letterSpacing: "3px" }}>LOADING PRODUCT…</p></div>
      </div>
    );
  }

  if (loadError || !original) {
    return (
      <div className="ap-root">
        <div className="ap-container" style={{ textAlign: "center", paddingTop: 90 }}>
          <p style={{ color: "#8899aa", marginBottom: 18 }}>{loadError || "Product not found."}</p>
          <Link to={`/company/${companyName}/addproduct`} className="ap-btn ap-btn--primary" style={{ display: "inline-flex" }}>← Back to products</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="ap-root">
      <div className="ap-container">

        {/* ── Top bar ─────────────────────────────────────────── */}
        <div className="ap-topbar">
          <Link to={`/company/${companyName}/viewproduct/${productId}`} className="ap-back" aria-label="Back to product">
            <ArrowBackIcon style={{ fontSize: 22 }} />
          </Link>
          <span className="ap-eyebrow ap-mono">Edit product</span>
          <span className={`ap-saved-flash ${savedFlash ? "ap-saved-flash--show" : ""}`}>
            ✓ Changes saved
          </span>
        </div>

        {/* Single centered card (no product-list column when editing) */}
        <div className="ep2-wrap">
          <div className="ap-form-card">
            <h1 className="ap-title">{original.ProductName}</h1>
            <p className="ap-sub">Update the details — the Save button stays disabled until something changes.</p>

            <div className="ap-field">
              <label className="ap-label" htmlFor="ep-name">Product / service name</label>
              <input
                id="ep-name" name="ProductName" type="text"
                className={`ap-input ${errors.ProductName ? "ap-input--error" : ""}`}
                value={form.ProductName} onChange={handleChange} maxLength={100}
              />
              {errors.ProductName && <span className="ap-error">{errors.ProductName}</span>}
            </div>

            <div className="ap-field">
              <label className="ap-label" htmlFor="ep-sku">
                SKU
                <span className="ap-label__hint">Optional — the stable code your systems use to push data</span>
              </label>
              <input
                id="ep-sku" name="sku" type="text"
                className="ap-input ap-mono"
                placeholder="TOTE-01"
                value={form.sku} onChange={handleChange} maxLength={40}
              />
            </div>

            <div className="ap-row">
              <div className="ap-field">
                <label className="ap-label" htmlFor="ep-price">Price</label>
                <div className="ap-prefix-wrap">
                  <span className="ap-prefix ap-mono">$</span>
                  <input
                    id="ep-price" name="ProductPrice" type="number" min="0"
                    className={`ap-input ap-input--prefixed ${errors.ProductPrice ? "ap-input--error" : ""}`}
                    value={form.ProductPrice} onChange={handleChange}
                  />
                </div>
                {errors.ProductPrice && <span className="ap-error">{errors.ProductPrice}</span>}
              </div>

              <div className="ap-field">
                <label className="ap-label" htmlFor="ep-stock">Available quantity</label>
                <input
                  id="ep-stock" name="InStockQuentity" type="number" min="0"
                  className={`ap-input ${errors.InStockQuentity ? "ap-input--error" : ""}`}
                  value={form.InStockQuentity} onChange={handleChange}
                />
                {errors.InStockQuentity && <span className="ap-error">{errors.InStockQuentity}</span>}
              </div>
            </div>

            {/* Image — shows current, lets you swap */}
            <div className="ap-field">
              <label className="ap-label">Product image</label>
              <div className="ep2-image-row">
                <div className="ep2-image-thumb">
                  {imgPreview
                    ? <img src={imgPreview} alt="Product" />
                    : <span className="ep2-image-thumb__empty">📦</span>}
                </div>
                <div className="ep2-image-actions">
                  <label className="ap-btn ap-btn--ghost ep2-choose">
                    <AddPhotoAlternateIcon style={{ fontSize: 18 }} />
                    {imgFile ? "Choose different" : "Change image"}
                    <input type="file" accept=".jpg,.jpeg,.png,.webp" className="ap-file-hidden" onChange={pickImage} />
                  </label>
                  {imgFile && (
                    <button type="button" className="ap-img-remove" onClick={revertImage}>
                      Keep current image
                    </button>
                  )}
                  {imgFile && <span className="ep2-image-name ap-mono">{imgFile.name}</span>}
                </div>
              </div>
              {errors.image && <span className="ap-error">{errors.image}</span>}
            </div>

            {/* Goals */}
            <div className="ap-field">
              <label className="ap-label">Attached goal(s)</label>
              {goals.length > 0 ? (
                <div className="ap-goals">
                  {goals.map((g) => {
                    const on = checkedGoals.includes(g._id);
                    return (
                      <button
                        type="button" key={g._id}
                        className={`ap-goal ${on ? "ap-goal--on" : ""}`}
                        onClick={() => toggleGoal(g._id)}
                      >
                        <span className={`ap-goal__check ${on ? "ap-goal__check--on" : ""}`}>{on ? "✓" : ""}</span>
                        {g.targetName}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="ap-no-goals"><span>You don't have any goals yet.</span></div>
              )}
              {errors.goals && <span className="ap-error">{errors.goals}</span>}
            </div>

            {serverError && <div className="ap-server-error" role="alert">{serverError}</div>}

            <div className="ep2-actions">
              <Link to={`/company/${companyName}/viewproduct/${productId}`} className="ap-btn ap-btn--ghost">Cancel</Link>
              <button className="ap-btn ap-btn--primary" onClick={handleSubmit} disabled={!isDirty || saving}>
                {saving && <span className="ap-spinner" />}
                Save changes
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}