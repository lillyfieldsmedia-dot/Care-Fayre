import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { Shield, Users, CreditCard, Star, ArrowRight, Heart, Clock, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.15, duration: 0.5, ease: "easeOut" as const } }),
};

const steps = [
  { icon: Heart, title: "Post Your Needs", desc: "Describe the care you need, your location, and schedule. It takes under 2 minutes." },
  { icon: Users, title: "Agencies Bid", desc: "CQC-rated agencies near you compete with their best hourly rates." },
  { icon: CheckCircle, title: "You Choose & Pay", desc: "Compare ratings, prices and reviews. Accept the best bid and pay securely." },
];

const trustItems = [
  { icon: Shield, label: "CQC Verified", desc: "Every agency's CQC rating is checked and displayed" },
  { icon: CreditCard, label: "Secure Payments", desc: "All payments processed securely with escrow protection" },
  { icon: Clock, label: "72hr Bidding", desc: "Competitive bids ensure you get the best rate" },
  { icon: Star, label: "Transparent", desc: "See real ratings, real prices, no hidden fees" },
];

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[image:var(--hero-gradient)] opacity-[0.03]" />
        <div className="container relative py-20 md:py-32">
          <motion.div className="mx-auto max-w-3xl text-center" initial="hidden" animate="visible">
            <motion.h1 variants={fadeUp} custom={0} className="font-serif text-4xl leading-tight md:text-6xl md:leading-tight text-foreground">
              Trusted Home Care,{" "}
              <span className="text-gradient-primary">Chosen by You</span>
            </motion.h1>
            <motion.p variants={fadeUp} custom={1} className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
              Post your care needs. Receive competitive bids from CQC-rated agencies. Choose the best — and pay securely.
            </motion.p>
            <motion.div variants={fadeUp} custom={2} className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" variant="hero" asChild>
                <Link to="/signup?role=customer">I Need Care <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="hero-outline" asChild>
                <Link to="/signup?role=agency">I'm a Care Agency</Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-border bg-card py-20">
        <div className="container">
          <motion.h2 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center font-serif text-3xl text-foreground md:text-4xl">
            How It Works
          </motion.h2>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                variants={fadeUp}
                className="relative rounded-xl border border-border bg-background p-8 text-center shadow-[var(--card-shadow)] transition-shadow hover:shadow-[var(--card-shadow-hover)]"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <step.icon className="h-7 w-7 text-primary" />
                </div>
                <span className="mt-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Step {i + 1}</span>
                <h3 className="mt-3 font-serif text-xl text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Signals */}
      <section className="border-t border-border py-20">
        <div className="container">
          <motion.h2 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center font-serif text-3xl text-foreground md:text-4xl">
            Built on Trust
          </motion.h2>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {trustItems.map((item, i) => (
              <motion.div
                key={item.label}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                variants={fadeUp}
                className="flex flex-col items-center rounded-xl border border-border bg-card p-6 text-center"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
                  <item.icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="mt-4 font-semibold text-foreground">{item.label}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-primary py-16">
        <div className="container text-center">
          <h2 className="font-serif text-3xl text-primary-foreground md:text-4xl">Ready to find the right care?</h2>
          <p className="mx-auto mt-4 max-w-md text-primary-foreground/80">Join hundreds of families who've found trusted, affordable home care through CareMatch.</p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" variant="secondary" asChild>
              <Link to="/signup?role=customer">Find Care Now</Link>
            </Button>
            <Button size="lg" variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" asChild>
              <Link to="/signup?role=agency">Register Your Agency</Link>
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
              <span className="font-serif text-lg text-foreground">CareMatch</span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-foreground transition-colors">Contact</a>
            </div>
            <p className="text-sm text-muted-foreground">© 2026 CareMatch UK. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
