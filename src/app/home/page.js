"use client";

import { useContext, useEffect, useState } from "react";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { useTheme } from "next-themes";
import {
  AlertTriangle,
  Cloud,
  Cpu,
  Droplets,
  LayoutDashboard,
  LogOut,
  Monitor,
  Moon,
  Settings,
  Sun,
  Thermometer,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { AuthContext } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEFAULT_DEVICE_ID, resolveUserDeviceId } from "@/lib/deviceAccess";
import { db } from "@/lib/firebase";

const TIMESTAMP_FIELDS = [
  "sensorUpdatedAt",
  "timestamp",
  "recordedAt",
  "createdAt",
  "updatedAt",
];

const toMillis = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value.toMillis === "function") {
    return value.toMillis();
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
};

const getReadingTime = (reading) => {
  for (const field of TIMESTAMP_FIELDS) {
    const timestamp = toMillis(reading?.[field]);

    if (timestamp !== null) {
      return timestamp;
    }
  }

  return null;
};

const normalizeReading = (reading, fallbackId, source) => {
  if (!reading || typeof reading !== "object") {
    return null;
  }

  const hasTemperature = typeof reading.temperature === "number";
  const hasPpm = typeof reading.ppm === "number";
  const hasHumidity = typeof reading.humidity === "number";

  if (!hasTemperature && !hasPpm && !hasHumidity) {
    return null;
  }

  return {
    ...reading,
    id: fallbackId,
    source,
    readingTime: getReadingTime(reading),
  };
};

const sortReadings = (readings) =>
  readings.sort((left, right) => {
    if (left.readingTime !== null && right.readingTime !== null) {
      return right.readingTime - left.readingTime;
    }

    if (left.readingTime !== null) {
      return -1;
    }

    if (right.readingTime !== null) {
      return 1;
    }

    return String(right.id).localeCompare(String(left.id));
  });

const pickLatestReading = (primaryReading, secondaryReading) => {
  if (!primaryReading) {
    return secondaryReading;
  }

  if (!secondaryReading) {
    return primaryReading;
  }

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
  if (readingTime === null) {
    return "Timestamp unavailable";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(readingTime));
};

