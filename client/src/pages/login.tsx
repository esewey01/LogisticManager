import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { FRASES, fraseAleatoria } from "@/components/frases/frases";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [frase, setFrase] = useState<string>("");
  const { login, isLoginPending, loginError } = useAuth();

  useEffect(() => {
    // Opción A: totalmente aleatoria en cada carga
    setFrase(fraseAleatoria(FRASES));

    // Opción B (comenta la línea de arriba y descomenta esto):
    // Frase “estable por día” (cambia una vez al día)
    // const idx = new Date().getDate() % FRASES.length;
    // setFrase(FRASES[idx]);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ email, password });
    } catch {
      // El error lo maneja la mutación
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <i className="fas fa-shipping-fast text-white text-lg"></i>
            </div>
            <CardTitle className="text-2xl font-bold text-primary">ULUM PLUS</CardTitle>
          </div>

          {/* Frase aleatoria */}
          <p className="text-gray-600" aria-live="polite">{frase}</p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Correo Electrónico"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {loginError && (
              <Alert variant="destructive">
                <AlertDescription>{loginError.message}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={isLoginPending}>
              {isLoginPending ? "Iniciando sesión..." : "Iniciar Sesión"}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            {/* <p className="text-sm font-medium text-gray-700 mb-2">Usuarios de prueba:</p>
            <div className="text-xs text-gray-600 space-y-1">
              <div>
                <strong>Usuario:</strong> logistica@empresa.com / 1234567
              </div>
              <div>
                <strong>Admin:</strong> admin@empresa.com / admin123
              </div>
            </div>*/}
          </div> 
        </CardContent>
      </Card>
    </div>
  );
}
