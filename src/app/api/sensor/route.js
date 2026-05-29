import { NextResponse } from "next/server";
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  addDoc,
  collection,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";

// Initialize Firebase client-side configuration for the server context
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_APIKEY,
  authDomain: process.env.NEXT_PUBLIC_AUTHDOMAIN,
  projectId: process.env.NEXT_PUBLIC_PROJECTID,
  storageBucket: process.env.NEXT_PUBLIC_STORAGEBUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_MESSAGINGSENDERID,
  appId: process.env.NEXT_PUBLIC_APPID,
  measurementId: process.env.NEXT_PUBLIC_MEASUREMENTID,
};

function getDb() {
  const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  return getFirestore(app);
}

/* ── Simple API key check for ESP32 ── */
const API_KEY = process.env.SENSOR_API_KEY || "ipms-prototype-key";

function validateApiKey(request) {
  const key = request.headers.get("x-api-key");
  return key === API_KEY;
}

/* ── POST /api/sensor — Push sensor data from ESP32 ── */
export async function POST(request) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { error: "Unauthorized. Provide a valid x-api-key header." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { deviceId, temperature, airQuality, humidity } = body;

    if (!deviceId || typeof deviceId !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid deviceId." },
        { status: 400 }
      );
    }

    const hasTemperature = typeof temperature === "number";
    const hasAirQuality = typeof airQuality === "string" && (airQuality.toLowerCase() === "good" || airQuality.toLowerCase() === "bad");
    const hasHumidity = typeof humidity === "number";

    if (!hasTemperature && !hasAirQuality && !hasHumidity) {
      return NextResponse.json(
        {
          error:
            "At least one sensor value (temperature, airQuality, humidity) must be provided with valid type.",
        },
        { status: 400 }
      );
    }

    const db = getDb();
    const now = serverTimestamp();
    const isoNow = new Date().toISOString();

    // Build sensor data — only include fields that are present
    const sensorData = {
      deviceId,
      ...(hasTemperature && { temperature }),
      ...(hasAirQuality && { airQuality: airQuality.toLowerCase() }),
      ...(hasHumidity && { humidity }),
      timestamp: isoNow,
      recordedAt: isoNow,
      updatedAt: now,
      sensorUpdatedAt: now,
    };

    // Update the canonical device doc (latest values)
    const deviceRef = doc(db, "devices", deviceId);
    
    // To prevent overriding createdAt on every update:
    const deviceSnap = await getDoc(deviceRef);
    const deviceExists = deviceSnap.exists();

    await setDoc(
      deviceRef,
      {
        ...sensorData,
        ...(!deviceExists && { createdAt: now }),
      },
      { merge: true }
    );

    // Add a history entry with timestamp
    const historyData = {
      deviceId,
      ...(hasTemperature && { temperature }),
      ...(hasAirQuality && { airQuality: airQuality.toLowerCase() }),
      ...(hasHumidity && { humidity }),
      timestamp: isoNow,
      recordedAt: isoNow,
      createdAt: now,
      updatedAt: now,
    };

    const historyRef = await addDoc(
      collection(db, "devices", deviceId, "data"),
      historyData
    );

    return NextResponse.json(
      {
        success: true,
        deviceId,
        historyId: historyRef.id,
        timestamp: isoNow,
        message: "Sensor data recorded successfully.",
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/sensor error:", err);
    return NextResponse.json(
      { error: "Internal server error.", details: err.message },
      { status: 500 }
    );
  }
}

/* ── GET /api/sensor?deviceId=device_001 — Read latest values ── */
export async function GET(request) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { error: "Unauthorized. Provide a valid x-api-key header." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get("deviceId");

    if (!deviceId) {
      return NextResponse.json(
        { error: "Missing deviceId query parameter." },
        { status: 400 }
      );
    }

    const db = getDb();
    const deviceRef = doc(db, "devices", deviceId);
    const deviceSnap = await getDoc(deviceRef);

    if (!deviceSnap.exists()) {
      return NextResponse.json(
        { error: `Device '${deviceId}' not found.` },
        { status: 404 }
      );
    }

    const data = deviceSnap.data();

    return NextResponse.json({
      success: true,
      deviceId,
      temperature: data.temperature ?? null,
      airQuality: data.airQuality ?? null,
      humidity: data.humidity ?? null,
      timestamp: data.timestamp ?? null,
      recordedAt: data.recordedAt ?? null,
    });
  } catch (err) {
    console.error("GET /api/sensor error:", err);
    return NextResponse.json(
      { error: "Internal server error.", details: err.message },
      { status: 500 }
    );
  }
}
