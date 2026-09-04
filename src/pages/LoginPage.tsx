import React, { useState } from "react";
import {
  Satellite,
  Shield,
  Lock,
  User,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Building,
  Terminal,
  Activity,
  Zap,
  Globe2
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const LoginPage: React.FC = () => {
  const { login, register, isLoading, demoAccounts } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [identifier, setIdentifier] = useState<string>("officer@thermoguard.gov.in");
  const [password, setPassword] = useState<string>("Analyst@2026!");
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Register state
  const [regName, setRegName] = useState<string>("");
  const [regUsername, setRegUsername] = useState<string>("");
  const [regEmail, setRegEmail] = useState<string>("");
  const [regPassword, setRegPassword] = useState<string>("");
  const [regRole, setRegRole] = useState<string>("ANALYST");
  const [regDepartment, setRegDepartment] = useState<string>("Thermal & Geospatial Intelligence Wing");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!identifier.trim() || !password) {
      setErrorMsg("Please enter your official username/email and password.");
      return;
    }

    try {
      setIsSubmitting(true);
      await login(identifier.trim(), password);
      setSuccessMsg("Clearance verified. Launching surveillance console...");
    } catch (err: any) {
      setErrorMsg(err.message || "Authentication failed. Please verify your credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!regName.trim() || !regUsername.trim() || !regEmail.trim() || !regPassword) {
      setErrorMsg("Please fill in all required registration fields.");
      return;
    }

    if (regPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters in length.");
      return;
    }

    try {
      setIsSubmitting(true);
      await register({
        name: regName.trim(),
        username: regUsername.trim(),
        email: regEmail.trim(),
        password: regPassword,
        role: regRole,
        department: regDepartment.trim()
      });
      setSuccessMsg("Analyst profile initialized. Access granted.");
    } catch (err: any) {
      setErrorMsg(err.message || "Registration failed. Username or email may already be in use.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillQuickCredentials = (username: string, pass: string) => {
    setMode("login");
    setIdentifier(username);
    setPassword(pass);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen w-screen bg-[#070b14] text-slate-100 flex flex-col justify-between font-sans selection:bg-cyan-500/20 selection:text-cyan-200">
      {/* Top Telemetry Header */}
      <header className="px-6 py-4 border-b border-[#141d2e] bg-[#090e1a]/80 backdrop-blur-sm flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded bg-[#0f172a] border border-[#1e293b] text-cyan-400">
            <Satellite className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-white text-sm">ThermoGuard AI</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Auth Gateway
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              AI-Powered Industrial Fire & Persistent Thermal Source Classifier
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0e1628] border border-[#17233c]">
            <Globe2 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-300">Organisation:</span>
            <span className="text-white font-medium">NTRO / SIH26162</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0e1628] border border-[#17233c] font-mono text-[10px] text-teal-400">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
            <span>SECURE ENCLAVE</span>
          </div>
        </div>
      </header>

      {/* Center Auth Card */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-md bg-[#0a101d] border border-[#172238] rounded-xl shadow-2xl p-6 relative overflow-hidden">
          {/* Subtle Grid / HUD Accents */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-teal-500/5 rounded-full blur-2xl pointer-events-none" />

          {/* Mode Switcher Tabs */}
          <div className="flex items-center justify-between border-b border-[#152033] pb-3 mb-5">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-cyan-400" />
                <span>{mode === "login" ? "Officer Clearance Access" : "Provision Analyst Account"}</span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {mode === "login"
                  ? "Enter authorized credentials to access GIS intelligence console."
                  : "Register a new analyst profile in the NTRO intelligence directory."}
              </p>
            </div>
          </div>

          {/* Alerts */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {mode === "login" ? (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Official Email or Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. officer@thermoguard.gov.in"
                    required
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#070b14] border border-[#1e293b] focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-xs text-white placeholder-slate-600 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-medium text-slate-300">
                    Security Password
                  </label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full pl-9 pr-10 py-2 rounded-lg bg-[#070b14] border border-[#1e293b] focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-xs text-white placeholder-slate-600 outline-none transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || isLoading}
                className="w-full mt-2 py-2.5 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Activity className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying Cryptographic Tokens...</span>
                  </>
                ) : (
                  <>
                    <span>Authenticate Clearance</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* REGISTER FORM */
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Full Name & Title
                </label>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Anand Kumar"
                  required
                  className="w-full px-3 py-1.5 rounded-lg bg-[#070b14] border border-[#1e293b] focus:border-cyan-500 text-xs text-white placeholder-slate-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="anand.kumar"
                    required
                    className="w-full px-3 py-1.5 rounded-lg bg-[#070b14] border border-[#1e293b] focus:border-cyan-500 text-xs text-white placeholder-slate-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Official Email
                  </label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="anand@ntro.gov.in"
                    required
                    className="w-full px-3 py-1.5 rounded-lg bg-[#070b14] border border-[#1e293b] focus:border-cyan-500 text-xs text-white placeholder-slate-600 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Role Clearance
                  </label>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#070b14] border border-[#1e293b] focus:border-cyan-500 text-xs text-white outline-none"
                  >
                    <option value="ANALYST">GIS Intelligence Analyst (L2)</option>
                    <option value="SENIOR_GIS_ANALYST">Senior GIS Analyst (L3)</option>
                    <option value="CHIEF_SURVEILLANCE_OFFICER">Chief Officer (L4)</option>
                    <option value="FIELD_OPERATIONS_OFFICER">Field Operations (L3)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Min 6 chars"
                    required
                    className="w-full px-3 py-1.5 rounded-lg bg-[#070b14] border border-[#1e293b] focus:border-cyan-500 text-xs text-white placeholder-slate-600 outline-none font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || isLoading}
                className="w-full mt-2 py-2 px-4 rounded-lg bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-lg shadow-teal-900/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Activity className="w-3.5 h-3.5 animate-spin" />
                    <span>Enrolling Analyst...</span>
                  </>
                ) : (
                  <>
                    <span>Create Official Profile</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Switch Mode Toggle */}
          <div className="mt-4 pt-3 border-t border-[#141d2e] flex items-center justify-between text-xs text-slate-400">
            <span>
              {mode === "login" ? "Need a new analyst credential?" : "Already have official clearance?"}
            </span>
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors cursor-pointer"
            >
              {mode === "login" ? "Register Profile" : "Sign In Here"}
            </button>
          </div>

          {/* Quick Demo Identities for SIH Judges & Evaluators */}
          <div className="mt-5 pt-3.5 border-t border-[#141d2e]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
                Authorized SIH Demo Identities
              </span>
              <span className="text-[9px] text-cyan-400/80 font-mono">One-Click Select</span>
            </div>

            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => fillQuickCredentials("officer@thermoguard.gov.in", "Analyst@2026!")}
                className="w-full text-left p-2 rounded bg-[#070b14] hover:bg-[#0e1628] border border-[#19243a] hover:border-cyan-500/40 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300">
                    Dr. Vikram Sethi
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20">
                    Chief Officer
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  officer@thermoguard.gov.in • Level 4 Clearance
                </div>
              </button>

              <button
                type="button"
                onClick={() => fillQuickCredentials("analyst@thermoguard.gov.in", "Analyst#2026")}
                className="w-full text-left p-2 rounded bg-[#070b14] hover:bg-[#0e1628] border border-[#19243a] hover:border-emerald-500/40 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-200 group-hover:text-emerald-300">
                    Aditi Roy
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                    GIS Analyst (L2)
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  analyst@thermoguard.gov.in • Surveillance & ML Telemetry
                </div>
              </button>

              <button
                type="button"
                onClick={() => fillQuickCredentials("analyst.gis@thermoguard.gov.in", "Thermal#Secure2026")}
                className="w-full text-left p-2 rounded bg-[#070b14] hover:bg-[#0e1628] border border-[#19243a] hover:border-teal-500/40 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-200 group-hover:text-teal-300">
                    Pooja Sharma
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono text-teal-400 bg-teal-500/10 border border-teal-500/20">
                    Senior GIS Analyst
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  analyst.gis@thermoguard.gov.in • Level 3 Clearance
                </div>
              </button>

              <button
                type="button"
                onClick={() => fillQuickCredentials("field.dispatch@thermoguard.gov.in", "Dispatch@2026")}
                className="w-full text-left p-2 rounded bg-[#070b14] hover:bg-[#0e1628] border border-[#19243a] hover:border-amber-500/40 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-200 group-hover:text-amber-300">
                    Captain Rajesh Verma
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20">
                    Field Ops
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  field.dispatch@thermoguard.gov.in • Level 3 Clearance
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <footer className="px-6 py-3 border-t border-[#141d2e] bg-[#090e1a]/80 backdrop-blur-sm flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-500 font-mono">
        <div className="flex items-center gap-2">
          <span>SMART INDIA HACKATHON 2026</span>
          <span>•</span>
          <span>PS ID: SIH26162</span>
          <span>•</span>
          <span>NTRO Geospatial Division</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Lock className="w-3 h-3 text-cyan-400" />
          <span>Session Encrypted • Scrypt Salted Hash Tokens</span>
        </div>
      </footer>
    </div>
  );
};
