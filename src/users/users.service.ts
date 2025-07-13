import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { Either, ErrorRegister, left, right } from '../helper/either';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { User } from './entities/user.entity';
import ca from 'zod/v4/locales/ca.cjs';
import { createUserSchema } from './schemas/user.schema';
import z from 'zod';
const SALT_ROUNDS = 10;

// Type definitions for service results
type CreateUserResult = Either<
  ErrorRegister.EmailAlreadyRegistered,
  { user: Omit<User, 'password'>; verificationToken: string }
>;

type VerifyEmailResult = Either<
  ErrorRegister.InvalidVerificationToken | ErrorRegister.UserNotFound,
  Omit<User, 'password'>
>;

type LoginResult = Either<
  ErrorRegister.UserNotFound | ErrorRegister.EmailNotVerified | ErrorRegister.InvalidPassword,
  { user: Omit<User, 'password'>; accessToken: string }
>;

type UpdateProfileResult = Either<ErrorRegister.UserNotFound, Omit<User, 'password'>>;
type FindUserResult = Either<ErrorRegister.UserNotFound, Omit<User, 'password'>>;
type CanViewProfileResult = Either<ErrorRegister.UserNotFound, boolean>;

@Injectable()
export class UsersService {
  private users: User[] = [];
  private verificationTokens: Map<string, string> = new Map();

  async create(createUserDto: CreateUserDto): Promise<CreateUserResult> {
    let validation: CreateUserDto;
    try {
      validation = createUserSchema.parse(createUserDto);
    } catch (error) {
      return left(new ErrorRegister.InputanSalah(JSON.parse(error)[0].message));
    }
    const existingUser = this.users.find((user) => user.email === createUserDto.email);

    if (existingUser) {
      return left(new ErrorRegister.EmailAlreadyRegistered());
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, SALT_ROUNDS);

    const newUser = new User({
      id: uuidv4(),
      email: createUserDto.email,
      password: hashedPassword, // Simpan password yang sudah di-hash
      fullName: createUserDto.fullName || '',
      isEmailVerified: false,
      followers: [],
      following: [],
    });

    this.users.push(newUser);

    // Generate token untuk verifikasi email
    const verificationToken = uuidv4();
    this.verificationTokens.set(newUser.email, verificationToken);

    const { password, ...userWithoutPassword } = newUser;

    return right({
      user: userWithoutPassword,
      verificationToken,
    });
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<VerifyEmailResult> {
    const { email, verificationToken } = verifyEmailDto;

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

    const { password, ...userWithoutPassword } = user;
    return right(userWithoutPassword);
  }

  async login(loginDto: LoginDto): Promise<LoginResult> {
    const { email, password } = loginDto;

    const user = this.users.find((user) => user.email === email);
    if (!user) {
      return left(new ErrorRegister.UserNotFound());
    }

    if (!user.isEmailVerified) {
      return left(new ErrorRegister.EmailNotVerified());
    }

    // Bandingkan password dengan hash yang disimpan
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return left(new ErrorRegister.InvalidPassword());
    }

    // Generate access token sederhana untuk mock
    const accessToken = `mock_token_${uuidv4()}`;

    const { password: _, ...userWithoutPassword } = user;

    return right({
      user: userWithoutPassword,
      accessToken,
    });
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto): Promise<UpdateProfileResult> {
    const userIndex = this.users.findIndex((user) => user.id === userId);
    if (userIndex === -1) {
      return left(new ErrorRegister.UserNotFound());
    }

    this.users[userIndex] = {
      ...this.users[userIndex],
      ...updateProfileDto,
    };

    const { password, ...userWithoutPassword } = this.users[userIndex];
    return right(userWithoutPassword);
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
}
