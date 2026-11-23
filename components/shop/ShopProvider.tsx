"use client";
// Shop state shared by the header, cards, sheets, bag, outfit builder and looks: the bag (this browser only), which product
// sheet is open (with /p/<code> in the address bar), requests to load pieces into the builder, and the toast.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { bagStore, parseBag, type BagData } from "@/lib/bag-store";
import { tally } from "@/lib/tally";
import type { OrderForm } from "@/lib/order";
import type { ShopProduct, ShopSettings } from "@/lib/shop-model";
import { BagDrawer } from "./BagDrawer";
import { ProductActions } from "./ProductActions";
import { Gallery, ProductDetails } from "./ProductDetails";
import { Overlay } from "./Overlay";
import s from "./shop.module.css";

type BuilderRequest = { pieces: ShopProduct[]; nonce: number };

type Shop = {
  products: ShopProduct[];
  byCode: Map<string, ShopProduct>;
  settings: ShopSettings;
  hasBuilder: boolean;
  bag: {
    items: ShopProduct[];
    dropped: ShopProduct[];
    form: OrderForm;
    has: (code: string) => boolean;
    add: (codes: string[]) => number;
    remove: (code: string) => void;
    setForm: (f: Partial<OrderForm>) => void;
    open: (trigger: HTMLElement | null) => void;
  };
  openProduct: (code: string, trigger: HTMLElement | null) => void;
  builderRequest: BuilderRequest | null;
  sendToBuilder: (pieces: ShopProduct[]) => void;
  toast: (text: string) => void;
};

const ShopContext = createContext<Shop | null>(null);
const SHEET_KEY = "tqSheet";

export function useShop(): Shop {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error("useShop must be used inside ShopProvider");
  return ctx;
}

export function ShopProvider({ products, settings, hasBuilder, children }: {
  products: ShopProduct[]; settings: ShopSettings; hasBuilder: boolean; children: ReactNode;
}) {
  const byCode = useMemo(() => new Map(products.map((p) => [p.code, p])), [products]);

  // Bag: codes are kept as saved; anything no longer live drops out of the order and is named in the drawer (D-009).
  const raw = useSyncExternalStore(bagStore.subscribe, bagStore.getSnapshot, bagStore.getServerSnapshot);
  const data = useMemo(() => parseBag(raw), [raw]);
  const items = useMemo(() => data.codes.map((c) => byCode.get(c)).filter((p): p is ShopProduct => p?.status === "live"), [data, byCode]);
  const dropped = useMemo(() => data.codes.map((c) => byCode.get(c)).filter((p): p is ShopProduct => !!p && p.status !== "live"), [data, byCode]);
  const write = useCallback((next: BagData) => bagStore.write(next), []);
  const liveCodes = useCallback((d: BagData) => d.codes.filter((c) => byCode.get(c)?.status === "live" || !byCode.has(c)), [byCode]);

  const [bagOpen, setBagOpen] = useState<{ trigger: HTMLElement | null } | null>(null);
  const [sheet, setSheet] = useState<{ code: string; trigger: HTMLElement | null } | null>(null);
  const [builderRequest, setBuilderRequest] = useState<BuilderRequest | null>(null);
  const [toastText, setToastText] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const toast = useCallback((text: string) => {
    setToastText(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastText(""), 2200);
  }, []);

  const bag = useMemo<Shop["bag"]>(() => ({
    items,
    dropped,
    form: data.form,
    has: (code) => data.codes.includes(code),
    add: (codes) => {
      const fresh = codes.filter((c) => byCode.get(c)?.status === "live" && !data.codes.includes(c));
      if (fresh.length) {
        write({ ...data, codes: [...liveCodes(data), ...fresh] });
        tally("bag_add", { codes: fresh });
      }
      return fresh.length;
    },
    remove: (code) => write({ ...data, codes: liveCodes(data).filter((c) => c !== code) }),
    setForm: (f) => write({ ...data, form: { ...data.form, ...f } }),
    open: (trigger) => setBagOpen({ trigger }),
  }), [items, dropped, data, byCode, write, liveCodes]);

  // Product sheet. A direct visit to /p/<code> renders the full product page instead.
  const openProduct = useCallback((code: string, trigger: HTMLElement | null) => {
    if (!byCode.has(code)) return;
    window.history.pushState({ [SHEET_KEY]: code }, "", `/p/${code}`);
    setSheet({ code, trigger });
  }, [byCode]);
  const closeProduct = useCallback(() => {
    if (window.history.state?.[SHEET_KEY]) window.history.back();
    else setSheet(null);
  }, []);
  useEffect(() => {
    const onPop = () => {
      const code = window.history.state?.[SHEET_KEY];
      setSheet((cur) => (code && byCode.has(code) ? { code, trigger: cur?.trigger ?? null } : null));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [byCode]);

  const sendToBuilder = useCallback((pieces: ShopProduct[]) => {
    setBuilderRequest((r) => ({ pieces, nonce: (r?.nonce ?? 0) + 1 }));
  }, []);

  const value = useMemo<Shop>(() => ({
    products, byCode, settings, hasBuilder, bag, openProduct, builderRequest, sendToBuilder, toast,
  }), [products, byCode, settings, hasBuilder, bag, openProduct, builderRequest, sendToBuilder, toast]);

  const sheetProduct = sheet ? byCode.get(sheet.code) ?? null : null;
  return (
    <ShopContext.Provider value={value}>
      {children}
      <Overlay item={sheetProduct} onClose={closeProduct} trigger={sheet?.trigger ?? null} kind="sheet" labelledBy="sheetTitle">
        {(p, closeRef) => (
          <>
            <Gallery product={p} className={s.sheetPhotos} />
            <div className={s.sheetBody}>
              <ProductDetails product={p} titleId="sheetTitle" heading="h2"
                actions={<ProductActions product={p} inSheet onLeave={closeProduct} />} />
            </div>
            <button ref={closeRef} className={s.close} type="button" aria-label="Close" onClick={closeProduct}>×</button>
          </>
        )}
      </Overlay>
      <BagDrawer open={bagOpen !== null} trigger={bagOpen?.trigger ?? null} onClose={() => setBagOpen(null)} />
      <p className={`${s.toast} ${toastText ? s.toastOn : ""}`} role="status" aria-live="polite">{toastText}</p>
    </ShopContext.Provider>
  );
}
