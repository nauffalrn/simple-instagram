class Left<R = unknown> {
  readonly _tag = 'Left';
  private errorValue: R;

  constructor(errorValue: R) {
    this.errorValue = errorValue;
  }

  get error(): R {
    return this.errorValue;
  }

  isLeft(): this is Left {
    return this._tag === 'Left';
  }
}

class Right<R = unknown> {
  readonly _tag = 'Right';
  private dataValue: R;

  constructor(dataValue: R) {
    this.dataValue = dataValue;
  }

  get value(): R {
    return this.dataValue;
  }

  isLeft(): this is Left {
    return this._tag !== 'Right';
  }
}

export type Either<L, R> = Left<L> | Right<R>;

export function left<L, R>(error: L): Either<L, R> {
  return new Left(error);
}

export function right<L, R>(value: R): Either<L, R> {
  return new Right(value);
}

export namespace ErrorRegister {
  export class InputanSalah extends Error {
    constructor(message: string) {
      super(message);
    }
  }

  export class EmailAlreadyRegistered extends Error {
    constructor() {
      super('Email sudah terdaftar');
    }
  }

  export class InvalidVerificationToken extends Error {
    constructor() {
      super('Token verifikasi tidak valid');
    }
  }

  export class UserNotFound extends Error {
    constructor() {
      super('User tidak ditemukan');
    }
  }

  export class EmailNotVerified extends Error {
    constructor() {
      super('Email belum diverifikasi');
    }
  }

  export class InvalidPassword extends Error {
    constructor() {
      super('Password salah');
    }
  }

  export class CannotFollowSelf extends Error {
    constructor() {
      super('Tidak bisa mengikuti diri sendiri');
    }
  }

  export class AlreadyFollowing extends Error {
    constructor() {
      super('Sudah mengikuti pengguna ini');
    }
  }

  export class NotFollowing extends Error {
    constructor() {
      super('Belum mengikuti pengguna ini');
    }
  }

  export class PostNotFound extends Error {
    constructor() {
      super('Post tidak ditemukan atau Anda tidak memiliki izin');
    }
  }

  export class ProfilePrivate extends Error {
    constructor() {
      super('Akun ini private. Anda perlu mengikuti pengguna untuk melihat post.');
    }
  }
}
