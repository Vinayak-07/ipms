"use client";

import { useContext, useEffect, useState } from "react";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { AuthContext } from "@/components/AuthProvider";
import DynamicIsland from "@/components/DynamicIsland";
import MetricCard from "@/components/MetricCard";
import {
  ThermometerIcon,
  AirQualityIcon,
  DropletIcon,
  HistoryIcon,
  ContentIcon,
  DeviceIcon,
  LogOutIcon,
  AlertIcon,
  UserIcon,
  MailIcon,
  ActivityIcon,
} from "@/components/icons";
import { DEFAULT_DEVICE_ID, resolveUserDeviceId } from "@/lib/deviceAccess";
import { db } from "@/lib/firebase";

/* ── Timestamp utilities ── */
const TIMESTAMP_FIELDS = [
  "sensorUpdatedAt",
  "timestamp",
  "recordedAt",
  "createdAt",
  "updatedAt",
];

const toMillis = (value) => {
  if (!value) return null;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (value instanceof Date) return value.getTime();
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
};

const getReadingTime = (reading) => {
  for (const field of TIMESTAMP_FIELDS) {
    const timestamp = toMillis(reading?.[field]);
    if (timestamp !== null) return timestamp;
  }
  return null;
};

const normalizeReading = (reading, fallbackId, source) => {
  if (!reading || typeof reading !== "object") return null;
  const hasTemperature = typeof reading.temperature === "number";
  const hasAirQuality = typeof reading.airQuality === "string" || typeof reading.airQuality === "number";
  const hasHumidity = typeof reading.humidity === "number";
  if (!hasTemperature && !hasAirQuality && !hasHumidity) return null;
  return {
    ...reading,
    id: fallbackId,
    source,
    readingTime: getReadingTime(reading),
  };
};

const sortReadings = (readings) =>
  readings.sort((left, right) => {
    if (left.readingTime !== null && right.readingTime !== null)
      return right.readingTime - left.readingTime;
    if (left.readingTime !== null) return -1;
    if (right.readingTime !== null) return 1;
    return String(right.id).localeCompare(String(left.id));
  });

const pickLatestReading = (primaryReading, secondaryReading) => {
  if (!primaryReading) return secondaryReading;
  if (!secondaryReading) return primaryReading;
  if (
    primaryReading.readingTime !== null &&
    secondaryReading.readingTime !== null &&
    secondaryReading.readingTime > primaryReading.readingTime
  ) {
    return secondaryReading;
  }
  return primaryReading;
};

const formatReadingTime = (readingTime) => {
  if (readingTime === null) return "Timestamp unavailable";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(readingTime));
};

const getAirQuality = (airQuality) => {
  if (airQuality === undefined || airQuality === null) {
    return { label: "--", good: true };
  }
  if (typeof airQuality === "number") {
    return {
      label: `${airQuality} ppm`,
      good: airQuality <= 1000,
    };
  }
  if (typeof airQuality !== "string") {
    return {
      label: String(airQuality),
      good: true,
    };
  }
  const lower = airQuality.toLowerCase();
  if (lower === "good" || lower === "clean") return { label: "Clean", good: true };
  if (lower === "bad" || lower === "poor") return { label: "Poor", good: false };
  return {
    label: airQuality.charAt(0).toUpperCase() + airQuality.slice(1),
    good: true,
  };
};

