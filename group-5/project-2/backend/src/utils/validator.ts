import { z } from 'zod';

const COMMON_WEAK_PASSWORDS = [
  'password', '12345678', '123456789', 'qwerty123', 'abc12345',
];

export const registerSchema = z.object({
  email: z.string().email({ message: '邮箱格式无效' }).optional(),
  phone: z.string().regex(/^1[3-9]\d{9}$/, { message: '手机号格式无效' }).optional(),
  password: z
    .string()
    .min(8, '密码至少8位')
    .regex(/[a-z]/, '密码需包含小写字母')
    .regex(/[A-Z]/, '密码需包含大写字母')
    .regex(/\d/, '密码需包含数字')
    .refine((val) => !COMMON_WEAK_PASSWORDS.includes(val.toLowerCase()), {
      message: '密码过于简单',
    }),
  nickname: z.string().min(1, '昵称不能为空').max(30, '昵称最长30字符'),
});

export const loginSchema = z.object({
  email: z.string().email({ message: '邮箱格式无效' }),
  password: z.string().min(1, '密码不能为空'),
});

export const profileSchema = z.object({
  nickname: z.string().min(1).max(30).optional(),
  gender: z.enum(['male', 'female']).optional(),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为YYYY-MM-DD')
    .refine((val) => {
      const y = parseInt(val.slice(0, 4));
      return y >= 1900 && y <= 2100;
    }, { message: '日期范围应在1900-2100之间' }),
  birthTime: z.string().regex(/^\d{2}:\d{2}$/, '时间格式应为HH:mm').optional(),
});

export const qimenSchema = z.object({
  question: z.string().min(1, '问题不能为空').max(200),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
});

export const liurenSchema = z.object({
  question: z.string().min(1, '问题不能为空').max(200),
  numbers: z
    .array(z.number().int().min(1).max(12))
    .length(3, '需要3个数字'),
});

export const destinySchema = z.object({
  name: z.string().min(1, '姓名不能为空').max(20),
  gender: z.enum(['male', 'female']),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为YYYY-MM-DD')
    .refine((val) => {
      const y = parseInt(val.slice(0, 4));
      return y >= 1900 && y <= 2100;
    }, { message: '日期范围应在1900-2100之间' }),
  birthTime: z.string().regex(/^\d{2}:\d{2}$/, '时间格式应为HH:mm').optional(),
  noBirthTime: z.boolean().default(false),
});

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const firstError = result.error.errors[0];
    throw { statusCode: 400, code: 'VALIDATION_ERROR', message: firstError.message, details: result.error.errors };
  }
  return result.data;
}
