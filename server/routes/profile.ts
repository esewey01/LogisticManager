// REFACTOR: User profile management endpoints
import { Router, Request, Response } from "express";
import { z } from "zod";

const router = Router();

const profileSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").optional(),
  phone: z.string().optional(),
  avatar_url: z.string().url().optional().or(z.literal("")),
  timezone: z.string().optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
  notifications: z.boolean().optional()
});

interface MockUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar_url?: string;
  timezone?: string;
  theme?: string;
  notifications?: boolean;
  created_at: string;
  updated_at: string;
}

// Mock user data - In production this would come from the database
let mockUserProfile: MockUser = {
  id: "1",
  email: "admin@logisys.com",
  name: "Administrador",
  phone: "+52 1234567890",
  avatar_url: "",
  timezone: "America/Mexico_City",
  theme: "system",
  notifications: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

// Get current user profile
router.get("/", async (req: Request, res: Response) => {
  try {
    // In production, get user from session/token
    // const userId = req.session?.userId || req.headers['x-user-id'];
    
    res.json(mockUserProfile);
  } catch (error: any) {
    res.status(500).json({
      message: "Error al obtener el perfil",
      error: error.message
    });
  }
});

// Update user profile
router.put("/", async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = profileSchema.parse(req.body);

    // In production, update user in database
    // const userId = req.session?.userId || req.headers['x-user-id'];
    // await updateUser(userId, validatedData);

    // Mock update
    mockUserProfile = {
      ...mockUserProfile,
      ...validatedData,
      updated_at: new Date().toISOString()
    };

    res.json({
      message: "Perfil actualizado correctamente",
      profile: mockUserProfile
    });

  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({
        message: "Datos inválidos",
        errors: error.errors
      });
      return;
    }

    res.status(500).json({
      message: "Error al actualizar el perfil",
      error: error.message
    });
  }
});

export default router;