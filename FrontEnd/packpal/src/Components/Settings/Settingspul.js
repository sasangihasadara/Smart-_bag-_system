import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
 import "./Settingspul.css";
import Sidebarpul from "../Sidebar/Sidebarpul";   // ✅ import the same name you render

// ---------- Translations (outside component) ----------
const translations = {
  en: {
    settingsTitle: "Settings & Configuration",
    saveBtn: "Save All Changes",
    saving: "Saving...",
    saved: "Saved ✓",
    tabs: {
      general: "General",
      inventory: "Inventory",
      notifications: "Notifications",
      appearance: "Appearance",
      profile: "Profile",
      data: "Data Management",
    },
    general: {
      companyInfo: "Company Information",
      companyName: "Company Name",
      companyNameDesc: "Your company or organization name",
      currency: "Currency",
      currencyDesc: "Default currency for pricing",
      timeZone: "Time Zone",
      timeZoneDesc: "Default time zone for timestamps",
      autoSave: "Auto-save",
      autoSaveDesc: "Automatically save changes",
    },
    appearance: {
      appearanceSettings: "Appearance Settings",
      theme: "Theme",
      themeDesc: "Choose your preferred interface theme",
      language: "Language",
      languageDesc: "Select your preferred language",
      themes: { light: "Light Theme", dark: "Dark Theme", auto: "Auto (System)" },
    },
    profile: {
      userProfile: "User Profile",
      security: "Security",
      fullName: "Full Name",
      fullNameDesc: "Your display name",
      email: "Email Address",
      emailDesc: "Your email for notifications",
      role: "Role",
      roleDesc: "Your system role",
    },
  },
  si: {
    settingsTitle: "සැකසුම් සහ වින්‍යාසය",
    saveBtn: "සියලු වෙනස්කම් සුරකින්න",
    saving: "සුරකිමින්...",
    saved: "සුරකින ලදී ✓",
    tabs: {
      general: "සාමාන්‍ය",
      inventory: "ඉන්වෙන්ටරි",
      notifications: "දැනුම්දීම්",
      appearance: "පෙනුම",
      profile: "පැතිකඩ",
      data: "දත්ත කළමනාකරණය",
    },
    general: {
      companyInfo: "සමාගම් තොරතුරු",
      companyName: "සමාගමේ නම",
      companyNameDesc: "ඔබේ සමාගම හෝ සංවිධානයේ නම",
      currency: "මුදල්",
      currencyDesc: "මිලකරණය සඳහා පෙරනිමි මුදල",
      timeZone: "වේලා කලාපය",
      timeZoneDesc: "වේලා මුද්‍රණ සඳහා පෙරනිමි වේලා කලාපය",
      autoSave: "ස්වයංක්‍රීය සුරැකීම",
      autoSaveDesc: "වෙනස්කම් ස්වයංක්‍රීයව සුරකින්න",
    },
    appearance: {
      appearanceSettings: "පෙනුම් සැකසුම්",
      theme: "තේමාව",
      themeDesc: "ඔබේ කැමති අතුරු මුඛ තේමාව තෝරන්න",
      language: "භාෂාව",
      languageDesc: "ඔබේ කැමති භාෂාව තෝරන්න",
      themes: { light: "ආලෝක තේමාව", dark: "අඳුරු තේමාව", auto: "ස්වයංක්‍රීය (පද්ධතිය)" },
    },
    profile: {
      userProfile: "පරිශීලක පැතිකඩ",
      security: "ආරක්ෂාව",
      fullName: "සම්පූර්ණ නම",
      fullNameDesc: "ඔබේ ප්‍රදර්ශන නම",
      email: "විද්‍යුත් ලිපිනය",
      emailDesc: "දැනුම්දීම් සඳහා ඔබේ විද්‍යුත් ලිපිනය",
      role: "භූමිකාව",
      roleDesc: "ඔබේ පද්ධති භූමිකාව",
    },
  },
  ta: {
    settingsTitle: "அமைப்புகள் மற்றும் கட்டமைப்பு",
    saveBtn: "அனைத்து மாற்றங்களையும் சேமிக்கவும்",
    saving: "சேமிக்கிறது...",
    saved: "சேமிக்கப்பட்டது ✓",
    tabs: {
      general: "பொது",
      inventory: "சரக்கு",
      notifications: "அறிவிப்புகள்",
      appearance: "தோற்றம்",
      profile: "சுயவிவரம்",
      data: "தரவு மேலாண்மை",
    },
    general: {
      companyInfo: "நிறுவன தகவல்",
      companyName: "நிறுவனத்தின் பெயர்",
      companyNameDesc: "உங்கள் நிறுவனம் அல்லது அமைப்பின் பெயர்",
      currency: "நாணயம்",
      currencyDesc: "விலை நிர்ணயத்திற்கான இயல்புநிலை நாணயம்",
      timeZone: "நேர மண்டலம்",
      timeZoneDesc: "நேர முத்திரைகளுக்கான இயல்புநிலை நேர மண்டலம்",
      autoSave: "தானியங்கி சேமிப்பு",
      autoSaveDesc: "மாற்றங்களை தானாகவே சேமிக்கவும்",
    },
    appearance: {
      appearanceSettings: "தோற்ற அமைப்புகள்",
      theme: "தீம்",
      themeDesc: "உங்கள் விருப்பமான இடைமுக தீமை தேர்ந்தெடுக்கவும்",
      language: "மொழி",
      languageDesc: "உங்கள் விருப்பமான மொழியைத் தேர்ந்தெடுக்கவும்",
      themes: { light: "ஒளி தீம்", dark: "இருண்ட தீம்", auto: "தானியங்கி (கணினி)" },
    },
    profile: {
      userProfile: "பயனர் சுயவிவரம்",
      security: "பாதுகாப்பு",
      fullName: "முழு பெயர்",
      fullNameDesc: "உங்கள் காட்சி பெயர்",
      email: "மின்னஞ்சல் முகவரி",
      emailDesc: "அறிவிப்புகளுக்கான உங்கள் மின்னஞ்சல்",
      role: "பாத்திரம்",
      roleDesc: "உங்கள் கணினி பாத்திரம்",
    },
  },
  es: {
    settingsTitle: "Configuración y Ajustes",
    saveBtn: "Guardar Todos los Cambios",
    saving: "Guardando...",
    saved: "Guardado ✓",
    tabs: {
      general: "General",
      inventory: "Inventario",
      notifications: "Notificaciones",
      appearance: "Apariencia",
      profile: "Perfil",
      data: "Gestión de Datos",
    },
    general: {
      companyInfo: "Información de la Empresa",
      companyName: "Nombre de la Empresa",
      companyNameDesc: "El nombre de su empresa u organización",
      currency: "Moneda",
      currencyDesc: "Moneda predeterminada para precios",
      timeZone: "Zona Horaria",
      timeZoneDesc: "Zona horaria predeterminada para marcas de tiempo",
      autoSave: "Guardado Automático",
      autoSaveDesc: "Guardar cambios automáticamente",
    },
    appearance: {
      appearanceSettings: "Configuración de Apariencia",
      theme: "Tema",
      themeDesc: "Elige tu tema de interfaz preferido",
      language: "Idioma",
      languageDesc: "Selecciona tu idioma preferido",
      themes: { light: "Tema Claro", dark: "Tema Oscuro", auto: "Automático (Sistema)" },
    },
    profile: {
      userProfile: "Perfil de Usuario",
      security: "Seguridad",
      fullName: "Nombre Completo",
      fullNameDesc: "Tu nombre para mostrar",
      email: "Dirección de Correo",
      emailDesc: "Tu correo para notificaciones",
      role: "Rol",
      roleDesc: "Tu rol en el sistema",
    },
  },
};

