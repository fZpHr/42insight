"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Star, Activity, MousePointer, Bug } from "lucide-react";
import { TransparentBadge } from "@/components/TransparentBadge";
import { signIn } from "next-auth/react";
import { 
  motion, 
  useMotionValue, 
  useTransform, 
  MotionValue, 
  useSpring, 
  useAnimation 
} from "framer-motion";

const allFloatingStats = [
  { label: "Unique Users", value: "623", subtitle: "Last 30 days", color: "text-blue-400" },
  { label: "API Requests", value: "5.8M+", subtitle: "Total", color: "text-yellow-400" },
  { label: "Tokens Generated", value: "29.1K", subtitle: "Total", color: "text-purple-400" },
  { label: "Visitors", value: "906", trend: "+9%", subtitle: "Last 30 days", color: "text-blue-400" },
  { label: "Page Views", value: "4,357", trend: "+3%", subtitle: "Last 30 days", color: "text-purple-400" },
  { label: "Bounce Rate", value: "20%", trend: "-3%", subtitle: "Last 30 days", color: "text-green-400" },
  { label: "/dashboard", value: "72.5%", subtitle: "of visitors", color: "text-cyan-400" },
  { label: "/rankings", value: "54.6%", subtitle: "of visitors", color: "text-pink-400" },
  { label: "/trombinoscope", value: "30.7%", subtitle: "of visitors", color: "text-orange-400" },
  { label: "/rncp-simulator", value: "22.8%", subtitle: "of visitors", color: "text-yellow-400" },
  { label: "/exam-tracker", value: "22.6%", subtitle: "of visitors", color: "text-lime-400" },
  { label: "/peers", value: "17.5%", subtitle: "of visitors", color: "text-indigo-400" },
  { label: "/cluster-map", value: "16.7%", subtitle: "of visitors", color: "text-rose-400" },
  { label: "France", value: "98%", subtitle: "Last 30 days", color: "text-blue-500" },
  { label: "Desktop", value: "69%", subtitle: "Last 30 days", color: "text-violet-400" },
  { label: "Mobile", value: "31%", subtitle: "Last 30 days", color: "text-fuchsia-400" },
  { label: "GNU/Linux", value: "41%", subtitle: "Last 30 days", color: "text-emerald-400" },
  { label: "Android", value: "18%", subtitle: "Last 30 days", color: "text-green-400" },
  { label: "Windows", value: "17%", subtitle: "Last 30 days", color: "text-sky-400" },
  { label: "Commits", value: "264", subtitle: "Total", color: "text-cyan-400" },
  { label: "Additions", value: "97.6K", subtitle: "Total", color: "text-teal-400" },
  { label: "Suppressions", value: "71.2K", subtitle: "Total", color: "text-red-400" },
  { label: "Actions runs minutes", value: "3280 min", subtitle: "Last 30 days", color: "text-yellow-400" },
  { label: "Total job runs", value: "546", subtitle: "Last 30 days", color: "text-purple-400" },
  { label: "Avg job run time", value: "5.18 min", subtitle: "Last 30 days", color: "text-pink-400" },
];

const useWrapPosition = (
  initialPos: number, 
  cameraValue: MotionValue<number>, 
  parallaxFactor: number
) => {
  return useTransform(cameraValue, (v) => {
    const pos = initialPos + (v * parallaxFactor);
    return ((pos % 100) + 100) % 100; 
  });
};

