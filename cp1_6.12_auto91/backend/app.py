import random
import math
from flask import Flask, jsonify, request
from flask_cors import CORS
from sentiment_analysis import analyze_sentiment, EMOTION_LABELS, EMOTION_EMOJI

app = Flask(__name__)
CORS(app)
random.seed(42)

_sentiment_cache = {}

EVENT_START_HOUR = 18
EVENT_DURATION_SLOTS = 10

SAMPLE_COMMENTS = [
    "舞台效果太震撼了！灯光和音响完美配合，简直炸裂！",
    "主唱的声音太好听了，现场比录音版更有感染力，爱了爱了！",
    "没想到嘉宾突然登场，全场尖叫，太惊喜了！",
    "人真的超级多，挤了半天才到前排，但值了！",
    "encore环节泪目了，全场大合唱，感动到哭",
    "排队买水排了20分钟，体验有点差，希望下次改进",
    "音乐节的氛围真的太棒了，每个人都好嗨！",
    "吉他solo那段帅炸了，鸡皮疙瘩都起来了",
    "有点担心散场交通，但现场安保很到位",
    "灯光秀太惊艳了，手机根本拍不出现场的感觉",
    "歌单都是我喜欢的！完美的夜晚",
    "音响有点问题，后排听不清楚，有点小失望",
    "和朋友一起蹦迪真的太开心了，青春的感觉！",
    "主唱突然跳下台互动，前排观众疯了！",
    "有点紧张，第一次去这么大的演唱会",
    "结束了好不舍得，不想离开这片场地",
    "周边太贵了，性价比不高，生气",
    "现场的烟花太惊喜，绚烂到想哭",
    "舞台设计很有创意，科技感满满",
    "旁边的人太吵了，影响听歌体验",
    "鼓手solo那段燃爆全场，热血沸腾！",
    "今天的风好舒服，草坪上听歌真享受",
    "没想到能听到这首冷门歌，意外之喜",
    "安检排队太久了，差点错过开场",
    "全场手机闪光灯亮起来的时候，像星空一样治愈",
    "Bass震得心脏咚咚跳，现场真的不一样",
    "和陌生人一起合唱的感觉太棒了，感动",
    "有点担心安全问题，人太多了容易挤",
    "这个乐队现场真的稳，和CD一模一样",
    "最后一首歌全场大合唱，泪洒现场",
    "啤酒摊的队伍太长了，渴死我了",
    "灯光突然变紫那一瞬间，起鸡皮疙瘩了",
    "爱死这个主唱的舞台表现力了！",
    "站了三个小时腿好酸，但完全值得",
    "音乐节的日落超美，氛围感拉满",
    "encore等了十分钟还没出来，有点焦虑",
    "旁边的小姐姐送了我贴纸，好暖心",
    "现场的彩虹旗太感动了，包容的氛围",
    "主唱讲话声音太小了，听不清说什么",
    "第一次现场听这首，哭成泪人了",
]

IMAGE_CATEGORIES = [
    ("concert_stage", "演唱会舞台", "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600&h=400&fit=crop"),
    ("crowd", "现场观众", "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=600&h=800&fit=crop"),
    ("stage_lights", "舞台灯光", "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=500&fit=crop"),
    ("band_performing", "乐队演出", "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&h=600&fit=crop"),
    ("festival_ground", "音乐节场地", "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&h=450&fit=crop"),
    ("singer_mic", "主唱特写", "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&h=700&fit=crop"),
    ("concert_fireworks", "烟花", "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&h=400&fit=crop"),
    ("audience_hands", "观众举手", "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=600&h=500&fit=crop"),
]


def _format_time(slot_index: int) -> str:
    total_minutes = EVENT_START_HOUR * 60 + slot_index * 30
    hour = total_minutes // 60
    minute = total_minutes % 60
    return f"{hour:02d}:{minute:02d}"


def _generate_timeline_data():
    timeline = []
    for i in range(EVENT_DURATION_SLOTS):
        peak_factor = math.sin((i / EVENT_DURATION_SLOTS) * math.pi)
        base_score = 0.3 + peak_factor * 0.4
        noise = random.uniform(-0.15, 0.15)
        avg_score = max(-1.0, min(1.0, base_score + noise))
        comment_count = random.randint(20, 80)
        timeline.append({
            'time': _format_time(i),
            'timestamp': i,
            'avg_sentiment': round(avg_score, 3),
            'comment_count': comment_count,
            'emotion_distribution': {
                emo: round(random.uniform(2, 8) + (peak_factor * 2 if emo in ['joy', 'surprise'] else 0), 2)
                for emo in EMOTION_LABELS
            }
        })
    return timeline