const languageName = { en: "English", si: "Sinhala", ta: "Tamil", es: "Spanish" };

// ---------- Reusable Toggle (no Sidebar here) ----------
function Toggle({ checked, onChange }) {
  return (
    <div className="toggle-container">
      <div
        className={`toggle-switch ${checked ? "active" : ""}`}
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onChange(!checked);
          }
        }}
      >
        <div className="toggle-slider" />
      </div>
    </div>
  );
}

export default function Setting() {
  // App state
  const [settings, setSettings] = useState({
    theme: "light",
    language: "en",
    profileImage: null,
    preferences: {},
  });

  const [activeTab, setActiveTab] = useState("general");
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);

  const [toggles, setToggles] = useState({
    autoSave: true,
    email: true,
    sms: false,
    orderUpdates: true,
    dataBackup: true,
  });

  const t = useMemo(() => translations[settings.language] || translations.en, [settings.language]);
  const fileImportRef = useRef(null);
  const avatarInputRef = useRef(null);
  const mainRef = useRef(null); // <-- scope target

  // Toast helper (stable)
  const showToast = useCallback((message) => {
    setToast(message);
    setTimeout(() => setToast(""), 3000);
  }, []);

  // Save action (stable)
  const saveAllChanges = useCallback(() => {
    setSaving(true);
    showToast(t.saving);
    setTimeout(() => {
      setSaving(false);
      showToast(t.saved);
    }, 1000);
  }, [t, showToast]);

  // Apply theme and handle 'auto' + system changes (scoped to Settings only)
  useEffect(() => {
    const root = mainRef.current;
    if (!root) return;

    const apply = () => {
      if (settings.theme === "dark") {
        root.classList.add("dark-theme");
      } else if (settings.theme === "light") {
        root.classList.remove("dark-theme");
      } else {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
        const setAuto = () => root.classList.toggle("dark-theme", prefersDark.matches);
        setAuto();
        prefersDark.addEventListener("change", setAuto);
        return () => prefersDark.removeEventListener("change", setAuto);
      }
    };

    const cleanup = apply();
    return cleanup;
  }, [settings.theme]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveAllChanges();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setSettings((prev) => {
          const nextTheme = prev.theme === "dark" ? "light" : "dark";
          setTimeout(() => showToast(`Theme changed to ${nextTheme}`), 0);
          return { ...prev, theme: nextTheme };
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saveAllChanges, showToast]);

  // Handlers
  function changeTheme(theme) {
    setSettings((s) => ({ ...s, theme }));
    showToast("Theme changed to " + theme);
  }
  function changeLanguage(lang) {
    setSettings((s) => ({ ...s, language: lang }));
    showToast("Language changed to " + (languageName[lang] || "English"));
  }
  function toggle(name, value) {
    setToggles((t) => ({ ...t, [name]: value }));
  }

  // Profile image
  function onAvatarFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return alert("Please select a valid image file.");
    if (file.size > 5 * 1024 * 1024) return alert("Please select an image smaller than 5MB.");
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = ev.target.result;
      setSettings((s) => ({
        ...s,
        profileImage: {
          data,
          name: file.name,
          size: file.size,
          type: file.type,
          uploadDate: new Date().toISOString(),
        },
      }));
      showToast("Profile image updated");
    };
    reader.readAsDataURL(file);
  }
  function removeProfileImage() {
    setSettings((s) => ({ ...s, profileImage: null }));
    if (avatarInputRef.current) avatarInputRef.current.value = "";
    showToast("Profile image removed");
  }

  // Import / Export
  function exportSettings() {
    const data = JSON.stringify(settings, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "baghub-settings.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Settings exported successfully");
  }
  function importSettings(e) {
    const file = e.target.files?.[0];
    if (!file || file.type !== "application/json") return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target.result);
        setSettings((prev) => ({
          ...prev,
          theme: imported.theme ?? prev.theme,
          language: imported.language ?? prev.language,
          profileImage: imported.profileImage ?? prev.profileImage,
          preferences: imported.preferences ?? prev.preferences,
        }));
        showToast("Settings imported successfully");
      } catch {
        alert("Invalid settings file format");
      }
    };
    reader.readAsText(file);
  }

  // UI helper
  const tabButton = (id, label) => (
    <button
      key={id}
      className={`tab-btn ${activeTab === id ? "active" : ""}`}
      onClick={() => setActiveTab(id)}
      type="button"
    >
      {label}
    </button>
  );

  return (
    <>
      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            background: "#10b981",
            color: "#fff",
            padding: "1rem 1.5rem",
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,.2)",
            zIndex: 1000,
          }}
        >
          {toast}
        </div>
      )}

      {/* Shell: Sidebar + Main content */}
      <div className="settings-shell">
        <Sidebarpul />

        <main className="settings-main" ref={mainRef}>
          <div className="settings-container">
            {/* Header */}
            <div className="settings-header">
              <div className="header-left">
                <span className="settings-icon">⚙️</span>
                <h1 className="settings-title">{t.settingsTitle}</h1>
              </div>
              <button className="save-btn" onClick={saveAllChanges} disabled={saving}>
                {saving ? t.saving : t.saveBtn}
              </button>
            </div>

            {/* Tabs (Inventory removed) */}
            <div className="tab-navigation">
              {tabButton("general", t.tabs.general)}
              {tabButton("notifications", t.tabs.notifications)}
              {tabButton("appearance", t.tabs.appearance)}
              {tabButton("profile", t.tabs.profile)}
              {tabButton("data", t.tabs.data)}
            </div>

            <div className="tab-content">
              {/* General */}
              <div className={`tab-panel ${activeTab === "general" ? "active" : ""}`}>
                <div className="section-header">
                  <span className="section-icon">🏢</span>
                  <h2 className="section-title">{t.general.companyInfo}</h2>
                </div>

                <div className="form-group">
                  <div className="form-row">
                    <div className="form-label-section">
                      <label className="form-label">{t.general.companyName}</label>
                      <p className="form-description">{t.general.companyNameDesc}</p>
                    </div>
                    <div className="form-control-section">
                      <input
                        type="text"
                        className="form-input"
                        defaultValue="PackPal"
                        placeholder="Enter company name"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-label-section">
                      <label className="form-label">{t.general.currency}</label>
                      <p className="form-description">{t.general.currencyDesc}</p>
                    </div>
                    <div className="form-control-section">
                      <select className="form-select" defaultValue="USD">
                        <option value="USD">Sri Lankan Rupee (Rs.)</option>
                        <option value="EUR">Euro (€)</option>
                        <option value="GBP">British Pound (£)</option>
                        <option value="LKR">US Dollar ($)</option>
                        <option value="INR">Indian Rupee (₹)</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-label-section">
                      <label className="form-label">{t.general.timeZone}</label>
                      <p className="form-description">{t.general.timeZoneDesc}</p>
                    </div>
                    <div className="form-control-section">
                      <select className="form-select" defaultValue="Asia/Colombo">
                        <option value="Asia/Colombo">Colombo</option>
                        <option value="America/New_York">New York</option>
                        <option value="Europe/London">London</option>
                        <option value="Asia/Tokyo">Tokyo</option>
                        <option value="Australia/Sydney">Sydney</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-label-section">
                      <label className="form-label">{t.general.autoSave}</label>
                      <p className="form-description">{t.general.autoSaveDesc}</p>
                    </div>
                    <div className="form-control-section">
                      <Toggle checked={toggles.autoSave} onChange={(v) => toggle("autoSave", v)} />
                    </div>
                  </div>
                </div>

                <div className="divider" />

                <div className="settings-grid">
                  <div className="settings-card">
                    <h3 className="card-title">Business Hours</h3>
                    <p className="card-description">Configure your operational hours and availability</p>
                  </div>
                  <div className="settings-card">
                    <h3 className="card-title">Tax Configuration</h3>
                    <p className="card-description">Set up tax rates and regional tax settings</p>
                  </div>
                  <div className="settings-card">
                    <h3 className="card-title">Shipping Zones</h3>
                    <p className="card-description">Define shipping areas and delivery options</p>
                  </div>
                </div>
              </div>

              {/* Notifications */}
              <div className={`tab-panel ${activeTab === "notifications" ? "active" : ""}`}>
                <div className="section-header">
                  <span className="section-icon">🔔</span>
                  <h2 className="section-title">Notification Settings</h2>
                </div>

                <div className="form-group">
                  <div className="form-row">
                    <div className="form-label-section">
                      <label className="form-label">Email Notifications</label>
                      <p className="form-description">Receive notifications via email</p>
                    </div>
                    <div className="form-control-section">
                      <Toggle checked={toggles.email} onChange={(v) => toggle("email", v)} />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-label-section">
                      <label className="form-label">SMS Notifications</label>
                      <p className="form-description">Receive important alerts via SMS</p>
                    </div>
                    <div className="form-control-section">
                      <Toggle checked={toggles.sms} onChange={(v) => toggle("sms", v)} />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-label-section">
                      <label className="form-label">Order Updates</label>
                      <p className="form-description">Get notified about order status changes</p>
                    </div>
                    <div className="form-control-section">
                      <Toggle checked={toggles.orderUpdates} onChange={(v) => toggle("orderUpdates", v)} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Appearance */}
              <div className={`tab-panel ${activeTab === "appearance" ? "active" : ""}`}>
                <div className="section-header">
                  <span className="section-icon">🎨</span>
                  <h2 className="section-title">{t.appearance.appearanceSettings}</h2>
                </div>

                <div className="form-group">
                  <div className="form-row">
                    <div className="form-label-section">
                      <label className="form-label">{t.appearance.theme}</label>
                      <p className="form-description">{t.appearance.themeDesc}</p>
                    </div>
                    <div className="form-control-section">
                      <select
                        id="themeSelect"
                        className="form-select"
                        value={settings.theme}
                        onChange={(e) => changeTheme(e.target.value)}
                      >
                        <option value="light">{t.appearance.themes.light}</option>
                        <option value="dark">{t.appearance.themes.dark}</option>
                        <option value="auto">{t.appearance.themes.auto}</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-label-section">
                      <label className="form-label">{t.appearance.language}</label>
                      <p className="form-description">{t.appearance.languageDesc}</p>
                    </div>
                    <div className="form-control-section">
                      <select
                        id="languageSelect"
                        className="form-select"
                        value={settings.language}
                        onChange={(e) => changeLanguage(e.target.value)}
                      >
                        <option value="en">English</option>
                        <option value="si">Sinhala</option>
                        <option value="ta">Tamil</option>
                        <option value="es">Spanish</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Profile */}
              <div className={`tab-panel ${activeTab === "profile" ? "active" : ""}`}>
                <div className="section-header">
                  <span className="section-icon">👤</span>
                  <h2 className="section-title">{t.profile.userProfile}</h2>
                </div>

                <div className="form-group">
                  <div className="profile-section">
                    <div className="profile-avatar-container">
                      <div
                        className="profile-avatar"
                        id="profileAvatar"
                        onContextMenu={(e) => {
                          if (settings.profileImage) {
                            e.preventDefault();
                            // eslint-disable-next-line no-restricted-globals
                            if (confirm("Do you want to remove your profile picture?")) removeProfileImage();
                          }
                        }}
                        onClick={() => avatarInputRef.current?.click()}
                      >
                        {settings.profileImage ? (
                          <img id="avatarImage" src={settings.profileImage.data} alt="Profile" />
                        ) : (
                          <div className="avatar-placeholder">👤</div>
                        )}
                        <div className="avatar-upload-overlay">
                          <span className="upload-icon">📷</span>
                        </div>
                        <input
                          ref={avatarInputRef}
                          type="file"
                          id="avatarInput"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={onAvatarFileChange}
                        />
                      </div>
                      <div
                        className="avatar-edit-indicator"
                        title={settings.profileImage ? "Image set" : "Click to upload"}
                        style={{ background: "#10b981" }}
                      >
                        {settings.profileImage ? "✓" : "✏️"}
                      </div>
                    </div>

                    <div className="profile-info">
                      <div className="profile-field">
                        <div className="form-row">
                          <div className="form-label-section">
                            <label className="form-label">{t.profile.fullName}</label>
                            <p className="form-description">{t.profile.fullNameDesc}</p>
                          </div>
                          <div className="form-control-section">
                            <input type="text" className="form-input" defaultValue="Pulmi Wijesinghe" placeholder="Enter your full name" />
                          </div>
                        </div>
                      </div>

                      <div className="profile-field">
                        <div className="form-row">
                          <div className="form-label-section">
                            <label className="form-label">{t.profile.email}</label>
                            <p className="form-description">{t.profile.emailDesc}</p>
                          </div>
                          <div className="form-control-section">
                            <input
                              type="email"
                              className="form-input"
                              defaultValue="pulmivihansa27@gmail.com"
                              placeholder="Enter email address"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="profile-field">
                        <div className="form-row">
                          <div className="form-label-section">
                            <label className="form-label">{t.profile.role}</label>
                            <p className="form-description">{t.profile.roleDesc}</p>
                          </div>
                          <div className="form-control-section">
                            <select className="form-select" defaultValue="inventory">
                              <option value="inventory">Inventory Manager</option>
                              <option value="finance">Finance Manager</option>
                              <option value="product">Product Manager</option>
                              <option value="cart">Cart Manager</option>
                              <option value="user">User Manager</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="divider" />

                <div className="section-header">
                  <span className="section-icon">🔒</span>
                  <h2 className="section-title">{t.profile.security}</h2>
                </div>

                <div className="form-group">
                  <div className="security-item">
                    <div className="security-content">
                      <h3 className="security-title">Two-Factor Authentication</h3>
                      <p className="security-description">Add extra security to your account</p>
                    </div>
                    <button
                      className="security-action-btn setup-btn"
                      onClick={() => alert("2FA setup would be implemented here")}
                    >
                      Setup 2FA
                    </button>
                  </div>

                  <div className="security-item">
                    <div className="security-content">
                      <h3 className="security-title">Change Password</h3>
                      <p className="security-description">Update your account password</p>
                    </div>
                    <button
                      className="security-action-btn change-btn"
                      onClick={() => alert("Password change dialog would be implemented here")}
                    >
                      Change Password
                    </button>
                  </div>

                  <div className="security-item">
                    <div className="security-content">
                      <h3 className="security-title">Session Timeout</h3>
                      <p className="security-description">Auto-logout after inactivity (minutes)</p>
                    </div>
                    <div className="security-control">
                      <select className="form-select timeout-select" defaultValue="30">
                        <option value="15">15 minutes</option>
                        <option value="30">30 minutes</option>
                        <option value="60">1 hour</option>
                        <option value="120">2 hours</option>
                        <option value="240">4 hours</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Data */}
              <div className={`tab-panel ${activeTab === "data" ? "active" : ""}`}>
                <div className="section-header">
                  <span className="section-icon">💾</span>
                  <h2 className="section-title">Data Management</h2>
                </div>

                <div className="form-group">
                  <div className="form-row">
                    <div className="form-label-section">
                      <label className="form-label">Data Backup</label>
                      <p className="form-description">Automatically backup your data</p>
                    </div>
                    <div className="form-control-section">
                      <Toggle checked={toggles.dataBackup} onChange={(v) => toggle("dataBackup", v)} />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-label-section">
                      <label className="form-label">Backup Frequency</label>
                      <p className="form-description">How often to create backups</p>
                    </div>
                    <div className="form-control-section">
                      <select className="form-select" defaultValue="daily">
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-label-section">
                      <label className="form-label">Data Retention</label>
                      <p className="form-description">How long to keep deleted items</p>
                    </div>
                    <div className="form-control-section">
                      <select className="form-select" defaultValue="90">
                        <option value="30">30 days</option>
                        <option value="90">90 days</option>
                        <option value="180">6 months</option>
                        <option value="365">1 year</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="divider" />

                <div className="settings-grid">
                  <div className="settings-card">
                    <h3 className="card-title">Export Settings</h3>
                    <p className="card-description">Download your current configuration as JSON.</p>
                    <button className="security-action-btn change-btn" onClick={exportSettings}>
                      Export
                    </button>
                  </div>
                  <div className="settings-card">
                    <h3 className="card-title">Import Settings</h3>
                    <p className="card-description">Load a previously saved configuration.</p>
                    <input
                      ref={fileImportRef}
                      type="file"
                      accept="application/json"
                      className="form-input"
                      onChange={importSettings}
                    />
                  </div>
                  <div className="settings-card">
                    <h3 className="card-title">Reset to Defaults</h3>
                    <p className="card-description">Restore the default app settings.</p>
                    <button
                      className="security-action-btn change-btn"
                      onClick={() => {
                        // eslint-disable-next-line no-restricted-globals
                        if (confirm("Are you sure you want to reset all settings to defaults?")) {
                          setSettings({ theme: "light", language: "en", profileImage: null, preferences: {} });
                          setToggles({ autoSave: true, email: true, sms: false, orderUpdates: true, dataBackup: true });
                          showToast("Settings reset to defaults");
                        }
                      }}
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>
              {/* end Data */}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
