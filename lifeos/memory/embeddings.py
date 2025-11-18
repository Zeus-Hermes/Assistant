from typing import List

from openai import OpenAI

client = OpenAI()


def generate_embedding(text: str) -> List[float]:
    """Generate an embedding vector for the given text using OpenAI."""
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text,
    )
    embedding = response.data[0].embedding

    if len(embedding) > 768:
        embedding = embedding[:768]
    elif len(embedding) < 768:
        embedding = embedding + [0.0] * (768 - len(embedding))

    return embedding