/* ── Main dashboard component ── */
export default function HomePage() {
  const { user, logout, authLoading } = useContext(AuthContext);
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("home");
  const [deviceId, setDeviceId] = useState("device_001");
  const [tempDeviceId, setTempDeviceId] = useState("device_001");
  const [history, setHistory] = useState([]);
  const [userReading, setUserReading] = useState(null);
  const [deviceReading, setDeviceReading] = useState(null);
  const [deviceLoading, setDeviceLoading] = useState(true);

  /* Auth guard */
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      toast.error("You're not signed in", {
        description: "Please sign in to access the dashboard.",
      });
      router.replace("/");
    }
  }, [user, authLoading, router]);

  /* User doc listener → resolves deviceId */
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        if (!snap.exists()) {
          setDeviceLoading(false);
          return;
        }
        const userData = snap.data();
        const resolvedId = resolveUserDeviceId(userData);

        if (deviceId === "device_001") {
          setDeviceId(resolvedId);
          setTempDeviceId(resolvedId);
          setUserReading(normalizeReading(userData, user.uid, "user"));
        }
        setDeviceLoading(false);
      },
      () => {
        setDeviceLoading(false);
        setUserReading(null);
        toast.error("Failed to load device", {
          description: "Check your connection and try again.",
        });
      }
    );
    return () => unsubscribe();
  }, [user, deviceId]);

  /* Device doc listener → canonical reading */
  useEffect(() => {
    if (!deviceId || deviceId !== "device_001" || !user) {
      if (deviceId !== "device_001") setDeviceLoading(false);
      return;
    }
    const unsubscribe = onSnapshot(
      doc(db, "devices", deviceId),
      (snap) => {
        setDeviceReading(
          snap.exists()
            ? normalizeReading(snap.data(), deviceId, "device")
            : null
        );
      },
      () => {
        toast.error("Device status failed", {
          description: "Could not read the canonical device record.",
        });
      }
    );
    return () => unsubscribe();
  }, [deviceId, user]);

  /* History sub-collection listener */
  useEffect(() => {
    if (!deviceId || deviceId !== "device_001" || !user) return;
    const unsubscribe = onSnapshot(
      collection(db, `devices/${deviceId}/data`),
      (snap) => {
        const values = snap.docs
          .map((readingDoc) =>
            normalizeReading(readingDoc.data(), readingDoc.id, "history")
          )
          .filter(Boolean);
        setHistory(sortReadings(values));
      },
      () => {
        toast.error("Realtime sync failed", {
          description: "Could not connect to your device stream.",
        });
      }
    );
    return () => unsubscribe();
  }, [deviceId, user]);

  const isDemoMode = deviceId !== "device_001";

  const latest = isDemoMode
    ? {
        temperature: 22.5,
        airQuality: "good",
        humidity: 48,
        readingTime: Date.now(),
        source: "simulation",
      }
    : (deviceReading ?? history[0] ?? userReading ?? null);

  const activeHistory = isDemoMode
    ? [
        {
          id: "dummy_1",
          temperature: 22.5,
          airQuality: "good",
          humidity: 48,
          readingTime: Date.now(),
        },
        {
          id: "dummy_2",
          temperature: 23.0,
          airQuality: "good",
          humidity: 46,
          readingTime: Date.now() - 600000,
        },
        {
          id: "dummy_3",
          temperature: 24.1,
          airQuality: "bad",
          humidity: 55,
          readingTime: Date.now() - 1200000,
        },
        {
          id: "dummy_4",
          temperature: 21.8,
          airQuality: "good",
          humidity: 45,
          readingTime: Date.now() - 1800000,
        },
        {
          id: "dummy_5",
          temperature: 22.0,
          airQuality: "good",
          humidity: 44,
          readingTime: Date.now() - 2400000,
        },
      ]
    : history;

  const airQuality = getAirQuality(latest?.airQuality);

  /* Logout handler */
  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Signed out", { description: "See you next time!" });
      router.replace("/");
    } catch {
      toast.error("Logout failed", { description: "Please try again." });
    }
  };

  const handleSaveDeviceId = () => {
    const trimmed = tempDeviceId.trim();
    if (!trimmed) {
      toast.error("Invalid ID", { description: "Device ID cannot be empty." });
      return;
    }
    setDeviceId(trimmed);
    if (trimmed === "device_001") {
      toast.success("Device Connected", {
        description: "Switched to live database for device_001.",
      });
    } else {
      toast.warning("Demo Mode Enabled", {
        description: `Showing simulated data for ${trimmed}.`,
      });
    }
  };

  /* ── Loading states ── */
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <DeviceIcon
            className="h-12 w-12 animate-subtle-pulse"
            style={{ color: "var(--accent-blue)" }}
          />
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Loading...
          </p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (deviceLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <DeviceIcon
            className="h-12 w-12 animate-subtle-pulse"
            style={{ color: "var(--accent-blue)" }}
          />
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Connecting to device...
          </p>
        </div>
      </div>
    );
  }

  if (!deviceId) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className="rounded-2xl border p-8 max-w-lg w-full text-center"
          style={{
            background: "var(--bg-card)",
            borderColor: "var(--border-subtle)",
          }}
        >
          <DeviceIcon
            className="h-10 w-10 mx-auto mb-4"
            style={{ color: "var(--text-tertiary)" }}
          />
          <h2
            className="text-lg font-bold mb-2"
            style={{ color: "var(--text-primary)" }}
          >
            No device linked
          </h2>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            This account does not have a device mapping yet. A deviceId will be
            assigned automatically, or set one in your Firestore user document.
          </p>
        </div>
      </div>
    );
  }

  /* ── Render ── */
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-12">
      {/* Title */}
      <div className="text-center mb-6 animate-fade-in-up">
        <h1
          className="text-4xl font-bold tracking-tight mb-1"
          style={{ color: "var(--text-primary)" }}
        >
          IPMS
        </h1>
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
          <DeviceIcon
            className="inline h-3.5 w-3.5 mr-1"
            style={{ verticalAlign: "-2px" }}
          />
          {deviceId}
        </p>
      </div>

      {/* Dynamic Island Nav */}
      <div className="flex justify-center mb-10 animate-fade-in-up animation-delay-100">
        <DynamicIsland activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* ── HOME TAB ── */}
      {activeTab === "home" && (
        <div>
          {/* ESP32 Sync Warning */}
          <div
            className="flex items-start gap-3 rounded-xl border p-4 mb-6 animate-fade-in-up animation-delay-150"
            style={{
              background: "rgba(255, 149, 0, 0.06)",
              borderColor: "rgba(255, 149, 0, 0.15)",
            }}
          >
            <AlertIcon
              className="mt-0.5 h-5 w-5 shrink-0"
              style={{ color: "var(--accent-orange)" }}
            />
            <div>
              <p
                className="text-sm font-medium"
                style={{ color: "var(--accent-orange)" }}
              >
                ESP32 Sync Warning
              </p>
              <p
                className="text-xs mt-0.5"
                style={{ color: "rgba(255, 149, 0, 0.8)" }}
              >
                Data from ESP32 is updated every 10 min.
              </p>
            </div>
          </div>

          {/* 3 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="animate-fade-in-up animation-delay-200">
              <MetricCard
                title="Temperature"
                value={latest?.temperature}
                unit="°C"
                subtitle="Current ambient temperature"
                icon={ThermometerIcon}
                glowClass="card-glow-temp"
                accentColor="var(--accent-orange)"
              />
            </div>
            <div className="animate-fade-in-up animation-delay-300">
              <MetricCard
                title="Air Quality"
                value={airQuality.label}
                unit=""
                subtitle={
                  typeof latest?.airQuality === "string"
                    ? `Air quality is ${latest.airQuality.toLowerCase()}`
                    : typeof latest?.airQuality === "number"
                      ? `Air quality is ${latest.airQuality} ppm`
                      : "Waiting for sensor data"
                }
                icon={AirQualityIcon}
                glowClass="card-glow-air"
                accentColor={
                  airQuality.good ? "var(--accent-green)" : "var(--accent-red)"
                }
              />
            </div>
            <div className="animate-fade-in-up animation-delay-400">
              <MetricCard
                title="Humidity"
                value={latest?.humidity}
                unit="%"
                subtitle="Relative humidity level"
                icon={DropletIcon}
                glowClass="card-glow-humidity"
                accentColor="var(--accent-blue)"
              />
            </div>
          </div>

          {/* No data warning */}
          {!latest && (
            <div
              className="flex items-start gap-3 rounded-xl border p-4 mb-6 animate-fade-in-up animation-delay-400"
              style={{
                background: "rgba(255, 149, 0, 0.06)",
                borderColor: "rgba(255, 149, 0, 0.15)",
              }}
            >
              <AlertIcon
                className="mt-0.5 h-5 w-5 shrink-0"
                style={{ color: "var(--accent-orange)" }}
              />
              <div>
                <p
                  className="text-sm font-medium"
                  style={{ color: "var(--accent-orange)" }}
                >
                  Waiting for live sensor data
                </p>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: "rgba(255, 149, 0, 0.7)" }}
                >
                  Dashboard is linked to {deviceId}, but no readings have
                  arrived yet.
                </p>
              </div>
            </div>
          )}

          {/* 2 Bottom Cards: History + Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* History Card */}
            <div
              className="rounded-2xl border p-6 card-glow-history animate-fade-in-up animation-delay-400"
              style={{
                background: "var(--bg-card)",
                borderColor: "var(--border-subtle)",
              }}
            >
              <div className="flex items-center gap-2 mb-5">
                <HistoryIcon
                  className="h-5 w-5"
                  style={{ color: "var(--accent-purple)", opacity: 0.85 }}
                />
                <h3
                  className="text-sm font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  History
                </h3>
              </div>

              {activeHistory.length === 0 ? (
                <p
                  className="py-8 text-center text-sm"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  No data history available.
                </p>
              ) : (
                <div
                  className="space-y-2 max-h-[280px] overflow-y-auto pr-1"
                  style={{ scrollbarGutter: "stable" }}
                >
                  {activeHistory.slice(0, 20).map((reading) => {
                    const aq = getAirQuality(reading.airQuality);
                    return (
                      <div key={reading.id} className="history-row">
                        <div className="flex flex-wrap items-center gap-4">
                          <div
                            className="flex items-center gap-1.5 text-sm"
                            style={{ color: "var(--text-primary)" }}
                          >
                            <ThermometerIcon
                              className="h-3.5 w-3.5"
                              style={{ color: "var(--accent-orange)" }}
                            />
                            {reading.temperature ?? "--"}&deg;C
                          </div>
                          <div
                            className="flex items-center gap-1.5 text-sm"
                            style={{ color: "var(--text-primary)" }}
                          >
                            <AirQualityIcon
                              className="h-3.5 w-3.5"
                              style={{
                                color: aq.good
                                  ? "var(--accent-green)"
                                  : "var(--accent-red)",
                              }}
                            />
                            {aq.label}
                          </div>
                          <div
                            className="flex items-center gap-1.5 text-sm"
                            style={{ color: "var(--text-primary)" }}
                          >
                            <DropletIcon
                              className="h-3.5 w-3.5"
                              style={{ color: "var(--accent-blue)" }}
                            />
                            {reading.humidity ?? "--"}%
                          </div>
                        </div>
                        <div
                          className="text-xs ml-4 whitespace-nowrap"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {formatReadingTime(reading.readingTime)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Content / Device Info Card */}
            <div
              className="rounded-2xl border p-6 card-glow-content animate-fade-in-up animation-delay-500"
              style={{
                background: "var(--bg-card)",
                borderColor: "var(--border-subtle)",
              }}
            >
              <div className="flex items-center gap-2 mb-5">
                <ContentIcon
                  className="h-5 w-5"
                  style={{ color: "var(--accent-yellow)", opacity: 0.85 }}
                />
                <h3
                  className="text-sm font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Content
                </h3>
              </div>

              <div className="space-y-4">
                <div className="settings-row">
                  <div className="flex items-center gap-3">
                    <DeviceIcon
                      className="h-4 w-4"
                      style={{ color: "var(--text-tertiary)" }}
                    />
                    <span
                      className="text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Device ID
                    </span>
                  </div>
                  <span
                    className="text-sm font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {deviceId}
                  </span>
                </div>

                <div className="settings-row">
                  <div className="flex items-center gap-3">
                    <ActivityIcon
                      className="h-4 w-4"
                      style={{ color: "var(--text-tertiary)" }}
                    />
                    <span
                      className="text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Status
                    </span>
                  </div>
                  <span className="text-sm font-medium flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full inline-block"
                      style={{
                        background: latest
                          ? "var(--accent-green)"
                          : "var(--accent-red)",
                        boxShadow: latest
                          ? "0 0 8px var(--accent-green)"
                          : "0 0 8px var(--accent-red)",
                      }}
                    />
                    <span style={{ color: "var(--text-primary)" }}>
                      {latest ? "Online" : "Offline"}
                    </span>
                  </span>
                </div>

                <div className="settings-row">
                  <div className="flex items-center gap-3">
                    <HistoryIcon
                      className="h-4 w-4"
                      style={{ color: "var(--text-tertiary)" }}
                    />
                    <span
                      className="text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Last Update
                    </span>
                  </div>
                  <span
                    className="text-sm font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {latest ? formatReadingTime(latest.readingTime) : "No data yet"}
                  </span>
                </div>

                <div className="settings-row">
                  <div className="flex items-center gap-3">
                    <ContentIcon
                      className="h-4 w-4"
                      style={{ color: "var(--text-tertiary)" }}
                    />
                    <span
                      className="text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Data Source
                    </span>
                  </div>
                  <span
                    className="text-sm font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {latest?.source === "device"
                      ? "Device doc"
                      : latest?.source === "history"
                        ? "History"
                        : latest?.source === "user"
                          ? "User fallback"
                          : latest?.source === "simulation"
                            ? "Simulation"
                            : "--"}
                  </span>
                </div>

                <div className="settings-row">
                  <div className="flex items-center gap-3">
                    <HistoryIcon
                      className="h-4 w-4"
                      style={{ color: "var(--text-tertiary)" }}
                    />
                    <span
                      className="text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      History Entries
                    </span>
                  </div>
                  <span
                    className="text-sm font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {activeHistory.length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SETTINGS TAB ── */}
      {activeTab === "settings" && (
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Account Card */}
          <div
            className="rounded-2xl border p-6 animate-fade-in-up animation-delay-200"
            style={{
              background: "var(--bg-card)",
              borderColor: "var(--border-subtle)",
            }}
          >
            <h3
              className="text-sm font-medium mb-5"
              style={{ color: "var(--text-secondary)" }}
            >
              Account
            </h3>
            <div className="space-y-3">
              <div className="settings-row">
                <div className="flex items-center gap-3">
                  <MailIcon
                    className="h-4 w-4"
                    style={{ color: "var(--text-tertiary)" }}
                  />
                  <span
                    className="text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Email
                  </span>
                </div>
                <span
                  className="text-sm font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  {user.email || "Not set"}
                </span>
              </div>

              <div className="settings-row">
                <div className="flex items-center gap-3">
                  <UserIcon
                    className="h-4 w-4"
                    style={{ color: "var(--text-tertiary)" }}
                  />
                  <span
                    className="text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    User ID
                  </span>
                </div>
                <span
                  className="text-sm font-medium font-mono"
                  style={{ color: "var(--text-primary)", fontSize: "12px" }}
                >
                  {user.uid?.slice(0, 12)}...
                </span>
              </div>

              <div className="settings-row">
                <div className="flex items-center gap-3">
                  <DeviceIcon
                    className="h-4 w-4"
                    style={{ color: "var(--text-tertiary)" }}
                  />
                  <span
                    className="text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Device
                  </span>
                </div>
                <span
                  className="text-sm font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  {deviceId}
                </span>
              </div>
            </div>
          </div>

          {/* Device Settings Card */}
          <div
            className="rounded-2xl border p-6 animate-fade-in-up animation-delay-250"
            style={{
              background: "var(--bg-card)",
              borderColor: "var(--border-subtle)",
            }}
          >
            <h3
              className="text-sm font-medium mb-5"
              style={{ color: "var(--text-secondary)" }}
            >
              Device Configuration
            </h3>
            <div className="space-y-4">
              <div>
                <label
                  className="block text-xs font-medium mb-2"
                  style={{ color: "var(--text-tertiary)" }}
                  htmlFor="deviceIdInput"
                >
                  Device ID
                </label>
                <div className="flex gap-2">
                  <input
                    id="deviceIdInput"
                    type="text"
                    value={tempDeviceId}
                    onChange={(e) => setTempDeviceId(e.target.value)}
                    placeholder="Enter Device ID"
                    className="auth-input w-full"
                    style={{
                      background: "var(--bg-app)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "10px",
                      padding: "10px 14px",
                      color: "var(--text-primary)",
                      fontSize: "14px",
                    }}
                  />
                  <button
                    onClick={handleSaveDeviceId}
                    className="auth-btn auth-btn-primary whitespace-nowrap"
                    style={{
                      borderRadius: "10px",
                      padding: "10px 20px",
                      fontSize: "14px",
                      width: "auto",
                      maxWidth: "none",
                    }}
                    type="button"
                  >
                    Save
                  </button>
                </div>
              </div>
              <p
                className="text-xs"
                style={{ color: "var(--text-tertiary)", lineHeight: "1.5" }}
              >
                Enter your hardware device ID (default is{" "}
                <strong>device_001</strong>). If changed from{" "}
                <strong>device_001</strong>, the system will display simulated
                dummy data for testing purposes.
              </p>
            </div>
          </div>

          {/* Danger Zone */}
          <div
            className="rounded-2xl border p-6 animate-fade-in-up animation-delay-300"
            style={{
              background: "var(--bg-card)",
              borderColor: "rgba(255, 69, 58, 0.15)",
            }}
          >
            <h3
              className="text-sm font-medium mb-4"
              style={{ color: "var(--accent-red)" }}
            >
              Danger Zone
            </h3>
            <button
              onClick={handleLogout}
              className="auth-btn auth-btn-secondary flex items-center justify-center gap-2"
              style={{
                borderColor: "rgba(255, 69, 58, 0.25)",
                color: "var(--accent-red)",
                maxWidth: "none",
              }}
              type="button"
            >
              <LogOutIcon className="h-4 w-4" />
              Log Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}