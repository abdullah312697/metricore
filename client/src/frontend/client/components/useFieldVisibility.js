// useFieldVisibility.js
import { useState, useEffect } from "react";
import { DEFAULT_FIELDS } from "./fieldConfig";

const STORAGE_KEY = (goalId) => `fieldVisibility_${goalId}`;

export const useFieldVisibility = (goalId) => {
  const [visibleFields, setVisibleFields] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY(goalId));
      if (saved) return new Set(JSON.parse(saved));
    } catch {}
    // 👇 Default — all fields visible
    return new Set(DEFAULT_FIELDS.map((f) => f.key));
  });

  // Save to localStorage whenever visibility changes
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY(goalId),
      JSON.stringify([...visibleFields])
    );
  }, [visibleFields, goalId]);

  const toggleField = (key) => {
    setVisibleFields((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const showAll  = () => setVisibleFields(new Set(DEFAULT_FIELDS.map((f) => f.key)));
  const hideAll  = () => setVisibleFields(new Set());
  const isVisible = (key) => visibleFields.has(key);

  return { visibleFields, toggleField, showAll, hideAll, isVisible };
};