def _generate_comments(timeline):
    all_comments = []
    for slot in timeline:
        num_comments = min(slot['comment_count'], random.randint(3, 8))
        comments_for_slot = random.sample(SAMPLE_COMMENTS, min(num_comments, len(SAMPLE_COMMENTS)))
        for idx, text in enumerate(comments_for_slot):
            emotion_choice = random.choices(
                EMOTION_LABELS,
                weights=[slot['emotion_distribution'][e] for e in EMOTION_LABELS],
                k=1
            )[0]
            comment_analysis = analyze_sentiment([text])[0]
            all_comments.append({
                'id': f"c_{slot['timestamp']}_{idx}",
                'text': text,
                'time': slot['time'],
                'timestamp': slot['timestamp'],
                'emotion': emotion_choice,
                'emotion_label': EMOTION_EMOJI[emotion_choice],
                'score': comment_analysis['score'],
                'user': f"用户{random.randint(1000, 9999)}"
            })
    return all_comments


def _generate_media(comments):
    media_items = []
    num_media = 45
    for i in range(num_media):
        img_idx = i % len(IMAGE_CATEGORIES)
        cat_id, cat_name, img_url = IMAGE_CATEGORIES[img_idx]
        slot_idx = random.randint(0, EVENT_DURATION_SLOTS - 1)
        emotion = random.choice(EMOTION_LABELS)
        related_comment = random.choice(comments) if comments else None
        media_items.append({
            'id': f"m_{i}",
            'image_url': f"{img_url}&sig={i}",
            'thumbnail_url': f"{img_url}&sig={i}&w=300",
            'caption': random.choice([
                "现场氛围拉满！🔥",
                "今晚的舞台太美了",
                "和最好的朋友在这里",
                "完美的夜晚，完美的演出",
                "太开心了！还想再来一次",
                "音乐让人忘记一切",
                "这一刻，永远铭记",
                "散场前的最后一首歌",
                f"#{cat_name} #音乐节",
                "青春的样子"
            ]),
            'time': _format_time(slot_idx),
            'timestamp': slot_idx,
            'emotion': emotion,
            'emotion_label': EMOTION_EMOJI[emotion],
            'likes': random.randint(10, 500),
            'user': f"用户{random.randint(1000, 9999)}",
            'related_comment_id': related_comment['id'] if related_comment else None
        })
    media_items.sort(key=lambda x: x['timestamp'])
    return media_items


def _generate_emotion_summary(comments, media):
    all_items = comments + [{'emotion': m['emotion']} for m in media]
    emotion_counts = {e: 0 for e in EMOTION_LABELS}
    for item in all_items:
        emotion_counts[item['emotion']] += 1
    total = sum(emotion_counts.values()) or 1
    emotion_summary = {
        e: {
            'count': emotion_counts[e],
            'ratio': round(emotion_counts[e] / total, 3),
            'score': round((emotion_counts[e] / total) * 8 + random.uniform(0.5, 2.0), 2)
        }
        for e in EMOTION_LABELS
    }
    emotion_summary['joy']['score'] = min(10.0, emotion_summary['joy']['score'] + 0.8)
    return emotion_summary


def _build_initial_data():
    timeline = _generate_timeline_data()
    comments = _generate_comments(timeline)
    media = _generate_media(comments)
    emotion_summary = _generate_emotion_summary(comments, media)
    return {
        'event_name': '夏日星空音乐节 2026',
        'event_date': '2026-06-10',
        'event_duration': f"{_format_time(0)} - {_format_time(EVENT_DURATION_SLOTS)}",
        'stats': {
            'total_comments': len(comments),
            'total_media': len(media),
            'avg_sentiment': round(sum(c['score'] for c in comments) / len(comments), 3) if comments else 0
        },
        'timeline': timeline,
        'comments': comments,
        'media': media,
        'emotion_summary': emotion_summary
    }


_initial_data_cache = _build_initial_data()


@app.route('/api/initial_data', methods=['GET'])
def get_initial_data():
    global _initial_data_cache
    if _initial_data_cache is None:
        _initial_data_cache = _build_initial_data()
    return jsonify(_initial_data_cache)


@app.route('/api/sentiment_analysis', methods=['POST'])
def sentiment_analysis_endpoint():
    data = request.get_json(silent=True)
    if not data or 'texts' not in data:
        return jsonify({'error': 'Missing required field: texts'}), 400
    texts = data['texts']
    if not isinstance(texts, list):
        return jsonify({'error': 'Field texts must be a list'}), 400

    cache_key = tuple(texts)
    if cache_key in _sentiment_cache:
        return jsonify({'results': _sentiment_cache[cache_key]})

    results = analyze_sentiment(texts)
    if len(_sentiment_cache) < 1000:
        _sentiment_cache[cache_key] = results
    return jsonify({'results': results})


if __name__ == '__main__':
    app.run(debug=True, port=5000, host='0.0.0.0')
