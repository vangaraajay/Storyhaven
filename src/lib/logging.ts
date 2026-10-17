import { createServiceSupabaseClient } from "@/lib/supabase/server";

export type BookStatus = "want" | "reading" | "finished" | "dropped";

export type BookLog = {
  id: string;
  profile_id: string;
  name: string;
  cover_url: string | null;
  rating: number | null;
  started_date: string | null;
  finished_date: string | null;
  liked: boolean;
  review: string | null;
  status: BookStatus | null;
  pages: number | null;
  created_at: string;
  updated_at: string;
};

export type MovieLog = {
  id: string;
  profile_id: string;
  name: string;
  cover_url: string | null;
  rating: number | null;
  finished_date: string | null;
  liked: boolean;
  review: string | null;
  runtime: number | null;
  created_at: string;
  updated_at: string;
};

export type AlbumLog = {
  id: string;
  profile_id: string;
  name: string;
  cover_url: string | null;
  rating: number | null;
  finished_date: string | null;
  liked: boolean;
  review: string | null;
  created_at: string;
  updated_at: string;
};

export type BookLogInput = {
  name: string;
  cover_url?: string | null;
  rating?: number | null;
  started_date?: string | null;
  finished_date?: string | null;
  liked?: boolean;
  review?: string | null;
  status?: BookStatus | null;
  pages?: number | null;
};

export type MovieLogInput = {
  name: string;
  cover_url?: string | null;
  rating?: number | null;
  finished_date?: string | null;
  liked?: boolean;
  review?: string | null;
  runtime?: number | null;
};

export type AlbumLogInput = {
  name: string;
  cover_url?: string | null;
  rating?: number | null;
  finished_date?: string | null;
  liked?: boolean;
  review?: string | null;
};

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseRating(value: number | null | undefined): number | null {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null;
  }
  if (value < 0 || value > 5) {
    throw new Error("Rating must be between 0 and 5.");
  }
  return value;
}

export async function listLogs(profileId: string) {
  const supabase = createServiceSupabaseClient();

  const [books, movies, albums] = await Promise.all([
    supabase
      .from("book_logs")
      .select("*")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false }),
    supabase
      .from("movie_logs")
      .select("*")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false }),
    supabase
      .from("album_logs")
      .select("*")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false }),
  ]);

  if (books.error) {
    throw new Error(`Failed to load books: ${books.error.message}`);
  }
  if (movies.error) {
    throw new Error(`Failed to load movies: ${movies.error.message}`);
  }
  if (albums.error) {
    throw new Error(`Failed to load albums: ${albums.error.message}`);
  }

  return {
    books: (books.data ?? []) as BookLog[],
    movies: (movies.data ?? []) as MovieLog[],
    albums: (albums.data ?? []) as AlbumLog[],
  };
}

export async function createBookLog(
  profileId: string,
  input: BookLogInput,
): Promise<BookLog> {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Name is required.");
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("book_logs")
    .insert({
      profile_id: profileId,
      name,
      cover_url: emptyToNull(input.cover_url),
      rating: parseRating(input.rating),
      started_date: emptyToNull(input.started_date),
      finished_date: emptyToNull(input.finished_date),
      liked: Boolean(input.liked),
      review: emptyToNull(input.review),
      status: input.status ?? null,
      pages: input.pages ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to save book: ${error.message}`);
  }

  return data as BookLog;
}

export async function createMovieLog(
  profileId: string,
  input: MovieLogInput,
): Promise<MovieLog> {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Name is required.");
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("movie_logs")
    .insert({
      profile_id: profileId,
      name,
      cover_url: emptyToNull(input.cover_url),
      rating: parseRating(input.rating),
      finished_date: emptyToNull(input.finished_date),
      liked: Boolean(input.liked),
      review: emptyToNull(input.review),
      runtime: input.runtime ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to save movie: ${error.message}`);
  }

  return data as MovieLog;
}

export async function createAlbumLog(
  profileId: string,
  input: AlbumLogInput,
): Promise<AlbumLog> {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Name is required.");
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("album_logs")
    .insert({
      profile_id: profileId,
      name,
      cover_url: emptyToNull(input.cover_url),
      rating: parseRating(input.rating),
      finished_date: emptyToNull(input.finished_date),
      liked: Boolean(input.liked),
      review: emptyToNull(input.review),
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to save album: ${error.message}`);
  }

  return data as AlbumLog;
}

function bookPayload(input: BookLogInput) {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Name is required.");
  }

  return {
    name,
    cover_url: emptyToNull(input.cover_url),
    rating: parseRating(input.rating),
    started_date: emptyToNull(input.started_date),
    finished_date: emptyToNull(input.finished_date),
    liked: Boolean(input.liked),
    review: emptyToNull(input.review),
    status: input.status ?? null,
    pages: input.pages ?? null,
  };
}

function moviePayload(input: MovieLogInput) {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Name is required.");
  }

  return {
    name,
    cover_url: emptyToNull(input.cover_url),
    rating: parseRating(input.rating),
    finished_date: emptyToNull(input.finished_date),
    liked: Boolean(input.liked),
    review: emptyToNull(input.review),
    runtime: input.runtime ?? null,
  };
}

function albumPayload(input: AlbumLogInput) {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Name is required.");
  }

  return {
    name,
    cover_url: emptyToNull(input.cover_url),
    rating: parseRating(input.rating),
    finished_date: emptyToNull(input.finished_date),
    liked: Boolean(input.liked),
    review: emptyToNull(input.review),
  };
}

export async function updateBookLog(
  profileId: string,
  id: string,
  input: BookLogInput,
): Promise<BookLog> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("book_logs")
    .update(bookPayload(input))
    .eq("id", id)
    .eq("profile_id", profileId)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to update book: ${error.message}`);
  }

  return data as BookLog;
}

export async function updateMovieLog(
  profileId: string,
  id: string,
  input: MovieLogInput,
): Promise<MovieLog> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("movie_logs")
    .update(moviePayload(input))
    .eq("id", id)
    .eq("profile_id", profileId)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to update movie: ${error.message}`);
  }

  return data as MovieLog;
}

export async function updateAlbumLog(
  profileId: string,
  id: string,
  input: AlbumLogInput,
): Promise<AlbumLog> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("album_logs")
    .update(albumPayload(input))
    .eq("id", id)
    .eq("profile_id", profileId)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to update album: ${error.message}`);
  }

  return data as AlbumLog;
}

export async function deleteBookLog(
  profileId: string,
  id: string,
): Promise<void> {
  const supabase = createServiceSupabaseClient();
  const { error } = await supabase
    .from("book_logs")
    .delete()
    .eq("id", id)
    .eq("profile_id", profileId);

  if (error) {
    throw new Error(`Failed to delete book: ${error.message}`);
  }
}

export async function deleteMovieLog(
  profileId: string,
  id: string,
): Promise<void> {
  const supabase = createServiceSupabaseClient();
  const { error } = await supabase
    .from("movie_logs")
    .delete()
    .eq("id", id)
    .eq("profile_id", profileId);

  if (error) {
    throw new Error(`Failed to delete movie: ${error.message}`);
  }
}

export async function deleteAlbumLog(
  profileId: string,
  id: string,
): Promise<void> {
  const supabase = createServiceSupabaseClient();
  const { error } = await supabase
    .from("album_logs")
    .delete()
    .eq("id", id)
    .eq("profile_id", profileId);

  if (error) {
    throw new Error(`Failed to delete album: ${error.message}`);
  }
}
