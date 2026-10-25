import { Fragment } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BellRing,
  Bot,
  CalendarCheck,
  Check,
  Crown,
  LayoutDashboard,
  MessageCircle,
  Sparkles,
  UserPlus,
} from "lucide-react";
import hero from "@/assets/hero.jpg";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { seo } from "@/lib/seo";


export const Route = createFileRoute("/for-business")({
  head: () =>
    seo({
      title: "Ticked for businesses — Your 24/7 WhatsApp receptionist",
      description: "Ticked's AI books, moves and cancels appointments on WhatsApp, syncs with Google Calendar and sends reminders. From R150 per month.",
      path: "/for-business",
    }),
  component: ForBusiness,
});

const STEPS = [
  { icon: MessageCircle, t: "Clients message your WhatsApp", d: "They chat to your business number like they always do." },
  { icon: Bot, t: "Ticked's AI handles it", d: "Books, moves and cancels appointments straight into your Google Calendar." },
  { icon: BellRing, t: "Reminders go out", d: "Clients get reminders automatically, so fewer no-shows." },
  { icon: LayoutDashboard, t: "You see everything", d: "Every booking and chat in your dashboard, with notifications." },
];

const PLANS = [
  {
    name: "Ticked Essential",
    tagline: "Your WhatsApp receptionist",
    icon: MessageCircle,
    price: 150,
    perDay: "About R5 a day",
    features: ["WhatsApp AI booking assistant, 24/7", "Google Calendar sync", "Dashboard and notifications", "Reminders"],
  },
  {
    name: "Ticked Premium",
    tagline: "Get found, get reviewed",
    icon: Crown,
    price: 300,
    perDay: "About R10 a day",
    featured: true,
    features: ["Everything in Essential, plus:", "Your own page on ticked.online", "Ticks (reviews) from clients", "1 extra team member included"],
  },
];

type Cell = boolean | { t: string; s?: string };
const COMPARE: { group: string; rows: [string, Cell, Cell][] }[] = [
  {
    group: "WhatsApp booking assistant",
    rows: [
      ["AI books, moves and cancels 24/7", true, true],
      ["Several services in one appointment", true, true],
      ["Automatic reminders", true, true],
      ["Google Calendar sync", true, true],
    ],
  },
  {
    group: "Your business",
    rows: [
      ["Dashboard and notifications", true, true],
      ["Add bookings from the calendar", true, true],
      ["Team members", { t: "R50 each" }, { t: "1 included", s: "then R50 each" }],
    ],
  },
  {
    group: "Get found online",
    rows: [
      ["Your own page on ticked.online", false, true],
      ["Book on WhatsApp button", false, true],
      ["Ticks (reviews) from clients", false, true],
      ["Verified-visit review invites", false, true],
      ["Reply to reviews publicly", false, true],
    ],
  },
  {
    group: "Cost",
    rows: [
      ["Monthly fee", { t: "R150" }, { t: "R300" }],
      ["Per booking made by Ticked", { t: "R3" }, { t: "R3" }],
    ],
  },
];

const FAQ = [
  ["Do I need a new number?", "No. Ticked works with your existing WhatsApp business number, so clients message you exactly as before."],
  ["Does it work with my calendar?", "Yes. Ticked syncs with Google Calendar — bookings, moves and cancellations show up instantly, and it only offers times you're free."],
  ["Can I still reply myself?", "Of course. You can jump into any chat whenever you like, and see every conversation in your dashboard."],
  ["How do reviews work?", "On Premium, clients can leave ticks (1–5) on your Ticked page. You can reply publicly. Reviews can't be deleted by businesses, but Ticked removes any that break our review rules."],
  ["Can I cancel anytime?", "Yes. There's no long contract — cancel whenever you want from your dashboard."],
];

const PREMIUM_COL = "bg-brand/[0.08]";

function Tick({ className }: { className?: string }) {
  return (
    <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand", className)}>
      <Check className="h-3 w-3 text-tick-check" strokeWidth={4} />
    </span>
  );
}

function CellValue({ v }: { v: Cell }) {
  if (v === true) return <Tick className="mx-auto h-[22px] w-[22px]" />;
  if (v === false)
    return (
      <span className="mx-auto block h-0.5 w-3.5 rounded bg-muted-foreground/45">
        <span className="sr-only">Not included</span>
      </span>
    );
  return (
    <span className="font-bold">
      {v.t}
      {v.s && <span className="block text-xs font-medium text-muted-foreground">{v.s}</span>}
    </span>
  );
}

