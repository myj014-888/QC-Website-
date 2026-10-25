import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { seo } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// The application form for businesses. It creates a pending application that Ticked reviews and
// approves in the super admin dashboard (the same form that used to be on app.ticked.online/apply).
export const Route = createFileRoute("/apply")({
  head: () => seo({
    title: "Apply for Ticked — Your 24/7 WhatsApp receptionist",
    description: "Tell us about your business and we'll set up Ticked, your WhatsApp booking assistant.",
    path: "/apply",
  }),
  component: ApplyPage,
});

const SUBMIT_URL = "https://ticked-webhook.vercel.app/api/submit-application";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
type Day = (typeof DAYS)[number];
const DAY_LABEL: Record<Day, string> = { monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun" };

type Service = { key: number; name: string; duration: string; price: string };
type Staff = { key: number; name: string; role: string; email: string; services: string[]; login: boolean };
type Hours = Record<Day, { closed: boolean; open: string; close: string }>;

const TERMS_URL = "https://quadcorp.co.za/terms";
const PRIVACY_URL = "https://quadcorp.co.za/privacy";

/** 082 123 4567 and +27 82 123 4567 both become 27821234567 (the same rule as the backend). */
function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("270")) d = "27" + d.slice(3);
  else if (d.startsWith("0")) d = "27" + d.slice(1);
  else if (d.length === 9 && /^[6-8]/.test(d)) d = "27" + d;
  if (d.startsWith("27")) return d.length === 11 ? d : null;
  return d.length >= 10 && d.length <= 15 ? d : null;
}

let nextKey = 1;
const newService = (): Service => ({ key: nextKey++, name: "", duration: "", price: "" });
const newStaff = (): Staff => ({ key: nextKey++, name: "", role: "", email: "", services: [], login: false });
const defaultHours = (): Hours => Object.fromEntries(DAYS.map((d) => [d, { closed: d === "sunday", open: "09:00", close: "17:00" }])) as Hours;

