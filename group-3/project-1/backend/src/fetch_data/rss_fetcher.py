"""
RSS新闻抓取模块
支持多源RSS抓取、去重、基础信息提取、落库
"""
import feedparser
import hashlib
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Optional
import time
from src.config import get_logger
from ..utils.db import get_cursor

logger = get_logger(__name__)

class RSSNewsItem:
    """单条新闻数据结构"""
    
    def __init__(self, title: str, link: str, source: str, category: str,
                 published: Optional[datetime] = None, summary: str = "",
                 language: str = "zh"):
        self.id = self._generate_id(title, link)
        self.title = title
        self.link = link
        self.source = source
        self.category = category
        self.published = published or datetime.now(timezone.utc)
        self.summary = summary
        self.language = language
        self.fetched_at = datetime.now(timezone.utc)
        
        # 分析字段（后续填充）
        self.sentiment = None
        self.importance = None
        self.tickers = []
        
    def _generate_id(self, title: str, link: str) -> str:
        """生成唯一ID"""
        content = f"{title}{link}".encode('utf-8')
        return hashlib.md5(content).hexdigest()[:12]
    
    def to_dict(self) -> Dict:
        """转换为字典"""
        return {
            "id": self.id,
            "title": self.title,
            "link": self.link,
            "source": self.source,
            "category": self.category,
            "published": self.published.isoformat() if self.published else None,
            "summary": self.summary,
            "language": self.language,
            "fetched_at": self.fetched_at.isoformat(),
            "sentiment": self.sentiment,
            "importance": self.importance,
            "tickers": self.tickers
        }


class RSSFetcher:
    """RSS新闻抓取器"""
    
    def __init__(self, config: Dict):
        self.config = config
        self.timeout = config.get('request_timeout', 30)
        self.retry_times = config.get('retry_times', 3)
        self.max_per_source = config.get('max_news_per_source', 50)
        self.anti_bot_config = config.get('anti_bot', {})
        
    def fetch_source(self, source_config: Dict) -> List[RSSNewsItem]:
        """
        从单个RSS源抓取新闻
        
        Args:
            source_config: RSS源配置，包含name, url, category, language
            anti_bot: 是否使用反爬虫模式 (可选，覆盖全局配置)
            
        Returns:
            List[RSSNewsItem]: 新闻列表
        """
        name = source_config['name']
        url = source_config['url']
        category = source_config.get('category', 'general')
        language = source_config.get('language', 'zh')
        anti_bot_enabled = source_config.get('anti_bot', self.anti_bot_config.get('enabled', False))
        
        logger.info(f"开始抓取: {name} ({url})")
        
        content = None
        feed = None
        
        # 首先尝试标准模式（直连）
        for attempt in range(self.retry_times):
            try:
                logger.info(f"[{name}] 使用标准模式(直连)抓取...")
                feed = feedparser.parse(url, request_headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                })
                
                # 检查是否获取到有效内容
                if feed.entries:
                    logger.info(f"[{name}] 标准模式抓取成功")
                    break
                elif feed.bozo and hasattr(feed, 'bozo_exception'):
                    # 有解析错误，可能是反爬虫阻挡
                    logger.warning(f"[{name}] 标准模式解析警告: {feed.bozo_exception}")
                    feed = None
                else:
                    logger.warning(f"[{name}] 标准模式返回空内容，可能是被阻挡")
                    feed = None
                    
            except Exception as e:
                logger.warning(f"[{name}] 标准模式失败 (尝试 {attempt + 1}/{self.retry_times}): {e}")
                if attempt < self.retry_times - 1:
                    time.sleep(2 ** attempt)
                feed = None
        
        # 如果标准模式失败且启用了反爬虫模式，尝试反爬虫模式
        if feed is None and anti_bot_enabled:
            logger.info(f"[{name}] 标准模式失败，尝试反爬虫模式...")
            anti_bot_fetcher = AntiBotFetcher(self.anti_bot_config)
            content = anti_bot_fetcher.fetch(url)
            
            if content:
                # 使用获取到的内容解析RSS
                feed = feedparser.parse(content)
                logger.info(f"[{name}] 反爬虫模式抓取成功")
            else:
                logger.error(f"[{name}] 反爬虫模式也失败")
                return []
        elif feed is None:
            logger.error(f"[{name}] 所有抓取方式均失败")
            return []
        
        # 解析新闻条目
        try:
            if feed.bozo and hasattr(feed, 'bozo_exception'):
                logger.warning(f"{name} 解析警告: {feed.bozo_exception}")
            
            news_items = []
            for entry in feed.entries[:self.max_per_source]:
                try:
                    # 解析发布时间
                    published = self._parse_date(entry)
                    
                    # 获取摘要
                    summary = self._extract_summary(entry)
                    
                    news = RSSNewsItem(
                        title=str(entry.get('title', '无标题')),
                        link=str(entry.get('link', '')),
                        source=name,
                        category=category,
                        published=published,
                        summary=summary,
                        language=language
                    )
                    news_items.append(news)
                    
                except Exception as e:
                    logger.warning(f"解析单条新闻失败: {e}")
                    continue
            
            logger.info(f"{name} 抓取完成: {len(news_items)} 条")
            return news_items
            
        except Exception as e:
            logger.error(f"{name} 解析新闻失败: {e}")
            return []
    
    def fetch_all(self, sources: List[Dict]) -> List[RSSNewsItem]:
        """
        从所有配置的RSS源抓取新闻
        
        Args:
            sources: RSS源配置列表
            
        Returns:
            List[RSSNewsItem]: 合并后的新闻列表（已去重）
        """
        all_news = []
        seen_ids = set()
        
        for source in sources:
            try:
                news_list = self.fetch_source(source)
                for news in news_list:
                    if news.id not in seen_ids:
                        all_news.append(news)
                        seen_ids.add(news.id)
            except Exception as e:
                logger.error(f"抓取源 {source.get('name', 'unknown')} 失败: {e}")
                continue
        
        # 按发布时间排序
        all_news.sort(key=lambda x: x.published or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
        
        # 过滤掉7天以前的新闻
        from datetime import timedelta
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=7)
        filtered_news = [news for news in all_news if news.published and news.published >= cutoff_date]
        
        if len(filtered_news) < len(all_news):
            logger.info(f"过滤掉 {len(all_news) - len(filtered_news)} 条7天前的旧新闻")
        
        logger.info(f"总共抓取: {len(filtered_news)} 条新闻 (已过滤7天前数据)")
        return filtered_news
    
    def _parse_date(self, entry) -> Optional[datetime]:
        """解析发布时间"""
        try:
            if hasattr(entry, 'published_parsed') and entry.published_parsed:
                return datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
            elif hasattr(entry, 'updated_parsed') and entry.updated_parsed:
                return datetime(*entry.updated_parsed[:6], tzinfo=timezone.utc)
        except Exception:
            pass
        return None
    
    def _extract_summary(self, entry) -> str:
        """提取摘要"""
        # 尝试不同的字段
        if hasattr(entry, 'summary') and entry.summary:
            return self._clean_html(entry.summary)
        elif hasattr(entry, 'description') and entry.description:
            return self._clean_html(entry.description)
        elif hasattr(entry, 'content') and entry.content:
            return self._clean_html(entry.content[0].value)
        return ""
    
    def _clean_html(self, html: str) -> str:
        """简单的HTML清理"""
        import re
        # 移除HTML标签
        text = re.sub(r'<[^>]+>', '', html)
        # 移除多余空白
        text = re.sub(r'\s+', ' ', text)
        return text.strip()


