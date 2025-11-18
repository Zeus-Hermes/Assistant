-- Enable pgvector and add embeddings to memories
create extension if not exists vector;

alter table if exists memories
add column if not exists embedding vector(768);

create or replace function match_memories(
    query_embedding vector(768),
    match_count int default 5,
    min_similarity double precision default 0
) returns table(
    id uuid,
    fact text,
    source text,
    timestamp timestamptz,
    category text,
    importance integer,
    tags text[],
    context text,
    similarity double precision
) as $$
    select
        m.id,
        m.fact,
        m.source,
        m.timestamp,
        m.category,
        m.importance,
        m.tags,
        m.context,
        1 - (m.embedding <=> query_embedding) as similarity
    from memories m
    where m.embedding is not null
      and (min_similarity <= 0 or 1 - (m.embedding <=> query_embedding) >= min_similarity)
    order by m.embedding <=> query_embedding
    limit match_count;
$$ language sql stable;
