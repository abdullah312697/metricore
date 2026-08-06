import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon      from "@mui/icons-material/Edit";
import DeleteIcon    from "@mui/icons-material/Delete";
import ConfirmDialog from "./ConfirmDialog";
import { Altaxios }  from "../../Altaxios";
import "../../../style/ViewProduct.css";

export default function ViewProduct() {
  const { productId,companyName } = useParams();
  const navigate = useNavigate();

  const [product,   setProduct]   = useState(null);
  const [goals,     setGoals]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [loadError, setLoadError] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting,    setDeleting]    = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // ── Load product + goals ────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    Altaxios.get(`/newproduct/getSingleProduct/${productId}`)
      .then((res) => setProduct(res.data.data))
      .catch((err) => setLoadError(err.response?.data?.message || "Failed to load this product"))
      .finally(() => setLoading(false));
  }, [productId]);

  useEffect(() => {
    Altaxios.get("/setgole/getGoleData")
      .then((res) => setGoals(res.data || []))
      .catch(() => {});
  }, []);

  // ── Which goals is this product attached to ─────────────────────
  const attachedIds = Array.isArray(product?.GoalIdentifire) ? product.GoalIdentifire : [];
  const attachedGoals = goals.filter((g) => attachedIds.includes(g._id));

  // ── Delete ──────────────────────────────────────────────────────
  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError("");
    try {
      await Altaxios.delete(`/newproduct/deleteProduct/${productId}`, { withCredentials: true });
      navigate(`/company/${companyName}/addproduct`, { replace: true });
    } catch (err) {
      setDeleteError(err.response?.data?.message || "Failed to delete product. Please try again.");
      setDeleting(false);
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════════ */
  if (loading) {
    return (
      <div className="vp-root">
        <div className="vp-loading vp-mono">LOADING PRODUCT…</div>
      </div>
    );
  }

  if (loadError || !product) {
    return (
      <div className="vp-root">
        <div className="vp-load-error">
          <p>{loadError || "Product not found."}</p>
          <Link to={`/company/${companyName}/addproduct`} className="vp-btn vp-btn--ghost">← Back to products</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="vp-root">
      <div className="vp-container">

        {/* ── Top bar ─────────────────────────────────────────── */}
        <div className="vp-topbar">
          <Link to={`/company/${companyName}/addproduct`} className="vp-back" aria-label="Back to products">
            <ArrowBackIcon style={{ fontSize: 22 }} />
          </Link>
          <span className="vp-eyebrow vp-mono">Product detail</span>
        </div>

        <div className="vp-grid">

          {/* ══ LEFT — image + actions ═════════════════════════ */}
          <aside className="vp-media">
            <div className="vp-image-wrap">
              {product.productImgFile ? (
                <img src={product.productImgFile} alt={product.ProductName} className="vp-image" />
              ) : (
                <div className="vp-image vp-image--empty">📦</div>
              )}
            </div>

            <div className="vp-actions">
              <Link to={`/company/${companyName}/editproduct/${productId}`} className="vp-btn vp-btn--edit">
                <EditIcon style={{ fontSize: 17 }} /> Edit product
              </Link>
              <button
                className="vp-btn vp-btn--delete"
                onClick={() => { setDeleteError(""); setConfirmOpen(true); }}
              >
                <DeleteIcon style={{ fontSize: 17 }} /> Delete
              </button>
            </div>
          </aside>

          {/* ══ RIGHT — details ════════════════════════════════ */}
          <main className="vp-details">

            <div className="vp-header">
              <h1 className="vp-name">{product.ProductName}</h1>
              {product.sku && <span className="vp-sku vp-mono">{product.sku}</span>}
            </div>

            {/* Stat tiles */}
            <div className="vp-stats">
              <div className="vp-stat">
                <span className="vp-stat__label vp-mono">PRICE</span>
                <span className="vp-stat__value">
                  <span className="vp-stat__currency">$</span>{product.ProductPrice}
                </span>
              </div>
              <div className="vp-stat">
                <span className="vp-stat__label vp-mono">IN STOCK</span>
                <span className="vp-stat__value">
                  {product.InStockQuentity}
                  <span className="vp-stat__unit">units</span>
                </span>
              </div>
            </div>

            {/* Attached goals */}
            <div className="vp-section">
              <h2 className="vp-section__title vp-mono">ATTACHED GOALS</h2>
              {attachedGoals.length > 0 ? (
                <div className="vp-goals">
                  {attachedGoals.map((g) => (
                    <span className="vp-goal" key={g._id}>
                      <span className="vp-goal__dot" />
                      {g.targetName}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="vp-empty-line">
                  This product isn't attached to any goal.{" "}
                  <Link to={`/editproduct/${productId}`} className="vp-link">Edit to add one →</Link>
                </p>
              )}
            </div>

          </main>
        </div>
      </div>

      {/* ── Delete confirmation ──────────────────────────────────── */}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete this product?"
        message={`"${product.ProductName}" will be permanently removed, along with its image. This can't be undone.`}
        error={deleteError}
        confirmLabel="Delete product"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}