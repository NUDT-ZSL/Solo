from datetime import datetime, timedelta, timezone
from typing import Any

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


def find_similar_lines(
    content: str, lines: list[dict[str, Any]], top_k: int = 4
) -> list[dict[str, Any]]:
    if not lines:
        return []

    corpus = [content] + [line["content"] for line in lines]
    vectorizer = TfidfVectorizer(analyzer="char", ngram_range=(1, 3))
    tfidf_matrix = vectorizer.fit_transform(corpus)
    similarity_scores = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:]).flatten()

    scored_lines = list(zip(lines, similarity_scores))
    scored_lines.sort(key=lambda x: x[1], reverse=True)

    return [line for line, _ in scored_lines[:top_k]]


def generate_poem(
    new_line_data: dict[str, Any], all_lines: list[dict[str, Any]]
) -> dict[str, Any] | None:
    now = datetime.now(timezone.utc)
    seven_days_ago = now - timedelta(days=7)

    recent_lines = []
    for line in all_lines:
        created = datetime.fromisoformat(line["created_at"])
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        if created >= seven_days_ago and line["id"] != new_line_data["id"]:
            if line["anonymous_id"] != new_line_data["anonymous_id"]:
                recent_lines.append(line)

    similar_lines = find_similar_lines(new_line_data["content"], recent_lines, top_k=4)

    poem_lines = [new_line_data]
    num_to_add = min(len(similar_lines), 4)
    if num_to_add >= 2:
        poem_lines.extend(similar_lines[:num_to_add])
    elif num_to_add == 1:
        poem_lines.extend(similar_lines[:1])
    else:
        if len(poem_lines) < 1:
            return None

    total = len(poem_lines)
    if total > 5:
        poem_lines = poem_lines[:5]

    poem_id = f"poem_{__import__('uuid').uuid4().hex[:8]}"
    poem: dict[str, Any] = {
        "id": poem_id,
        "lines": poem_lines,
        "created_at": now.isoformat(),
        "stitch_count": 0,
    }
    return poem
