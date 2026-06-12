from typing import List, Dict, Tuple

POSITIVE_WORDS = {
    'joy': [
        '开心', '快乐', '幸福', '兴奋', '激动', '棒', '赞', '完美', '精彩', '热血',
        '爽', '嗨', '爱', '喜欢', '享受', '震撼', '炸裂', '狂欢', '沸腾', '治愈',
        'happy', 'love', 'amazing', 'awesome', 'great', 'fantastic', 'wonderful',
        'excellent', 'joy', 'excited', 'epic', 'vibe', 'fire', 'lit'
    ],
    'surprise': [
        '惊讶', '震惊', '没想到', '意外', '惊喜', '惊艳', '哇', '天呐', '不可思议',
        '出乎意料', '惊喜', 'unexpected', 'wow', 'surprise', 'incredible', 'unbelievable'
    ]
}

NEGATIVE_WORDS = {
    'sadness': [
        '难过', '伤心', '失落', '遗憾', '哭', '泪目', '不舍', '离别', '结束', '散场',
        'sad', 'cry', 'tears', 'miss', 'goodbye', 'ending'
    ],
    'anger': [
        '生气', '愤怒', '不满', '抱怨', '糟糕', '烂', '差', '失望', '拥挤', '排队',
        '贵', '坑', 'angry', 'bad', 'terrible', 'awful', 'disappointed', 'crowded', 'suck'
    ],
    'fear': [
        '害怕', '紧张', '担心', '焦虑', '恐慌', '恐惧', '不安', '拥挤', '危险',
        'scared', 'afraid', 'nervous', 'worried', 'fear', 'panic', 'anxious'
    ]
}

EMOTION_LABELS = ['joy', 'surprise', 'sadness', 'anger', 'fear']
EMOTION_EMOJI = {
    'joy': '😊',
    'surprise': '😲',
    'sadness': '😢',
    'anger': '😠',
    'fear': '😨'
}


def _count_emotion_matches(text: str) -> Dict[str, int]:
    text_lower = text.lower()
    counts = {}
    for emotion, words in POSITIVE_WORDS.items():
        counts[emotion] = sum(1 for w in words if w in text_lower)
    for emotion, words in NEGATIVE_WORDS.items():
        counts[emotion] = sum(1 for w in words if w in text_lower)
    return counts


def analyze_sentiment(texts: List[str]) -> List[Dict]:
    results = []
    for text in texts:
        matches = _count_emotion_matches(text)
        total_matches = sum(matches.values())

        if total_matches == 0:
            dominant_emotion = 'joy'
            score = 0.1
        else:
            dominant_emotion = max(matches, key=matches.get)
            positive_count = matches.get('joy', 0) + matches.get('surprise', 0)
            negative_count = (
                matches.get('sadness', 0)
                + matches.get('anger', 0)
                + matches.get('fear', 0)
            )
            raw_score = (positive_count - negative_count) / total_matches
            score = max(-1.0, min(1.0, raw_score))

        emotion_scores = {}
        for emo in EMOTION_LABELS:
            count = matches.get(emo, 0)
            emotion_scores[emo] = round(
                (count / total_matches * 10) if total_matches > 0 else (1.5 if emo in ['joy', 'surprise'] else 0.8),
                2
            )
            emotion_scores[emo] = min(10.0, emotion_scores[emo] + (1.0 if total_matches == 0 else 0))

        results.append({
            'text': text,
            'emotion': dominant_emotion,
            'emotion_label': EMOTION_EMOJI.get(dominant_emotion, '😊'),
            'score': round(score, 3),
            'emotion_scores': emotion_scores
        })

    return results