# 便捷函数
def _ensure_situation_week_table() -> None:
    """确保 situation_week 表存在"""
    sql = """
    CREATE TABLE IF NOT EXISTS situation_week (
        week_number    INT           NOT NULL COMMENT '周编号（从 1 开始）',
        start_date     DATE          DEFAULT NULL COMMENT '周起始日期',
        end_date       DATE          DEFAULT NULL COMMENT '周结束日期',
        situation_score INT          DEFAULT NULL COMMENT '局势分值',
        summary        VARCHAR(500)  DEFAULT NULL COMMENT '周总结',
        created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        PRIMARY KEY (week_number)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='局势周数据表'
    """
    with get_cursor() as cursor:
        cursor.execute(sql)
    logger.info("数据库表 situation_week 已就绪")


def _calculate_week_number(dt: datetime) -> int:
    """计算日期所在年的周编号（ISO 周）"""
    iso = dt.isocalendar()
    return iso[1]


def save_news_to_situation_week(news_items: List[Dict]) -> int:
    """
    将RSS新闻数据聚合后保存到 situation_week 表

    按周聚合新闻，将新闻摘要合并为 summary

    Args:
        news_items: 新闻字典列表（来自 fetch_daily_news 返回值）

    Returns:
        影响的行数
    """
    if not news_items:
        logger.info("无新闻数据，跳过落库")
        return 0

    _ensure_situation_week_table()

    # 按周分组
    weeks: Dict[int, Dict] = {}
    for item in news_items:
        pub_date = item.get("published")
        if pub_date:
            if isinstance(pub_date, str):
                pub_date = datetime.fromisoformat(pub_date)
            week_num = _calculate_week_number(pub_date)
        else:
            week_num = _calculate_week_number(datetime.now(timezone.utc))

        if week_num not in weeks:
            weeks[week_num] = {
                "week_number": week_num,
                "titles": [],
                "sources": set(),
                "start_date": None,
                "end_date": None,
            }

        w = weeks[week_num]
        w["titles"].append(item.get("title", ""))
        w["sources"].add(item.get("source", ""))

        # 更新周起始结束日期
        if pub_date:
            if isinstance(pub_date, str):
                pub_date = datetime.fromisoformat(pub_date)
            pub_date_obj = pub_date.date() if hasattr(pub_date, "date") else pub_date
            if w["start_date"] is None or pub_date_obj < w["start_date"]:
                w["start_date"] = pub_date_obj
            if w["end_date"] is None or pub_date_obj > w["end_date"]:
                w["end_date"] = pub_date_obj

    # 插入/更新
    records = []
    for week_num, data in weeks.items():
        # 将新闻标题汇总为摘要（限制长度）
        summary_parts = []
        for t in data["titles"][:10]:  # 最多取10条
            summary_parts.append(t)
        summary = "；".join(summary_parts)
        if len(summary) > 500:
            summary = summary[:497] + "..."

        records.append({
            "week_number": week_num,
            "start_date": data["start_date"],
            "end_date": data["end_date"],
            "situation_score": len(data["titles"]),  # 用新闻数量作为初始分值
            "summary": summary,
        })

    # 批量 UPSERT
    insert_sql = """
    INSERT INTO situation_week (week_number, start_date, end_date, situation_score, summary)
    VALUES (%(week_number)s, %(start_date)s, %(end_date)s, %(situation_score)s, %(summary)s)
    ON DUPLICATE KEY UPDATE
        start_date = VALUES(start_date),
        end_date = VALUES(end_date),
        situation_score = VALUES(situation_score),
        summary = VALUES(summary)
    """

    total = 0
    with get_cursor() as cursor:
        for record in records:
            cursor.execute(insert_sql, record)
            total += cursor.rowcount

    logger.info(f"保存 {len(records)} 周新闻数据到 situation_week，影响 {total} 行")
    return total


