import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import {
  CircleDollarSign,
  TrendingUp,
  Users,
  Target,
  FileText,
  Rocket,
  Zap,
  ArrowRight,
} from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.55, ease: "easeOut" as const },
  }),
};

const features = [
  {
    icon: CircleDollarSign,
    title: "No sign-up cost",
    desc: "Joining Care Fayre is completely free. No subscription, no upfront fees. Create your profile and start receiving leads immediately.",
  },
  {
    icon: TrendingUp,
    title: "You don't pay until you earn",
    desc: "Our small platform fee is only taken when you get paid. If you're not earning, you're not paying — zero risk.",
  },
  {
    icon: Users,
    title: "Ready-made clients, no marketing spend",
    desc: "Receive care requests from families in your area automatically. No advertising costs, no cold outreach required.",
  },
  {
    icon: Target,
    title: "You set your own rate",
    desc: "Bid competitively and win clients on your terms. You decide your hourly rate for every job.",
  },
  {
    icon: FileText,
    title: "Automated invoicing and payments",
    desc: "Submit timesheets and get paid automatically. No chasing invoices, no late payments.",
  },
  {
    icon: Zap,
    title: "Grow without the admin",
    desc: "We handle contracts, payments and client communication so you can focus on delivering outstanding care.",
  },
  {
    icon: Rocket,
    title: "Be live quickly",
    desc: "Simple onboarding. Start receiving leads as soon as your CQC registration is verified — often within 24 hours.",
  },
];

export default function ForAgencies() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[image:var(--hero-gradient)] opacity-[0.03]" />
        <div className="container relative py-24 md:py-36">
          <motion.div
            className="mx-auto max-w-3xl text-center"
            initial="hidden"
            animate="visible"
          >
            <motion.span
              variants={fadeUp}
              custom={0}
              className="inline-block rounded-full bg-accent/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-accent"
            >
              For care agencies
            </motion.span>
            <motion.h1
              variants={fadeUp}
              custom={0.5}
              className="mt-6 font-serif text-4xl leading-tight md:text-6xl md:leading-tight text-foreground"
            >
              Grow your agency,{" "}
              <span className="text-gradient-primary">without the overhead</span>
            </motion.h1>
            <motion.p
              variants={fadeUp}
              custom={1}
              className="mx-auto mt-6 max-w-2xl text-lg md:text-xl text-muted-foreground leading-relaxed"
            >
              Care Fayre connects you with families in your area who need care
              right now. No marketing spend, no chasing invoices — just more
              clients and less admin.
            </motion.p>
            <motion.div variants={fadeUp} custom={1.5} className="mt-10">
              <Button size="lg" variant="hero" asChild>
                <Link to="/signup?role=agency">
                  Register your agency today — it's free{" "}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-card py-20 md:py-24">
        <div className="container">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center font-serif text-3xl text-foreground md:text-4xl"
          >
            Why agencies choose Care Fayre
          </motion.h2>
          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                variants={fadeUp}
                className="rounded-xl border border-border bg-background p-8 shadow-[var(--card-shadow)] transition-shadow hover:shadow-[var(--card-shadow-hover)]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
                  <f.icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="mt-5 font-serif text-xl text-foreground">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {f.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-border bg-primary py-16">
        <div className="container text-center">
          <h2 className="font-serif text-3xl text-primary-foreground md:text-4xl">
            Ready to grow your agency?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-primary-foreground/80">
            Join Care Fayre today — it's completely free. Start receiving care
            requests in your area within hours.
          </p>
          <div className="mt-8">
            <Button size="lg" variant="secondary" asChild>
              <Link to="/signup?role=agency">
                Register your agency today — it's free
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-12">
        <div className="container">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <span className="text-sm font-bold text-primary-foreground">C</span>
              </div>
              <span className="font-serif text-lg text-foreground">Care Fayre</span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-foreground transition-colors">Contact</a>
            </div>
            <p className="text-sm text-muted-foreground">© 2026 Care Fayre UK. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
