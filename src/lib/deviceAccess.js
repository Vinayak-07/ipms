import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export const DEFAULT_DEVICE_ID = "device_001";

const getLegacyDeviceId = (data = {}) => {
  if (Array.isArray(data.devices) && data.devices.length > 0) {
    return data.devices[0];
  }

  return undefined;
};

export const normalizeDeviceId = (deviceId) => {
  if (typeof deviceId !== "string") {
    return DEFAULT_DEVICE_ID;
  }

  const normalized = deviceId.trim();
  return normalized || DEFAULT_DEVICE_ID;
};

export const resolveUserDeviceId = (data = {}) =>
  normalizeDeviceId(data.deviceId ?? getLegacyDeviceId(data));

export const setupUser = async (user) => {
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  const existingUser = userSnap.exists() ? userSnap.data() : {};
  const deviceId = resolveUserDeviceId(existingUser);

  await setDoc(
    userRef,
    {
      uid: user.uid,
      email: user.email ?? existingUser.email ?? null,
      deviceId,
      ...(existingUser.updatedAt ? {} : { updatedAt: serverTimestamp() }),
      ...(existingUser.createdAt ? {} : { createdAt: serverTimestamp() }),
    },
    { merge: true }
  );

  const deviceRef = doc(db, "devices", deviceId);
  const deviceSnap = await getDoc(deviceRef);
  const existingDevice = deviceSnap.exists() ? deviceSnap.data() : {};

  await setDoc(
    deviceRef,
    {
      deviceId,
      ...(existingDevice.updatedAt ? {} : { updatedAt: serverTimestamp() }),
      ...(existingDevice.createdAt ? {} : { createdAt: serverTimestamp() }),
    },
    { merge: true }
  );

  return deviceId;
};

export const getUserDeviceId = async (uid) => {
  const userSnap = await getDoc(doc(db, "users", uid));

  if (!userSnap.exists()) {
    return null;
  }

  return resolveUserDeviceId(userSnap.data());
};
