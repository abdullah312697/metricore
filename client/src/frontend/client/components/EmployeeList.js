import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import AddIcon         from "@mui/icons-material/Add";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import EmailComposer   from "./EmailComposer";
import "../../../style/EmployeeList.css";
import { can } from "../../../utils/permissions";
import { useAuth } from "../../../context/AuthContext";

/* ═══════════════════════════════════════════════════════════════
   EmployeeList — team table with multi-select + group email.

   Fits inside a fixed-size parent (.MainContainerChunk 600x300,
   overflow:hidden). Structure is three stacked regions:

     .el-topbar   — fixed  (title, count, Send mail, Add employee)
     .el-head     — fixed  (column labels)
     .el-scroll   — SCROLLS (all .el-row employee rows live here)

   Only .el-scroll overflows, so the header never scrolls away.

   Props:
     employees     : array from /newemplyee/getallEmployee
     currentUserId : user?.employeeId (filtered out of the list)
     companyName   : user?.companyName || companyName
     avatar        : fallback avatar image
     isOnline      : (id) => boolean
═══════════════════════════════════════════════════════════════ */
export default function EmployeeList({
  employees = [],
  currentUserId,
  companyName,
  avatar,
  isOnline = () => false,
}) {
  const [selected,     setSelected]     = useState([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const {user} = useAuth();

  const team = useMemo(
    () => employees.filter((e) => e._id !== currentUserId),
    [employees, currentUserId]
  );

  const allSelected = team.length > 0 && selected.length === team.length;

  const toggle = (id) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const toggleAll = () =>
    setSelected(allSelected ? [] : team.map((e) => e._id));

  const recipients = useMemo(
    () =>
      team
        .filter((e) => selected.includes(e._id))
        .map((e) => ({ _id: e._id, name: e.YemplyeeName })),
    [team, selected]
  );

  return (
    <div className="el-root">

      {/* ══ FIXED: top bar ═══════════════════════════════════ */}
      <div className="el-topbar">
        <div className="el-topbar__left">
          <h2 className="el-title">Team</h2>
          {team.length > 0 && <span className="el-count el-mono">{team.length}</span>}
        </div>
        {can(user.employeeRoal, "manageTeam") && (
        <div className="el-topbar__actions">
          {selected.length > 0 && (
            <button className="el-btn el-btn--email" onClick={() => setComposerOpen(true)}>
              <MailOutlineIcon style={{ fontSize: 16 }} />
              Send mail ({selected.length})
            </button>
          )}
          <Link to={`/company/${companyName}/addemployee`} className="el-btn el-btn--add">
            <AddIcon style={{ fontSize: 16 }} />
            Add
          </Link>
        </div>
          )}
      </div>

      {team.length > 0 ? (
        <>
          {/* ══ FIXED: column header ═════════════════════════ */}
          <div className="el-head">
          {can(user.employeeRoal, "manageTeam") && (
            <label className="el-check" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                aria-label="Select all employees"
              />
              <span className="el-check__box" />
            </label>
                    )}
            <span className="el-col-profile">Profile</span>
            <span className="el-col-name">Name</span>
            <span className="el-col-role">Role</span>
            <span className="el-col-status">Status</span>
            <span className="el-col-salary">Salary</span>
            <span className="el-col-action" />
          </div>

          {/* ══ SCROLLABLE: employee rows ════════════════════ */}
          <div className="el-scroll">
            {team.map((emp) => {
              const online    = isOnline(emp._id);
              const isChecked = selected.includes(emp._id);
              return (
                <div
                  key={emp._id}
                  className={`el-row ${isChecked ? "el-row--selected" : ""}`}
                  onClick={() => toggle(emp._id)}
                >
                {can(user.employeeRoal, "manageTeam") && (
                  <label className="el-check" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggle(emp._id)}
                      aria-label={`Select ${emp.YemplyeeName || "employee"}`}
                    />
                    <span className="el-check__box" />
                  </label>
                  )}
                  <span className="el-col-profile">
                    <img
                      src={emp.EmplyeeProfile || avatar}
                      alt={emp.YemplyeeName || "Employee"}
                      className="el-avatar"
                    />
                  </span>

                  <span className="el-col-name">{emp.YemplyeeName || "—"}</span>

                  <span className="el-col-role">
                    <span className="el-role-pill">{emp.EmplyeeRoal || "—"}</span>
                  </span>

                  <span className="el-col-status">
                    <span className={`el-status ${online ? "el-status--on" : "el-status--off"}`}>
                      <span className="el-status__dot" />
                      {online ? "Online" : "Offline"}
                    </span>
                  </span>
                {can(user.employeeRoal, "manageTeam") && (

                  <span className="el-col-salary el-mono">
                    {emp.EmplyeeSellary != null ? emp.EmplyeeSellary : "—"}
                  </span>
                )}
                  <span className="el-col-action" onClick={(e) => e.stopPropagation()}>
                    <Link
                      to={`/company/${companyName}/theemployee/${emp._id}`}
                      className="el-view"
                    >
                      View
                    </Link>
                  </span>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* ══ empty state (fills remaining height) ═══════════ */
        <div className="el-scroll el-scroll--empty">
          {can(user?.employeeRoal, "manageTeam") && (
          <Link to={`/company/${companyName}/addemployee`} className="el-empty">
            <AddIcon style={{ fontSize: 28, color: "#ffb100" }} />
            <h4>Add your first employee</h4>
          </Link>
          )}
        </div>
      )}

      {/* ── Group / single email composer ───────────────────── */}
     {can(user?.employeeRoal, "manageTeam") && ( <EmailComposer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        recipients={recipients}
      />
     )}
    </div>
  );
}