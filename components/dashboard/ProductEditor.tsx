"use client";
// Add or edit a product (Phase 6). Photos are resized in the browser and uploaded straight to storage with the team member's
// session; the cut-out is made in the browser too (D-036). Nothing is saved until "Save" passes the shared schema.
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { useForm, useWatch, type FieldErrors } from "react-hook-form";
import { saveProduct } from "@/app/dashboard/actions";
import type { AutofillFields } from "@/lib/ai";
import { Overlay } from "@/components/shop/Overlay";
import s from "@/components/shop/shop.module.css";
import { CATEGORIES, CONDITIONS, ERAS, MEASURE, STATUSES, type Category } from "@/lib/catalog";
import { toCutout, toProductPhoto } from "@/lib/image";
import { PHOTO } from "@/lib/photo-spec";
import { emptyProduct, productSchema, type ProductInput, type ProductValues } from "@/lib/product-schema";
import { browserDb } from "@/lib/supabase/browser";
import { photoUrl } from "@/lib/supabase/public";
import d from "./dashboard.module.css";

const STATUS_LABEL = { live: "Live in shop", reserved: "Reserved", sold: "Sold", hidden: "Hidden (draft)" } as const;

async function upload(folder: "p" | "c", blob: Blob, ext: string): Promise<string> {
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await browserDb().storage.from(PHOTO.bucket).upload(path, blob, { contentType: blob.type, upsert: false, cacheControl: PHOTO.cacheSeconds });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return path;
}

function Err({ id, errors, name }: { id: string; errors: FieldErrors<ProductInput>; name: keyof ProductInput }) {
  const e = errors[name];
  return e?.message ? <p className={d.fieldErr} id={id}>{String(e.message)}</p> : null;
}

