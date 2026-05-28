"use client";

import {
  Thermometer,
  Droplets,
  Wind,
  Clock,
  FileText,
  Home,
  Settings,
  Cpu,
  LogIn,
  UserPlus,
  LogOut,
  ArrowLeft,
  ChevronRight,
  AlertTriangle,
  User,
  Mail,
  Shield,
  Activity,
} from "lucide-react";

// Re-export lucide icons with consistent naming
export {
  Thermometer as ThermometerIcon,
  Droplets as DropletIcon,
  Wind as AirQualityIcon,
  Clock as HistoryIcon,
  FileText as ContentIcon,
  Home as HomeIcon,
  Settings as SettingsIcon,
  Cpu as DeviceIcon,
  LogIn as LoginIcon,
  UserPlus as SignupIcon,
  LogOut as LogOutIcon,
  ArrowLeft as ArrowLeftIcon,
  ChevronRight as ChevronRightIcon,
  AlertTriangle as AlertIcon,
  User as UserIcon,
  Mail as MailIcon,
  Shield as ShieldIcon,
  Activity as ActivityIcon,
};

// Custom logo SVG — shield with pulse line
export function LogoIcon({ className = "", size = 72 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 72 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M36 6L12 18v18c0 14.4 10.2 27.84 24 31.2C49.8 63.84 60 50.4 60 36V18L36 6z"
        fill="url(#logo-gradient)"
        fillOpacity="0.12"
        stroke="url(#logo-gradient)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M22 38h8l4-10 4 20 4-10h8"
        stroke="url(#logo-gradient)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="logo-gradient" x1="12" y1="6" x2="60" y2="67.2" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0a84ff" />
          <stop offset="1" stopColor="#5e5ce6" />
        </linearGradient>
      </defs>
    </svg>
  );
}