const ShootingStarItem = ({ delay }: { delay: number }) => {
  const controls = useAnimation();

  useEffect(() => {
    let isMounted = true;

    const sequence = async () => {
      await new Promise(r => setTimeout(r, delay * 2000 + Math.random() * 2000));

      while (isMounted) {
        const isVerticalStart = Math.random() > 0.5;
        
        let startX, startY, endX, endY;

        if (isVerticalStart) {
          startX = Math.random() * 120 - 10;
          startY = -10;
          
          endX = Math.random() * 120 - 10;
          endY = 120;
        } else {
          const fromLeft = Math.random() > 0.5;
          
          startX = fromLeft ? -10 : 110;
          startY = Math.random() * 80; 
          
          endX = fromLeft ? 110 : -10;
          endY = Math.random() * 100 + 20; 
        }
        const angle = Math.atan2(endY - startY, (endX - startX) * 1.7) * (180 / Math.PI);

        if (!isMounted) break;
        await controls.set({
          left: `${startX}%`,
          top: `${startY}%`,
          rotate: angle, 
          opacity: 0,
          scale: 0.5,
          width: Math.random() * 100 + 50 + "px",
        });

        const duration = Math.random() * 0.7 + 0.8;
        
        
        controls.start({
          left: `${endX}%`,
          top: `${endY}%`,
          opacity: [0, 1, 0], 
          scale: [1, 1.2, 0.5],
          transition: { duration: duration, ease: "easeIn" }
        });

        await new Promise(r => setTimeout(r, duration * 1000));

        const waitTime = Math.random() * 10000 + 5000;
        await new Promise(r => setTimeout(r, waitTime));
      }
    };

    sequence();
    return () => { isMounted = false; };
  }, [delay, controls]);

  return (
    <motion.div
      className="absolute z-0 pointer-events-none"
      animate={controls}
      style={{
        height: "2px", 
        background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,1) 100%)",
        boxShadow: "0 0 15px 1px rgba(255, 255, 255, 0.5)",
        transformOrigin: "left center"
      }}
    />
  );
};

const StarItem = ({ data, cameraX, cameraY }: { data: any, cameraX: MotionValue, cameraY: MotionValue }) => {
  const x = useWrapPosition(data.x, cameraX, 0.05);
  const y = useWrapPosition(data.y, cameraY, 0.05);

  return (
    <motion.div
      className="absolute rounded-full bg-white shadow-[0_0_2px_rgba(255,255,255,0.8)]"
      style={{
        left: useTransform(x, v => `${v}%`),
        top: useTransform(y, v => `${v}%`),
        width: data.size,
        height: data.size,
      }}
      animate={{
        opacity: [data.opacity, 1, data.opacity],
        scale: [1, 1.2, 1],
      }}
      transition={{
        duration: data.duration,
        repeat: Infinity,
        delay: data.delay,
        ease: "easeInOut",
      }}
    />
  );
};

