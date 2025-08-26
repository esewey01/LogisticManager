// REFACTOR: User profile management page
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/providers/ThemeProvider";
import { apiRequest } from "@/lib/queryClient";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Mail, Phone, Globe, Bell, Palette } from "lucide-react";

const profileSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Email inválido").readonly(),
  phone: z.string().optional(),
  avatar_url: z.string().url().optional().or(z.literal("")),
  timezone: z.string().optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
  notifications: z.boolean().optional()
});

type ProfileForm = z.infer<typeof profileSchema>;

interface UserProfile extends ProfileForm {
  id: string;
  created_at?: string;
  updated_at?: string;
}

const timezones = [
  { value: "America/Mexico_City", label: "Ciudad de México (GMT-6)" },
  { value: "America/Cancun", label: "Cancún (GMT-5)" },
  { value: "America/Tijuana", label: "Tijuana (GMT-8)" },
  { value: "America/New_York", label: "Nueva York (GMT-5)" },
  { value: "Europe/Madrid", label: "Madrid (GMT+1)" },
  { value: "UTC", label: "UTC (GMT+0)" }
];

export default function Profile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();

  // Fetch current user profile
  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ['/api/me']
  });

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      avatar_url: "",
      timezone: "America/Mexico_City",
      theme: theme,
      notifications: true
    }
  });

  // Update form when profile loads
  React.useEffect(() => {
    if (profile) {
      form.reset({
        ...profile,
        theme: theme // Use current theme from provider
      });
    }
  }, [profile, form, theme]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<ProfileForm>) => {
      const response = await fetch("/api/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error("Failed to update profile");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Perfil actualizado",
        description: "Los cambios se han guardado correctamente"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el perfil",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: ProfileForm) => {
    // Sync theme changes
    if (data.theme && data.theme !== theme) {
      setTheme(data.theme);
    }
    
    updateProfileMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="container max-w-2xl py-6">
        <div className="space-y-6">
          <div className="h-8 bg-muted rounded animate-pulse" />
          <div className="h-64 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="container max-w-2xl py-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Mi Perfil</h1>
        <p className="text-muted-foreground">
          Administra tu información personal y preferencias de la cuenta
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={form.watch("avatar_url")} />
              <AvatarFallback className="text-lg">
                {form.watch("name") ? getInitials(form.watch("name")) : <User className="h-6 w-6" />}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>Información Personal</CardTitle>
              <p className="text-sm text-muted-foreground">
                Actualiza tu información de perfil y foto
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Personal Information */}
              <div className="grid gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Nombre completo
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Tu nombre completo"
                          data-testid="input-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="email" 
                          disabled
                          className="bg-muted"
                          data-testid="input-email"
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        El email no se puede cambiar
                      </p>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Teléfono
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="tel" 
                          placeholder="+52 1234567890"
                          data-testid="input-phone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="avatar_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL del Avatar</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="url" 
                          placeholder="https://ejemplo.com/avatar.jpg"
                          data-testid="input-avatar"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Preferences */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Preferencias</h3>

                <FormField
                  control={form.control}
                  name="timezone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Zona horaria
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-timezone">
                            <SelectValue placeholder="Seleccionar zona horaria" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {timezones.map((tz) => (
                            <SelectItem key={tz.value} value={tz.value}>
                              {tz.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="theme"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Palette className="h-4 w-4" />
                        Tema de la aplicación
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-theme">
                            <SelectValue placeholder="Seleccionar tema" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="light">Claro</SelectItem>
                          <SelectItem value="dark">Oscuro</SelectItem>
                          <SelectItem value="system">Sistema</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notifications"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="flex items-center gap-2 text-base">
                          <Bell className="h-4 w-4" />
                          Notificaciones
                        </FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Recibir notificaciones sobre pedidos y actualizaciones
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-notifications"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  disabled={updateProfileMutation.isPending}
                  data-testid="button-save-profile"
                >
                  {updateProfileMutation.isPending ? "Guardando..." : "Guardar cambios"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}