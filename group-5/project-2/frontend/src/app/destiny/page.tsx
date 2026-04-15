"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button, Card, Input, Tabs, DatePicker, ShichenPicker } from "@/components/ui";
import { DestinyResultView } from "@/components/business/DestinyResultView";
import { useAuthStore } from "@/stores/auth";
import { useDestinyStore } from "@/stores/destiny";
import { SHICHEN_MAP } from "@/lib/utils/date";

const otherSchema = z.object({
  name: z.string().min(2, "姓名至少2个字符").max(20, "姓名最多20个字符"),
  gender: z.enum(["male", "female"], { message: "请选择性别" }),
  birthDate: z.string().min(1, "请选择出生日期"),
  birthTime: z.number({ message: "请选择出生时辰" }),
});

type OtherForm = z.infer<typeof otherSchema>;

const TABS = [
  { key: "self", label: "解析本人" },
  { key: "other", label: "解析他人" },
];

export default function DestinyPage() {
  const { profile, fetchProfile } = useAuthStore();
  const { activeTab, setActiveTab, result, loading, error, analyzeSelf, analyzeOther, clearResult } =
    useDestinyStore();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<OtherForm>({
    resolver: zodResolver(otherSchema),
  });

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const onOtherSubmit = async (data: OtherForm) => {
    await analyzeOther({
      name: data.name,
      gender: data.gender,
      birthDate: data.birthDate,
      birthTime: data.birthTime,
      noBirthTime: data.birthTime === -1,
    });
  };

  const shichenLabel = (val: number) => {
    if (val === -1) return "不清楚";
    const s = SHICHEN_MAP.find((s) => s.value === val);
    return s ? `${s.label}（${s.range}）` : "";
  };

  return (
    <PageLayout requireAuth={true}>
      <div className="max-w-md mx-auto pt-8">
        <h1 className="text-gradient font-heading text-2xl font-bold mb-6">命格解析</h1>

        {error && <p className="text-error text-sm mb-4">{error}</p>}

        {/* 如果已有结果，显示结果 */}
        {result ? (
          <div className="space-y-6 animate-fade-in">
            <DestinyResultView data={result} />
            <Button variant="secondary" className="w-full" onClick={clearResult}>
              重新解析
            </Button>
          </div>
        ) : (
          <>
            <Tabs
              items={TABS}
              activeKey={activeTab}
              onChange={(key) => setActiveTab(key as "self" | "other")}
            />

            <div className="mt-6">
              {activeTab === "self" ? (
                profile ? (
                  <div className="space-y-6">
                    <Card className="border border-[#F7931A]/20 shadow-[0_0_15px_-3px_rgba(247,147,26,0.15)]">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-text-secondary">姓名</span>
                          <span className="text-text-primary">{profile.nickname}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-secondary">性别</span>
                          <span className="text-text-primary">
                            {profile.gender === "male" ? "男" : "女"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-secondary">出生日期</span>
                          <span className="text-text-primary">{profile.birthDate}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-secondary">时辰</span>
                          <span className="text-text-primary">
                            {shichenLabel(profile.birthTime)}
                          </span>
                        </div>
                      </div>
                    </Card>
                    <Button
                      className="w-full"
                      loading={loading}
                      onClick={analyzeSelf}
                    >
                      开始解析
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-12 space-y-4">
                    <p className="text-text-secondary">请先完善个人档案</p>
                    <Button
                      variant="secondary"
                      onClick={() => (window.location.href = "/profile")}
                    >
                      前往档案页
                    </Button>
                  </div>
                )
              ) : (
                <form onSubmit={handleSubmit(onOtherSubmit)} className="space-y-5" aria-label="他人命格解析表单">
                  <Input
                    label="姓名"
                    placeholder="2-20个字符"
                    error={errors.name?.message}
                    {...register("name")}
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

                  <Button type="submit" loading={loading} className="w-full">
                    开始解析
                  </Button>
                </form>
              )}
            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
}
