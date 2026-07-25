import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;
const OTP_PLACEHOLDER_SALT = bcrypt.genSaltSync(SALT_ROUNDS);
const OTP_PLACEHOLDER_HASH = bcrypt.hashSync(
  'OTP_ONLY_PLACEHOLDER_PASSWORD_DO_NOT_USE',
  OTP_PLACEHOLDER_SALT
);

export const hashPassword = async (password: string) => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const comparePassword = async (password: string, hash: string) => {
  return bcrypt.compare(password, hash);
};

export const hashPasswordPlaceholder = async () => {
  return OTP_PLACEHOLDER_HASH;
};
