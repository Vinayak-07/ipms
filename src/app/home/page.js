"use client";

import { useContext, useEffect, useState } from "react";
import { AuthContext } from "@/components/AuthProvider";
import { db } from "@/lib/firebase";
import { useTheme } from "next-themes";
import {
  Thermometer,
  Cloud,
  Settings,
  LayoutDashboard,
  LogOut,
  Sun,
  Moon,
  Monitor,
  AlertTriangle,
  Cpu,
} from "lucide-react";

import {
  doc,
  getDoc,
  collection,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { useRouter } from "next/navigation";

export default function HomePage() {
  const { user, logout } = useContext(AuthContext);
  const router = useRouter();

  const { theme, setTheme } = useTheme();

  const [deviceId, setDeviceId] = useState(null);
  const [data, setData] = useState([]);
  const [latest, setLatest] = useState(null);

  //  Get user + check manual values
  useEffect(() => {
    if (user === null) {
      router.replace("/");
    }
    if (!user) return;

    const fetchDevice = async () => {
      const snap = await getDoc(doc(db, "users", user.uid));
      const userData = snap.data();

      if (!userData) return;

      if (userData.deviceId) {
        setDeviceId(userData.deviceId);
      }

      // PRIORITY 1 → user data
      if (
        userData.temperature !== undefined &&
        userData.ppm !== undefined
      ) {
        setLatest({
          temperature: userData.temperature,
          ppm: userData.ppm,
          source: "user",
        });
      }
    };

    fetchDevice();
  }, [user]);

  //  Device listener with fallback
  useEffect(() => {
    if (!deviceId || !user) return;

    const unsub = onSnapshot(
      collection(db, `devices/${deviceId}/data`),
      (snap) => {
        const values = snap.docs.map((doc) => doc.data());
        setData(values);

        setLatest((prev) => {
          //  don't override manual user values
          if (prev && prev.source === "user") return prev;

          const latestReading = values[values.length - 1];

          //  PRIORITY 2 → device data
          if (latestReading) {
            return {
              ...latestReading,
              source: "device",
            };
          }

          // PRIORITY 3 → dummy
          return {
            temperature: 25,
            ppm: 120,
            source: "dummy",
          };
        });
      }
    );

    return () => unsub();
  }, [deviceId, user]);


  if (user === undefined)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <Cpu className="h-12 w-12 animate-pulse text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );

  if (!user) return null;

  if (!deviceId)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <Cpu className="h-12 w-12 animate-pulse text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading device...</p>
        </div>
      </div>
    );

  return (
    <div className="items-center max-w-4xl mx-auto p-4 md:p-8 space-y-8">
      <div className="flex flex-col items-center   space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground flex items-center gap-2">
          <Cpu className="h-4 w-4" /> Device: {deviceId}
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6 items-center">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" /> Overview
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" /> Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 animate-in fade-in duration-500">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Temperature</CardTitle>
                <Thermometer className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {latest?.temperature ?? "--"} °C
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
                <div className="text-2xl font-bold">
                  {latest?.ppm ?? "--"}
                </div>
                <p className="text-xs text-muted-foreground">
                  Parts per million concentration
                </p>
              </CardContent>
            </Card>
          </div>

          {latest?.dummy && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-500">
                  Showing dummy data
                </p>
                <p className="text-xs text-yellow-500/80">
                  No real sensor data received yet. These values are for demonstration purposes.
                </p>
              </div>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No data history available.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {data.slice().reverse().map((d, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5 text-sm">
                            <Thermometer className="h-3.5 w-3.5 text-muted-foreground" />
                            {d.temperature} °C
                          </div>
                          <div className="flex items-center gap-1.5 text-sm">
                            <Cloud className="h-3.5 w-3.5 text-muted-foreground" />
                            {d.ppm}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6 animate-in fade-in duration-500">
          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>
                Customize your dashboard experience.
              </CardDescription>
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

              <div className="pt-6 border-t font-medium text-sm text-destructive">
                Danger Zone
              </div>
              <Button
                variant="destructive"
                onClick={logout}
                className="w-full md:w-auto flex items-center gap-2"
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