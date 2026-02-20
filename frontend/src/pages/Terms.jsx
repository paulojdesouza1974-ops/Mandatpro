import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="terms-page">
      <div>
        <h1 className="text-3xl font-bold text-slate-900" data-testid="terms-title">Allgemeine Geschäftsbedingungen (AGB)</h1>
        <p className="text-slate-500 mt-1" data-testid="terms-subtitle">Geltungsbereich für die Nutzung von KommunalCRM</p>
      </div>

      <Card data-testid="terms-scope-card">
        <CardHeader>
          <CardTitle>1. Geltungsbereich</CardTitle>
        </CardHeader>
        <CardContent className="text-slate-700">
          <p>
            Diese AGB gelten für die Nutzung der Software-as-a-Service Plattform „KommunalCRM“.
            Abweichende Bedingungen der Nutzer finden keine Anwendung, sofern ihnen nicht ausdrücklich zugestimmt wurde.
          </p>
        </CardContent>
      </Card>

      <Card data-testid="terms-services-card">
        <CardHeader>
          <CardTitle>2. Leistungsumfang</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-slate-700">
          <p>
            KommunalCRM stellt Funktionen zur Organisation kommunalpolitischer Arbeit bereit (z. B. Anträge,
            Meetings, Mitgliederverwaltung, Dokumente, Buchhaltung).
          </p>
          <p>
            Der Funktionsumfang kann weiterentwickelt oder angepasst werden, sofern dies die Kernfunktionalität nicht wesentlich beeinträchtigt.
          </p>
        </CardContent>
      </Card>

      <Card data-testid="terms-account-card">
        <CardHeader>
          <CardTitle>3. Registrierung &amp; Zugang</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-slate-700">
          <p>
            Die Nutzung setzt ein Benutzerkonto voraus. Zugangsdaten sind vertraulich zu behandeln und vor dem Zugriff Dritter zu schützen.
          </p>
          <p>
            Nutzer sind verpflichtet, korrekte Angaben zu machen und Änderungen zeitnah zu aktualisieren.
          </p>
        </CardContent>
      </Card>

      <Card data-testid="terms-duties-card">
        <CardHeader>
          <CardTitle>4. Pflichten der Nutzer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-slate-700">
          <p>
            Nutzer dürfen die Plattform nicht missbräuchlich verwenden, insbesondere nicht für rechtswidrige Inhalte,
            unberechtigte Datenverarbeitung oder Angriffe auf die Systemsicherheit.
          </p>
          <p>
            Organisationen sind dafür verantwortlich, dass nur berechtigte Mitglieder Zugriff auf interne Daten erhalten.
          </p>
        </CardContent>
      </Card>

      <Card data-testid="terms-availability-card">
        <CardHeader>
          <CardTitle>5. Verfügbarkeit</CardTitle>
        </CardHeader>
        <CardContent className="text-slate-700">
          <p>
            Es besteht kein Anspruch auf jederzeitige Verfügbarkeit. Wartungsfenster und technische Störungen können zu Ausfällen führen.
          </p>
        </CardContent>
      </Card>

      <Card data-testid="terms-liability-card">
        <CardHeader>
          <CardTitle>6. Haftung</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-slate-700">
          <p>
            Wir haften uneingeschränkt bei Vorsatz und grober Fahrlässigkeit. Bei einfacher Fahrlässigkeit haften wir nur bei Verletzung
            wesentlicher Vertragspflichten (Kardinalpflichten) und begrenzt auf den typischerweise vorhersehbaren Schaden.
          </p>
          <p>
            Die Haftung für entgangenen Gewinn, mittelbare Schäden und Folgeschäden ist ausgeschlossen, soweit gesetzlich zulässig.
          </p>
        </CardContent>
      </Card>

      <Card data-testid="terms-termination-card">
        <CardHeader>
          <CardTitle>7. Laufzeit &amp; Kündigung</CardTitle>
        </CardHeader>
        <CardContent className="text-slate-700">
          <p>
            Die Nutzung kann jederzeit durch den Betreiber oder den Nutzer beendet werden. Bei Beendigung werden Daten gemäß der
            Datenschutzerklärung behandelt.
          </p>
        </CardContent>
      </Card>

      <Card data-testid="terms-data-card">
        <CardHeader>
          <CardTitle>8. Datenschutz</CardTitle>
        </CardHeader>
        <CardContent className="text-slate-700">
          <p>
            Es gilt die jeweils aktuelle Datenschutzerklärung. Nutzer sind verpflichtet, personenbezogene Daten nur im Rahmen der
            gesetzlichen Vorgaben zu verarbeiten.
          </p>
        </CardContent>
      </Card>

      <Card data-testid="terms-law-card">
        <CardHeader>
          <CardTitle>9. Schlussbestimmungen</CardTitle>
        </CardHeader>
        <CardContent className="text-slate-700">
          <p>
            Es gilt deutsches Recht. Sollten einzelne Bestimmungen unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.
          </p>
        </CardContent>
      </Card>

      <div className="text-sm text-slate-500 pt-4" data-testid="terms-last-updated">Stand: Februar 2026</div>
    </div>
  );
}
