// src/lib/cart.js
const STORAGE_KEY = "packPalCart";
const UPDATED_EVT = "cart:updated";

export const readCart = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);

    // Migrate if someone stored a single object or string by mistake
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === "object") return [parsed];
    return [];
  } catch {
    // If JSON was corrupted, reset it so the app recovers
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
};

export const writeCart = (arr) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.isArray(arr) ? arr : []));
    window.dispatchEvent(new Event(UPDATED_EVT));
  } catch {
    /* ignore */
  }
};

export const addLine = (item) => {
  const list = readCart();
  list.push({
    id: String(item.id ?? Date.now()),
    name: String(item.name ?? "Item"),
    price: Number(item.price ?? 0),
    quantity: Math.max(1, Number(item.quantity ?? 1)),
    img: item.img || "",
    icon: item.icon || "👜",
    description: item.description || "",
  });
  writeCart(list);
};

export const onCartUpdated = (fn) => {
  const h = () => fn(readCart());
  window.addEventListener(UPDATED_EVT, h);
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) h();
  });
  return () => {
    window.removeEventListener(UPDATED_EVT, h);
  };
};

export const STORAGE_KEY_CONST = STORAGE_KEY;
