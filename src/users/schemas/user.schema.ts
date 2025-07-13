import { z } from 'zod';

// Skema untuk signup
export const createUserSchema = z.object({
  email: z.email('Format email tidak valid').min(1, 'Email harus diisi'),

  password: z.string().min(6, {error: "Pw minimal 6"}),
},{error: "email dan password dibutuhkan"}
);

export type CreateUserSchemaType = z.infer<typeof createUserSchema>;

// Skema untuk login
export const loginSchema = z.object({
  email: z.email('Format email tidak valid').min(1, 'Email harus diisi'),

  password: z.string().min(6, 'Password harus diisi'),
});

export type LoginSchemaType = z.infer<typeof loginSchema>;

// Skema untuk verifikasi email
export const verifyEmailSchema = z.object({
  email: z.email('Format email tidak valid').min(1, 'Email harus diisi'),
  
  verificationToken: z.string().min(1, 'Token verifikasi harus diisi'),
});

export type VerifyEmailSchemaType = z.infer<typeof verifyEmailSchema>;

// Skema untuk update profile
export const updateProfileSchema = z
  .object({
    userId: z.string().min(1, 'User ID harus diisi'),

    fullName: z.string().optional(),
    bio: z.string().optional(),
    username: z.string().optional(),
    pictureUrl: z.url('URL profil tidak valid').optional(),
    isPrivate: z.boolean().optional(),
  })
  .refine(
    (data) => {
      // Setidaknya satu field harus diisi untuk update
      return Object.keys(data).some(
        (key) => key !== 'userId' && data[key] !== undefined,
      );
    },
    {
      message: 'Setidaknya satu field harus diisi untuk update profil',
    },
  );

export type UpdateProfileSchemaType = z.infer<typeof updateProfileSchema>;

// Skema untuk toggle privacy
export const togglePrivacySchema = z.object({
  userId: z.string().min(1, 'User ID harus diisi'),

  isPrivate: z.boolean(),
});

export type TogglePrivacySchemaType = z.infer<typeof togglePrivacySchema>;