function ApplyPage() {
  const startedAt = useRef(Date.now());
  const [biz, setBiz] = useState({ business_name: "", contact_email: "", contact_phone: "", owner_whatsapp_number: "", desired_whatsapp_number: "" });
  const [honeypot, setHoneypot] = useState("");
  const [services, setServices] = useState<Service[]>([newService()]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [hours, setHours] = useState<Hours>(defaultHours);
  const [policy, setPolicy] = useState({ cancellation_policy: "", rescheduling_policy: "", other_notes: "" });
  const [terms, setTerms] = useState(false);
  const [badPhone, setBadPhone] = useState<{ owner?: boolean; desired?: boolean }>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const errorRef = useRef<HTMLParagraphElement>(null);

  const serviceNames = [...new Set(services.map((s) => s.name.trim()).filter(Boolean))];
  const loginCount = staff.filter((s) => s.login).length;

  function fail(message: string) {
    setError(message);
    setTimeout(() => errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
  }

  function checkPhone(field: "owner_whatsapp_number" | "desired_whatsapp_number" | "contact_phone") {
    const value = biz[field].trim();
    const n = value ? normalizePhone(value) : null;
    if (n) setBiz((b) => ({ ...b, [field]: n }));
    if (field === "owner_whatsapp_number") setBadPhone((p) => ({ ...p, owner: !!value && !n }));
    if (field === "desired_whatsapp_number") setBadPhone((p) => ({ ...p, desired: !!value && !n }));
    return !value || !!n;
  }

  const setStaffAt = (key: number, patch: Partial<Staff>) => setStaff((list) => list.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  const setServiceAt = (key: number, patch: Partial<Service>) => setServices((list) => list.map((s) => (s.key === key ? { ...s, ...patch } : s)));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const name = biz.business_name.trim();
    const email = biz.contact_email.trim();
    if (!name || !email) return fail("Please add your business name and email before submitting.");
    const owner = biz.owner_whatsapp_number.trim();
    const ownerN = owner ? normalizePhone(owner) : "";
    if (owner && !ownerN) { setBadPhone((p) => ({ ...p, owner: true })); return fail("Please check your own WhatsApp number. It should be a full mobile number, for example 082 123 4567."); }
    const desired = biz.desired_whatsapp_number.trim();
    const desiredN = desired ? normalizePhone(desired) : "";
    if (desired && !desiredN) { setBadPhone((p) => ({ ...p, desired: true })); return fail("Please check the WhatsApp number for your bookings. It should be a full mobile number, for example 082 123 4567."); }

    const cleanServices = services
      .map((s) => ({ name: s.name.trim(), duration_minutes: parseInt(s.duration, 10) || 0, price: parseFloat(s.price) || 0 }))
      .filter((s) => s.name);
    const cleanStaff = staff
      .map((s) => ({ name: s.name.trim(), role_title: s.role.trim(), email: s.email.trim(), services: s.services.filter((n) => serviceNames.includes(n)), needs_login: s.login }))
      .filter((s) => s.name);
    for (const s of cleanStaff) {
      if (!s.services.length) return fail(`Please tick at least one service for ${s.name}, otherwise clients can't book them.`);
      if (s.needs_login && !s.email) return fail(`${s.name} needs an email address to get a dashboard login.`);
    }
    if (!terms) return fail("Please tick the box to accept the Terms of Service and Privacy Policy.");
    if (!cleanServices.length) return fail("Please add at least one service so Ticked knows what clients can book.");

    const business_hours = Object.fromEntries(DAYS.map((d) => [d, hours[d].closed ? { closed: true } : { closed: false, open: hours[d].open, close: hours[d].close }]));
    const payload = {
      business_name: name,
      contact_email: email,
      contact_phone: normalizePhone(biz.contact_phone.trim()) ?? biz.contact_phone.trim(),
      owner_whatsapp_number: ownerN,
      desired_whatsapp_number: desiredN,
      services: cleanServices,
      business_hours,
      cancellation_policy: policy.cancellation_policy.trim(),
      rescheduling_policy: policy.rescheduling_policy.trim(),
      other_notes: policy.other_notes.trim(),
      staff: cleanStaff,
      terms_accepted: terms,
      company_website: honeypot,
      form_started_at: startedAt.current,
    };

    setBusy(true);
    try {
      const res = await fetch(SUBMIT_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      fail((err as Error).message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="container-page max-w-3xl py-8 sm:py-12">
        {done ? (
          <div className="mx-auto max-w-md py-12 text-center">
            <span className="mx-auto mb-6 grid size-16 place-items-center rounded-full bg-brand-tint text-brand-dark"><CheckCircle2 className="size-8" /></span>
            <p className="text-xs font-bold tracking-[0.16em] text-brand-dark uppercase">Application received</p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight">Thanks, we've got your details.</h1>
            <p className="mt-3 text-muted-foreground">We'll review your application and reach out by email to set up your WhatsApp number and Google Calendar. Your dashboard login comes once you're set up.</p>
            <Button asChild className="mt-8"><Link to="/">Back to Ticked</Link></Button>
          </div>
        ) : (
          <>
            <p className="text-xs font-bold tracking-[0.16em] text-brand-dark uppercase">Apply for Ticked</p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Tell us about <span className="text-brand-dark">your business.</span></h1>
            <p className="mt-3 max-w-xl text-muted-foreground">Ticked answers your WhatsApp, books straight into your Google Calendar and follows up with clients automatically, even after hours. Fill this in and we'll take it from here.</p>

            <ol className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                ["You apply", "Share your services, hours and policies below. It takes about five minutes."],
                ["We set you up", "We review your details, then connect your WhatsApp number and Google Calendar."],
                ["You go live", "You get your dashboard login and Ticked starts booking for you."],
              ].map(([title, text], i) => (
                <li key={title} className="rounded-3xl border bg-card p-4 shadow-card">
                  <span className="mb-3 grid size-7 place-items-center rounded-full border-2 border-brand text-sm font-bold text-brand-dark">{i + 1}</span>
                  <p className="font-bold">{title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{text}</p>
                </li>
              ))}
            </ol>

            <form onSubmit={submit} noValidate className="mt-10 space-y-5">
              {/* Spam trap: hidden from people, so only bots fill it in. */}
              <div aria-hidden="true" className="absolute -left-[10000px] size-px overflow-hidden">
                <label htmlFor="company_website">Leave this empty</label>
                <input id="company_website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
              </div>

              <Section title="Business details">
                <Field id="business_name" label="Business name">
                  <Input id="business_name" autoComplete="organization" required value={biz.business_name} onChange={(e) => setBiz({ ...biz, business_name: e.target.value })} className="h-11" />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="contact_email" label="Your email" hint="Your dashboard login is sent here.">
                    <Input id="contact_email" type="email" autoComplete="email" required value={biz.contact_email} onChange={(e) => setBiz({ ...biz, contact_email: e.target.value })} className="h-11" />
                  </Field>
                  <Field id="contact_phone" label="Your phone number">
                    <Input id="contact_phone" type="tel" autoComplete="tel" placeholder="082 123 4567" value={biz.contact_phone} onChange={(e) => setBiz({ ...biz, contact_phone: e.target.value })} onBlur={() => checkPhone("contact_phone")} className="h-11" />
                  </Field>
                </div>
                <Field id="owner_whatsapp_number" label="Your own WhatsApp number" error={badPhone.owner ? "That number doesn't look right. Please enter a full mobile number, for example 082 123 4567." : undefined}
                  hint="We send one test message here while setting you up, and use it if we need to reach you. Booking updates come to you in the Ticked app.">
                  <Input id="owner_whatsapp_number" type="tel" placeholder="082 123 4567" value={biz.owner_whatsapp_number} aria-invalid={!!badPhone.owner}
                    onChange={(e) => setBiz({ ...biz, owner_whatsapp_number: e.target.value })} onBlur={() => checkPhone("owner_whatsapp_number")} className="h-11" />
                </Field>
                <Field id="desired_whatsapp_number" label="WhatsApp number for your bookings" error={badPhone.desired ? "That number doesn't look right. Please enter a full mobile number, for example 082 123 4567." : undefined}
                  hint="The number your clients will message to book. It must not already be registered on WhatsApp or WhatsApp Business (use a new SIM, or delete WhatsApp from it first). Leave blank if you're not sure yet.">
                  <Input id="desired_whatsapp_number" type="tel" placeholder="082 123 4567" value={biz.desired_whatsapp_number} aria-invalid={!!badPhone.desired}
                    onChange={(e) => setBiz({ ...biz, desired_whatsapp_number: e.target.value })} onBlur={() => checkPhone("desired_whatsapp_number")} className="h-11" />
                </Field>
              </Section>

              <Section title="Services you offer">
                <div className="hidden grid-cols-[minmax(0,1fr)_9rem_9rem_2.5rem] gap-2 text-xs font-bold tracking-wide text-muted-foreground uppercase sm:grid">
                  <span>Service</span><span>Time in minutes</span><span>Price in rands</span><span />
                </div>
                <div className="space-y-3 sm:space-y-2">
                  {services.map((s) => (
                    <div key={s.key} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.5rem] gap-2 rounded-lg border bg-muted/40 p-3 sm:grid-cols-[minmax(0,1fr)_9rem_9rem_2.5rem] sm:border-0 sm:bg-transparent sm:p-0">
                      <Input aria-label="Service name" placeholder="e.g. Haircut" value={s.name} onChange={(e) => setServiceAt(s.key, { name: e.target.value })} className="col-span-3 h-11 sm:col-span-1" />
                      <Input aria-label="Time in minutes" type="number" inputMode="numeric" min={1} placeholder="Minutes" value={s.duration} onChange={(e) => setServiceAt(s.key, { duration: e.target.value })} className="h-11" />
                      <Input aria-label="Price in rands" type="number" inputMode="decimal" min={0} placeholder="Price (R)" value={s.price} onChange={(e) => setServiceAt(s.key, { price: e.target.value })} className="h-11" />
                      <Button type="button" variant="ghost" size="icon" aria-label="Remove service" disabled={services.length === 1}
                        onClick={() => setServices((list) => list.filter((x) => x.key !== s.key))} className="size-11 text-muted-foreground hover:text-destructive"><X /></Button>
                    </div>
                  ))}
                </div>
                <Button type="button" variant="ghost" className="px-0 font-bold text-brand-dark hover:bg-transparent hover:text-brand-dark" onClick={() => setServices((l) => [...l, newService()])}><Plus /> Add another service</Button>
              </Section>

              <Section title="Your team" intro="Add each person who takes bookings and tick the services they do. Clients can then choose who they see. Leave this empty if it's just you.">
                <div className="space-y-3">
                  {staff.map((s) => (
                    <div key={s.key} className="relative space-y-3 rounded-lg border bg-muted/40 p-4 pt-10 sm:pt-4">
                      <Button type="button" variant="ghost" size="icon" aria-label="Remove team member" onClick={() => setStaff((l) => l.filter((x) => x.key !== s.key))}
                        className="absolute top-1 right-1 text-muted-foreground hover:text-destructive"><X /></Button>
                      <div className="grid gap-3 sm:grid-cols-3 sm:pr-10">
                        <Field id={`st-name-${s.key}`} label="Name"><Input id={`st-name-${s.key}`} placeholder="e.g. Sarah" value={s.name} onChange={(e) => setStaffAt(s.key, { name: e.target.value })} className="h-11" /></Field>
                        <Field id={`st-role-${s.key}`} label="Role"><Input id={`st-role-${s.key}`} placeholder="e.g. Stylist" value={s.role} onChange={(e) => setStaffAt(s.key, { role: e.target.value })} className="h-11" /></Field>
                        <Field id={`st-email-${s.key}`} label="Email"><Input id={`st-email-${s.key}`} type="email" placeholder="optional" value={s.email} onChange={(e) => setStaffAt(s.key, { email: e.target.value })} className="h-11" /></Field>
                      </div>
                      <div>
                        <p className="mb-2 text-sm font-medium">Services they do</p>
                        {serviceNames.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Add your services above first.</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {serviceNames.map((n) => {
                              const on = s.services.includes(n);
                              return (
                                <button key={n} type="button" aria-pressed={on}
                                  onClick={() => setStaffAt(s.key, { services: on ? s.services.filter((x) => x !== n) : [...s.services, n] })}
                                  className={cn("min-h-9 rounded-full border-2 px-3 text-sm font-semibold transition-colors", on ? "border-brand bg-brand-tint text-brand-dark" : "border-border bg-card hover:border-brand/60")}>
                                  {n}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <label className="flex cursor-pointer items-center gap-2 text-sm">
                        <Checkbox checked={s.login} onCheckedChange={(v) => setStaffAt(s.key, { login: v === true })} />
                        Give them a dashboard login (needs an email)
                      </label>
                    </div>
                  ))}
                </div>
                <Button type="button" variant="ghost" className="px-0 font-bold text-brand-dark hover:bg-transparent hover:text-brand-dark" onClick={() => setStaff((l) => [...l, newStaff()])}><Plus /> Add a team member</Button>
              </Section>

              <Section title="Business hours">
                <div className="divide-y">
                  {DAYS.map((d) => {
                    const h = hours[d];
                    const set = (patch: Partial<Hours[Day]>) => setHours((all) => ({ ...all, [d]: { ...all[d], ...patch } }));
                    return (
                      <div key={d} className="grid grid-cols-[3rem_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2 py-2.5 first:pt-0 last:pb-0 sm:grid-cols-[3.5rem_minmax(0,1fr)_minmax(0,1fr)_auto] sm:gap-3">
                        <span className="text-sm font-bold">{DAY_LABEL[d]}</span>
                        <Input type="time" aria-label={`${DAY_LABEL[d]} opening time`} value={h.open} disabled={h.closed} onChange={(e) => set({ open: e.target.value })} className="h-10" />
                        <Input type="time" aria-label={`${DAY_LABEL[d]} closing time`} value={h.close} disabled={h.closed} onChange={(e) => set({ close: e.target.value })} className="h-10" />
                        <label className="col-start-2 col-end-4 flex cursor-pointer items-center gap-2 text-sm text-muted-foreground sm:col-auto">
                          <Checkbox checked={h.closed} onCheckedChange={(v) => set({ closed: v === true })} /> Closed
                        </label>
                      </div>
                    );
                  })}
                </div>
              </Section>

              <Section title="Policies">
                <Field id="cancellation_policy" label="Cancellation policy">
                  <Textarea id="cancellation_policy" rows={3} placeholder="e.g. 24 hours notice required for a full refund." value={policy.cancellation_policy} onChange={(e) => setPolicy({ ...policy, cancellation_policy: e.target.value })} />
                </Field>
                <Field id="rescheduling_policy" label="Rescheduling policy">
                  <Textarea id="rescheduling_policy" rows={3} placeholder="e.g. Free to reschedule up to 4 hours before." value={policy.rescheduling_policy} onChange={(e) => setPolicy({ ...policy, rescheduling_policy: e.target.value })} />
                </Field>
                <Field id="other_notes" label="Anything else worth knowing">
                  <Textarea id="other_notes" rows={3} placeholder="House calls, parking, walk-ins, special instructions..." value={policy.other_notes} onChange={(e) => setPolicy({ ...policy, other_notes: e.target.value })} />
                </Field>
              </Section>

              <Section title="Your plan">
                <div className="rounded-lg border-2 border-brand bg-brand-tint/60 p-4">
                  <p className="text-lg font-extrabold">Ticked Essential</p>
                  <p className="mt-1 text-sm text-muted-foreground">Everything Ticked does: every booking conversation handled for you, all your chats and bookings in your dashboard, stepping into any chat yourself, your client list and your numbers.</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {loginCount ? `${loginCount} team login${loginCount > 1 ? "s" : ""} requested. Extra logins are added to your monthly plan.` : "Choose which team members get their own dashboard login in the team section above."}
                </p>
              </Section>

              <label className="flex cursor-pointer items-start gap-3 text-sm">
                <Checkbox checked={terms} onCheckedChange={(v) => setTerms(v === true)} className="mt-0.5" />
                <span>I agree to the <a href={TERMS_URL} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-dark underline">Terms of Service</a> and the <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-dark underline">Privacy Policy</a>.</span>
              </label>

              {error && <p ref={errorRef} role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}

              <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={busy}>
                {busy && <Loader2 className="animate-spin" />} {busy ? "Submitting…" : "Submit application"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                No spam. We'll only contact you about your application. Questions first? <Link to="/for-business" className="font-medium text-brand-dark hover:underline">See how Ticked works</Link>
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function Section({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-3xl border bg-card p-5 shadow-card sm:p-6">
      <div>
        <h2 className="text-xs font-bold tracking-[0.16em] text-brand-dark uppercase">{title}</h2>
        {intro && <p className="mt-2 text-sm text-muted-foreground">{intro}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string | undefined; error?: string | undefined; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
