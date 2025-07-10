import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UsersService {
  private users: User[] = [];
  private verificationTokens: Map<string, string> = new Map();

  async create(createUserDto: CreateUserDto): Promise<{ user: Omit<User, 'password'>; verificationToken: string }> {
    const existingUser = this.users.find(user => user.email === createUserDto.email);
    if (existingUser) {
      throw new BadRequestException('Email sudah terdaftar');
    }

    const newUser = new User({
      id: uuidv4(),
      email: createUserDto.email,
      password: createUserDto.password,
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

    return { 
      user: userWithoutPassword, 
      verificationToken 
    };
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<Omit<User, 'password'>> {
    const { email, verificationToken } = verifyEmailDto;
    
    const storedToken = this.verificationTokens.get(email);
    if (!storedToken || storedToken !== verificationToken) {
      throw new BadRequestException('Token verifikasi tidak valid');
    }

    const user = this.users.find(user => user.email === email);
    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    user.isEmailVerified = true;
    this.verificationTokens.delete(email);

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async login(loginDto: LoginDto): Promise<{ user: Omit<User, 'password'>; accessToken: string }> {
    const { email, password } = loginDto;
    
    const user = this.users.find(user => user.email === email);
    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    if (!user.isEmailVerified) {
      throw new BadRequestException('Email belum diverifikasi');
    }

    if (user.password !== password) { 
      throw new BadRequestException('Password salah');
    }

    // Generate access token sederhana untuk mock
    const accessToken = `mock_token_${uuidv4()}`;

    const { password: _, ...userWithoutPassword } = user;

    return { 
      user: userWithoutPassword,
      accessToken 
    };
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto): Promise<Omit<User, 'password'>> {
    const userIndex = this.users.findIndex(user => user.id === userId);
    if (userIndex === -1) {
      throw new NotFoundException('User tidak ditemukan');
    }

    this.users[userIndex] = {
      ...this.users[userIndex],
      ...updateProfileDto,
    };

    const { password, ...userWithoutPassword } = this.users[userIndex];
    return userWithoutPassword;
  }

  async findById(userId: string): Promise<Omit<User, 'password'>> {
    const user = this.users.find(user => user.id === userId);
    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }
    
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async findByUsername(username: string): Promise<Omit<User, 'password'>> {
    const user = this.users.find(user => user.username === username);
    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }
    
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async canViewUserProfile(viewerId: string, profileId: string): Promise<boolean> {
    // Jika melihat profil sendiri, selalu diizinkan
    if (viewerId === profileId) {
      return true;
    }

    const user = await this.findById(profileId);
    
    if (!user.isPrivate) {
      return true;
    }

    return Array.isArray(user.followers) && user.followers.includes(viewerId);
  }
}