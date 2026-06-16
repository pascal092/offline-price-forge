import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { v4 as uuid } from "uuid";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Save, Leaf, WifiOff } from "lucide-react";

import { UploadCard } from "@/components/pricing/UploadCard";
import { DisclaimerBanner } from "@/components/pricing/DisclaimerBanner";
import { ProjectForm, type ProjectInput } from "@/components/pricing/ProjectForm";
import { ResultBadge } from "@/components/pricing/ResultBadge";
import { ArticleLookup } from "@/components/pricing/ArticleLookup";
import { HistoryTable } from "@/components/pricing/HistoryTable";
import { CartCard } from "@/components/pricing/CartCard";
import { registerPWA } from "@/lib/pwa/register";
import { resolveTier } from "@/lib/pricing/tiers";
import {
  deleteProject,
  getAllArticles,
  getAllProjects,
  getCatalogMeta,
  saveProject,
} from "@/lib/db/idb";
import type { Article, CatalogMeta, CartItem, PriceListKey, Project } from "@/lib/pricing/types";
import { generateOfferPDF } from "@/lib/pdf/offer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ZinCo Projektpreis-Rechner — Offline PWA" },
      {
        name: "description",
        content:
          "Dynamische Projektkalkulation und Preislisten-Lookup für ZinCo GmbH. Voll offline-fähig auf Android-Tablets.",
      },
    ],
  }),
  component: HomePage,
});

const EMPTY_INPUT: ProjectInput = {
  kundenname: "",
  kundenkategorie: "",
  kundenart: "",
  klassifizierung: "",
  dachgroesse_m2: "",
  aufbaupreis_eur_m2: "",
};

