// FieldVisibilityManager.jsx
import { useState } from "react";
import { DEFAULT_FIELDS, GROUPS } from "./fieldConfig";
import "../../../style/FieldVisibilityManager.css"; // <-- Import the external CSS file

export const FieldVisibilityManager = ({
  visibleFields,
  toggleField,
  showAll,
  hideAll,
  onClose,
}) => {
  const [activeGroup, setActiveGroup] = useState("All");
  const groups = ["All", ...GROUPS];

  const filtered = activeGroup === "All"
    ? DEFAULT_FIELDS
    : DEFAULT_FIELDS.filter((f) => f.group === activeGroup);

  const allChecked   = DEFAULT_FIELDS.every((f) => visibleFields.has(f.key));
  const noneChecked  = DEFAULT_FIELDS.every((f) => !visibleFields.has(f.key));
  const visibleCount = visibleFields.size;

  return (
    <div className="fvm-overlay">
      <div className="fvm-modal">

        {/* Header */}
        <div className="fvm-header">
          <div>
            <div className="fvm-headerLabel">DISPLAY SETTINGS</div>
            <div className="fvm-headerTitle">Manage Fields</div>
            <div className="fvm-headerSub">{visibleCount} of {DEFAULT_FIELDS.length} fields visible</div>
          </div>
          <button className="fvm-closeBtn" onClick={onClose}>✕</button>
        </div>

        {/* Quick actions */}
        <div className="fvm-quickActions">
          <button
            className={`fvm-quickBtn ${allChecked ? "fvm-disabled" : ""}`}
            onClick={showAll}
            disabled={allChecked}
          >
            Show All
          </button>
          <button
            className={`fvm-quickBtn ${noneChecked ? "fvm-disabled" : ""}`}
            onClick={hideAll}
            disabled={noneChecked}
          >
            Hide All
          </button>
        </div>

        {/* Group filter tabs */}
        <div className="fvm-tabs">
          {groups.map((group) => {
            const isActive = activeGroup === group;
            return (
              <button
                key={group}
                className={`fvm-tab ${isActive ? "fvm-tab-active" : "fvm-tab-inactive"}`}
                onClick={() => setActiveGroup(group)}
              >
                {group}
              </button>
            );
          })}
        </div>

        {/* Field list */}
        <div className="fvm-fieldList">
          {filtered.map((field) => {
            const checked = visibleFields.has(field.key);
            return (
              <div
                key={field.key}
                className={`fvm-fieldRow ${checked ? "fvm-row-checked" : "fvm-row-unchecked"}`}
                onClick={() => toggleField(field.key)}
              >
                {/* Custom checkbox */}
                <div className={`fvm-checkbox ${checked ? "fvm-checkbox-checked" : "fvm-checkbox-unchecked"}`}>
                  {checked && <span className="fvm-checkmark">✓</span>}
                </div>
                <span className="fvm-fieldLabel">{field.label}</span>
                <span className="fvm-fieldGroup">{field.group}</span>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="fvm-footer">
          <span className="fvm-footerNote">
            Extra fields are always visible
          </span>
          <button className="fvm-doneBtn" onClick={onClose}>Done</button>
        </div>

      </div>
    </div>
  );
};