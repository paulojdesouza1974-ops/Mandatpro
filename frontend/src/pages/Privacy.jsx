import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const OWNER = {
  name: "Paulo Jose De Souza",
  addressLines: ["Nettergasse 9", "41539 Dormagen"],
  email: "paulo@dshhome.de",
  phone: "01747436594",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="privacy-page">
      <div>
        <h1 className="text-3xl font-bold text-slate-900" data-testid="privacy-title">Datenschutzerklärung</h1>
        <p className="text-slate-500 mt-1" data-testid="privacy-subtitle">
          Informationen zum Umgang mit Ihren personenbezogenen Daten
        </p>
      </div>

      <Card data-testid="privacy-controller-card">
        <CardHeader>
          <CardTitle>1. Verantwortliche Stelle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-slate-700">
          <p className="font-semibold" data-testid="privacy-controller-name">{OWNER.name}</p>
          <div className="space-y-1" data-testid="privacy-controller-address">
            {OWNER.addressLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          <p data-testid="privacy-controller-contact">E-Mail: {OWNER.email} · Telefon: {OWNER.phone}</p>
        </CardContent>
      </Card>

      <Card data-testid="privacy-data-categories-card">
        <CardHeader>
          <CardTitle>2. Erhobene Daten</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-700">Bei der Nutzung von KommunalCRM können folgende Daten verarbeitet werden:</p>
          <ul className="list-disc list-inside space-y-2 text-slate-700" data-testid="privacy-data-list">
            <li>Stammdaten (Name, E-Mail-Adresse, Telefonnummer)</li>
            <li>Organisationszugehörigkeit und Rollen</li>
            <li>Kontaktdaten von Mitgliedern, Spendern, Mandatsträgern</li>
            <li>Inhalte aus Anträgen, Sitzungen, Aufgaben und Dokumenten</li>
            <li>System- und Protokolldaten (Login, Änderungen, Zeitstempel)</li>
          </ul>
        </CardContent>
      </Card>

      <Card data-testid="privacy-purpose-card">
        <CardHeader>
          <CardTitle>3. Zweck der Verarbeitung</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="list-disc list-inside space-y-2 text-slate-700" data-testid="privacy-purpose-list">
            <li>Bereitstellung der App-Funktionen (Anträge, Meetings, Buchhaltung, Dokumente)</li>
            <li>Organisation der politischen Arbeit innerhalb der jeweiligen Organisation</li>
            <li>Nutzerverwaltung, Authentifizierung und Zugriffsschutz</li>
            <li>Interne Kommunikation und Dokumentation</li>
          </ul>
        </CardContent>
      </Card>

      <Card data-testid="privacy-organization-card">
        <CardHeader>
          <CardTitle>4. Organisationen & Zugriffsberechtigungen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-slate-700">
          <p>
            Daten werden organisationsbezogen gespeichert. Mitglieder einer Organisation sehen die Daten,
            die innerhalb ihrer Organisation erfasst wurden, sofern sie berechtigt sind.
          </p>
          <p>
            Administratoren der Organisation können weitere Mitglieder einladen und Zugriffe verwalten.
          </p>
        </CardContent>
      </Card>

      <Card data-testid="privacy-ai-card">
        <CardHeader>
          <CardTitle>5. KI-gestützte Funktionen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-slate-700">
          <p>
            Für KI-Funktionen (z. B. Textentwürfe für Anträge oder Protokolle) werden Inhalte an den
            Dienstleister OpenAI (GPT-5.2) übertragen. Es werden nur die für die Funktion notwendigen
            Inhalte übermittelt.
          </p>
        </CardContent>
      </Card>

      <Card data-testid="privacy-legal-card">
        <CardHeader>
          <CardTitle>6. Rechtsgrundlage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="list-disc list-inside space-y-2 text-slate-700" data-testid="privacy-legal-list">
            <li>Einwilligung (Art. 6 Abs. 1 lit. a DSGVO)</li>
            <li>Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO)</li>
            <li>Berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO)</li>
          </ul>
        </CardContent>
      </Card>

      <Card data-testid="privacy-sharing-card">
        <CardHeader>
          <CardTitle>7. Weitergabe an Dritte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-slate-700">
          <p>Eine Weitergabe an Dritte erfolgt nur, wenn dies gesetzlich vorgeschrieben ist oder Sie eingewilligt haben.</p>
          <p>Es werden keine Tracking- oder Werbe-Cookies eingesetzt (Stand heute).</p>
        </CardContent>
      </Card>

      <Card data-testid="privacy-retention-card">
        <CardHeader>
          <CardTitle>8. Speicherdauer</CardTitle>
        </CardHeader>
        <CardContent className="text-slate-700">
          <p>Ihre Daten werden nur so lange gespeichert, wie es für die Zwecke der Verarbeitung erforderlich ist oder gesetzliche Aufbewahrungspflichten bestehen.</p>
        </CardContent>
      </Card>

      <Card data-testid="privacy-rights-card">
        <CardHeader>
          <CardTitle>9. Ihre Rechte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="list-disc list-inside space-y-2 text-slate-700" data-testid="privacy-rights-list">
            <li>Recht auf Auskunft (Art. 15 DSGVO)</li>
            <li>Recht auf Berichtigung (Art. 16 DSGVO)</li>
            <li>Recht auf Löschung (Art. 17 DSGVO)</li>
            <li>Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
            <li>Recht auf Datenübertragbarkeit (Art. 20 DSGVO)</li>
            <li>Widerspruchsrecht (Art. 21 DSGVO)</li>
            <li>Recht auf Widerruf der Einwilligung</li>
          </ul>
        </CardContent>
      </Card>

      <Card data-testid="privacy-contact-card">
        <CardHeader>
          <CardTitle>10. Kontakt Datenschutz</CardTitle>
        </CardHeader>
        <CardContent className="text-slate-700">
          <p>Bei Fragen zum Datenschutz kontaktieren Sie uns unter: {OWNER.email}</p>
        </CardContent>
      </Card>

      <div className="text-sm text-slate-500 pt-4" data-testid="privacy-last-updated">Stand: Februar 2026</div>
    </div>
  );
}
