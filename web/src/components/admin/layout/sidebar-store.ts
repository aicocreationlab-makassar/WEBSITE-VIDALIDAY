// Status sidebar admin di desktop (ditutup penuh atau terbuka), diingat di localStorage
// dengan kunci yang sama seperti admin lama. Dibaca lewat useSyncExternalStore.

export const SIDEBAR_STORAGE_KEY = "admin_sidebar_closed";
export const DESKTOP_QUERY = "(min-width: 48rem)"; // breakpoint `md`

const listeners = new Set<() => void>();
let closedMemory: boolean | null = null;

function readClosed(): boolean {
  if (closedMemory !== null) return closedMemory;
  try {
    closedMemory = window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
  } catch {
    closedMemory = false;
  }
  return closedMemory;
}

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeSidebar(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== SIDEBAR_STORAGE_KEY) return;
    closedMemory = event.newValue === "true";
    emit();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export const getSidebarClosedSnapshot = (): boolean => readClosed();

/** Server dan saat hidrasi: belum diketahui, CSS + skrip inline yang menentukan tampilan awal. */
export const getSidebarClosedServerSnapshot = (): boolean | null => null;

export function setSidebarClosed(closed: boolean) {
  closedMemory = closed;
  try {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, closed ? "true" : "false");
  } catch {
    // localStorage diblokir: status tetap berlaku selama halaman terbuka.
  }
  emit();
}

export function subscribeDesktop(listener: () => void): () => void {
  const mql = window.matchMedia(DESKTOP_QUERY);
  mql.addEventListener("change", listener);
  return () => mql.removeEventListener("change", listener);
}

export const getDesktopSnapshot = (): boolean => window.matchMedia(DESKTOP_QUERY).matches;
export const getDesktopServerSnapshot = (): boolean | null => null;

/**
 * Skrip inline: tandai elemen induknya `data-sidebar="closed"` sebelum paint bila sidebar
 * terakhir ditutup, supaya tidak berkedip. Elemen induk wajib `suppressHydrationWarning`.
 */
export const SIDEBAR_INIT_SCRIPT = `(function(){try{var s=document.currentScript,r=s&&s.parentElement;if(r&&localStorage.getItem(${JSON.stringify(
  SIDEBAR_STORAGE_KEY,
)})==="true")r.setAttribute("data-sidebar","closed")}catch(e){}})()`;
