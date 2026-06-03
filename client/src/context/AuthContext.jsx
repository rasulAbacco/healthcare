// client/src/context/AuthContext.jsx
// Replace your existing AuthContext.jsx with this file
import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

const USERS = {
  receptionist: { password: "123", role: "receptionist", modules: ["OPD", "IPD"] },
  doctor:       { password: "123", role: "doctor",       modules: ["OPD", "IPD"] },
  pharmacy:     { password: "123", role: "pharmacy",     modules: ["Pharmacy"] },
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const login = (username, password, module) => {
    const found = USERS[username];
    if (!found || found.password !== password) return { success: false };
    if (!found.modules.includes(module)) return { success: false };
    const u = { username, role: found.role, module };
    setUser(u);
    return { success: true, role: found.role, module };
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);