function PlanCard({ p }: { p: (typeof PLANS)[number] }) {
  const Icon = p.icon;
  const body = (
    <div className={cn("relative h-full rounded-3xl", p.featured ? "bg-popover px-6 py-8 sm:px-7 sm:py-9" : "border bg-card p-6 shadow-card sm:p-7")}>
      {p.featured && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(ellipse_80%_50%_at_100%_0%,color-mix(in_srgb,var(--brand)_14%,transparent),transparent_70%)]"
        />
      )}
      <div className="relative">
        <div className="flex items-center gap-3">
          <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full", p.featured ? "bg-brand text-brand-ink" : "bg-brand-tint text-brand-dark")}>
            <Icon className="h-[22px] w-[22px]" />
          </span>
          <div className="min-w-0">
            <h3 className="text-xl">{p.name}</h3>
            <p className="text-sm text-muted-foreground">{p.tagline}</p>
          </div>
        </div>
        <p className="mt-6 flex items-start leading-none">
          <span className="mt-1.5 text-2xl font-extrabold">R</span>
          <span className="text-[3.25rem] font-extrabold tracking-tight">{p.price}</span>
          <span className="mb-2 ml-1.5 self-end text-muted-foreground">per month</span>
        </p>
        <span className="mt-3 inline-block rounded-full bg-brand-tint px-2.5 py-1 text-xs font-bold text-brand-dark">{p.perDay}</span>
        <div className="my-6 border-t border-dashed" />
        <ul className="space-y-3">
          {p.features.map((f, i) => (
            <li key={f} className={cn("flex gap-3", p.featured && i === 0 && "font-bold")}>
              <Tick className="mt-0.5" />
              {f}
            </li>
          ))}
        </ul>
        <Button asChild size="lg" variant={p.featured ? "default" : "contrast"} className="group mt-7 w-full">
          <Link to="/apply">
            Apply now <ArrowRight className="transition-transform group-hover:translate-x-1" />
          </Link>
        </Button>
      </div>
    </div>
  );

  if (!p.featured) {
    return <div className="transition-transform duration-300 hover:-translate-y-1">{body}</div>;
  }
  return (
    <div className="relative transition-transform duration-300 hover:-translate-y-1 md:scale-[1.04] md:hover:scale-[1.04]">
      <span className="absolute -top-3.5 left-7 z-10 inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-xs font-extrabold text-brand-ink shadow-glow">
        <Sparkles className="h-3.5 w-3.5" /> Most popular
      </span>
      <div className="h-full rounded-[calc(var(--radius)+14px)] bg-gradient-to-br from-brand via-brand-dark to-brand p-[2px] shadow-lift dark:shadow-glow">
        {body}
      </div>
    </div>
  );
}

