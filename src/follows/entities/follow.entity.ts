export class Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: Date;

  constructor(partial: Partial<Follow>) {
    Object.assign(this, partial);
    this.createdAt = new Date();
  }
}