def fetch_daily_news(config) -> List[Dict]:
    """
    抓取当日新闻并落库

    Args:
        config: 配置对象，需包含sources.rss和fetcher配置

    Returns:
        List[Dict]: 新闻字典列表
    """
    # 兼容 Pydantic AppConfig 和字典
    if hasattr(config, 'sources'):
        sources = getattr(config, 'sources', {}).get('rss', [])
    else:
        sources = config.get('sources', {}).get('rss', [])

    if hasattr(config, 'fetcher'):
        fetcher_config = config.fetcher
    else:
        fetcher_config = config.get('fetcher', {})

    if not sources:
        logger.warning("没有配置RSS源")
        return []

    fetcher = RSSFetcher(fetcher_config)
    news_items = fetcher.fetch_all(sources)

    news_dicts = [item.to_dict() for item in news_items]

    # 落库
    try:
        save_news_to_situation_week(news_dicts)
    except Exception as e:
        logger.error(f"保存新闻数据到数据库失败: {e}")

    return news_dicts


class AntiBotFetcher:
    """反爬虫绕过抓取器"""
    
    def __init__(self, config: Dict):
        """
        初始化反爬虫抓取器
        
        Args:
            config: 配置字典，包含:
                - method: 选择的抓取方法 ('cloudscraper', 'undetected_chromedriver', 'playwright_stealth')
                - proxy: 代理配置 (可选，可以是字符串或字典)
                - headless: 是否无头模式 (默认True)
                - timeout: 超时时间 (默认30)
        """
        self.config = config
        self.method = config.get('method', 'cloudscraper')
        self.proxy = self._parse_proxy(config.get('proxy'))
        self.headless = config.get('headless', True)
        self.timeout = config.get('timeout', 30)
    
    def _parse_proxy(self, proxy_config) -> Optional[str]:
        """
        解析代理配置
        
        Args:
            proxy_config: 代理配置，可以是字符串或字典
            
        Returns:
            代理URL字符串或None
        """
        if proxy_config is None:
            return None
        
        # 如果是字符串，直接使用
        if isinstance(proxy_config, str):
            return proxy_config if proxy_config else None
        
        # 如果是字典，检查enabled并提取代理URL
        if isinstance(proxy_config, dict):
            if not proxy_config.get('enabled', False):
                return None
            # 优先使用https代理，否则使用http
            https_proxy = proxy_config.get('https')
            http_proxy = proxy_config.get('http')
            return https_proxy or http_proxy or None
        
        return None
        
    def fetch_with_cloudscraper(self, url: str) -> Optional[str]:
        """
        使用cloudscraper抓取 (绕过Cloudflare保护)
        
        Args:
            url: 目标URL
            
        Returns:
            HTML/XML内容字符串，失败返回None
        """
        try:
            import cloudscraper
        except ImportError:
            logger.warning("cloudscraper库未安装，请运行: pip install cloudscraper")
            return None
            
        try:
            scraper = cloudscraper.create_scraper(
                browser={'browser': 'chrome', 'platform': 'windows', 'mobile': False}
            )
            
            proxies = None
            if self.proxy:
                proxies = {
                    'http': self.proxy,
                    'https': self.proxy
                }
            
            logger.info(f"[cloudscraper] 正在抓取: {url}")
            response = scraper.get(url, proxies=proxies, timeout=self.timeout)
            
            if response.status_code == 200:
                logger.info(f"[cloudscraper] 抓取成功: {url}")
                return response.text
            else:
                logger.warning(f"[cloudscraper] 请求失败，状态码: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"[cloudscraper] 抓取异常: {e}")
            return None
    
    def fetch_with_undetected_chromedriver(self, url: str) -> Optional[str]:
        """
        使用undetected_chromedriver抓取 (绕过JavaScript检测)
        
        Args:
            url: 目标URL
            
        Returns:
            HTML/XML内容字符串，失败返回None
        """
        try:
            import undetected_chromedriver as uc
        except ImportError:
            logger.warning("undetected_chromedriver库未安装，请运行: pip install undetected-chromedriver")
            return None
            
        driver = None
        try:
            options = uc.ChromeOptions()
            
            if self.headless:
                options.add_argument('--headless=new')
            options.add_argument('--no-sandbox')
            options.add_argument('--disable-dev-shm-usage')
            options.add_argument('--disable-gpu')
            
            if self.proxy:
                options.add_argument(f'--proxy-server={self.proxy}')
            
            logger.info(f"[undetected_chromedriver] 正在抓取: {url}")
            driver = uc.Chrome(options=options, version_main=None)
            driver.set_page_load_timeout(self.timeout)
            driver.get(url)
            
            # 等待页面加载
            time.sleep(2)
            
            content = driver.page_source
            logger.info(f"[undetected_chromedriver] 抓取成功: {url}")
            return content
            
        except Exception as e:
            logger.error(f"[undetected_chromedriver] 抓取异常: {e}")
            return None
        finally:
            if driver:
                try:
                    driver.quit()
                except:
                    pass
    
    def fetch_with_playwright_stealth(self, url: str) -> Optional[str]:
        """
        使用playwright-stealth抓取 (现代浏览器自动化)
        
        Args:
            url: 目标URL
            
        Returns:
            HTML/XML内容字符串，失败返回None
        """
        try:
            from playwright.sync_api import sync_playwright
            from playwright_stealth import stealth_sync  # type: ignore

        except ImportError:
            logger.warning("playwright/playwright-stealth库未安装，请运行: pip install playwright playwright-stealth && playwright install")
            return None
            
        try:
            logger.info(f"[playwright_stealth] 正在抓取: {url}")
            
            with sync_playwright() as p:
                browser_args = []
                if self.proxy:
                    browser_args.append(f'--proxy-server={self.proxy}')
                
                browser = p.chromium.launch(
                    headless=self.headless,
                    args=browser_args
                )
                
                context = browser.new_context()
                page = context.new_page()
                
                # 应用stealth补丁
                stealth_sync(page)
                
                page.set_default_timeout(self.timeout * 1000)
                page.goto(url, wait_until='networkidle')
                
                # 等待内容加载
                page.wait_for_load_state('domcontentloaded')
                
                content = page.content()
                logger.info(f"[playwright_stealth] 抓取成功: {url}")
                
                browser.close()
                return content
                
        except Exception as e:
            logger.error(f"[playwright_stealth] 抓取异常: {e}")
            return None
    
    def fetch(self, url: str) -> Optional[str]:
        """
        使用配置的方法抓取URL，失败时自动回退到其他方法
        
        Args:
            url: 目标URL
            
        Returns:
            HTML/XML内容字符串，全部失败返回None
        """
        # 按优先级尝试的方法列表（已移除undetected_chromedriver以避免超时）
        methods = [
            ('cloudscraper', self.fetch_with_cloudscraper),
            ('playwright_stealth', self.fetch_with_playwright_stealth),
        ]
        
        # 将配置的方法放在首位
        method_order = []
        for name, func in methods:
            if name == self.method:
                method_order.insert(0, (name, func))
            else:
                method_order.append((name, func))
        
        # 按顺序尝试
        for method_name, method_func in method_order:
            logger.info(f"尝试使用 {method_name} 方法抓取...")
            result = method_func(url)
            if result:
                return result
            logger.warning(f"{method_name} 方法失败，尝试下一个...")
        
        logger.error(f"所有反爬虫方法都失败: {url}")
        return None
