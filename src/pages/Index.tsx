import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { Shield, Users, ArrowRight, Heart, CheckCircle, Megaphone } from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.14, duration: 0.55, ease: "easeOut" as const },
  }),
};

const steps = [
  {
    icon: Heart,
    title: "Post your need",
    desc: "Families describe the care they need. Agencies browse requests in their area.",
  },
  {
    icon: Megaphone,
    title: "Agencies bid",
    desc: "CQC-registered agencies submit their hourly rate. Competition keeps prices fair.",
  },
  {
    icon: CheckCircle,
    title: "You choose",
    desc: "Compare agencies by price, CQC rating and reviews. Accept the best fit for you.",
  },
];

export default function Index() {
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
            <motion.h1
              variants={fadeUp}
              custom={0}
              className="font-serif text-4xl leading-tight md:text-6xl md:leading-tight text-foreground"
            >
              Quality home care,{" "}
              <span className="text-gradient-primary">at a fair price</span>
            </motion.h1>
            <motion.p
              variants={fadeUp}
              custom={1}
              className="mx-auto mt-6 max-w-2xl text-lg md:text-xl text-muted-foreground leading-relaxed"
            >
              Tell us what care you need. Local CQC-rated agencies bid for your
              business. You choose the best fit — no obligation, no hidden fees.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-border bg-card py-20">
        <div className="container">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center font-serif text-3xl text-foreground md:text-4xl"
          >
            How CareMatch works
          </motion.h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-muted-foreground">
            A simple process designed for both families and care agencies.
          </p>
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
                <span className="mt-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Step {i + 1}
                </span>
                <h3 className="mt-3 font-serif text-xl text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Two audience CTAs */}
      <section className="border-t border-border py-20 md:py-24">
        <div className="container">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center font-serif text-3xl text-foreground md:text-4xl"
          >
            Who are you?
          </motion.h2>
          <p className="mx-auto mt-4 max-w-lg text-center text-muted-foreground">
            CareMatch connects families with trusted care agencies. Choose your
            path to learn more.
          </p>

          <div className="mt-14 grid gap-8 md:grid-cols-2">
            {/* Families card */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={0}
              variants={fadeUp}
            >
              <Link
                to="/for-families"
                className="group block rounded-2xl border border-border bg-card p-10 text-center shadow-[var(--card-shadow)] transition-all duration-300 hover:shadow-[var(--card-shadow-lg)] hover:-translate-y-1"
              >
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 transition-colors group-hover:bg-primary/20">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <h3 className="mt-6 font-serif text-2xl text-foreground">
                  I'm looking for care
                </h3>
                <p className="mt-3 text-muted-foreground leading-relaxed">
                  Find trusted, CQC-rated agencies near you. Compare prices,
                  ratings and reviews — and only pay when you're happy.
                </p>
                <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-primary group-hover:gap-2 transition-all">
                  Learn more <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            </motion.div>

            {/* Agencies card */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={1}
              variants={fadeUp}
            >
              <Link
                to="/for-agencies"
                className="group block rounded-2xl border border-border bg-card p-10 text-center shadow-[var(--card-shadow)] transition-all duration-300 hover:shadow-[var(--card-shadow-lg)] hover:-translate-y-1"
              >
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 transition-colors group-hover:bg-accent/20">
                  <Shield className="h-8 w-8 text-accent" />
                </div>
                <h3 className="mt-6 font-serif text-2xl text-foreground">
                  I'm a care agency
                </h3>
                <p className="mt-3 text-muted-foreground leading-relaxed">
                  Grow your client base with zero upfront cost. Receive local
                  care requests and bid on your own terms.
                </p>
                <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-accent group-hover:gap-2 transition-all">
                  Learn more <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            </motion.div>
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
