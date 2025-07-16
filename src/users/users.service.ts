import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { and, eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { DrizzleInstance } from '../db';
import { follows, users } from '../db/schema';
import { Either, ErrorRegister, left, right } from '../helper/either';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { EmailService } from './email.service';
import { User } from './entities/user.entity';
import { createUserSchema, loginSchema, verifyEmailSchema } from './schemas/user.schema';

const SALT_ROUNDS = 10;

// Type definitions untuk hasil service
type CreateUserResult = Either<
  ErrorRegister.EmailAlreadyRegistered | ErrorRegister.InputanSalah,
  { user: Omit<User, 'password'>; verificationToken: string }
>;

type VerifyEmailResult = Either<
  ErrorRegister.InvalidVerificationToken | ErrorRegister.UserNotFound | ErrorRegister.InputanSalah,
  Omit<User, 'password'>
>;

type LoginResult = Either<
  | ErrorRegister.UserNotFound
  | ErrorRegister.EmailNotVerified
  | ErrorRegister.InvalidPassword
  | ErrorRegister.InputanSalah,
  { user: Omit<User, 'password'>; accessToken: string }
>;

type UpdateProfileResult = Either<ErrorRegister.UserNotFound | ErrorRegister.InputanSalah, Omit<User, 'password'>>;
type FindUserResult = Either<ErrorRegister.UserNotFound, Omit<User, 'password'>>;
type CanViewProfileResult = Either<ErrorRegister.UserNotFound, boolean>;

@Injectable()
export class UsersService {
  private tokenExpiryTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly TOKEN_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 jam dalam milidetik

  constructor(
    private readonly jwtService: JwtService,
    @Inject('DB') private db: DrizzleInstance,
    private readonly emailService: EmailService
  ) {}

  async create(createUserDto: CreateUserDto): Promise<CreateUserResult> {
    try {
      // Validasi input dengan Zod
      const validatedData = createUserSchema.parse(createUserDto);

      const existingUser = await this.db.select().from(users).where(eq(users.email, validatedData.email)).limit(1);
      if (existingUser.length > 0) {
        return left(new ErrorRegister.EmailAlreadyRegistered());
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, SALT_ROUNDS);

      const userId = uuidv4();

      // Simpan user ke database
      const [newUser] = await this.db
        .insert(users)
        .values({
          id: userId,
          email: validatedData.email,
          password: hashedPassword,
          fullName: createUserDto.fullName || '',
          isEmailVerified: false,
          isPrivate: false,
        })
        .returning();

      // Generate JWT untuk verifikasi email
      const verifyToken = this.jwtService.sign(
        { sub: newUser.id, email: newUser.email, type: 'verify' },
        { expiresIn: '24h' }
      );

      // Kirim email verifikasi via Resend
      await this.emailService.sendVerificationEmail(newUser.email, verifyToken);

      // Mapping ke User entity
      const userEntity: User = {
        id: newUser.id,
        email: newUser.email,
        password: newUser.password,
        fullName: newUser.fullName || '',
        isEmailVerified: newUser.isEmailVerified,
        isPrivate: newUser.isPrivate || false,
        followers: [],
        following: [],
      };

      const { password, ...userWithoutPassword } = userEntity;

      return right({
        user: userWithoutPassword,
        verificationToken: verifyToken,
      });
    } catch (error) {
      console.log('Validation error:', error);

      // Perbaikan untuk ZodError
      if (error.name === 'ZodError' && error.issues) {
        const errorMessages = error.issues
          .map((issue) => {
            // Tambahkan nama field jika available
            const path = issue.path.length > 0 ? issue.path[issue.path.length - 1] + ': ' : '';
            return path + issue.message;
          })
          .join(', ');

        return left(new ErrorRegister.InputanSalah(errorMessages));
      }
      return left(new ErrorRegister.InputanSalah('Data tidak valid'));
    }
  }

  async login(loginDto: LoginDto): Promise<LoginResult> {
    try {
      // Validasi input
      const validatedData = loginSchema.parse(loginDto);
      const { email, password } = validatedData;

      // Cari user di database
      const userRecord = await this.db.select().from(users).where(eq(users.email, email)).limit(1);

      if (userRecord.length === 0) {
        return left(new ErrorRegister.UserNotFound());
      }

      const user = userRecord[0];

      if (!user.isEmailVerified) {
        return left(new ErrorRegister.EmailNotVerified());
      }

      // Bandingkan password dengan hash yang tersimpan
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return left(new ErrorRegister.InvalidPassword());
      }

      // Generate JWT token
      const payload = { sub: user.id, email: user.email };
      const accessToken = this.jwtService.sign(payload);

      // Mapping ke entity
      const userEntity: User = {
        id: user.id,
        email: user.email,
        password: user.password,
        fullName: user.fullName || '',
        isEmailVerified: user.isEmailVerified,
        isPrivate: user.isPrivate || false,
        followers: [],
        following: [],
      };

      const { password: _, ...userWithoutPassword } = userEntity;

      return right({
        user: userWithoutPassword,
        accessToken,
      });
    } catch (error) {
      if (error.name === 'ZodError' && error.issues) {
        const errorMessages = error.issues.map((issue) => issue.message).join(', ');
        return left(new ErrorRegister.InputanSalah(errorMessages));
      }
      return left(new ErrorRegister.InputanSalah('Data login tidak valid'));
    }
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto): Promise<UpdateProfileResult> {
    try {
      // Cek apakah user ada
      const existingUser = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (existingUser.length === 0) {
        return left(new ErrorRegister.UserNotFound());
      }

      console.log('Existing user:', existingUser[0]);
      let isPrivate = existingUser[0].isPrivate;

      if (isPrivate) {
        await this.db.update(users).set({ isPrivate: false }).where(eq(users.id, userId));
      } else {
        await this.db.update(users).set({ isPrivate: true }).where(eq(users.id, userId));
      }

      // Ambil data user yang sudah diupdate
      const [updatedUser] = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);

      // Mapping ke entity
      const userEntity: User = {
        id: updatedUser.id,
        email: updatedUser.email,
        password: updatedUser.password,
        fullName: updatedUser.fullName || '',
        isEmailVerified: updatedUser.isEmailVerified,
        isPrivate: updatedUser.isPrivate || false,
        followers: [],
        following: [],
      };

      const { password, ...userWithoutPassword } = userEntity;
      return right(userWithoutPassword);
    } catch (error) {
      if (error.name === 'ZodError' && error.issues) {
        const errorMessages = error.issues.map((issue) => issue.message).join(', ');
        return left(new ErrorRegister.InputanSalah(errorMessages));
      }
      return left(new ErrorRegister.InputanSalah('Data profil tidak valid'));
    }
  }

  async findById(userId: string): Promise<FindUserResult> {
    const userRecord = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (userRecord.length === 0) {
      return left(new ErrorRegister.UserNotFound());
    }

    const user = userRecord[0];

    // Ambil followers dan following dari database
    const userFollowers = await this.db
      .select({ followerId: follows.followerId })
      .from(follows)
      .where(eq(follows.followingId, userId));

    const userFollowing = await this.db
      .select({ followingId: follows.followingId })
      .from(follows)
      .where(eq(follows.followerId, userId));

    // Mapping ke entity
    const userEntity: User = {
      id: user.id,
      email: user.email,
      password: user.password,
      fullName: user.fullName || '',
      isEmailVerified: user.isEmailVerified,
      isPrivate: user.isPrivate || false,
      followers: userFollowers.map((f) => f.followerId),
      following: userFollowing.map((f) => f.followingId),
    };

    const { password, ...userWithoutPassword } = userEntity;
    return right(userWithoutPassword);
  }

  async findByUsername(username: string): Promise<FindUserResult> {
    if (!username) {
      return left(new ErrorRegister.UserNotFound());
    }

    const userRecord = await this.db.select().from(users).where(eq(users.username, username)).limit(1);

    if (userRecord.length === 0) {
      return left(new ErrorRegister.UserNotFound());
    }

    // Gunakan findById untuk mendapatkan user dengan followers/following
    return this.findById(userRecord[0].id);
  }

  async canViewUserProfile(viewerId: string, profileId: string): Promise<CanViewProfileResult> {
    // Jika melihat profil sendiri, selalu diizinkan
    if (viewerId === profileId) {
      return right(true);
    }

    const userRecord = await this.db.select().from(users).where(eq(users.id, profileId)).limit(1);

    if (userRecord.length === 0) {
      return left(new ErrorRegister.UserNotFound());
    }

    const user = userRecord[0];

    // Jika profil public, langsung return true
    if (!user.isPrivate) {
      return right(true);
    }

    // Cek apakah viewer adalah follower
    const isFollowing = await this.db
      .select()
      .from(follows)
      .where(and(eq(follows.followerId, viewerId), eq(follows.followingId, profileId)))
      .limit(1);

    return right(isFollowing.length > 0);
  }

  // Metode untuk follow/unfollow
  async addFollower(userId: string, followerId: string): Promise<void> {
    // Ini hanya dipanggil oleh followsService, tidak perlu validasi ulang
    await this.db
      .insert(follows)
      .values({
        id: uuidv4(),
        followerId: followerId,
        followingId: userId,
      })
      .onConflictDoNothing();
  }

  async addFollowing(userId: string, followingId: string): Promise<void> {
    // Ini sudah ditangani di addFollower, method ini hanya untuk kompatibilitas
    // dengan kode yang menggunakannya
  }

  async removeFollower(userId: string, followerId: string): Promise<void> {
    // Hapus relasi follower
    await this.db.delete(follows).where(and(eq(follows.followerId, followerId), eq(follows.followingId, userId)));
  }

  async removeFollowing(userId: string, followingId: string): Promise<void> {
    // Ini sudah ditangani di removeFollower, method ini hanya untuk kompatibilitas
    // dengan kode yang menggunakannya
  }

  // Tambahkan method untuk update status email verified
  async markEmailVerified(userId: string): Promise<void> {
    await this.db.update(users).set({ isEmailVerified: true }).where(eq(users.id, userId));
  }
}
