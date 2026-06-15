POSITIVE_WORDS = {
    "开心", "快乐", "幸福", "美好", "喜欢", "爱", "温暖", "阳光", "希望", "梦想",
    "感恩", "感谢", "满足", "惊喜", "精彩", "棒", "好", "美", "甜", "笑",
    "成功", "胜利", "自由", "勇敢", "力量", "绽放", "闪耀", "光明", "欣慰", "期待",
    "治愈", "宁静", "和谐", "热爱", "珍惜", "拥抱", "闪耀", "灿烂", "欢喜", "甜蜜",
    "喜悦", "感动", "鼓舞", "振奋", "得意", "自豪", "放松", "安心", "舒适", "愉快",
    "优美", "壮观", "震撼", "惊艳", "绝美", "妙", "赞", "强", "厉害", "出色",
    "happy", "joy", "love", "hope", "dream", "bright", "warm", "beautiful", "amazing",
    "wonderful", "great", "awesome", "good", "nice", "perfect", "grateful", "excited",
    "inspired", "peaceful", "cheerful", "delightful", "fantastic", "brilliant", "superb",
}

NEGATIVE_WORDS = {
    "难过", "伤心", "痛苦", "失望", "孤独", "绝望", "悲伤", "焦虑", "恐惧", "愤怒",
    "厌烦", "无聊", "疲惫", "迷茫", "困惑", "遗憾", "后悔", "委屈", "无奈", "沮丧",
    "消沉", "低落", "忧郁", "郁闷", "烦躁", "不安", "害怕", "担心", "忧愁", "苦闷",
    "懊恼", "懊悔", "痛心", "心碎", "崩溃", "煎熬", "折磨", "挣扎", "逃避", "放弃",
    "哭", "泪", "碎", "冷", "暗", "伤", "痛", "苦", "悲", "哀",
    "sad", "pain", "hurt", "lonely", "angry", "fear", "anxious", "depressed",
    "disappointed", "hopeless", "lost", "confused", "tired", "bored", "frustrated",
    "miserable", "heartbroken", "devastated", "grief", "sorrow", "despair", "gloomy",
}


def analyze_sentiment(text: str) -> str:
    positive_count = 0
    negative_count = 0

    for word in POSITIVE_WORDS:
        if word in text:
            positive_count += 1

    for word in NEGATIVE_WORDS:
        if word in text:
            negative_count += 1

    if positive_count > negative_count:
        return "positive"
    elif negative_count > positive_count:
        return "negative"
    else:
        return "neutral"
