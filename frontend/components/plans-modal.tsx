"use client";

import React, { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import * as PricingCard from "@/components/ui/pricing-card";
import ReceiptPrinter, { type ReceiptPrinterHandle } from "@/components/ui/receipt-printer";
import {
  CheckCircle2,
  XCircleIcon,
  Users,
  Sparkles,
  Zap,
  Shield,
  X,
  ArrowRight,
  RotateCcw,
} from "lucide-react";

interface PlanItem {
  id: string;
  name: string;
  badge: string;
  price: string;
  originalPrice: string;
  period: string;
  buttonText: string;
  popular?: boolean;
  buttonGradient?: string;
  features: string[];
  lockedFeatures: string[];
}

const PLANS: PlanItem[] = [
  {
    id: "starter",
    name: "Starter",
    badge: "For Individuals",
    price: "$10",
    originalPrice: "$12",
    period: "/ month",
    buttonText: "Get Started",
    buttonGradient: "from-orange-500 to-orange-600 shadow-[0_10px_25px_rgba(255,115,0,0.3)]",
    features: [
      "Up to 3 projects",
      "Basic templates",
      "Community support",
      "1GB storage",
    ],
    lockedFeatures: [
      "Unlimited projects",
      "Premium templates",
      "Priority support",
    ],
  },
  {
    id: "pro",
    name: "Pro Quant",
    badge: "Most Popular",
    price: "$29",
    originalPrice: "$39",
    period: "/ month",
    buttonText: "Upgrade to Pro",
    popular: true,
    buttonGradient: "from-emerald-500 to-teal-600 shadow-[0_10px_25px_rgba(16,185,129,0.3)]",
    features: [
      "Unlimited projects & models",
      "Harmonic QR/QS support & resistance",
      "True Value equilibrium scanner",
      "Real-time zero-latency NSE feed",
      "Priority quant support",
    ],
    lockedFeatures: [
      "Dedicated quant engineer",
      "Colocated FIX API access",
    ],
  },
  {
    id: "institutional",
    name: "Enterprise",
    badge: "For Desks & Funds",
    price: "$99",
    originalPrice: "$129",
    period: "/ month",
    buttonText: "Get Enterprise",
    buttonGradient: "from-blue-500 to-indigo-600 shadow-[0_10px_25px_rgba(59,130,246,0.3)]",
    features: [
      "Everything in Pro Quant",
      "Institutional order-flow clustering",
      "Custom algorithmic execution webhooks",
      "Direct broker multi-account router",
      "Dedicated quant engineer & 24/7 SLA",
    ],
    lockedFeatures: [],
  },
];

interface PlansModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PlansModal({ isOpen, onClose }: PlansModalProps) {
  const router = useRouter();
  const printerRef = useRef<ReceiptPrinterHandle>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanItem | null>(null);
  const [viewState, setViewState] = useState<"plans" | "receipt">("plans");
  const [orderNumber, setOrderNumber] = useState("8421");
  const [isTorn, setIsTorn] = useState(false);

  // Generate random order number on selection
  const handleSelectPlan = (plan: PlanItem) => {
    setSelectedPlan(plan);
    const randNum = Math.floor(1000 + Math.random() * 9000).toString();
    setOrderNumber(randNum);
    setIsTorn(false);
    setViewState("receipt");
  };

  // Trigger printer automatically when entering receipt view
  useEffect(() => {
    if (viewState === "receipt") {
      const timer = setTimeout(() => {
        printerRef.current?.open();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [viewState]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (viewState === "receipt") {
          setViewState("plans");
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, viewState, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto backdrop-blur-2xl bg-black/85 animate-in fade-in duration-300">
      {/* Subtle dotted grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.09) 0.8px, transparent 0.8px)",
          backgroundSize: "14px 14px",
          maskImage:
            "radial-gradient( circle at 50% 10%, rgba(0,0,0,1), rgba(0,0,0,0.2) 40%, rgba(0,0,0,0) 70% )",
        }}
      />

      {/* Radial spotlight */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -top-1/2 left-1/2 h-[120vmin] w-[120vmin] -translate-x-1/2 rounded-full",
          "bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.08),transparent_50%)]",
          "blur-[40px]"
        )}
      />

      {/* Top action bar: Quick Enter Terminal + Close button */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50 flex items-center gap-2.5">
        {viewState === "receipt" && (
          <Button
            onClick={() => {
              onClose();
              router.push("/terminal");
            }}
            className="flex items-center gap-1.5 text-xs py-1.5 px-3.5 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-medium shadow-md shadow-orange-500/20 hover:from-orange-400 hover:to-orange-500 cursor-pointer"
          >
            <span>Enter Terminal</span>
            <ArrowRight className="w-3 h-3" />
          </Button>
        )}
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="p-2 sm:p-2.5 rounded-full bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>

      {/* View 1: Plans Selection */}
      {viewState === "plans" && (
        <div className="relative z-10 w-full max-w-6xl my-auto py-8 flex flex-col items-center">
          {/* Header */}
          <div className="text-center max-w-2xl mb-10 px-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/15 bg-white/[0.05] text-[#b9becf] text-xs font-mono tracking-wider mb-4 backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-orange-400" />
              <span>VOLTREX QUANTITATIVE TIERS</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-white">
              Institutional Plans & Pricing
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[#9ca3af] leading-relaxed">
              Transparent tiering for retail traders, independent quants, and proprietary trading desks. Cancel or change at any time.
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full px-2 sm:px-4 items-stretch justify-center">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={cn(
                  "relative flex flex-col items-center transition-all duration-300 hover:scale-[1.02]",
                  plan.popular && "scale-[1.02]"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 z-30 px-3 py-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-black text-[11px] font-bold tracking-wide uppercase shadow-lg shadow-emerald-500/20">
                    Recommended
                  </div>
                )}

                <PricingCard.Card className="w-full flex flex-col justify-between h-full bg-[#0d131b]/95 border-white/15 hover:border-white/30 transition-all">
                  <PricingCard.Header>
                    <PricingCard.Plan>
                      <PricingCard.PlanName>
                        {plan.id === "starter" && <Users aria-hidden="true" />}
                        {plan.id === "pro" && <Zap aria-hidden="true" className="text-emerald-400" />}
                        {plan.id === "institutional" && <Shield aria-hidden="true" className="text-blue-400" />}
                        <span className="text-[#eef3f8] font-semibold">{plan.name}</span>
                      </PricingCard.PlanName>
                      <PricingCard.Badge>{plan.badge}</PricingCard.Badge>
                    </PricingCard.Plan>

                    <PricingCard.Price>
                      <PricingCard.MainPrice>{plan.price}</PricingCard.MainPrice>
                      <PricingCard.Period>{plan.period}</PricingCard.Period>
                      <PricingCard.OriginalPrice className="ml-auto">
                        {plan.originalPrice}
                      </PricingCard.OriginalPrice>
                    </PricingCard.Price>

                    <Button
                      variant="custom"
                      className={cn(
                        "w-full font-semibold text-white cursor-pointer active:scale-95 transition-transform relative z-30 shadow-lg py-2.5 rounded-xl",
                        `bg-gradient-to-b ${plan.buttonGradient}`
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectPlan(plan);
                      }}
                    >
                      {plan.buttonText}
                    </Button>
                  </PricingCard.Header>

                  <PricingCard.Body className="flex-1 flex flex-col justify-between">
                    <PricingCard.List>
                      {plan.features.map((item, idx) => (
                        <PricingCard.ListItem key={idx}>
                          <span className="mt-0.5">
                            <CheckCircle2
                              className="h-4 w-4 text-emerald-400 shrink-0"
                              aria-hidden="true"
                            />
                          </span>
                          <span className="text-[#eef3f8]/90 text-xs sm:text-sm">{item}</span>
                        </PricingCard.ListItem>
                      ))}
                    </PricingCard.List>

                    {plan.lockedFeatures.length > 0 && (
                      <div className="mt-4">
                        <PricingCard.Separator>Advanced features</PricingCard.Separator>
                        <PricingCard.List className="mt-3">
                          {plan.lockedFeatures.map((item, idx) => (
                            <PricingCard.ListItem key={idx} className="opacity-55">
                              <span className="mt-0.5">
                                <XCircleIcon
                                  className="text-red-400/80 h-4 w-4 shrink-0"
                                  aria-hidden="true"
                                />
                              </span>
                              <span className="text-xs text-[#9ca3af]">{item}</span>
                            </PricingCard.ListItem>
                          ))}
                        </PricingCard.List>
                      </div>
                    )}
                  </PricingCard.Body>
                </PricingCard.Card>
              </div>
            ))}
          </div>

          {/* Money Back Guarantee Banner */}
          <div className="mt-10 text-center text-xs text-[#8e94a8] font-mono flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            14-Day Institutional Money Back Guarantee &middot; Instant API Provisioning &middot; Zero Hardware Locks
          </div>
        </div>
      )}

      {/* View 2: Receipt Generator */}
      {viewState === "receipt" && selectedPlan && (
        <div className="relative z-10 w-full max-w-xl my-auto py-2 sm:py-3 flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
          {/* Header banner */}
          <div className="text-center mb-1 px-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-[11px] font-mono mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>TRANSACTION CONFIRMED</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
              Your Printed Receipt is Ready
            </h3>
            <p className="mt-0.5 text-xs text-[#9ca3af]">
              Grab and pull the receipt down or sideways to tear it away!
            </p>
          </div>

          {/* Receipt Printer Component */}
          <div className="w-full flex justify-center scale-[0.88] sm:scale-95 md:scale-100 origin-top">
            <ReceiptPrinter
              ref={printerRef}
              brandLabel="VOLTREX"
              itemLabel={`Voltrex ${selectedPlan.name}`}
              amount={`${selectedPlan.price}.00`}
              orderLabel={`voltrex.trade · Order #${orderNumber}`}
              onTearComplete={() => {
                setIsTorn(true);
              }}
            />
          </div>

          {/* Action buttons under printer */}
          <div className="mt-1 sm:mt-2 flex flex-wrap items-center justify-center gap-2.5 w-full max-w-md px-4 relative z-40">
            <Button
              variant="outline"
              onClick={() => {
                printerRef.current?.print();
                setIsTorn(false);
              }}
              className="flex items-center gap-1.5 text-xs py-2 px-3.5 rounded-xl border-white/20 hover:bg-white/10 text-white cursor-pointer bg-white/5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Print Again</span>
            </Button>

            <Button
              variant="ghost"
              onClick={() => setViewState("plans")}
              className="text-xs py-2 px-3.5 rounded-xl text-white/70 hover:text-white cursor-pointer"
            >
              Change Plan
            </Button>

            <Button
              onClick={() => {
                onClose();
                router.push("/terminal");
              }}
              className="flex items-center gap-1.5 text-xs py-2 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold shadow-lg shadow-orange-500/25 hover:from-orange-400 hover:to-orange-500 cursor-pointer"
            >
              <span>Enter Terminal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PlansModal;
