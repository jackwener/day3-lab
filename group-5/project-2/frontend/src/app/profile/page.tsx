"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageLayout } from "@/components/layout/PageLayout";
import { Input, Button, Card, DatePicker, ShichenPicker } from "@/components/ui";
import { useAuthStore } from "@/stores/auth";
import type { BaziInfo } from "@/types";

const profileSchema = z.object({
  nickname: z.string().min(2, "昵称至少2个字符").max(20, "昵称最多20个字符"),
  gender: z.enum(["male", "female"], { message: "请选择性别" }),
  birthDate: z.string().min(1, "请选择出生日期"),
  birthTime: z.number({ message: "请选择出生时辰" }),
});

type ProfileForm = z.infer<typeof profileSchema>;

const WUXING_CONFIG = [
  { key: "metal" as const, label: "金", color: "bg-yellow-400" },
  { key: "wood" as const, label: "木", color: "bg-green-500" },
  { key: "water" as const, label: "水", color: "bg-blue-500" },
  { key: "fire" as const, label: "火", color: "bg-red-500" },
  { key: "earth" as const, label: "土", color: "bg-amber-700" },
];

export default function ProfilePage() {
  const { profile, fetchProfile, updateProfile } = useAuthStore();
  const [apiError, setApiError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (profile) {
      reset({
        nickname: profile.nickname,
        gender: profile.gender,
        birthDate: profile.birthDate,
        birthTime: profile.birthTime,
      });
    }
  }, [profile, reset]);

  const onSubmit = async (data: ProfileForm) => {
    setApiError("");
    setSuccess(false);
    setSubmitting(true);
    try {
      await updateProfile({
        nickname: data.nickname,
        gender: data.gender,
        birthDate: data.birthDate,
        birthTime: data.birthTime,
        noBirthTime: data.birthTime === -1,
      });
      setSuccess(true);
    } catch {
      setApiError("保存失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageLayout>
      <div className="max-w-md mx-auto pt-8">
        <h1 className="text-gradient font-heading text-2xl font-bold mb-8">个人档案</h1>

        {apiError && <p className="text-error text-sm mb-4">{apiError}</p>}
        {success && <p className="text-green-400 text-sm mb-4">保存成功</p>}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" aria-label="个人档案表单">
          <Input
            label="昵称"
            placeholder="2-20个字符"
            error={errors.nickname?.message}
            {...register("nickname")}
          />

          {/* 性别 */}
          <div>
            <label className="block text-text-secondary text-sm mb-2">性别</label>
            <Controller
              name="gender"
              control={control}
              render={({ field }) => (
                <div className="flex gap-4">
                  {([["male", "男"], ["female", "女"]] as const).map(([val, label]) => (
                    <label
                      key={val}
                      className={`flex-1 flex items-center justify-center py-2 rounded-lg border cursor-pointer transition-colors ${
                        field.value === val
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-white/20 text-text-secondary hover:border-white/40"
                      }`}
                    >
                      <input
                        type="radio"
                        className="sr-only"
                        value={val}
                        checked={field.value === val}
                        onChange={() => field.onChange(val)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              )}
            />
            {errors.gender && (
              <p className="text-error text-sm mt-1">{errors.gender.message}</p>
            )}
          </div>

          {/* 出生日期 */}
          <Controller
            name="birthDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                label="出生日期"
                value={field.value}
                onChange={field.onChange}
                error={errors.birthDate?.message}
              />
            )}
          />

          {/* 出生时辰 */}
          <Controller
            name="birthTime"
            control={control}
            render={({ field }) => (
              <ShichenPicker
                label="出生时辰"
                value={field.value}
                onChange={field.onChange}
                error={errors.birthTime?.message}
              />
            )}
          />

          <Button type="submit" loading={submitting} className="w-full mt-2">
            保存
          </Button>
        </form>

        {/* 八字信息 */}
        {profile?.bazi && <BaziSection bazi={profile.bazi} />}
      </div>
    </PageLayout>
  );
}

function BaziSection({ bazi }: { bazi: BaziInfo }) {
  const pillars = [
    { label: "年柱", value: bazi.yearPillar },
    { label: "月柱", value: bazi.monthPillar },
    { label: "日柱", value: bazi.dayPillar },
    { label: "时柱", value: bazi.hourPillar },
  ];

  const total = Object.values(bazi.wuxing).reduce((a, b) => a + b, 0) || 1;

  return (
    <Card variant="glass" className="mt-8 border border-[#F7931A]/20 shadow-[0_0_15px_-3px_rgba(247,147,26,0.15)]">
      <h2 className="font-heading text-lg text-text-primary mb-4">您的八字信息</h2>

      <div className="grid grid-cols-4 gap-3 mb-6">
        {pillars.map((p) => (
          <div key={p.label} className="text-center">
            <div className="text-text-secondary text-sm mb-1">{p.label}</div>
            <div className="font-mono text-text-primary text-lg">{p.value}</div>
          </div>
        ))}
      </div>

      <h3 className="text-text-secondary text-sm mb-3">五行分布</h3>
      <div className="space-y-2">
        {WUXING_CONFIG.map(({ key, label, color }) => {
          const pct = Math.round((bazi.wuxing[key] / total) * 100);
          return (
            <div key={key} className="flex items-center gap-2">
              <span className="text-text-secondary text-sm w-6">{label}</span>
              <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${color}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-text-secondary text-sm w-10 text-right">{pct}%</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
