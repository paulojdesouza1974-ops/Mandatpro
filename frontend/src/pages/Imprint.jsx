import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function ImprintPage() {
  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: organization } = useQuery({
    queryKey: ["organization", currentUser?.organization],
    queryFn: () => base44.entities.Organization.filter({ id: currentUser.organization }),
    enabled: !!currentUser?.organization,
    select: (data) => data[0],
  });

  const { data: appSettings = [] } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSettings.list(),
  });

  const settings = appSettings[0];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Impressum</h1>
        <p className="text-slate-500 mt-1">
          Angaben gemäß § 5 TMG
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Angaben zur Organisation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {organization ? (
            <div className="space-y-3 text-slate-700">
              <div>
                <p className="font-semibold">{organization.name}</p>
              </div>
              {organization.address && (
                <div>
                  <p className="text-sm font-medium text-slate-500">Adresse</p>
                  <p>{organization.address}</p>
                  {organization.city && <p>{organization.city}</p>}
                </div>
              )}
              {organization.email && (
                <div>
                  <p className="text-sm font-medium text-slate-500">E-Mail</p>
                  <p>{organization.email}</p>
                </div>
              )}
              {organization.phone && (
                <div>
                  <p className="text-sm font-medium text-slate-500">Telefon</p>
                  <p>{organization.phone}</p>
                </div>
              )}
              {organization.website && (
                <div>
                  <p className="text-sm font-medium text-slate-500">Website</p>
                  <p>{organization.website}</p>
                </div>
              )}
              {organization.owner_name && (
                <div>
                  <p className="text-sm font-medium text-slate-500">Verantwortlich</p>
                  <p>{organization.owner_name}</p>
                  {organization.owner_position && (
                    <p className="text-sm text-slate-600">{organization.owner_position}</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-slate-500">
              Organisationsdaten werden geladen...
            </p>
          )}
        </CardContent>
      </Card>

      {settings && (
        <Card>
          <CardHeader>
            <CardTitle>App-Betreiber</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-slate-700">
              {settings.app_owner_name && (
                <div>
                  <p className="font-semibold">{settings.app_owner_name}</p>
                  {settings.app_owner_position && (
                    <p className="text-sm text-slate-600">{settings.app_owner_position}</p>
                  )}
                </div>
              )}
              {settings.app_owner_address && (
                <div>
                  <p className="text-sm font-medium text-slate-500">Adresse</p>
                  <p className="whitespace-pre-line">{settings.app_owner_address}</p>
                </div>
              )}
              {settings.app_owner_email && (
                <div>
                  <p className="text-sm font-medium text-slate-500">E-Mail</p>
                  <p>{settings.app_owner_email}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Plattform & Hosting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 text-slate-700">
            <p>
              Diese Anwendung wird auf der Base44-Plattform betrieben.
            </p>
            <div>
              <p className="text-sm font-medium text-slate-500">Technischer Betreiber</p>
              <p>Base44 Ltd.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Haftungsausschluss</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 text-slate-700">
            <div>
              <p className="font-medium">Haftung für Inhalte</p>
              <p className="text-sm mt-1">
                Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten 
                nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als 
                Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde 
                Informationen zu überwachen.
              </p>
            </div>
            <div>
              <p className="font-medium">Haftung für Links</p>
              <p className="text-sm mt-1">
                Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen 
                Einfluss haben. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter 
                oder Betreiber der Seiten verantwortlich.
              </p>
            </div>
            <div>
              <p className="font-medium">Urheberrecht</p>
              <p className="text-sm mt-1">
                Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen 
                dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art 
                der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen 
                Zustimmung des jeweiligen Autors bzw. Erstellers.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Copyright</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-700">
            © {new Date().getFullYear()} {settings?.app_owner_name || 'KommunalCRM'}. Alle Rechte vorbehalten.
          </p>
          <p className="text-sm text-slate-600">
            KommunalCRM ist eine Anwendung zur Verwaltung kommunalpolitischer Arbeit. Die Software wird 
            bereitgestellt auf der Base44-Plattform.
          </p>
        </CardContent>
      </Card>

      <div className="text-sm text-slate-500 pt-4">
        Stand: Februar 2026
      </div>
    </div>
  );
}