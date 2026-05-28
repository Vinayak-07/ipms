"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { HomeIcon, SettingsIcon } from "@/components/icons";

const TABS = [
  { id: "home", label: "Home", icon: HomeIcon },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

export default function DynamicIsland({ activeTab, onTabChange }) {
  const containerRef = useRef(null);
  const btnRefs = useRef({});
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0 });

  const updatePill = useCallback(() => {
    const activeBtn = btnRefs.current[activeTab];
    const container = containerRef.current;
    if (!activeBtn || !container) return;

    const containerRect = container.getBoundingClientRect();
    const btnRect = activeBtn.getBoundingClientRect();

    setPillStyle({
      left: btnRect.left - containerRect.left,
      width: btnRect.width,
    });
  }, [activeTab]);

  useEffect(() => {
    updatePill();
    window.addEventListener("resize", updatePill);
    return () => window.removeEventListener("resize", updatePill);
  }, [updatePill]);

  return (
    <nav className="dynamic-island" ref={containerRef}>
      <div
        className="dynamic-island-pill"
        style={{
          left: `${pillStyle.left}px`,
          width: `${pillStyle.width}px`,
        }}
      />
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          ref={(el) => {
            btnRefs.current[id] = el;
          }}
          className={`dynamic-island-btn ${activeTab === id ? "active" : ""}`}
          onClick={() => onTabChange(id)}
          type="button"
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </nav>
  );
}