const BlackHole = ({ data, cameraX, cameraY }: { data: any, cameraX: MotionValue, cameraY: MotionValue }) => {
  const x = useWrapPosition(data.x, cameraX, 0.02);
  const y = useWrapPosition(data.y, cameraY, 0.02);

  return (
    <motion.div
      className="absolute flex items-center justify-center pointer-events-none"
      style={{
        left: useTransform(x, v => `${v}%`),
        top: useTransform(y, v => `${v}%`),
        width: 100, 
        height: 100,
      }}
    >
      <motion.div 
        className="absolute w-24 h-24 rounded-full border-[1px] border-white/10 blur-sm"
        animate={{ rotate: 360, scale: [1, 1.05, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        style={{
          boxShadow: "0 0 40px 10px rgba(100, 0, 150, 0.1), inset 0 0 20px rgba(0,0,0,1)"
        }}
      />
      <div className="absolute w-12 h-12 bg-black rounded-full shadow-[0_0_30px_rgba(0,0,0,1)] z-10" />
    </motion.div>
  );
};

const StatItem = ({ stat, cameraX, cameraY }: { stat: any, cameraX: MotionValue, cameraY: MotionValue }) => {
  const [pos, setPos] = useState({ 
    x: Math.random() * 90 + 5, 
    y: Math.random() * 80 + 10 
  });

  const controls = useAnimation();

  const x = useWrapPosition(pos.x, cameraX, 0.15);
  const y = useWrapPosition(pos.y, cameraY, 0.15);

  useEffect(() => {
    let isMounted = true;

    const sequence = async () => {
      await new Promise(r => setTimeout(r, Math.random() * 1000));

      while (isMounted) {
        setPos({
          x: Math.random() * 90 + 5,
          y: Math.random() * 80 + 10
        });

        if (!isMounted) break;
        await controls.start({
          opacity: 1,
          scale: 1,
          filter: "blur(0px)",
          y: 0,
          transition: { duration: 1.5, ease: "easeOut" }
        });

        const waitTime = Math.random() * 3000 + 6000;
        await new Promise(r => setTimeout(r, waitTime));
        if (!isMounted) break;

        await controls.start({
          opacity: 0,
          scale: 0.8,
          filter: "blur(8px)",
          y: -20,
          transition: { duration: 1, ease: "easeIn" }
        });

        await new Promise(r => setTimeout(r, Math.random() * 2000 + 500));
      }
    };

    sequence();

    return () => { isMounted = false; };
  }, [controls]);

  return (
    <motion.div
      className="absolute will-change-transform"
      style={{
        left: useTransform(x, v => `${v}%`),
        top: useTransform(y, v => `${v}%`),
        zIndex: 0 
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.5, filter: "blur(10px)", y: 20 }}
        animate={controls}
        className="relative"
      >
        <div className="bg-card/60 dark:bg-card/40 backdrop-blur-md border border-border/50 dark:border-white/10 rounded-lg px-3 py-2 shadow-2xl whitespace-nowrap hover:bg-card/80 dark:hover:bg-card/60 transition-colors duration-500 cursor-default">
          <div className="flex flex-col gap-0.5">
            <span className={`text-[10px] font-bold tracking-wider uppercase opacity-80 ${stat.color}`}>
              {stat.label}
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-bold text-foreground">{stat.value}</span>
              {stat.trend && (
                <span className={`text-[10px] font-semibold ${stat.trend.startsWith('+') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {stat.trend}
                </span>
              )}
            </div>
            {stat.subtitle && (
              <p className="text-[9px] text-muted-foreground">{stat.subtitle}</p>
            )}
          </div>
          <motion.div 
            className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${stat.color.replace('text-', 'bg-')} blur-[2px]`}
            animate={{ opacity: [0.2, 0.8, 0.2] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
};


const HeartExplosion = ({ isHovered }: { isHovered: boolean }) => {
  const hearts = useMemo(() => 
    Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 60,
      y: (Math.random() - 0.5) * 30 - 50,
      scale: Math.random() * 2.5 + 5,
      duration: Math.random() * 0.4 + 0.5,
      delay: Math.random() * 0.2,
    })), 
  []);

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {isHovered && hearts.map(heart => (
        <motion.div
          key={heart.id}
          initial={{ y: 0, x: 0, opacity: 1, scale: 0.5 }}
          animate={{ 
            y: heart.y, 
            x: heart.x, 
            opacity: 0, 
            scale: heart.scale 
          }}
          transition={{ 
            duration: heart.duration, 
            delay: heart.delay, 
            ease: "easeOut" 
          }}
          className="absolute text-red-400"
        >
          ♥
        </motion.div>
      ))}
    </div>
  );
};

export default function Home() {
  const [loader, setLoader] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isStarHovered, setIsStarHovered] = useState(false);
  const [showApiWarning, setShowApiWarning] = useState(false);

  const cameraX = useMotionValue(0);
  const cameraY = useMotionValue(0);
  
  const smoothX = useSpring(cameraX, { damping: 30, stiffness: 200, mass: 0.8 });
  const smoothY = useSpring(cameraY, { damping: 30, stiffness: 200, mass: 0.8 });

  const stars = useMemo(() => Array.from({ length: 80 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 0.5,
    opacity: Math.random() * 0.5 + 0.2,
    duration: 2 + Math.random() * 3,
    delay: Math.random() * 2
  })), []);
  
  const blackHoles = useMemo(() => Array.from({ length: 1 }, (_, i) => ({
    id: `bh-${i}`,
    x: Math.random() * 10000,
    y: Math.random() * 10000,
  })), []);

  const shootingStarsData = useMemo(() => Array.from({ length: 3 }, (_, i) => ({
    id: `ss-${i}`,
    initialDelay: Math.random() * 10 
  })), []);

  useEffect(() => {

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('error') === 'OAuthCallback') {
        setShowApiWarning(true);

        const timer = setTimeout(() => setShowApiWarning(false), 15000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  useEffect(() => {
    let animationFrameId: number;
    let velocity = { x: 0, y: 0 };
    let lastMouse = { x: 0, y: 0 };
    let isMouseDown = false;

    const handleMouseDown = (e: MouseEvent) => {
      isMouseDown = true;
      setIsDragging(true);
      lastMouse = { x: e.clientX, y: e.clientY };
      velocity = { x: 0, y: 0 };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isMouseDown) return;
      const deltaX = e.clientX - lastMouse.x;
      const deltaY = e.clientY - lastMouse.y;
      const sensitivity = 0.2;
      cameraX.set(cameraX.get() + deltaX * sensitivity);
      cameraY.set(cameraY.get() + deltaY * sensitivity);
      velocity = { x: deltaX * sensitivity, y: deltaY * sensitivity };
      lastMouse = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isMouseDown = false;
      setIsDragging(false);
    };

    const loop = () => {
      if (!isMouseDown) {
        velocity.x *= 0.95;
        velocity.y *= 0.95;
        if (Math.abs(velocity.x) > 0.01 || Math.abs(velocity.y) > 0.01) {
          cameraX.set(cameraX.get() + velocity.x);
          cameraY.set(cameraY.get() + velocity.y);
        }
      }
      animationFrameId = requestAnimationFrame(loop);
    };

    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    loop();

    return () => {
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      cancelAnimationFrame(animationFrameId);
    };
  }, [cameraX, cameraY]);

  const handleLogin = async () => {
    setLoader(true);
    document.body.style.cursor = "wait";
    
    const warningTimer = setTimeout(() => {
      setShowApiWarning(true);
    }, 5000);
    
    await new Promise((resolve) => setTimeout(resolve, 100));
    
    const urlParams = new URLSearchParams(window.location.search);
    const callbackUrl = urlParams.get('callbackUrl') || `${window.location.origin}/dashboard`;
    
    signIn("42-school", { callbackUrl });
    
    return () => clearTimeout(warningTimer);
  };

  return (
    <div 
      ref={containerRef} 
      className={`relative min-h-screen overflow-hidden bg-[#0a0a0f] text-foreground select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900/50 via-[#050505] to-black pointer-events-none" />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
         <motion.div
          className="absolute w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] rounded-full blur-[120px] opacity-20"
          style={{ 
            background: 'radial-gradient(circle, rgba(60, 50, 255, 0.4), transparent 70%)',
            top: '50%', left: '50%',
            x: '-50%', y: '-50%'
          }}
          animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute w-[60vw] h-[60vw] max-w-[600px] max-h-[600px] rounded-full blur-[100px] opacity-15"
          style={{ background: 'radial-gradient(circle, rgba(180, 50, 255, 0.4), transparent 70%)' }}
          animate={{ x: [0, 100, -100, 0], y: [0, -100, 100, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {blackHoles.map((bh) => (
          <BlackHole key={bh.id} data={bh} cameraX={smoothX} cameraY={smoothY} />
        ))}
      </div>

      {/* --- LAYER DES ÉTOILES STATIQUES --- */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {stars.map((star) => (
          <StarItem key={star.id} data={star} cameraX={smoothX} cameraY={smoothY} />
        ))}
      </div>

      {/* --- NOUVELLE LAYER : ÉTOILES FILANTES --- */}
      {/* Elles sont indépendantes du mouvement de la caméra (parallax) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {shootingStarsData.map((ss) => (
          <ShootingStarItem key={ss.id} delay={ss.initialDelay} />
        ))}
      </div>

      {/* --- STATS SECTION --- */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 hidden lg:block">
        {allFloatingStats.map((stat, index) => (
          <StatItem 
            key={index}
            stat={stat}
            cameraX={smoothX}
            cameraY={smoothY}
          />
        ))}
      </div>

      {!showApiWarning && (
        <motion.div
          className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ duration: 4, delay: 1, times: [0, 0.2, 0.8, 1] }}
        >
          <div className="bg-black/50 backdrop-blur-md border border-white/10 rounded-full px-4 py-1.5 shadow-xl">
            <p className="text-[10px] text-muted-foreground flex items-center gap-2 uppercase tracking-widest">
              <MousePointer className="h-3 w-3" />
              Drag Space
            </p>
          </div>
        </motion.div>
      )}

      {showApiWarning && (
        <motion.div
          className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-auto max-w-md"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <div className="bg-yellow-500/10 backdrop-blur-md border border-yellow-500/30 rounded-lg px-4 py-3 shadow-xl">
              <div className="flex items-start gap-3">
              <Activity className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-200 mb-1">42 API Rate Limit</p>
                <p className="text-xs text-yellow-100/80 leading-relaxed">
                  The 42 API has a rate limit of 2 requests per second. We&apos;re managing requests to stay within this limit. The page may take a few moments to load completely.
                </p>
              </div>
              <button
                onClick={() => setShowApiWarning(false)}
                className="text-yellow-400/60 hover:text-yellow-400 transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>
        </motion.div>
      )}

      <div className="relative z-10 grid min-h-dvh grid-rows-[1fr_auto] items-center justify-items-center p-8 pb-12 gap-12 sm:p-20 sm:pb-20 sm:gap-16">
        <main className="flex flex-col gap-8 row-start-1 items-center relative w-full max-w-2xl">
          <motion.div 
            className="text-center space-y-6 relative z-10"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          >
            <motion.div 
              className="inline-block relative"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              <h1 className="text-6xl sm:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/40 drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                42 Insight
              </h1>
              <div className="absolute -inset-10 bg-blue-500/20 blur-3xl rounded-full -z-10 opacity-50" />
            </motion.div>

              <div className="flex flex-row items-center justify-center gap-2 text-lg text-muted-foreground">
                <TransparentBadge
                  text="🌐 One for All"
                  bgColor="bg-blue-500/10"
                  textColor="text-blue-300"
                />
                <span className="text-sm">Student Hub</span>
              </div>
          </motion.div>

          <motion.div 
            className="flex flex-col items-center gap-6 w-full max-w-xs sm:max-w-sm relative z-10"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          >
            <motion.div className="w-full" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={handleLogin}
                className="w-full h-12 text-base font-medium bg-white text-black hover:bg-white/90 shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] transition-all duration-300 relative overflow-hidden group"
                disabled={loader}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loader ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {loader ? "Connecting..." : "Connect with Intra"}
                </span>
              </Button>
            </motion.div>
            
            <div className="flex flex-wrap gap-2 justify-center w-full">
               {[
                 { icon: Star, text: "Star", href: "https://github.com/fzphr/42insight", color: "text-yellow-400" },
                 { icon: Bug, text: "Issues", href: "https://github.com/fzphr/42insight/issues", color: "text-red-400" },
                 { icon: Activity, text: "Status", href: "https://monitor.bapasqui.duckdns.org/status/42insight", color: "text-green-400" }
               ].map((item, idx) => (
                 <motion.a
                   key={idx}
                   href={item.href}
                   target="_blank"
                   whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.1)" }}
                   whileTap={{ scale: 0.95 }}
                   onHoverStart={() => item.text === 'Star' && setIsStarHovered(true)}
                   onHoverEnd={() => item.text === 'Star' && setIsStarHovered(false)}
                   className="relative flex-1 min-w-[80px] flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl border border-white/5 bg-white/5 backdrop-blur-sm transition-colors text-xs text-muted-foreground hover:text-white"
                 >
                   {/* Affiche l'explosion uniquement pour le bouton "Star" */}
                   {item.text === 'Star' && <HeartExplosion isHovered={isStarHovered} />}
                   <item.icon className={`h-4 w-4 ${item.color}`} />
                   <span>{item.text}</span>
                 </motion.a>
               ))}
            </div>
          </motion.div>
        </main>

        <footer className="row-start-2 flex gap-6 flex-wrap items-center justify-center z-10">
          <motion.p 
            className="text-[10px] uppercase tracking-widest text-muted-foreground/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            Created by{' '}
            <a 
              href="https://github.com/fzphr" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-white/80 hover:text-white transition-colors"
            >
              Zeph
            </a>{' '}
            &{' '}
            <a 
              href="https://github.com/Haletran" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-white/80 hover:text-white transition-colors"
            >
              Haletran
            </a>
          </motion.p>
        </footer>
      </div>
    </div>
  );
}