import { z } from 'zod';

// Skema untuk signup
export const createUserSchema = z
  .object({
    email: z.email('Format email tidak valid'),

    password: z.string().min(6, { message: 'Password minimal 6 karakter' }),

    fullName: z.string().optional(),
  })
  .required({
    email: true,
    password: true,
  });

export type CreateUserSchemaType = z.infer<typeof createUserSchema>;

// Skema untuk login
export const loginSchema = z.object({
  email: z.email('Format email tidak valid'),

  password: z.string().min(1, 'Password harus diisi'),
});

export type LoginSchemaType = z.infer<typeof loginSchema>;

// Skema untuk verifikasi email
export const verifyEmailSchema = z.object({
  email: z.email('Format email tidak valid'),

  verificationToken: z.string().min(1, 'Token verifikasi harus diisi'),
});

export type VerifyEmailSchemaType = z.infer<typeof verifyEmailSchema>;

// Skema untuk update profile
export const updateProfileSchema = z
  .object({
    fullName: z.string().optional(),
    bio: z.string().optional(),
    username: z.string().optional(),
    pictureUrl: z.string().url('URL profil tidak valid').optional(),
    isPrivate: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).some((key) => data[key] !== undefined), {
    message: 'Setidaknya satu field harus diisi untuk update profil',
  });

export type UpdateProfileSchemaType = z.infer<typeof updateProfileSchema>;

// Skema untuk toggle privacy
export const togglePrivacySchema = z.object({
  isPrivate: z.boolean(),
});

export type TogglePrivacySchemaType = z.infer<typeof togglePrivacySchema>;