function ComparePlans() {
  return (
    <div className="mx-auto mt-14 max-w-4xl">
      <h3 className="text-center text-2xl">Compare plans</h3>
      <p className="mt-1 text-center text-sm text-muted-foreground">Everything side by side.</p>
      <div className="mt-6 overflow-x-auto rounded-3xl border bg-card shadow-card">
        <table className="w-full min-w-[20rem] border-collapse text-[13px] sm:text-sm">
          <thead>
            <tr className="border-b">
              <th className="px-2 py-4 sm:px-4">
                <span className="sr-only">Feature</span>
              </th>
              <th className="w-[27%] px-1.5 py-4 text-center font-extrabold sm:w-1/4 sm:px-4 sm:text-[15px]">
                Essential
                <span className="block text-xs font-semibold text-muted-foreground">R150 p/m</span>
              </th>
              <th className={cn("w-[27%] px-1.5 py-4 text-center font-extrabold shadow-[inset_0_3px_0_var(--brand)] sm:w-1/4 sm:px-4 sm:text-[15px]", PREMIUM_COL)}>
                <span className="mb-1.5 inline-block rounded-full bg-brand px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-brand-ink">Popular</span>
                <span className="block">Premium</span>
                <span className="block text-xs font-semibold text-muted-foreground">R300 p/m</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {COMPARE.map((g) => (
              <Fragment key={g.group}>
                <tr>
                  <td className="px-2 pb-2 pt-5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-brand-dark sm:px-4">{g.group}</td>
                  <td />
                  <td className={PREMIUM_COL} />
                </tr>
                {g.rows.map(([label, e, p]) => (
                  <tr key={label} className="group border-t">
                    <td className="px-2 py-3 group-hover:bg-brand/5 sm:px-4">{label}</td>
                    <td className="px-1.5 py-3 text-center group-hover:bg-brand/5 sm:px-4">
                      <CellValue v={e} />
                    </td>
                    <td className={cn("px-1.5 py-3 text-center group-hover:bg-brand/[0.13] sm:px-4", PREMIUM_COL)}>
                      <CellValue v={p} />
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t">
              <td />
              <td className="px-1.5 py-4 text-center sm:px-4">
                <Button asChild size="sm" variant="outline">
                  <Link to="/apply">Apply</Link>
                </Button>
              </td>
              <td className={cn("px-1.5 py-4 text-center sm:px-4", PREMIUM_COL)}>
                <Button asChild size="sm">
                  <Link to="/apply">Apply</Link>
                </Button>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function ForBusiness() {
  return (
    <>
      <section className="container-page pt-6 sm:pt-8">
        <div className="grid items-center gap-10 rounded-3xl border bg-card p-6 shadow-lift sm:p-10 lg:grid-cols-2 lg:p-14">
          <div className="min-w-0">
            <p className="inline-flex rounded-full bg-brand-tint px-3 py-1 text-sm font-bold text-brand-dark">Ticked for businesses</p>
            <h1 className="mt-4 text-4xl leading-tight sm:text-5xl">Your 24/7 WhatsApp receptionist</h1>
            <p className="mt-4 max-w-xl text-lg text-muted-foreground">
              Ticked answers your WhatsApp, books appointments into your calendar and reminds clients — even while you're busy with a client or asleep.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="xl"><Link to="/apply">Apply now</Link></Button>
            </div>
          </div>
          <img src={hero} alt="A stylist at work in a busy salon" width={1600} height={1008} className="hidden aspect-[4/3] w-full rounded-3xl border object-cover shadow-lift lg:block" />
        </div>
      </section>

      <section className="container-page py-14">
        <h2 className="text-center text-3xl">How Ticked works</h2>
        <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.t} className="rounded-3xl border bg-card p-6 shadow-card">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-tint text-brand-dark"><s.icon className="h-5 w-5" /></span>
              <p className="mt-4 text-sm font-bold text-muted-foreground">Step {i + 1}</p>
              <h3 className="mt-1 text-lg">{s.t}</h3>
              <p className="mt-1 text-muted-foreground">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="py-14">
        <div className="container-page">
          <h2 className="text-center text-3xl">Simple pricing</h2>
          <p className="mt-2 text-center text-muted-foreground">Prices are final — QuadCorp is not VAT registered.</p>
          <div className="mx-auto mt-11 grid max-w-4xl items-center gap-x-6 gap-y-9 md:grid-cols-2">
            {PLANS.map((p) => (
              <PlanCard key={p.name} p={p} />
            ))}
          </div>
          <div className="mx-auto mt-10 grid max-w-4xl gap-3 text-sm sm:grid-cols-2">
            <div className="flex items-center gap-3.5 rounded-full border bg-card px-4 py-3.5 shadow-card">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand-dark"><UserPlus className="h-[18px] w-[18px]" /></span>
              <p><strong className="block text-[15px]">R50 per month</strong><span className="text-muted-foreground">for each extra team member</span></p>
            </div>
            <div className="flex items-center gap-3.5 rounded-full border bg-card px-4 py-3.5 shadow-card">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand-dark"><CalendarCheck className="h-[18px] w-[18px]" /></span>
              <p><strong className="block text-[15px]">R3 per booking</strong><span className="text-muted-foreground">made by Ticked</span></p>
            </div>
          </div>
          <ComparePlans />
        </div>
      </section>

      <section className="container-page max-w-3xl py-14">
        <h2 className="text-center text-3xl">Questions</h2>
        <Accordion type="single" collapsible className="mt-8 space-y-3">
          {FAQ.map(([q, a]) => (
            <AccordionItem key={q} value={q} className="rounded-3xl border bg-card px-5 shadow-card sm:px-6">
              <AccordionTrigger className="text-left text-base font-bold">{q}</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <div className="mt-10 flex flex-col items-center gap-3 rounded-3xl border bg-card p-8 text-center shadow-lift">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand text-brand-ink shadow-glow">
            <CalendarCheck className="h-7 w-7" />
          </span>
          <h2 className="text-2xl">Ready to get booked on WhatsApp?</h2>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg"><Link to="/apply">Apply now</Link></Button>
          </div>
        </div>
      </section>
    </>
  );
}
