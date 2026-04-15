# -*- coding: utf-8 -*-
"""审核流程服务"""

import json
import threading
from datetime import datetime, timedelta
from app.extensions import db
from app.models import Review, Issue, Rule
from app.utils.errors import NotFoundError, ErrorCodes


# 审核步骤定义
REVIEW_STEPS = [
    {"name": "文件解析", "progress": 15},
    {"name": "合规规则匹配", "progress": 35},
    {"name": "AI语义分析", "progress": 58},
    {"name": "数据来源交叉验证", "progress": 80},
    {"name": "生成审核报告", "progress": 100}
]


class ReviewService:
    """审核服务"""
    
    def __init__(self):
        self.active_reviews = {}  # 存储正在进行的审核任务
    
    def create_review(self, report_type, mode, file_path, file_name, title=None, author=None):
        """创建审核记录
        
        Args:
            report_type: 研报类型
            mode: 审核模式
            file_path: 文件路径
            file_name: 原始文件名
            title: 研报标题
            author: 作者
            
        Returns:
            Review: 审核记录
        """
        review = Review(
            id=Review.generate_id(),
            report_type=report_type,
            mode=mode,
            status='pending',
            file_path=file_path,
            file_name=file_name,
            title=title,
            author=author
        )
        
        db.session.add(review)
        db.session.commit()
        
        return review
    
    def start_review(self, review_id):
        """启动审核流程（异步）"""
        review = Review.query.get(review_id)
        if not review:
            raise NotFoundError("审核记录", review_id)
        
        if review.status != 'pending':
            raise ValueError("审核已开始或已完成")
        
        # 更新状态
        review.status = 'reviewing'
        review.current_step = REVIEW_STEPS[0]['name']
        review.progress = 0
        db.session.commit()
        
        # 启动后台线程
        thread = threading.Thread(
            target=self._run_review,
            args=(review_id,)
        )
        thread.start()
        
        return review
    
    def _run_review(self, review_id):
        """执行审核流程（后台线程）"""
        from app import create_app
        
        app = create_app()
        with app.app_context():
            try:
                review = Review.query.get(review_id)
                if not review:
                    return
                
                # 步骤1: 文件解析
                self._update_progress(review, 0)
                
                from app.services.file_service import file_service
                if review.file_path:
                    parsed = file_service.parse_file(review.file_path)
                    review.title = review.title or parsed.get('title')
                    review.author = review.author or parsed.get('author')
                    db.session.commit()
                
                # 步骤2: 合规规则匹配
                self._update_progress(review, 1)
                issues = self._execute_rules(review)
                
                # 步骤3: AI语义分析
                self._update_progress(review, 2)
                if review.mode in ['ai', 'combined']:
                    ai_issues = self._execute_ai_analysis(review)
                    issues.extend(ai_issues)
                
                # 步骤4: 数据来源交叉验证
                self._update_progress(review, 3)
                # TODO: 实现数据来源验证
                
                # 步骤5: 生成审核报告
                self._update_progress(review, 4)
                
                # 计算评分和状态
                score = self._calculate_score(issues)
                compliance_count = sum(1 for i in issues if i.category == 'compliance')
                content_count = sum(1 for i in issues if i.category == 'content')
                
                review.score = score
                review.compliance_issues = compliance_count
                review.content_issues = content_count
                review.progress = 100
                review.current_step = None
                
                # 确定状态
                has_p0 = any(i.severity == 'P0' for i in issues)
                has_p1_p2 = any(i.severity in ['P1', 'P2'] for i in issues)
                
                if has_p0:
                    review.status = 'failed'
                elif has_p1_p2:
                    review.status = 'warning'
                else:
                    review.status = 'passed'
                
                review.completed_at = datetime.utcnow()
                db.session.commit()
                
            except Exception as e:
                # 错误处理
                review = Review.query.get(review_id)
                if review:
                    review.status = 'failed'
                    review.current_step = f"审核失败: {str(e)}"
                    db.session.commit()
    
    def _update_progress(self, review, step_index):
        """更新进度"""
        step = REVIEW_STEPS[step_index]
        review.progress = step['progress']
        review.current_step = step['name']
        
        # 更新之前的步骤状态
        for i, s in enumerate(REVIEW_STEPS):
            if i < step_index:
                s['status'] = 'completed'
            elif i == step_index:
                s['status'] = 'in_progress'
            else:
                s['status'] = 'pending'
        
        db.session.commit()
    
    def _execute_rules(self, review):
        """执行规则检查"""
        from app.services.rule_service import rule_service
        
        # 获取文本内容
        text = ""
        if review.file_path:
            from app.services.file_service import file_service
            try:
                parsed = file_service.parse_file(review.file_path)
                text = parsed.get('text', '')
            except:
                pass
        
        # 执行规则
        issues = rule_service.execute_rules(text, review.mode)
        
        # 保存问题
        for issue in issues:
            issue.review_id = review.id
            db.session.add(issue)
        
        db.session.commit()
        
        return issues
    
    def _execute_ai_analysis(self, review):
        """执行AI分析"""
        from app.services.ai_service import ai_service
        
        text = ""
        if review.file_path:
            from app.services.file_service import file_service
            try:
                parsed = file_service.parse_file(review.file_path)
                text = parsed.get('text', '')
            except:
                pass
        
        issues = ai_service.analyze(text, review.id)
        return issues
    
    def _calculate_score(self, issues):
        """计算评分"""
        score = 100
        for issue in issues:
            if issue.severity == 'P0':
                score -= 20
            elif issue.severity == 'P1':
                score -= 10
            elif issue.severity == 'P2':
                score -= 5
        return max(0, score)
    
    def get_review(self, review_id):
        """获取审核记录"""
        review = Review.query.get(review_id)
        if not review:
            raise NotFoundError("审核记录", review_id)
        return review
    
    def get_review_status(self, review_id):
        """获取审核状态"""
        review = self.get_review(review_id)
        
        result = {
            'id': review.id,
            'status': review.status,
            'progress': review.progress,
        }
        
        if review.status == 'reviewing':
            result['currentStep'] = review.current_step
            result['steps'] = self._get_steps_status(review)
            result['estimatedRemaining'] = self._estimate_remaining(review)
        else:
            result['score'] = review.score
            result['totalIssues'] = review.compliance_issues + review.content_issues
            result['complianceIssues'] = review.compliance_issues
            result['contentIssues'] = review.content_issues
            if review.completed_at:
                result['completedAt'] = review.completed_at.isoformat() + '+08:00'
        
        return result
    
    def _get_steps_status(self, review):
        """获取步骤状态"""
        steps = []
        for i, step in enumerate(REVIEW_STEPS):
            if step['progress'] < review.progress:
                status = 'completed'
            elif step['progress'] == review.progress and review.status == 'reviewing':
                status = 'in_progress'
            else:
                status = 'pending'
            
            steps.append({
                'name': step['name'],
                'status': status,
                'progress': step['progress'] if status == 'completed' else (review.progress if status == 'in_progress' else 0)
            })
        
        return steps
    
    def _estimate_remaining(self, review):
        """估算剩余时间"""
        remaining = 100 - review.progress
        seconds = remaining * 2  # 假设每进度1%需要2秒
        return f"{seconds}秒"
    
    def get_review_list(self, page=1, page_size=20, status=None, mode=None, 
                        search=None, start_date=None, end_date=None):
        """获取审核历史列表"""
        query = Review.query
        
        if status:
            query = query.filter(Review.status == status)
        if mode:
            query = query.filter(Review.mode == mode)
        if search:
            query = query.filter(
                db.or_(
                    Review.title.ilike(f'%{search}%'),
                    Review.author.ilike(f'%{search}%'),
                    Review.id.ilike(f'%{search}%')
                )
            )
        if start_date:
            query = query.filter(Review.submitted_at >= start_date)
        if end_date:
            query = query.filter(Review.submitted_at < end_date + timedelta(days=1))
        
        total = query.count()
        reviews = query.order_by(Review.submitted_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
        
        return total, reviews
    
    def get_dashboard_stats(self):
        """获取仪表盘统计数据"""
        total = Review.query.count()
        
        # 近30天通过率
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_reviews = Review.query.filter(Review.submitted_at >= thirty_days_ago).all()
        
        passed = sum(1 for r in recent_reviews if r.status == 'passed')
        total_recent = len(recent_reviews)
        pass_rate = (passed / total_recent * 100) if total_recent > 0 else 0
        
        # 平均评分
        scores = [r.score for r in recent_reviews if r.score is not None]
        avg_score = sum(scores) / len(scores) if scores else 0
        
        # 今日审核数
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_count = Review.query.filter(Review.submitted_at >= today).count()
        
        # 待审核数
        pending_count = Review.query.filter(Review.status == 'pending').count()
        
        # 累计问题数
        compliance_total = db.session.query(db.func.sum(Review.compliance_issues)).scalar() or 0
        content_total = db.session.query(db.func.sum(Review.content_issues)).scalar() or 0
        
        return {
            'totalReviews': total,
            'passRate': round(pass_rate, 1),
            'avgScore': round(avg_score, 1),
            'avgDuration': '2.3分钟',  # 模拟数据
            'todayCount': today_count,
            'pendingCount': pending_count,
            'complianceIssuesTotal': compliance_total,
            'contentIssuesTotal': content_total
        }
    
    def get_trend_data(self):
        """获取近7日趋势数据"""
        trend = []
        for i in range(6, -1, -1):
            date = datetime.utcnow() - timedelta(days=i)
            date_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
            date_end = date_start + timedelta(days=1)
            
            reviews = Review.query.filter(
                Review.submitted_at >= date_start,
                Review.submitted_at < date_end
            ).all()
            
            total = len(reviews)
            passed = sum(1 for r in reviews if r.status == 'passed')
            failed = sum(1 for r in reviews if r.status in ['failed', 'warning'])
            
            trend.append({
                'day': f'{date.month}/{date.day}',
                'total': total,
                'passed': passed,
                'failed': failed
            })
        
        return trend
    
    def get_top_issues(self):
        """获取常见问题TOP5"""
        # 按规则名称统计
        from sqlalchemy import func
        
        result = db.session.query(
            Issue.rule_name,
            func.count(Issue.id).label('count')
        ).group_by(Issue.rule_name).order_by(func.count(Issue.id).desc()).limit(5).all()
        
        total = sum(r[1] for r in result) or 1
        
        issues = []
        for rule_name, count in result:
            issues.append({
                'name': rule_name,
                'count': count,
                'pct': round(count / total * 100)
            })
        
        return issues


# 单例
review_service = ReviewService()