function Editor({ code, initial, onClose, onSaved, closeRef, cancelRef }: {
  code: string | null; initial: ProductInput; onClose: () => void; onSaved: (code: string, created: boolean) => void;
  closeRef: RefObject<HTMLButtonElement | null>; cancelRef: RefObject<(() => void) | null>;
}) {
  const ids = { name: useId(), brand: useId(), era: useId(), cat: useId(), size: useId(), price: useId(), cond: useId(), status: useId(), colour: useId(), desc: useId(), tip: useId() };
  const { register, handleSubmit, control, setValue, formState } = useForm<ProductInput, unknown, ProductValues>({
    resolver: zodResolver(productSchema),
    defaultValues: initial,
  });
  const { errors, isSubmitting } = formState;
  const photos = useWatch({ control, name: "photos" }) ?? [];
  const cutout = useWatch({ control, name: "cutout" });
  const category = useWatch({ control, name: "category" }) as Category;
  const [busy, setBusy] = useState("");
  const [problem, setProblem] = useState("");
  const fresh = useRef<string[]>([]); // uploaded during this edit, removed again if the edit is cancelled
  const photoInput = useRef<HTMLInputElement>(null);
  const cutoutInput = useRef<HTMLInputElement>(null);

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setProblem("");
    const room = PHOTO.maxPerProduct - photos.length;
    const list = [...files].slice(0, room);
    if (files.length > room) setProblem(`${PHOTO.maxPerProduct} photos at most, so only the first ${room} were added.`);
    const added: string[] = [];
    for (const [i, f] of list.entries()) {
      setBusy(`Resizing and uploading photo ${i + 1} of ${list.length}…`);
      try {
        const { blob, ext } = await toProductPhoto(f);
        const path = await upload("p", blob, ext);
        fresh.current.push(path);
        added.push(path);
      } catch (e) {
        setProblem(e instanceof Error ? e.message : "That photo didn't upload.");
      }
    }
    setBusy("");
    setValue("photos", [...photos, ...added], { shouldValidate: true, shouldDirty: true });
  }

  async function makeCutout(source: "model" | "own", file?: File) {
    setProblem("");
    try {
      let blob: Blob;
      if (source === "model") {
        if (!photos[0]) return setProblem("Add a photo first. The cut-out is made from the cover photo.");
        setBusy("Removing the background… the first time downloads the model (44 MB), then it's quick.");
        blob = await (await fetch(photoUrl(photos[0]))).blob();
      } else {
        if (!file) return;
        setBusy("Preparing your cut-out…");
        blob = file;
      }
      const out = await toCutout(blob, { fromModel: source === "model" });
      const path = await upload("c", out.blob, out.ext);
      fresh.current.push(path);
      setValue("cutout", path, { shouldDirty: true });
    } catch (e) {
      setProblem(e instanceof Error ? e.message : "Couldn't make the cut-out.");
    } finally {
      setBusy("");
    }
  }

  // "Fill from photo" (D-012): suggestions only, the team checks them before saving. Off-list category or era stays as it is.
  async function fillFromPhoto() {
    if (!photos[0]) return setProblem("Add a photo first. The AI reads the cover photo.");
    setProblem("");
    setBusy("Reading the cover photo…");
    try {
      const res = await fetch("/api/autofill", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ path: photos[0] }) });
      const body = (await res.json().catch(() => ({}))) as { fields?: AutofillFields; error?: string };
      if (!res.ok || !body.fields) return setProblem(body.error ?? "The AI couldn't help with this one. Fill it in by hand.");
      const f = body.fields;
      const opts = { shouldDirty: true, shouldValidate: true };
      setValue("name", f.name, opts);
      if (f.category) setValue("category", f.category, opts);
      if (f.era) setValue("era", f.era, opts);
      if (f.colour) setValue("colour", f.colour, opts);
      if (f.description) setValue("description", f.description, opts);
      if (f.stylingTip) setValue("stylingTip", f.stylingTip, opts);
      setProblem("Filled from the photo. Check every field before saving.");
    } catch {
      setProblem("Couldn't reach the AI. Check your connection, or fill it in by hand.");
    } finally {
      setBusy("");
    }
  }

  async function cancel() {
    // Uploads from an edit that's thrown away would otherwise sit in storage forever.
    const orphans = fresh.current;
    fresh.current = [];
    onClose();
    if (orphans.length) await browserDb().storage.from(PHOTO.bucket).remove(orphans);
  }
  useEffect(() => {
    cancelRef.current = cancel;
  });

  async function onValid(v: ProductValues) {
    setProblem("");
    const r = await saveProduct(code, v);
    if (!r.ok) return setProblem(r.error);
    fresh.current = [];
    onSaved(r.code, code === null);
  }

  const field = (name: keyof ProductInput, id: string) => ({
    id,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${id}-err` : undefined,
  });

  return (
    <form className={d.editor} onSubmit={(e) => handleSubmit(onValid)(e)} noValidate>
      <div className={d.edHead}>
        <h2 className="display" id="editorTitle">{code ? `Edit ${code}` : "Add product"}</h2>
        <button ref={closeRef} className={s.close} type="button" aria-label="Close editor" onClick={cancel}>×</button>
      </div>
      <div className={d.edBody}>
        <section className={d.field} aria-labelledby="photosLabel">
          <span className={d.fieldLegend} id="photosLabel">Photos ({photos.length} of {PHOTO.maxPerProduct}). The first is the cover.</span>
          <div className={d.photos}>
            {photos.map((p, i) => (
              <figure key={p} className={d.photo}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoUrl(p)} alt={`Photo ${i + 1}${i === 0 ? ", cover" : ""}`} width={720} height={900} />
                <figcaption>
                  {i === 0 ? <span className={d.coverTag}>Cover</span> : (
                    <button type="button" className={d.btnSm} onClick={() => setValue("photos", [p, ...photos.filter((x) => x !== p)], { shouldDirty: true })}>Make cover</button>
                  )}
                  <button type="button" className={d.btnSm} aria-label={`Remove photo ${i + 1}`} onClick={() => setValue("photos", photos.filter((x) => x !== p), { shouldValidate: true, shouldDirty: true })}>Remove</button>
                </figcaption>
              </figure>
            ))}
            {photos.length < PHOTO.maxPerProduct && (
              <button type="button" className={d.addPhoto} onClick={() => photoInput.current?.click()} disabled={!!busy}>
                <span aria-hidden="true">+</span>Add photos
              </button>
            )}
          </div>
          <input ref={photoInput} className="sr-only-text" type="file" accept="image/*" multiple tabIndex={-1} aria-hidden="true"
            onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
          <p className={d.muted}>Flat lay on a plain background works best. Photos are cropped to 4:5 and made small before upload.</p>
          {errors.photos?.message && <p className={d.fieldErr}>{String(errors.photos.message)}</p>}
        </section>

        <section className={d.field} aria-labelledby="cutoutLabel">
          <span className={d.fieldLegend} id="cutoutLabel">Cut-out for the outfit builder and looks</span>
          <div className={d.cutoutRow}>
            <div className={d.cutoutPreview}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {cutout ? <img src={photoUrl(cutout)} alt="Cut-out preview" /> : <span>No cut-out yet</span>}
            </div>
            <div className={d.cutoutActions}>
              <button type="button" className={d.btnSm} disabled={!!busy || !photos.length} onClick={() => makeCutout("model")}>Make cut-out from cover</button>
              <button type="button" className={d.btnSm} disabled={!!busy} onClick={() => cutoutInput.current?.click()}>Upload your own cut-out</button>
              {cutout && <button type="button" className={d.btnSm} onClick={() => setValue("cutout", "", { shouldDirty: true })}>Remove cut-out</button>}
            </div>
          </div>
          <input ref={cutoutInput} className="sr-only-text" type="file" accept="image/png,image/webp" tabIndex={-1} aria-hidden="true"
            onChange={(e) => { makeCutout("own", e.target.files?.[0]); e.target.value = ""; }} />
          <p className={d.muted}>Check it looks right on the blue. If parts are missing, use your phone&apos;s &quot;lift subject&quot; (long-press the piece in Photos) and upload that instead.</p>
        </section>

        <div className={d.aiRow}>
          <button type="button" className={d.btnSm} disabled={!!busy || !photos.length} onClick={fillFromPhoto}>Fill from photo</button>
          <p className={d.muted}>Suggests the name, category, era, colour, description and styling tip from the cover photo. Price, size, condition and measurements stay yours.</p>
        </div>

        <div className={d.field}>
          <label htmlFor={ids.name}>Product name</label>
          <input {...register("name")} {...field("name", ids.name)} placeholder="e.g. 90s cropped denim jacket" />
          <Err id={`${ids.name}-err`} errors={errors} name="name" />
        </div>
        <div className={d.grid2}>
          <div className={d.field}>
            <label htmlFor={ids.brand}>Brand</label>
            <input {...register("brand")} {...field("brand", ids.brand)} placeholder="Unbranded" />
          </div>
          <div className={d.field}>
            <label htmlFor={ids.era}>Era</label>
            <select {...register("era")} id={ids.era}>{ERAS.map((x) => <option key={x}>{x}</option>)}</select>
          </div>
        </div>
        <div className={d.grid3}>
          <div className={d.field}>
            <label htmlFor={ids.cat}>Category</label>
            <select {...register("category")} id={ids.cat}>{CATEGORIES.map((x) => <option key={x}>{x}</option>)}</select>
          </div>
          <div className={d.field}>
            <label htmlFor={ids.size}>Size</label>
            <input {...register("size")} {...field("size", ids.size)} placeholder="M, W30, EU 38" />
            <Err id={`${ids.size}-err`} errors={errors} name="size" />
          </div>
          <div className={d.field}>
            <label htmlFor={ids.price}>Price (QAR)</label>
            <input {...register("price")} {...field("price", ids.price)} type="number" inputMode="numeric" min={1} step={1} placeholder="120" />
            <Err id={`${ids.price}-err`} errors={errors} name="price" />
          </div>
        </div>
        <fieldset className={d.measures}>
          <legend className={d.fieldLegend}>Measurements, laid flat (cm)</legend>
          {MEASURE[category].map((k) => {
            const id = `${ids.cat}-m-${k}`;
            return (
              <div className={d.field} key={`${category}-${k}`}>
                <label htmlFor={id}>{k}</label>
                <input id={id} type="number" inputMode="decimal" min={0} step={0.5} {...register(`measurements.${k}` as const)} />
              </div>
            );
          })}
        </fieldset>
        <div className={d.grid2}>
          <div className={d.field}>
            <label htmlFor={ids.cond}>Condition</label>
            <select {...register("condition")} id={ids.cond}>{CONDITIONS.map((x) => <option key={x}>{x}</option>)}</select>
          </div>
          <div className={d.field}>
            <label htmlFor={ids.status}>Visibility</label>
            <select {...register("status")} id={ids.status}>{STATUSES.map((x) => <option key={x} value={x}>{STATUS_LABEL[x]}</option>)}</select>
          </div>
        </div>
        <div className={d.field}>
          <label htmlFor={ids.colour}>Colour (optional)</label>
          <input {...register("colour")} {...field("colour", ids.colour)} placeholder="Sage green" />
        </div>
        <div className={d.field}>
          <label htmlFor={ids.desc}>Description (optional)</label>
          <textarea {...register("description")} {...field("description", ids.desc)} rows={3} />
          <Err id={`${ids.desc}-err`} errors={errors} name="description" />
        </div>
        <div className={d.field}>
          <label htmlFor={ids.tip}>Styling tip (optional)</label>
          <textarea {...register("stylingTip")} {...field("stylingTip", ids.tip)} rows={2} />
          <Err id={`${ids.tip}-err`} errors={errors} name="stylingTip" />
        </div>
      </div>
      <div className={d.edFoot}>
        <p className={d.muted} role="status" aria-live="polite">{busy || problem}</p>
        <div className={d.saveRow}>
          <button className={`${s.btn} ${s.secondary}`} type="button" onClick={cancel}>Cancel</button>
          <button className={`${s.btn} ${s.primary}`} type="submit" disabled={isSubmitting || !!busy}>
            {isSubmitting ? "Saving" : code ? "Save changes" : "Add to shop"}
          </button>
        </div>
      </div>
    </form>
  );
}

// Loads an existing product into the form values, or starts an empty one.
export async function loadForEdit(code: string): Promise<ProductInput> {
  const { data, error } = await browserDb()
    .from("products")
    .select("name,brand,era,category,size,price_qar,condition,colour,measurements,status,photos,cutout,description,styling_tip")
    .eq("code", code)
    .single();
  if (error) throw new Error(error.message);
  const m = data.measurements && typeof data.measurements === "object" && !Array.isArray(data.measurements) ? data.measurements : {};
  return {
    name: data.name, brand: data.brand === "Unbranded" ? "" : data.brand, era: data.era as ProductInput["era"],
    category: data.category as ProductInput["category"], size: data.size, price: data.price_qar,
    condition: data.condition as ProductInput["condition"], colour: data.colour ?? "",
    measurements: Object.fromEntries(Object.entries(m).map(([k, v]) => [k, Number(v)])), status: data.status,
    photos: data.photos, cutout: data.cutout ?? "", description: data.description ?? "", stylingTip: data.styling_tip ?? "",
  };
}

export type EditTarget = { code: string | null; values: ProductInput; nonce: number };

export function ProductEditor({ target, trigger, onClose, onSaved }: {
  target: EditTarget | null;
  trigger: HTMLElement | null;
  onClose: () => void;
  onSaved: (code: string, created: boolean) => void;
}) {
  // Escape and the scrim go through the editor's own cancel, so its uploads are cleaned up too.
  const cancelRef = useRef<(() => void) | null>(null);
  return (
    <Overlay item={target} onClose={() => (cancelRef.current ?? onClose)()} trigger={trigger} kind="drawer" labelledBy="editorTitle">
      {/* Keyed per open, so form state never leaks from one product to the next. */}
      {(t, closeRef) => <Editor key={t.nonce} code={t.code} initial={t.values} onClose={onClose} onSaved={onSaved} closeRef={closeRef} cancelRef={cancelRef} />}
    </Overlay>
  );
}

export { emptyProduct };
