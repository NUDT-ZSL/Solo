from ..models import SentimentStats


POSITIVE_WORDS = {
    "好棒", "优秀", "完美", "成功", "高效", "不错", "很好", "非常好", "赞", "厉害",
    "满意", "出色", "卓越", "精彩", "棒", "好", "积极", "进步", "创新", "突破",
    "great", "excellent", "perfect", "amazing", "wonderful", "good", "awesome",
    "fantastic", "outstanding", "brilliant", "success", "successful", "best",
    "nice", "happy", "positive", "impressive", "remarkable",
}


NEGATIVE_WORDS = {
    "差", "慢", "问题", "困难", "糟糕", "延迟", "失败", "不好", "差劲", "烂",
    "麻烦", "错误", "bug", "缺陷", "卡顿", "滞后", "严重", "紧急", "风险", "担忧",
    "bad", "poor", "terrible", "awful", "slow", "problem", "issue", "difficult",
    "hard", "fail", "failed", "failure", "wrong", "error", "bug", "delay",
    "delayed", "late", "worse", "worst", "negative", "unfortunate",
}


def analyze_sentiment(items) -> SentimentStats:
    positive = 0
    neutral = 0
    negative = 0
    for item in items:
        content = item.content.lower()
        pos_count = sum(1 for word in POSITIVE_WORDS if word in content)
        neg_count = sum(1 for word in NEGATIVE_WORDS if word in content)
        if pos_count > neg_count:
            positive += 1
        elif neg_count > pos_count:
            negative += 1
        else:
            neutral += 1
    return SentimentStats(positive=positive, neutral=neutral, negative=negative)