export default function HomePage() {
  const { user, logout, authLoading } = useContext(AuthContext);
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const [deviceId, setDeviceId] = useState(null);
  const [history, setHistory] = useState([]);
  const [userReading, setUserReading] = useState(null);
  const [deviceReading, setDeviceReading] = useState(null);
  const [deviceLoading, setDeviceLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      toast.error("You're not signed in", {
        description: "Please sign in to access the dashboard.",
      });
      router.replace("/");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        if (!snap.exists()) {
          setDeviceLoading(false);
          setDeviceId(null);
          setUserReading(null);
          toast.warning("No user data found", {
            description: "Your account is signed in but has no device link yet.",
          });
          return;
        }

        const userData = snap.data();
        setDeviceId(resolveUserDeviceId(userData));
        setUserReading(normalizeReading(userData, user.uid, "user"));
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
  }, [user]);

  useEffect(() => {
    if (!deviceId || !user) return;

    const unsubscribe = onSnapshot(
      doc(db, "devices", deviceId),
      (snap) => {
        setDeviceReading(
          snap.exists() ? normalizeReading(snap.data(), deviceId, "device") : null
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

  useEffect(() => {
    if (!deviceId || !user) return;

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

  const latest = pickLatestReading(
    pickLatestReading(deviceReading, history[0] ?? null),
    userReading
  );

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Cpu className="h-12 w-12 animate-pulse text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (deviceLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Cpu className="h-12 w-12 animate-pulse text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading device...</p>
        </div>
      </div>
    );
  }

  if (!deviceId) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>No device linked</CardTitle>
            <CardDescription>
              This account does not have a device mapping yet. Assign a
              `deviceId` in the `users/{"{user.uid}"}` document to start streaming
              shared sensor data.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Signed out", { description: "See you next time!" });
      router.replace("/");
    } catch {
      toast.error("Logout failed", { description: "Please try again." });
    }
  };

  return (
    <div className="mx-auto max-w-4xl items-center space-y-8 p-4 md:p-8">
      <div className="flex flex-col items-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Indoor pollution monitoring system
        </h1>
        <p className="flex items-center gap-2 text-center text-muted-foreground">
          <Cpu className="h-4 w-4" /> Device: {deviceId}
        </p>
      </div>

      <Tabs defaultValue="overview" className="items-center space-y-6">
        <TabsList className="grid w-full max-w-[400px] grid-cols-2">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" /> Overview
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" /> Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="overview"
          className="space-y-6 animate-in fade-in duration-500"
        >
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Temperature</CardTitle>
                <Thermometer className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {latest?.temperature ?? "--"} &deg;C
                </div>
                <p className="text-xs text-muted-foreground">
                  Current ambient temperature
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">PPM Level</CardTitle>
                <Cloud className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{latest?.ppm ?? "--"}</div>
                <p className="text-xs text-muted-foreground">
                  Parts per million concentration
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Humidity</CardTitle>
                <Droplets className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {latest?.humidity ?? "--"}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Relative humidity level
                </p>
              </CardContent>
            </Card>
          </div>

          {!latest && (
            <div className="flex items-start gap-3 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-500" />
              <div>
                <p className="text-sm font-medium text-yellow-500">
                  Waiting for live sensor data
                </p>
                <p className="text-xs text-yellow-500/80">
                  The dashboard is linked to {deviceId}, but no canonical device
                  reading or history entry has arrived yet.
                </p>
              </div>
            </div>
          )}

          {latest && (
            <Card>
              <CardHeader>
                <CardTitle>Current Source</CardTitle>
                <CardDescription>
                  The dashboard prefers the shared device path and can fall back
                  to the user document while you migrate sensor writes.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-1 text-sm text-muted-foreground">
                <p>
                  Source:{" "}
                  {latest.source === "device"
                    ? "Canonical device doc"
                    : latest.source === "history"
                      ? "Device history"
                      : "User doc fallback"}
                </p>
                <p>Recorded: {formatReadingTime(latest.readingTime)}</p>
                <p>Fallback device: {DEFAULT_DEVICE_ID}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>History</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No data history available.
                </p>
              ) : (
                <div className="space-y-2">
                  {history.map((reading) => (
                    <div
                      key={reading.id}
                      className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-1.5 text-sm">
                          <Thermometer className="h-3.5 w-3.5 text-muted-foreground" />
                          {reading.temperature ?? "--"} &deg;C
                        </div>
                        <div className="flex items-center gap-1.5 text-sm">
                          <Cloud className="h-3.5 w-3.5 text-muted-foreground" />
                          {reading.ppm ?? "--"}
                        </div>
                        <div className="flex items-center gap-1.5 text-sm">
                          <Droplets className="h-3.5 w-3.5 text-muted-foreground" />
                          {reading.humidity ?? "--"}%
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatReadingTime(reading.readingTime)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent
          value="settings"
          className="space-y-6 animate-in fade-in duration-500"
        >
          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>Customize your dashboard experience.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Theme</h4>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={theme === "light" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTheme("light")}
                    className="flex items-center gap-2"
                  >
                    <Sun className="h-4 w-4" /> Light
                  </Button>
                  <Button
                    variant={theme === "dark" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTheme("dark")}
                    className="flex items-center gap-2"
                  >
                    <Moon className="h-4 w-4" /> Dark
                  </Button>
                  <Button
                    variant={theme === "system" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTheme("system")}
                    className="flex items-center gap-2"
                  >
                    <Monitor className="h-4 w-4" /> System
                  </Button>
                </div>
              </div>

              <div className="border-t pt-6 text-sm font-medium text-destructive">
                Danger Zone
              </div>
              <Button
                variant="destructive"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 md:w-auto"
              >
                <LogOut className="h-4 w-4" /> Log Out
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

