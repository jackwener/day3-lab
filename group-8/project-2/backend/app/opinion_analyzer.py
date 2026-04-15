"""观点相似度分析模块 - 基于字符级 n-gram 的 Jaccard 相似度"""


def ngram_similarity(text_a: str, text_b: str, n: int = 3) -> float:
    """计算两段文本的字符级 n-gram Jaccard 相似度"""
    if not isinstance(text_a, str) or not isinstance(text_b, str):
        return 0.0

    text_a = text_a.strip()
    text_b = text_b.strip()

    if not text_a or not text_b:
        return 0.0

    if not isinstance(n, int) or n <= 0:
        n = 1

    def get_ngrams(text):
        if len(text) < n:
            return {text} if text else set()
        return {text[i:i + n] for i in range(len(text) - n + 1)}

    ngrams_a = get_ngrams(text_a)
    ngrams_b = get_ngrams(text_b)

    if not ngrams_a or not ngrams_b:
        return 0.0

    intersection = ngrams_a & ngrams_b
    union = ngrams_a | ngrams_b
    if not union:
        return 0.0
    return len(intersection) / len(union)


def find_common_and_diff_opinions(opinions_a: list, opinions_b: list, threshold: float = 0.7) -> dict:
    """
    比较两组观点，找出共同观点和差异观点。

    Args:
        opinions_a: 研报A的观点列表，每项为 {"text": "...", ...} 或纯字符串
        opinions_b: 研报B的观点列表
        threshold: 相似度阈值，>=此值判定为共同观点

    Returns:
        {
            "common_opinions": [{"text": "概括文本", "opinion_a": "原文A", "opinion_b": "原文B", "similarity": 0.82}],
            "diff_opinions_a": ["研报A独有观点"],
            "diff_opinions_b": ["研报B独有观点"]
        }
    """
    if not isinstance(threshold, (int, float)):
        threshold = 0.7
    threshold = max(0.0, min(float(threshold), 1.0))

    def extract_text(opinion):
        if isinstance(opinion, str):
            text = opinion
        elif isinstance(opinion, dict):
            text = opinion.get("text", "")
        else:
            text = ""
        return text.strip() if isinstance(text, str) else ""

    normalized_a = [extract_text(item) for item in (opinions_a or [])]
    normalized_b = [extract_text(item) for item in (opinions_b or [])]

    valid_a = [(index, text) for index, text in enumerate(normalized_a) if text]
    valid_b = [(index, text) for index, text in enumerate(normalized_b) if text]

    if not valid_a and not valid_b:
        return {
            "common_opinions": [],
            "diff_opinions_a": [],
            "diff_opinions_b": [],
        }

    if not valid_a:
        return {
            "common_opinions": [],
            "diff_opinions_a": [],
            "diff_opinions_b": [text for _, text in valid_b],
        }

    if not valid_b:
        return {
            "common_opinions": [],
            "diff_opinions_a": [text for _, text in valid_a],
            "diff_opinions_b": [],
        }

    candidate_pairs = []
    for index_a, text_a in valid_a:
        for index_b, text_b in valid_b:
            similarity = ngram_similarity(text_a, text_b)
            if similarity >= threshold:
                candidate_pairs.append((similarity, index_a, text_a, index_b, text_b))

    candidate_pairs.sort(key=lambda item: (-item[0], item[1], item[3]))

    matched_a = set()
    matched_b = set()
    common_opinions = []

    for similarity, index_a, text_a, index_b, text_b in candidate_pairs:
        if index_a in matched_a or index_b in matched_b:
            continue
        matched_a.add(index_a)
        matched_b.add(index_b)
        summary_text = text_a if len(text_a) <= len(text_b) else text_b
        common_opinions.append({
            "text": summary_text,
            "opinion_a": text_a,
            "opinion_b": text_b,
            "similarity": round(similarity, 4),
        })

    diff_opinions_a = [text for index, text in valid_a if index not in matched_a]
    diff_opinions_b = [text for index, text in valid_b if index not in matched_b]

    return {
        "common_opinions": common_opinions,
        "diff_opinions_a": diff_opinions_a,
        "diff_opinions_b": diff_opinions_b,
    }
