-- Workouts tracker base table
create table if not exists workouts (
    id uuid primary key,
    workout_type text not null,
    duration_minutes integer,
    intensity text,
    notes text,
    occurred_at timestamptz default now(),
    pattern_label text,
    metadata jsonb default '{}'::jsonb
);

create index if not exists idx_workouts_type on workouts(workout_type);
create index if not exists idx_workouts_occurred_at on workouts(occurred_at desc);
