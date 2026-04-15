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

const loginSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  password: z.string().min(1, "请输入密码"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [apiError, setApiError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  // 临时绕过：已登录不再自动重定向
  // useEffect(() => {
  //   if (isAuthenticated) router.replace("/");
  // }, [isAuthenticated, router]);

  const onSubmit = async (data: LoginForm) => {
    setApiError("");
    setSubmitting(true);
    try {
      await login(data);
      router.push("/");
    } catch {
      setApiError("登录失败，邮箱或密码错误");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageLayout requireAuth={false}>
      <div className="max-w-md mx-auto pt-8 animate-fade-in">
        <h1 className="text-gradient font-heading text-2xl font-bold mb-8">登录</h1>

        {apiError && (
          <p className="text-error text-sm mb-4">{apiError}</p>
        )}

        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" aria-label="登录表单">
          <Input
            label="邮箱"
            type="email"
            placeholder="请输入邮箱"
            error={errors.email?.message}
            {...register("email")}
          />
          <Input
            label="密码"
            type="password"
            placeholder="请输入密码"
            error={errors.password?.message}
            {...register("password")}
          />

          <Button type="submit" loading={submitting} className="w-full mt-2">
            登录
          </Button>
          </form>
        </div>

        <p className="text-text-secondary text-sm text-center mt-6">
          还没有账号？
          <Link href="/register" className="text-primary hover:underline ml-1">
            去注册
          </Link>
        </p>
      </div>
    </PageLayout>
  );
}
