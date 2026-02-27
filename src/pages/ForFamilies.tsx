import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import {
  Search,
  BarChart3,
  ShieldCheck,
  Handshake,
  Lock,
  BadgeCheck,
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
    icon: Search,
    title: "Find trusted, local care",
    desc: "Browse CQC-rated agencies near you and compare them side by side. Every agency on Care Fayre has been verified by our team.",
  },
  {
    icon: BarChart3,
    title: "Compare prices and quality",
    desc: "Agencies compete for your business, so you always get a fair rate. See real prices alongside CQC ratings and customer reviews.",
  },
  {
    icon: ShieldCheck,
    title: "Rate protection",
    desc: "Any annual rate increases are capped on our platform. No surprise large increases, ever. Your budget stays predictable.",
  },
  {
    icon: Handshake,
    title: "No commitment until you're ready",
    desc: "Care only begins after a face-to-face assessment. Either party can walk away with no charge — no pressure, no obligation.",
  },
  {
    icon: Lock,
    title: "Secure, automatic payments",
    desc: "No cash in hand. Payments are handled safely through Care Fayre, with full transparency on every transaction.",
  },
  {
    icon: BadgeCheck,
    title: "All agencies verified",
    desc: "Every agency on Care Fayre is CQC registered and verified by our team. Your loved ones are in safe hands.",
  },
];

export default function ForFamilies() {
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
              className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary"
            >
              For families
            </motion.span>
            <motion.h1
              variants={fadeUp}
              custom={0.5}
              className="mt-6 font-serif text-4xl leading-tight md:text-6xl md:leading-tight text-foreground"
            >
              Find the right care,{" "}
              <span className="text-gradient-primary">at a fair price</span>
            </motion.h1>
            <motion.p
              variants={fadeUp}
              custom={1}
              className="mx-auto mt-6 max-w-2xl text-lg md:text-xl text-muted-foreground leading-relaxed"
            >
              Care Fayre puts you in control. Post your care needs, receive
              competitive bids from CQC-rated agencies, and choose the best fit
              for your family — with no obligation.
            </motion.p>
            <motion.div variants={fadeUp} custom={1.5} className="mt-10">
              <Button size="lg" variant="hero" asChild>
                <Link to="/signup?role=customer">
                  Post your care request — it's free{" "}
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
            Why families choose Care Fayre
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
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <f.icon className="h-6 w-6 text-primary" />
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
            Ready to find trusted care?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-primary-foreground/80">
            Join hundreds of families who've found quality, affordable home care
            through Care Fayre.
          </p>
          <div className="mt-8">
            <Button size="lg" variant="secondary" asChild>
              <Link to="/signup?role=customer">
                Post your care request — it's free
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
