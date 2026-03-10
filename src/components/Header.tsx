import { Link, useLocation } from "react-router-dom";
import { Hand, Scan, BookOpen, GraduationCap, Type, Hash } from "lucide-react";
import { motion } from "framer-motion";

const navItems = [
  { path: "/", label: "Home", icon: Hand },
  { path: "/detect", label: "Detect", icon: Scan },
  { path: "/gestures", label: "Gestures", icon: BookOpen },
  { path: "/train", label: "Train", icon: GraduationCap },
  { path: "/alphabet", label: "Alphabet", icon: Type },
  { path: "/numbers", label: "Numbers", icon: Hash },
];

export default function Header() {
  const location = useLocation();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/30">
            <Hand className="h-5 w-5 text-primary" />
          </div>
          <span className="text-lg font-bold tracking-tight">
            Sign<span className="text-gradient">Speak</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}>
                <motion.div
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary border border-primary/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </motion.div>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
