"""
PDF/Word 文件解析引擎 — 对齐 Spec 08 §2 File Parser 层
使用 pdfplumber 解析 PDF，python-docx 解析 Word
"""

import signal
import os


class ParseTimeoutError(Exception):
    pass


def _timeout_handler(signum, frame):
    raise ParseTimeoutError("文件解析超时（30s）")


class PDFParser:
    """文件解析器（PDF/Word 文本提取）"""

    TIMEOUT = 30  # 对齐 Spec 10 §7：解析超时 30s → parse_status=failed

    def parse(self, file_path, file_type, progress_callback=None):
        """
        解析文件，返回解析结果
        对齐 Spec 10 §7：解析超时 30s → parse_status=failed
        :param file_path: 文件绝对路径
        :param file_type: pdf / doc / docx
        :param progress_callback: fn(percent:int) 进度回调
        :return: {title, content, pages} 或 {error: str}
        """
        try:
            # 设置超时（仅 Unix 系统）
            old_handler = None
            try:
                old_handler = signal.signal(signal.SIGALRM, _timeout_handler)
                signal.alarm(self.TIMEOUT)
            except (AttributeError, ValueError):
                pass  # Windows 无 SIGALRM

            if progress_callback:
                progress_callback(10)

            if file_type == "pdf":
                result = self._parse_pdf(file_path, progress_callback)
            elif file_type in ("doc", "docx"):
                result = self._parse_word(file_path, progress_callback)
            else:
                return {"error": f"不支持的文件类型: {file_type}"}

            # 取消超时
            try:
                signal.alarm(0)
                if old_handler:
                    signal.signal(signal.SIGALRM, old_handler)
            except (AttributeError, ValueError):
                pass

            if progress_callback:
                progress_callback(100)
            return result

        except ParseTimeoutError:
            return {"error": "文件解析超时（30s）"}
        except Exception as e:
            return {"error": str(e)}

    def _parse_pdf(self, file_path, progress_callback=None):
        """使用 pdfplumber 提取 PDF 文本"""
        import pdfplumber

        all_text = []
        title = ""
        total_pages = 0

        with pdfplumber.open(file_path) as pdf:
            total_pages = len(pdf.pages)
            for i, page in enumerate(pdf.pages):
                text = page.extract_text() or ""
                all_text.append(text)
                # 用第一页前 50 字符作标题
                if i == 0 and text.strip():
                    first_line = text.strip().split("\n")[0][:50]
                    title = first_line
                # 进度回调：10% ~ 90%
                if progress_callback and total_pages > 0:
                    pct = 10 + int(80 * (i + 1) / total_pages)
                    progress_callback(min(pct, 90))

        content = "\n\n".join(all_text).strip()
        if not content:
            content = "（PDF 未提取到有效文本内容）"

        return {
            "title": title or os.path.basename(file_path),
            "content": content,
            "pages": total_pages,
        }

    def _parse_word(self, file_path, progress_callback=None):
        """使用 python-docx 提取 Word 文本"""
        from docx import Document

        doc = Document(file_path)
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]

        if progress_callback:
            progress_callback(50)

        title = paragraphs[0][:50] if paragraphs else os.path.basename(file_path)
        content = "\n".join(paragraphs)

        if not content:
            content = "（Word 文档未提取到有效文本内容）"

        # Word 没有明确页数概念，按段落估算
        estimated_pages = max(1, len(paragraphs) // 25)

        return {
            "title": title,
            "content": content,
            "pages": estimated_pages,
        }


# 单例
pdf_parser = PDFParser()
