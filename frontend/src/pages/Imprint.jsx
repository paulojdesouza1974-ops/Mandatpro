import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const OWNER = {
  name: "Paulo Jose De Souza",
  addressLines: ["Nettergasse 9", "41539 Dormagen"],
  email: "paulo@dshhome.de",
  phone: "01747436594",
};

export default function ImprintPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="imprint-page">
      <div>
        <h1 className="text-3xl font-bold text-slate-900" data-testid="imprint-title">Impressum</h1>
        <p className="text-slate-500 mt-1" data-testid="imprint-subtitle">Angaben gemäß § 5 TMG</p>
      </div>

      <Card data-testid="imprint-operator-card">
        <CardHeader>
          <CardTitle>Betreiber der Anwendung</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-slate-700">
          <p className="font-semibold" data-testid="imprint-operator-name">{OWNER.name}</p>
          <div className="space-y-1" data-testid="imprint-operator-address">
            {OWNER.addressLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card data-testid="imprint-contact-card">
        <CardHeader>
          <CardTitle>Kontakt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-slate-700">
          <p data-testid="imprint-contact-email">E-Mail: {OWNER.email}</p>
          <p data-testid="imprint-contact-phone">Telefon: {OWNER.phone}</p>
        </CardContent>
      </Card>

      <Card data-testid="imprint-responsible-card">
        <CardHeader>
          <CardTitle>Verantwortlich für den Inhalt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-slate-700">
          <p data-testid="imprint-responsible-name">{OWNER.name}</p>
          <p className="text-sm text-slate-600">(gemäß § 55 Abs. 2 RStV)</p>
        </CardContent>
      </Card>

      <Card data-testid="imprint-register-card">
        <CardHeader>
          <CardTitle>Registereintrag & USt-IdNr.</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-slate-700">
          <p data-testid="imprint-register-info">Derzeit kein Handelsregistereintrag.</p>
          <p data-testid="imprint-vat-info">USt-IdNr. wird nachgereicht, sobald vorhanden.</p>
        </CardContent>
      </Card>

      <Card data-testid="imprint-liability-card">
        <CardHeader>
          <CardTitle>Haftungsausschluss</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-slate-700">
          <div>
            <p className="font-medium">Haftung für Inhalte</p>
            <p className="text-sm mt-1">
              Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach den
              allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch
              nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen.
            </p>
          </div>
          <div>
            <p className="font-medium">Haftung für Links</p>
            <p className="text-sm mt-1">
              Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss
              haben. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der
              Seiten verantwortlich.
            </p>
          </div>
          <div>
            <p className="font-medium">Urheberrecht</p>
            <p className="text-sm mt-1">
              Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem
              deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung
              außerhalb der Grenzen des Urheberrechts bedürfen der schriftlichen Zustimmung des jeweiligen Autors
              bzw. Erstellers.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="imprint-copyright-card">
        <CardHeader>
          <CardTitle>Copyright</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-slate-700">
          <p data-testid="imprint-copyright-text">© {new Date().getFullYear()} {OWNER.name}. Alle Rechte vorbehalten.</p>
        </CardContent>
      </Card>

      <div className="text-sm text-slate-500 pt-4" data-testid="imprint-last-updated">Stand: Februar 2026</div>
    </div>
  );
}
