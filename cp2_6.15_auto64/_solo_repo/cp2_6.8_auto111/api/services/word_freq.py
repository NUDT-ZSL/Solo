import re
from typing import List
from ..models import WordFreq


STOP_WORDS = {
    "的", "了", "和", "是", "就", "都", "而", "及", "与", "着", "或", "一个", "没有",
    "我们", "你们", "他们", "她们", "它们", "这个", "那个", "这些", "那些", "但是",
    "因为", "所以", "如果", "虽然", "但是", "可以", "应该", "需要", "已经", "可能",
    "the", "a", "an", "and", "or", "but", "is", "are", "was", "were", "be", "been",
    "being", "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "need", "dare", "ought", "used",
    "to", "of", "in", "for", "on", "with", "at", "by", "from", "as", "into",
    "through", "during", "before", "after", "above", "below", "between", "out",
    "off", "over", "under", "again", "further", "then", "once", "here", "there",
    "when", "where", "why", "how", "all", "each", "few", "more", "most", "other",
    "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than",
    "too", "very", "just", "also", "now", "it", "its", "this", "that", "these",
    "those", "i", "me", "my", "we", "our", "you", "your", "he", "him", "his",
    "she", "her", "they", "them", "their", "what", "which", "who", "whom",
}


def _tokenize_chinese(text: str) -> List[str]:
    tokens = []
    for ch in text:
        if "\u4e00" <= ch <= "\u9fff":
            tokens.append(ch)
    two_grams = []
    for i in range(len(tokens) - 1):
        two_grams.append(tokens[i] + tokens[i + 1])
    return tokens + two_grams


def _tokenize_english(text: str) -> List[str]:
    text = text.lower()
    words = re.findall(r"[a-zA-Z]+", text)
    return words


def analyze_word_freq(items) -> List[WordFreq]:
    freq: dict = {}
    for item in items:
        content = item.content
        chinese_tokens = _tokenize_chinese(content)
        english_tokens = _tokenize_english(content)
        all_tokens = chinese_tokens + english_tokens
        for token in all_tokens:
            token_lower = token.lower()
            if token_lower in STOP_WORDS:
                continue
            if len(token_lower) < 1:
                continue
            freq[token_lower] = freq.get(token_lower, 0) + 1
    sorted_items = sorted(freq.items(), key=lambda x: x[1], reverse=True)[:50]
    return [WordFreq(text=word, value=count) for word, count in sorted_items]
