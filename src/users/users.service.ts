import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { Either, ErrorRegister, left, right } from '../helper/either';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { User } from './entities/user.entity';
import { createUserSchema, loginSchema, updateProfileSchema, verifyEmailSchema } from './schemas/user.schema';

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
  private users: User[] = [];
  private verificationTokens: Map<string, string> = new Map();
  private tokenExpiryTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly TOKEN_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 jam dalam milidetik

  constructor(private readonly jwtService: JwtService) {}

  async create(createUserDto: CreateUserDto): Promise<CreateUserResult> {
    try {
      // Validasi input dengan Zod
      const validatedData = createUserSchema.parse(createUserDto);

      const existingUser = this.users.find((user) => user.email === validatedData.email);
      if (existingUser) {
        return left(new ErrorRegister.EmailAlreadyRegistered());
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, SALT_ROUNDS);

      const newUser = new User({
        id: uuidv4(),
        email: validatedData.email,
        password: hashedPassword,
        fullName: createUserDto.fullName || '',
        isEmailVerified: false,
        followers: [],
        following: [],
      });

      this.users.push(newUser);

      // Generate token untuk verifikasi email
      const verificationToken = uuidv4();
      this.verificationTokens.set(newUser.email, verificationToken);

      // Set timer untuk menghapus token setelah 24 jam
      const timer = setTimeout(() => {
        this.verificationTokens.delete(newUser.email);
        this.tokenExpiryTimers.delete(newUser.email);
      }, this.TOKEN_EXPIRY_TIME);

      this.tokenExpiryTimers.set(newUser.email, timer);

      const { password, ...userWithoutPassword } = newUser;

      return right({
        user: userWithoutPassword,
        verificationToken,
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

  async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<VerifyEmailResult> {
    try {
      // Validasi input
      const validatedData = verifyEmailSchema.parse(verifyEmailDto);
      const { email, verificationToken } = validatedData;

      const storedToken = this.verificationTokens.get(email);
      if (!storedToken || storedToken !== verificationToken) {
        return left(new ErrorRegister.InvalidVerificationToken());
      }

      const user = this.users.find((user) => user.email === email);
      if (!user) {
        return left(new ErrorRegister.UserNotFound());
      }

      user.isEmailVerified = true;
      this.verificationTokens.delete(email);

      // Bersihkan timer jika ada
      const timer = this.tokenExpiryTimers.get(email);
      if (timer) {
        clearTimeout(timer);
        this.tokenExpiryTimers.delete(email);
      }

      const { password, ...userWithoutPassword } = user;
      return right(userWithoutPassword);
    } catch (error) {
      if (error.issues) {
        const errorMessages = error.issues.map((issue) => issue.message).join(', ');
        return left(new ErrorRegister.InputanSalah(errorMessages));
      }
      return left(new ErrorRegister.InputanSalah('Data verifikasi tidak valid'));
    }
  }

  async login(loginDto: LoginDto): Promise<LoginResult> {
    try {
      // Validasi input
      const validatedData = loginSchema.parse(loginDto);
      const { email, password } = validatedData;

      const user = this.users.find((user) => user.email === email);
      if (!user) {
        return left(new ErrorRegister.UserNotFound());
      }

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

      const { password: _, ...userWithoutPassword } = user;

      return right({
        user: userWithoutPassword,
        accessToken,
      });
    } catch (error) {
      if (error.issues) {
        const errorMessages = error.issues.map((issue) => issue.message).join(', ');
        return left(new ErrorRegister.InputanSalah(errorMessages));
      }
      return left(new ErrorRegister.InputanSalah('Data login tidak valid'));
    }
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto): Promise<UpdateProfileResult> {
    try {
      // Validasi input dengan Zod
      const validatedData = updateProfileSchema.parse(updateProfileDto);

      const userIndex = this.users.findIndex((user) => user.id === userId);
      if (userIndex === -1) {
        return left(new ErrorRegister.UserNotFound());
      }

      this.users[userIndex] = {
        ...this.users[userIndex],
        ...validatedData,
      };

      const { password, ...userWithoutPassword } = this.users[userIndex];
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
    const user = this.users.find((user) => user.id === userId);
    if (!user) {
      return left(new ErrorRegister.UserNotFound());
    }

    const { password, ...userWithoutPassword } = user;
    return right(userWithoutPassword);
  }

  async findByUsername(username: string): Promise<FindUserResult> {
    const user = this.users.find((user) => user.username === username);
    if (!user) {
      return left(new ErrorRegister.UserNotFound());
    }

    const { password, ...userWithoutPassword } = user;
    return right(userWithoutPassword);
  }

  async canViewUserProfile(viewerId: string, profileId: string): Promise<CanViewProfileResult> {
    // Jika melihat profil sendiri, selalu diizinkan
    if (viewerId === profileId) {
      return right(true);
    }

    const userResult = await this.findById(profileId);
    if (userResult.isLeft()) {
      return left(userResult.error);
    }

    const user = userResult.value;

    if (!user.isPrivate) {
      return right(true);
    }

    return right(Array.isArray(user.followers) && user.followers.includes(viewerId));
  }

  async addFollower(userId: string, followerId: string): Promise<void> {
    const userIndex = this.users.findIndex((user) => user.id === userId);
    if (userIndex !== -1) {
      // Pastikan array followers ada
      if (!this.users[userIndex].followers) {
        this.users[userIndex].followers = [];
      }
      // Tambahkan follower jika belum ada
      if (!this.users[userIndex].followers.includes(followerId)) {
        this.users[userIndex].followers.push(followerId);
      }
    }
  }

  async addFollowing(userId: string, followingId: string): Promise<void> {
    const userIndex = this.users.findIndex((user) => user.id === userId);
    if (userIndex !== -1) {
      // Pastikan array following ada
      if (!this.users[userIndex].following) {
        this.users[userIndex].following = [];
      }
      // Tambahkan following jika belum ada
      if (!this.users[userIndex].following.includes(followingId)) {
        this.users[userIndex].following.push(followingId);
      }
    }
  }

  async removeFollower(userId: string, followerId: string): Promise<void> {
    const userIndex = this.users.findIndex((user) => user.id === userId);
    if (userIndex !== -1 && this.users[userIndex].followers) {
      this.users[userIndex].followers = this.users[userIndex].followers.filter((id) => id !== followerId);
    }
  }

  async removeFollowing(userId: string, followingId: string): Promise<void> {
    const userIndex = this.users.findIndex((user) => user.id === userId);
    if (userIndex !== -1 && this.users[userIndex].following) {
      this.users[userIndex].following = this.users[userIndex].following.filter((id) => id !== followingId);
    }
  }
}
