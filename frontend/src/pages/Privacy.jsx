import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Datenschutzerklärung</h1>
        <p className="text-slate-500 mt-1">
          Informationen zum Umgang mit Ihren personenbezogenen Daten
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1. Verantwortliche Stelle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-700">
            Verantwortlich für die Datenverarbeitung im Rahmen dieser Anwendung ist die jeweilige 
            Organisation, die das KommunalCRM nutzt.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Erhebung und Speicherung personenbezogener Daten</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-700">
            Bei der Nutzung von KommunalCRM werden folgende personenbezogene Daten erhoben und verarbeitet:
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-700">
            <li>Name und E-Mail-Adresse der Nutzer</li>
            <li>Organisationszugehörigkeit</li>
            <li>Kontaktdaten (Telefonnummer, Adresse)</li>
            <li>Politische Funktionen und Rollen</li>
            <li>Von Ihnen eingegebene Inhalte (Anträge, Termine, Kommunikationen, etc.)</li>
            <li>Nutzungsdaten und Protokolldaten</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3. Zweck der Datenverarbeitung</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-700">
            Die Verarbeitung Ihrer personenbezogenen Daten erfolgt zu folgenden Zwecken:
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-700">
            <li>Bereitstellung und Verwaltung der Anwendungsfunktionen</li>
            <li>Verwaltung von politischen Prozessen und Kommunikation</li>
            <li>Organisation von Terminen und Sitzungen</li>
            <li>Dokumentenverwaltung</li>
            <li>Authentifizierung und Zugriffsverwaltung</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>4. Rechtsgrundlage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-700">
            Die Verarbeitung personenbezogener Daten erfolgt auf Grundlage von:
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-700">
            <li>Einwilligung (Art. 6 Abs. 1 lit. a DSGVO)</li>
            <li>Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO)</li>
            <li>Berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO)</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>5. Datenweitergabe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-700">
            Ihre Daten werden nur innerhalb Ihrer Organisation verarbeitet. Eine Weitergabe an Dritte 
            erfolgt nur, wenn dies gesetzlich vorgeschrieben ist oder Sie ausdrücklich eingewilligt haben.
          </p>
          <p className="text-slate-700">
            Die technische Infrastruktur wird durch Base44 bereitgestellt. Ihre Daten werden auf 
            sicheren Servern innerhalb der EU gespeichert.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>6. Speicherdauer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-700">
            Ihre personenbezogenen Daten werden so lange gespeichert, wie dies für die Erfüllung der 
            genannten Zwecke erforderlich ist oder gesetzliche Aufbewahrungsfristen bestehen.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>7. Ihre Rechte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-700">
            Sie haben folgende Rechte bezüglich Ihrer personenbezogenen Daten:
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-700">
            <li>Recht auf Auskunft (Art. 15 DSGVO)</li>
            <li>Recht auf Berichtigung (Art. 16 DSGVO)</li>
            <li>Recht auf Löschung (Art. 17 DSGVO)</li>
            <li>Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
            <li>Recht auf Datenübertragbarkeit (Art. 20 DSGVO)</li>
            <li>Widerspruchsrecht (Art. 21 DSGVO)</li>
            <li>Recht auf Widerruf der Einwilligung</li>
            <li>Beschwerderecht bei einer Aufsichtsbehörde (Art. 77 DSGVO)</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>8. Datensicherheit</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-700">
            Wir setzen technische und organisatorische Sicherheitsmaßnahmen ein, um Ihre Daten gegen 
            zufällige oder vorsätzliche Manipulationen, Verlust, Zerstörung oder den Zugriff 
            unberechtigter Personen zu schützen.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>9. Änderungen der Datenschutzerklärung</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-700">
            Wir behalten uns vor, diese Datenschutzerklärung anzupassen, um sie an geänderte 
            Rechtslagen oder Änderungen unserer Anwendung anzupassen.
          </p>
        </CardContent>
      </Card>

      <div className="text-sm text-slate-500 pt-4">
        Stand: Februar 2026
      </div>
    </div>
  );
}