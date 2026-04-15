/* ---- API 数据类型定义（对齐 SPEC-09 API 接口规格） ---- */

export interface SkillSummary {
  skill_id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  rating_avg: number;
  rating_count: number;
  view_count: number;
  download_count: number;
  like_count: number;
  favorite_count: number;
  hot_score: number;
  has_bundle: boolean;
  updated_at: string;
}

export interface SkillDetail extends SkillSummary {
  skill_md: string;
  skill_md_html: string;
  created_at: string;
  bundle_size: number | null;
  file_count: number | null;
}

export interface Category {
  key: string;
  label: string;
  count: number;
}

export interface TagItem {
  tag: string;
  count: number;
}

/* ---- API 响应类型 ---- */

export interface ListResponse {
  traceId: string;
  items: SkillSummary[];
  total: number;
  page: number;
  page_size: number;
}

export interface DetailResponse extends SkillDetail {
  traceId: string;
}

export interface CreateResponse {
  traceId: string;
  skill_id: string;
  created_at: string;
}

export interface UploadResponse {
  traceId: string;
  skill_id: string;
  name: string;
  file_count: number;
  bundle_size: number;
}

export interface DraftResponse {
  traceId: string;
  skill_md_draft: string;
  fallback: boolean;
  upstream_latency_ms: number;
}

export interface SmartSearchResponse {
  traceId: string;
  items: (SkillSummary & { match_reason: string })[];
  keywords: string[];
  fallback: boolean;
  upstream_latency_ms: number;
}

export interface LikeResponse {
  traceId: string;
  skill_id: string;
  liked: boolean;
  like_count: number;
}

export interface FavoriteResponse {
  traceId: string;
  skill_id: string;
  favorited: boolean;
  favorite_count: number;
}

export interface RateResponse {
  traceId: string;
  skill_id: string;
  rating_avg: number;
  rating_count: number;
  my_score: number;
}

export interface TagsResponse {
  traceId: string;
  items: TagItem[];
}

export interface CategoriesResponse {
  traceId: string;
  items: Category[];
}

export interface FavoritesResponse {
  traceId: string;
  items: SkillSummary[];
  total: number;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details: Record<string, unknown>;
    traceId: string;
  };
}

/* ---- 前端筛选状态 ---- */

export type SortOption = 'hot' | 'downloads' | 'rating' | 'latest';
export type SearchMode = 'keyword' | 'smart';

export interface Filters {
  category: string;
  tags: string[];
  q: string;
  sort: SortOption;
  mode: SearchMode;
  page: number;
  page_size: number;
}

export const DEFAULT_FILTERS: Filters = {
  category: '',
  tags: [],
  q: '',
  sort: 'hot',
  mode: 'keyword',
  page: 1,
  page_size: 12,
};

/* ---- 排序选项展示 ---- */

export const SORT_OPTIONS: { value: SortOption; label: string; icon: string }[] = [
  { value: 'hot', label: '热度', icon: '🔥' },
  { value: 'downloads', label: '下载量', icon: '⬇' },
  { value: 'rating', label: '评分', icon: '⭐' },
  { value: 'latest', label: '最新', icon: '🆕' },
];

/* ---- 错误文案映射 ---- */

export const ERROR_MESSAGES: Record<string, string> = {
  EMPTY_FIELD: '必填字段不能为空（请检查 skill.md 中的 frontmatter 是否包含 name、description、category）',
  INVALID_CATEGORY: '分类不合法',
  INVALID_TAG: '标签不合法',
  INVALID_QUERY: '查询过长',
  INVALID_RATING: '评分必须 1–5',
  FILE_TOO_LARGE: '压缩包超过 10MB，请精简后重试',
  MISSING_SKILL_MD: '压缩包根目录必须包含 skill.md',
  BUNDLE_LIMIT_EXCEEDED: '解压后文件数或总大小超限',
  UNSAFE_ZIP: '压缩包包含不安全路径，已拒绝',
  RATE_LIMITED: '操作过于频繁，请稍后',
  SKILL_NOT_FOUND: '技能不存在',
  UPSTREAM_ERROR: '服务器开小差了，请稍后重试',
};