function HomePage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [meta, setMeta] = useState<CatalogMeta | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [input, setInput] = useState<ProjectInput>(EMPTY_INPUT);
  const [online, setOnline] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    registerPWA();
    setOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  async function refresh() {
    const [a, m, p] = await Promise.all([getAllArticles(), getCatalogMeta(), getAllProjects()]);
    setArticles(a);
    setMeta(m);
    setProjects(p);
  }

  useEffect(() => {
    void refresh();
  }, []);

  const dach = parseFloat(input.dachgroesse_m2.replace(",", "."));
  const preis = parseFloat(input.aufbaupreis_eur_m2.replace(",", "."));
  const projektwert =
    Number.isFinite(dach) && Number.isFinite(preis) && dach > 0 && preis > 0 ? dach * preis : 0;
  const hasInputs = projektwert > 0;
  const tier = useMemo(() => resolveTier(projektwert), [projektwert]);

  async function handleSave() {
    if (!input.kundenname.trim()) {
      toast.error("Bitte Kundenname eingeben");
      return;
    }
    if (!hasInputs) {
      toast.error("Bitte Dachgröße und Aufbaupreis eingeben");
      return;
    }
    const project: Project = {
      id: uuid(),
      createdAt: Date.now(),
      kundenname: input.kundenname.trim(),
      kundenkategorie: input.kundenkategorie || "—",
      kundenart: input.kundenart || "—",
      klassifizierung: input.klassifizierung || "—",
      dachgroesse_m2: dach,
      aufbaupreis_eur_m2: preis,
      projektwert,
      tier: tier.tier,
      priceListColumn: tier.column,
      cartItems: cart.slice(),
    };
    await saveProject(project);
    toast.success("Projekt gespeichert", {
      description: `${project.kundenname} → Preisliste ${project.tier}`,
    });
    setInput(EMPTY_INPUT);
    setCart([]);
    await refresh();
  }

  async function handleDelete(id: string) {
    await deleteProject(id);
    toast.success("Projekt gelöscht");
    await refresh();
  }

  function handleAddToCart(article: Article, priceColumn: PriceListKey, price: number) {
    setCart((prev) => {
      const existing = prev.find((i) => i.artikel_nr === article.artikel_nr);
      if (existing) {
        return prev.map((i) =>
          i.artikel_nr === article.artikel_nr
            ? { ...i, quantity: i.quantity + 1, unitPrice: price, priceColumn }
            : i,
        );
      }
      return [
        ...prev,
        {
          artikel_nr: article.artikel_nr,
          bezeichnung_1: article.bezeichnung_1,
          bezeichnung_2: article.bezeichnung_2,
          me: article.me,
          priceColumn,
          unitPrice: price,
          quantity: 1,
        },
      ];
    });
    toast.success("Zum Warenkorb hinzugefügt", { description: article.bezeichnung_1 });
  }

  function handleChangeQty(artikel_nr: string, qty: number) {
    setCart((prev) =>
      prev.map((i) => (i.artikel_nr === artikel_nr ? { ...i, quantity: qty } : i)),
    );
  }

  function handleRemove(artikel_nr: string) {
    setCart((prev) => prev.filter((i) => i.artikel_nr !== artikel_nr));
  }

  function handleGeneratePDF() {
    if (!input.kundenname.trim() || !hasInputs) {
      toast.error("Bitte Kundendaten und Projektwerte ausfüllen");
      return;
    }
    if (cart.length === 0) {
      toast.error("Warenkorb ist leer");
      return;
    }
    generateOfferPDF(cart, {
      kundenname: input.kundenname.trim(),
      kundenkategorie: input.kundenkategorie || "—",
      kundenart: input.kundenart || "—",
      klassifizierung: input.klassifizierung || "—",
      dachgroesse_m2: dach,
      aufbaupreis_eur_m2: preis,
      projektwert,
      tier,
    });
    toast.success("PDF wird heruntergeladen");
  }

  function handleGeneratePDFFromProject(project: Project) {
    if (!project.cartItems || project.cartItems.length === 0) {
      toast.error("Keine Artikel im gespeicherten Projekt vorhanden");
      return;
    }
    generateOfferPDF(project.cartItems, {
      kundenname: project.kundenname,
      kundenkategorie: project.kundenkategorie,
      kundenart: project.kundenart,
      klassifizierung: project.klassifizierung,
      dachgroesse_m2: project.dachgroesse_m2,
      aufbaupreis_eur_m2: project.aufbaupreis_eur_m2,
      projektwert: project.projektwert,
      tier: {
        tier: project.tier,
        column: project.priceListColumn,
        label: `Projektwert ${project.projektwert.toLocaleString("de-DE")} €`,
      },
    });
    toast.success("PDF wird heruntergeladen");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/40">
      <Toaster richColors position="top-right" />

      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Leaf className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight tracking-tight">
                ZinCo Projektpreis-Rechner
              </h1>
              <p className="text-xs text-muted-foreground">
                Offline-Tool für Außendienst · Nürtingen
              </p>
            </div>
          </div>
          {!online && (
            <div className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
              <WifiOff className="h-3.5 w-3.5" />
              Offline-Modus
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <UploadCard meta={meta} onImported={refresh} />

        <DisclaimerBanner />

        <ProjectForm value={input} onChange={setInput} />

        <ResultBadge projektwert={projektwert} tier={tier} hasInputs={hasInputs} />

        <div className="flex justify-end">
          <Button
            size="lg"
            onClick={handleSave}
            disabled={!hasInputs || !input.kundenname.trim()}
            className="h-12 gap-2 px-6 text-base"
          >
            <Save className="h-5 w-5" />
            Projekt speichern
          </Button>
        </div>

        <ArticleLookup
          articles={articles}
          activeColumn={hasInputs ? tier.column : null}
          onAddToCart={handleAddToCart}
        />

        <CartCard
          items={cart}
          onChangeQuantity={handleChangeQty}
          onRemove={handleRemove}
          onClear={() => setCart([])}
          onGeneratePDF={handleGeneratePDF}
          canGenerate={hasInputs && !!input.kundenname.trim() && cart.length > 0}
        />

        <HistoryTable
          projects={projects}
          onDelete={handleDelete}
          onGeneratePDF={handleGeneratePDFFromProject}
        />

        <footer className="pb-8 pt-4 text-center text-xs text-muted-foreground">
          Alle Daten verbleiben lokal auf diesem Gerät · Keine Server-Verbindung erforderlich
        </footer>
      </main>
    </div>
  );
}
