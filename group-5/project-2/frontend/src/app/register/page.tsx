"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageLayout } from "@/components/layout/PageLayout";
import { Input, Button } from "@/components/ui";
import { useAuthStore } from "@/stores/auth";

const registerSchema = z
  .object({
    email: z.string().email("请输入有效的邮箱地址"),
    phone: z.string().regex(/^1[3-9]\d{9}$/, "请输入有效的手机号"),
    password: z
      .string()
      .min(8, "密码至少8位")
      .regex(/[a-z]/, "需包含小写字母")
      .regex(/[A-Z]/, "需包含大写字母")
      .regex(/[0-9]/, "需包含数字"),
    confirmPassword: z.string(),
    nickname: z.string().min(2, "昵称至少2个字符").max(20, "昵称最多20个字符"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "两次密码输入不一致",
    path: ["confirmPassword"],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser } = useAuthStore();
  const [apiError, setApiError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  // 临时绕过：已登录不再自动重定向
  // useEffect(() => {
  //   if (isAuthenticated) router.replace("/");
  // }, [isAuthenticated, router]);

  const onSubmit = async (data: RegisterForm) => {
    setApiError("");
    setSubmitting(true);
    try {
      await registerUser({
        email: data.email,
        phone: data.phone,
        password: data.password,
        nickname: data.nickname,
      });
      router.push("/profile");
    } catch {
      setApiError("注册失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageLayout requireAuth={false}>
      <div className="max-w-md mx-auto pt-8 animate-fade-in">
        <h1 className="text-gradient font-heading text-2xl font-bold mb-8">创建账号</h1>

        {apiError && (
          <p className="text-error text-sm mb-4">{apiError}</p>
        )}

        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" aria-label="注册表单">
          <Input
            label="邮箱"
            type="email"
            placeholder="请输入邮箱"
            error={errors.email?.message}
            {...register("email")}
          />
          <Input
            label="手机号"
            type="tel"
            placeholder="请输入手机号"
            error={errors.phone?.message}
            {...register("phone")}
          />
          <Input
            label="密码"
            type="password"
            placeholder="至少8位，含大小写字母和数字"
            error={errors.password?.message}
            {...register("password")}
          />
          <Input
            label="确认密码"
            type="password"
            placeholder="请再次输入密码"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />
          <Input
            label="昵称"
            placeholder="2-20个字符"
            error={errors.nickname?.message}
            {...register("nickname")}
          />

          <Button type="submit" loading={submitting} className="w-full mt-2">
            注册
          </Button>
          </form>
        </div>

        <p className="text-text-secondary text-sm text-center mt-6">
          已有账号？
          <Link href="/login" className="text-primary hover:underline ml-1">
            去登录
          </Link>
        </p>
      </div>
    </PageLayout>
  );
}
