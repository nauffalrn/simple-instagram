export class Post {
  id: string;
  userId: string;
  pictureUrl: string;
  caption: string;
  createdAt: Date;
  isDeleted: boolean;

  constructor(partial: Partial<Post>) {
    Object.assign(this, partial);
    this.createdAt = new Date();
    this.isDeleted = false;
  }
}
