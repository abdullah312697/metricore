import { Link } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";
import "../../../style/ProductList.css";
import { can } from "../../../utils/permissions";
import { useAuth } from "../../../context/AuthContext";

/* ═══════════════════════════════════════════════════════════════
   ProductList — product table for the main dashboard.

   Sibling of EmployeeList: fits inside .MainContainerChunk
   (600x300, overflow:hidden) as three stacked regions:

     .pl-topbar  — fixed  (title, count, Add product)
     .pl-head    — fixed  (column labels)
     .pl-scroll  — SCROLLS (all .pl-row product rows)

   Props:
     products    : array from /newproduct/getallProducts (currentProducs)
     companyName : user?.companyName || companyName
═══════════════════════════════════════════════════════════════ */
export default function ProductList({ products = [], companyName }) {
    const {user} = useAuth();

  return (
    <div className="pl-root">

      {/* ══ FIXED: top bar ═══════════════════════════════════ */}
      <div className="pl-topbar">
        <div className="pl-topbar__left">
          <h2 className="pl-title">Products</h2>
          {products.length > 0 && (
            <span className="pl-count pl-mono">{products.length}</span>
          )}
        </div>
        {can(user.employeeRoal, "manageProducts") && (
        <Link
          to={`/company/${companyName}/addproduct`}
          className="pl-btn pl-btn--add"
        >
          <AddIcon style={{ fontSize: 16 }} />
          Add
        </Link>
        )}
      </div>

      {products.length > 0 ? (
        <>
          {/* ══ FIXED: column header ═════════════════════════ */}
          <div className="pl-head">
            <span className="pl-col-img">Image</span>
            <span className="pl-col-name">Name</span>
            <span className="pl-col-sku">SKU</span>
            <span className="pl-col-price">Price</span>
            <span className="pl-col-units">Units</span>
            <span className="pl-col-action" />
          </div>

          {/* ══ SCROLLABLE: product rows ═════════════════════ */}
          <div className="pl-scroll">
            {products.map((pro) => (
              <div className="pl-row" key={pro._id}>
                <span className="pl-col-img">
                  {pro.productImgFile ? (
                    <img
                      src={pro.productImgFile}
                      alt={pro.ProductName || "Product"}
                      className="pl-thumb"
                    />
                  ) : (
                    <span className="pl-thumb pl-thumb--empty">📦</span>
                  )}
                </span>

                <span className="pl-col-name">{pro.ProductName || "—"}</span>

                <span className="pl-col-sku pl-mono">
                  {pro.sku ? (
                    <span className="pl-sku-chip">{pro.sku}</span>
                  ) : (
                    <span className="pl-dash">—</span>
                  )}
                </span>

                <span className="pl-col-price pl-mono">
                  <span className="pl-currency">$</span>
                  {pro.ProductPrice ?? 0}
                </span>

                <span className="pl-col-units pl-mono">
                  {pro.InStockQuentity ?? 0}
                </span>

                <span className="pl-col-action">
                  <Link
                    to={`/company/${companyName}/viewproduct/${pro._id}`}
                    className="pl-view"
                  >
                    View
                  </Link>
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* ══ empty state (fills remaining height) ═══════════ */
        <div className="pl-scroll pl-scroll--empty">
          <Link to={`/company/${companyName}/addproduct`} className="pl-empty">
            <AddIcon style={{ fontSize: 28, color: "#ffb100" }} />
            <h4>Add your first product</h4>
          </Link>
        </div>
      )}
    </div>
  );
}