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
import { createUserSchema, loginSchema } from './schemas/user.schema';

const SALT_ROUNDS = 10;

// Tipe output untuk profil publik
type PublicProfileOutput = {
  id: string;
  email: string;
  fullName: string | null;
  bio: string | null;
  username: string | null;
  pictureUrl: string | null;
};

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
type FindUserResult = Either<ErrorRegister.UserNotFound, PublicProfileOutput>; // Diubah ke PublicProfileOutput
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
      const validatedData = createUserSchema.parse(createUserDto);

      // Mulai transaksi
      const result = await this.db.transaction<CreateUserResult>(async (trx) => {
        // Cek user sudah ada
        const existingUser = await trx.select().from(users).where(eq(users.email, validatedData.email)).limit(1);
        if (existingUser.length > 0) {
          return left(new ErrorRegister.EmailAlreadyRegistered());
        }

        const hashedPassword = await bcrypt.hash(validatedData.password, SALT_ROUNDS);
        const userId = uuidv4();

        // Insert user ke DB dalam transaksi
        const [newUser] = await trx
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

        // Generate token verifikasi
        const verifyToken = this.jwtService.sign(
          { sub: newUser.id, email: newUser.email, type: 'verify' },
          { expiresIn: '24h' }
        );

        // Kirim email verifikasi (jika gagal, lempar error agar rollback)
        await this.emailService.sendVerificationEmail(newUser.email, verifyToken);

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
      });

      return result;
    } catch (error) {
      if (error.name === 'ZodError' && error.issues) {
        const errorMessages = error.issues
          .map((issue) => {
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
      const validatedData = loginSchema.parse(loginDto);
      const { email, password } = validatedData;

      const userRecord = await this.db.select().from(users).where(eq(users.email, email)).limit(1);

      if (userRecord.length === 0) {
        return left(new ErrorRegister.UserNotFound());
      }

      const user = userRecord[0];

      if (!user.isEmailVerified) {
        return left(new ErrorRegister.EmailNotVerified());
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return left(new ErrorRegister.InvalidPassword());
      }

      const payload = { sub: user.id, email: user.email };
      const accessToken = this.jwtService.sign(payload);

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
      return await this.db.transaction<UpdateProfileResult>(async (trx) => {
        const existingUser = await trx.select().from(users).where(eq(users.id, userId)).limit(1);
        if (existingUser.length === 0) {
          return left(new ErrorRegister.UserNotFound());
        }

        const [updatedRecord] = await trx
          .update(users)
          .set({
            fullName: updateProfileDto.fullName,
            bio: updateProfileDto.bio,
            username: updateProfileDto.username,
            pictureUrl: updateProfileDto.pictureUrl,
            isPrivate:
              updateProfileDto.isPrivate !== undefined ? updateProfileDto.isPrivate : existingUser[0].isPrivate,
          })
          .where(eq(users.id, userId))
          .returning();

        if (!updatedRecord) {
          return left(new ErrorRegister.UserNotFound());
        }

        const userProfile: Omit<User, 'password'> = {
          id: updatedRecord.id,
          email: updatedRecord.email,
          fullName: updatedRecord.fullName || '',
          bio: updatedRecord.bio || '',
          username: updatedRecord.username || '',
          pictureUrl: updatedRecord.pictureUrl || '',
          isEmailVerified: updatedRecord.isEmailVerified,
          isPrivate: updatedRecord.isPrivate,
        };

        return right(userProfile);
      });
    } catch (error) {
      if (error.name === 'ZodError' && error.issues) {
        const errorMessages = error.issues.map((issue) => issue.message).join(', ');
        return left(new ErrorRegister.InputanSalah(errorMessages));
      }
      return left(new ErrorRegister.InputanSalah('Gagal memperbarui profil pengguna'));
    }
  }

  async findById(userId: string): Promise<FindUserResult> {
    const userRecord = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (userRecord.length === 0) {
      return left(new ErrorRegister.UserNotFound());
    }

    const user = userRecord[0];

    // Bentuk objek userProfile hanya dengan properti yang diinginkan untuk output publik
    const userProfile: PublicProfileOutput = {
      id: user.id,
      email: user.email,
      fullName: user.fullName || '',
      bio: user.bio || '',
      username: user.username || '',
      pictureUrl: user.pictureUrl || '',
    };

    return right(userProfile);
  }

  async findByUsername(username: string): Promise<FindUserResult> {
    if (!username) {
      return left(new ErrorRegister.UserNotFound());
    }

    const userRecord = await this.db.select().from(users).where(eq(users.username, username)).limit(1);

    if (userRecord.length === 0) {
      return left(new ErrorRegister.UserNotFound());
    }

    // Gunakan findById untuk mendapatkan user dengan format PublicProfileOutput
    return this.findById(userRecord[0].id);
  }

  async canViewUserProfile(viewerId: string, profileId: string): Promise<CanViewProfileResult> {
    if (viewerId === profileId) {
      return right(true);
    }

    const userRecord = await this.db.select().from(users).where(eq(users.id, profileId)).limit(1);

    if (userRecord.length === 0) {
      return left(new ErrorRegister.UserNotFound());
    }

    const user = userRecord[0];

    if (!user.isPrivate) {
      return right(true);
    }

    const isFollowing = await this.db
      .select()
      .from(follows)
      .where(and(eq(follows.followerId, viewerId), eq(follows.followingId, profileId)))
      .limit(1);

    return right(isFollowing.length > 0);
  }

  async addFollower(userId: string, followerId: string): Promise<void> {
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
    // Metode ini mungkin tidak diperlukan jika logika follow sepenuhnya ditangani di FollowsService
  }

  async removeFollower(userId: string, followerId: string): Promise<void> {
    await this.db.delete(follows).where(and(eq(follows.followerId, followerId), eq(follows.followingId, userId)));
  }

  async removeFollowing(userId: string, followingId: string): Promise<void> {
    // Metode ini mungkin tidak diperlukan jika logika unfollow sepenuhnya ditangani di FollowsService
  }

  async markEmailVerified(userId: string): Promise<void> {
    await this.db.update(users).set({ isEmailVerified: true }).where(eq(users.id, userId));
  }
}
