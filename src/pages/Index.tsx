import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Scan, BookOpen, Zap, Eye, Volume2, Cpu, Hand, Type, Hash, GraduationCap, ArrowRight, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  { icon: Eye, title: "Real-Time Detection", desc: "MediaPipe AI detects hands at 30+ FPS with precision tracking", step: "01" },
  { icon: Cpu, title: "On-Device AI", desc: "Runs entirely in your browser — no server, no data leaves your device", step: "02" },
  { icon: Zap, title: "Instant Classification", desc: "21 hand landmarks analyzed per frame for accurate gesture matching", step: "03" },
  { icon: Volume2, title: "Voice Output", desc: "Speaks detected gestures aloud using Web Speech API or custom recordings", step: "04" },
];

const modes = [
  { path: "/detect", icon: Scan, title: "Gesture Detection", desc: "Detect your custom trained gestures in real-time", gradient: "from-primary/20 to-primary/5" },
  { path: "/alphabet", icon: Type, title: "Alphabet Mode", desc: "Learn & detect ASL letters A-Z to form words", gradient: "from-accent/20 to-accent/5" },
  { path: "/numbers", icon: Hash, title: "Numbers Mode", desc: "Train & detect number signs 0-9 to form numbers", gradient: "from-accent/15 to-primary/10" },
  { path: "/train", icon: GraduationCap, title: "Train Gestures", desc: "Teach the AI your own custom hand signs", gradient: "from-primary/15 to-accent/10" },
];

export default function Index() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero */}
      <section className="relative flex flex-1 items-center justify-center pt-16 overflow-hidden">
        <div className="gradient-hero absolute inset-0 pointer-events-none" />
        
        {/* Animated orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            className="absolute w-[500px] h-[500px] rounded-full bg-primary/8 blur-[100px]"
            style={{ left: "10%", top: "10%" }}
            animate={{ x: [0, 40, 0], y: [0, -30, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute w-[400px] h-[400px] rounded-full bg-accent/6 blur-[100px]"
            style={{ right: "5%", bottom: "10%" }}
            animate={{ x: [0, -30, 0], y: [0, 20, 0], scale: [1, 1.15, 1] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          />
        </div>

        <div className="container relative z-10 py-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            {/* Badge */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="mx-auto mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-5 py-2 text-sm text-primary"
            >
              <Star className="h-4 w-4 fill-primary/50" />
              AI-Powered Sign Language Translator
            </motion.div>

            {/* Logo icon */}
            <motion.div 
              className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/15 to-accent/10 shadow-2xl"
              animate={{ 
                boxShadow: [
                  "0 20px 60px -15px hsl(270 85% 65% / 0.2)",
                  "0 20px 80px -10px hsl(270 85% 65% / 0.35)",
                  "0 20px 60px -15px hsl(270 85% 65% / 0.2)",
                ],
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Hand className="h-12 w-12 text-primary" />
            </motion.div>

            <h1 className="text-6xl font-extrabold tracking-tight font-display sm:text-7xl lg:text-8xl">
              Sign<span className="text-gradient">Speak</span>
            </h1>
            <p className="mx-auto mt-6 max-w-lg text-lg text-muted-foreground leading-relaxed">
              Real-time sign language translation powered by AI.
              Show a gesture → get instant text & voice feedback.
            </p>
            <div className="mt-12 flex items-center justify-center gap-4 flex-wrap">
              <Link to="/detect">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 glow-primary text-base px-10 h-13 rounded-xl text-lg font-semibold">
                  <Scan className="mr-2 h-5 w-5" />
                  Start Detecting
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/train">
                <Button size="lg" variant="outline" className="border-border/60 text-base px-10 h-13 rounded-xl text-lg hover:border-primary/40 hover:bg-primary/5">
                  <GraduationCap className="mr-2 h-5 w-5" />
                  Train Gestures
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Modes Section */}
      <section className="border-t border-border/50 py-20">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center mb-14"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5 text-xs font-mono uppercase tracking-widest text-accent mb-4">
              <Sparkles className="h-3.5 w-3.5" />
              Modes
            </div>
            <h2 className="text-4xl font-bold font-display">
              Explore <span className="text-gradient">Modes</span>
            </h2>
            <p className="mt-3 text-muted-foreground">Choose your learning path</p>
          </motion.div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {modes.map((m, i) => (
              <Link key={m.path} to={m.path}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  whileHover={{ y: -6, scale: 1.02 }}
                  className={`group rounded-2xl border border-border/60 bg-gradient-to-br ${m.gradient} p-7 transition-all hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 cursor-pointer h-full`}
                >
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                    <m.icon className="h-7 w-7" />
                  </div>
                  <h3 className="font-bold font-display text-foreground text-xl">{m.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{m.desc}</p>
                  <div className="mt-5 flex items-center text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-0 group-hover:translate-x-1">
                    Open <ArrowRight className="ml-1.5 h-4 w-4" />
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border/50 bg-card/20 py-20">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-center mb-14"
          >
            <h2 className="text-4xl font-bold font-display">
              How It <span className="text-gradient">Works</span>
            </h2>
            <p className="mt-3 text-muted-foreground">Powered by cutting-edge browser AI</p>
          </motion.div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                className="group rounded-2xl border border-border/50 bg-card/50 p-7 hover:border-primary/20 hover:bg-card transition-all duration-300"
              >
                <div className="mb-2 text-xs font-mono text-primary/50">{f.step}</div>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent group-hover:bg-accent/20 transition-colors">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="font-bold font-display text-foreground text-lg">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/50 py-20">
        <div className="container text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mx-auto max-w-2xl"
          >
            <h2 className="text-4xl font-bold font-display">
              Ready to <span className="text-gradient">Communicate</span>?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-md mx-auto">
              Start by training a few gestures, then watch the AI recognize them instantly.
            </p>
            <div className="mt-10 flex justify-center gap-4 flex-wrap">
              <Link to="/gestures">
                <Button variant="outline" size="lg" className="border-border/60 h-13 px-10 rounded-xl text-lg hover:border-primary/40">
                  <BookOpen className="mr-2 h-5 w-5" />
                  View Gesture Library
                </Button>
              </Link>
              <Link to="/detect">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 glow-primary h-13 px-10 rounded-xl text-lg font-semibold">
                  <Scan className="mr-2 h-5 w-5" />
                  Launch Detection
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container text-center text-xs text-muted-foreground font-mono">
          SignSpeak — AI-powered sign language translator. All processing runs locally in your browser.
        </div>
      </footer>
    </div>
  );
}
