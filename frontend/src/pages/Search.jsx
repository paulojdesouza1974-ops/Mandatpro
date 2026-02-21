
import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/apiClient";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const TYPE_LABELS = {
  contact: "Kontakt",
  member: "Mitglied",
  motion: "Antrag",
  meeting: "Meeting",
  fraction_meeting: "Fraktion-Meeting",
  document: "Dokument",
  income: "Einnahme",
  expense: "Ausgabe",
  mandate_levy: "Mandatsträgerabgabe",
  template: "Vorlage",
  task: "Aufgabe",
};

export default function SearchPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");

  const searchQuery = useQuery({
    queryKey: ["global-search", query, user?.organization],
    queryFn: () => base44.search.global(query, user?.organization),
    enabled: query.trim().length > 1 && !!user?.organization,
  });

  const results = searchQuery.data?.results || [];

  const grouped = useMemo(() => {
    return results.reduce((acc, item) => {
      acc[item.type] = acc[item.type] || [];
      acc[item.type].push(item);
      return acc;
    }, {});
  }, [results]);

  return (
    <div className="max-w-5xl mx-auto space-y-6" data-testid="search-page">
      <div>
        <h1 className="text-2xl font-bold text-slate-900" data-testid="search-title">Globale Suche</h1>
        <p className="text-sm text-slate-500" data-testid="search-subtitle">Durchsucht Kontakte, Mitglieder, Anträge, Meetings, Dokumente und Buchhaltung.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Suchbegriff eingeben..."
            data-testid="search-input"
          />
        </CardContent>
      </Card>

      {query.trim().length <= 1 && (
        <div className="text-sm text-slate-500" data-testid="search-hint">
          Bitte mindestens 2 Zeichen eingeben.
        </div>
      )}

      {searchQuery.isLoading && (
        <div className="text-sm text-slate-500" data-testid="search-loading">Suche läuft...</div>
      )}

      {!searchQuery.isLoading && query.trim().length > 1 && results.length === 0 && (
        <div className="text-sm text-slate-500" data-testid="search-empty">Keine Ergebnisse gefunden.</div>
      )}

      <div className="space-y-5" data-testid="search-results">
        {Object.entries(grouped).map(([type, items]) => (
          <Card key={type} data-testid={`search-group-${type}`}>
            <CardContent className="pt-5">
              <div className="text-xs uppercase tracking-wide text-slate-400 mb-3">
                {TYPE_LABELS[type] || type}
              </div>
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2" data-testid={`search-item-${type}-${item.id}`}>
                    <div>
                      <div className="text-sm font-medium text-slate-800">{item.title || "Ohne Titel"}</div>
                      {item.subtitle && (
                        <div className="text-xs text-slate-500">{item.subtitle}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
