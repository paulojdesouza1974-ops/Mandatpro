import React, { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { base44 } from "@/api/apiClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle } from "lucide-react";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!token) {
      setError("Reset-Token fehlt oder ist ungültig.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Das Passwort muss mindestens 6 Zeichen lang sein.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }

    setLoading(true);
    try {
      await base44.auth.confirmPasswordReset(token, newPassword);
      setSuccess("Passwort aktualisiert. Bitte melden Sie sich jetzt an.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.message || "Passwort-Reset fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6" data-testid="reset-password-page">
      <Card className="max-w-md w-full p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Passwort zurücksetzen</h1>
          <p className="text-slate-500 mt-1">Neues Passwort vergeben.</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700" data-testid="reset-password-error">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-sm text-emerald-700" data-testid="reset-password-success">
            <CheckCircle className="w-4 h-4" />
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">Neues Passwort</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              data-testid="reset-password-input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Neues Passwort bestätigen</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              data-testid="reset-password-confirm-input"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading} data-testid="reset-password-submit">
            {loading ? "Aktualisiert..." : "Passwort aktualisieren"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/login" className="text-sm text-slate-500 hover:text-slate-700" data-testid="reset-password-login-link">
            Zurück zum Login
          </Link>
        </div>
      </Card>
    </div>
  );
}
