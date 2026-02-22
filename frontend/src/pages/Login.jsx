import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Landmark, Mail, Lock, User, Building2, AlertCircle, Users, CheckCircle } from "lucide-react";
import { base44 } from "@/api/apiClient";

export default function LoginPage() {
  const { login, register } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // Register form
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPasswordConfirm, setRegPasswordConfirm] = useState("");
  const [regName, setRegName] = useState("");
  const [regOrganization, setRegOrganization] = useState("");
  const [regOrgType, setRegOrgType] = useState("fraktion");

  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState(null);
  const [resetSuccess, setResetSuccess] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      await login(loginEmail, loginPassword);
    } catch (err) {
      setError(err.message || "Anmeldung fehlgeschlagen");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    // Validation
    if (!regName.trim()) {
      setError("Bitte geben Sie Ihren Namen ein");
      setIsLoading(false);
      return;
    }
    if (!regEmail.includes("@")) {
      setError("Bitte geben Sie eine gültige E-Mail-Adresse ein");
      setIsLoading(false);
      return;
    }
    if (!regOrganization.trim()) {
      setError("Bitte geben Sie Ihre Organisation ein");
      setIsLoading(false);
      return;
    }
    if (regPassword.length < 6) {
      setError("Das Passwort muss mindestens 6 Zeichen lang sein");
      setIsLoading(false);
      return;
    }
    if (regPassword !== regPasswordConfirm) {
      setError("Die Passwörter stimmen nicht überein");
      setIsLoading(false);
      return;
    }
    
    try {
      await register({
        email: regEmail,
        password: regPassword,
        full_name: regName,
        organization: regOrganization.toLowerCase().replace(/\s+/g, '-'),
        org_type: regOrgType,
        role: "admin", // First user of org is admin
      });
      setSuccess("Registrierung erfolgreich! Sie werden angemeldet...");
    } catch (err) {
      setError(err.message || "Registrierung fehlgeschlagen");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError(null);
    setResetSuccess(null);
    setError(null);

    if (!resetEmail.includes('@')) {
      setResetError('Bitte geben Sie eine gültige E-Mail-Adresse ein');
      setResetLoading(false);
      return;
    }
    if (resetPassword.length < 6) {
      setResetError('Das Passwort muss mindestens 6 Zeichen lang sein');
      setResetLoading(false);
      return;
    }
    if (resetPassword != resetPasswordConfirm) {
      setResetError('Die Passwörter stimmen nicht überein');
      setResetLoading(false);
      return;
    }

    try {
      await base44.auth.resetPassword(resetEmail, resetPassword);
      setResetSuccess('Passwort aktualisiert. Bitte melden Sie sich jetzt an.');
      setSuccess('Passwort aktualisiert. Bitte melden Sie sich jetzt an.');
      setLoginEmail(resetEmail);
      setShowResetDialog(false);
    } catch (err) {
      setResetError(err.message || 'Passwort-Reset fehlgeschlagen');
    } finally {
      setResetLoading(false);
    }
  };


  const handleDemoLogin = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await login(loginEmail, loginPassword);
    } catch (err) {
      setError(err.message || "Anmeldung fehlgeschlagen");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4" data-testid="login-page">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center shadow-xl shadow-slate-900/20">
            <Landmark className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-slate-900 text-2xl">KommunalCRM</h1>
            <p className="text-sm text-slate-500">Politische Arbeit digital</p>
          </div>
        </div>

        <Card className="shadow-xl border-slate-200">
          <CardHeader className="text-center pb-2">
            <CardTitle className="font-heading text-xl">Willkommen</CardTitle>
            <CardDescription>
              Melden Sie sich an oder erstellen Sie ein Konto
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700" data-testid="login-error-message">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-sm text-emerald-700" data-testid="login-success-message">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                {success}
              </div>
            )}

            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login" data-testid="login-tab">Anmelden</TabsTrigger>
                <TabsTrigger value="register" data-testid="register-tab">Registrieren</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">E-Mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="name@beispiel.de"
                        className="pl-10"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                        data-testid="login-email"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Passwort</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        data-testid="login-password"
                      />
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-slate-900 hover:bg-slate-800" 
                    disabled={isLoading}
                    data-testid="login-submit"
                  >
                    {isLoading ? "Wird angemeldet..." : "Anmelden"}
                  </Button>

                  <div className="text-center">
                    <Button
                      type="button"
                      variant="link"
                      className="text-slate-500"
                      onClick={() => {
                        setShowResetDialog(true);
                        setResetEmail(loginEmail || "");
                        setResetError(null);
                        setResetSuccess(null);
                      }}
                      data-testid="reset-password-link"
                    >
                      Passwort vergessen?
                    </Button>
                  </div>
                </form>
              </TabsContent>
              
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="reg-name">Vollständiger Name *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        id="reg-name"
                        placeholder="Max Mustermann"
                        className="pl-10"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        required
                        data-testid="register-name"
                      />
                    </div>
                  </div>
                  
                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="reg-email">E-Mail *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        id="reg-email"
                        type="email"
                        placeholder="name@beispiel.de"
                        className="pl-10"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        required
                        data-testid="register-email"
                      />
                    </div>
                  </div>

                  {/* Organization */}
                  <div className="space-y-2">
                    <Label htmlFor="reg-organization">Organisation *</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        id="reg-organization"
                        placeholder="z.B. SPD Fraktion Musterstadt"
                        className="pl-10"
                        value={regOrganization}
                        onChange={(e) => setRegOrganization(e.target.value)}
                        required
                        data-testid="register-organization"
                      />
                    </div>
                  </div>

                  {/* Organization Type */}
                  <div className="space-y-3">
                    <Label>Organisationstyp *</Label>
                    <RadioGroup 
                      value={regOrgType} 
                      onValueChange={setRegOrgType}
                      className="grid grid-cols-2 gap-3"
                    >
                      <div>
                        <RadioGroupItem 
                          value="fraktion" 
                          id="type-fraktion" 
                          className="peer sr-only" 
                        />
                        <Label 
                          htmlFor="type-fraktion" 
                          className="flex flex-col items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all
                            peer-data-[state=checked]:border-slate-900 peer-data-[state=checked]:bg-slate-50
                            hover:bg-slate-50 border-slate-200"
                          data-testid="register-type-fraktion"
                        >
                          <Landmark className="w-6 h-6 mb-2 text-slate-600" />
                          <span className="font-medium text-sm">Fraktion</span>
                          <span className="text-xs text-slate-500 mt-1">Kommunale Fraktion</span>
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem 
                          value="verband" 
                          id="type-verband" 
                          className="peer sr-only" 
                        />
                        <Label 
                          htmlFor="type-verband" 
                          className="flex flex-col items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all
                            peer-data-[state=checked]:border-slate-900 peer-data-[state=checked]:bg-slate-50
                            hover:bg-slate-50 border-slate-200"
                          data-testid="register-type-verband"
                        >
                          <Users className="w-6 h-6 mb-2 text-slate-600" />
                          <span className="font-medium text-sm">Verband</span>
                          <span className="text-xs text-slate-500 mt-1">Ortsverband / Verein</span>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  {/* Password */}
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Passwort *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        id="reg-password"
                        type="password"
                        placeholder="Mindestens 6 Zeichen"
                        className="pl-10"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        required
                        minLength={6}
                        data-testid="register-password"
                      />
                    </div>
                  </div>

                  {/* Password Confirm */}
                  <div className="space-y-2">
                    <Label htmlFor="reg-password-confirm">Passwort bestätigen *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        id="reg-password-confirm"
                        type="password"
                        placeholder="Passwort wiederholen"
                        className="pl-10"
                        value={regPasswordConfirm}
                        onChange={(e) => setRegPasswordConfirm(e.target.value)}
                        required
                        minLength={6}
                        data-testid="register-password-confirm"
                      />
                    </div>
                    {regPassword && regPasswordConfirm && regPassword !== regPasswordConfirm && (
                      <p className="text-xs text-red-500">Die Passwörter stimmen nicht überein</p>
                    )}
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-slate-900 hover:bg-slate-800" 
                    disabled={isLoading || (regPassword !== regPasswordConfirm)}
                    data-testid="register-submit"
                  >
                    {isLoading ? "Wird registriert..." : "Konto erstellen"}
                  </Button>

                  <p className="text-xs text-slate-500 text-center">
                    Mit der Registrierung akzeptieren Sie unsere Nutzungsbedingungen und Datenschutzrichtlinien.
                  </p>
                </form>
              </TabsContent>
            </Tabs>

            <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
              <DialogContent data-testid="reset-dialog">
                <DialogHeader>
                  <DialogTitle>Passwort zurücksetzen</DialogTitle>
                  <DialogDescription>
                    Geben Sie Ihre E-Mail-Adresse und ein neues Passwort ein.
                  </DialogDescription>
                </DialogHeader>

                {resetError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700" data-testid="reset-error-message">
                    {resetError}
                  </div>
                )}

                {resetSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700" data-testid="reset-success-message">
                    {resetSuccess}
                  </div>
                )}

                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">E-Mail</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="name@beispiel.de"
                      required
                      data-testid="reset-email-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reset-password">Neues Passwort</Label>
                    <Input
                      id="reset-password"
                      type="password"
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                      required
                      data-testid="reset-password-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reset-password-confirm">Neues Passwort bestätigen</Label>
                    <Input
                      id="reset-password-confirm"
                      type="password"
                      value={resetPasswordConfirm}
                      onChange={(e) => setResetPasswordConfirm(e.target.value)}
                      required
                      data-testid="reset-password-confirm-input"
                    />
                  </div>

                  <DialogFooter className="gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowResetDialog(false)}
                      data-testid="reset-cancel-button"
                    >
                      Abbrechen
                    </Button>
                    <Button type="submit" disabled={resetLoading} data-testid="reset-submit-button">
                      {resetLoading ? "Aktualisiert..." : "Passwort aktualisieren"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

          </CardContent>
        </Card>

        <p className="text-xs text-slate-400 text-center mt-6">
          © 2026 KommunalCRM. Alle Rechte vorbehalten.
        </p>
      </div>
    </div>
  );
}
