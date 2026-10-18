"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { AlbumLog, BookLog, MovieLog } from "@/lib/logging";
import {
  deleteAlbumAction,
  deleteBookAction,
  deleteMovieAction,
  updateAlbumAction,
  updateBookAction,
  updateMovieAction,
  type LoggingFormState,
} from "./actions";
import Icon from "@/components/pixel/Icon";
import StarRating from "@/components/pixel/StarRating";
import PixelButton from "@/components/pixel/PixelButton";
import PixelInput, { PixelSelect, PixelTextarea } from "@/components/pixel/PixelInput";

const initialState: LoggingFormState = { error: null };

function BookEntry({ book }: { book: BookLog }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(
    updateBookAction,
    initialState,
  );

  if (!editing) {
    return (
      <li className="px-panel">
        <p>
          {book.name}
          {book.rating != null ? ` — ${book.rating}/5` : ""}
          {book.status ? ` — ${book.status}` : ""}
          {book.liked ? " — liked" : ""}
        </p>
        <Link
          href={`/pages/forum?mode=per_book&book=${encodeURIComponent(book.name)}`}
          className="text-xs text-amber-300 hover:underline inline-block mr-3"
        >
          <Icon name="chat" size={1} /> Discuss in Forum →
        </Link>
        <PixelButton type="button" onClick={() => setEditing(true)}>
          Update
        </PixelButton>
        <form action={deleteBookAction}>
          <input type="hidden" name="id" value={book.id} />
          <PixelButton type="submit">Delete</PixelButton>
        </form>
      </li>
    );
  }

  return (
    <li className="px-panel">
      <form action={action}>
        <input type="hidden" name="id" value={book.id} />
        <div>
          <label htmlFor={`book-name-${book.id}`}>Name</label>
          <PixelInput
            id={`book-name-${book.id}`}
            name="name"
            type="text"
            required
            defaultValue={book.name}
          />
        </div>
        <div>
          <label htmlFor={`book-cover-${book.id}`}>Cover URL</label>
          <PixelInput
            id={`book-cover-${book.id}`}
            name="cover_url"
            type="url"
            defaultValue={book.cover_url ?? ""}
          />
        </div>
        <div>
          <span>Rating</span>
          <StarRating name="rating" defaultValue={book.rating} aria-label="Rating" />
        </div>
        <div>
          <label htmlFor={`book-started-${book.id}`}>Started date</label>
          <PixelInput
            id={`book-started-${book.id}`}
            name="started_date"
            type="date"
            defaultValue={book.started_date ?? ""}
          />
        </div>
        <div>
          <label htmlFor={`book-finished-${book.id}`}>Finished date</label>
          <PixelInput
            id={`book-finished-${book.id}`}
            name="finished_date"
            type="date"
            defaultValue={book.finished_date ?? ""}
          />
        </div>
        <div>
          <label htmlFor={`book-status-${book.id}`}>Status</label>
          <PixelSelect
            id={`book-status-${book.id}`}
            name="status"
            defaultValue={book.status ?? ""}
          >
            <option value="">—</option>
            <option value="want">Want</option>
            <option value="reading">Reading</option>
            <option value="finished">Finished</option>
            <option value="dropped">Dropped</option>
          </PixelSelect>
        </div>
        <div>
          <label htmlFor={`book-pages-${book.id}`}>Pages</label>
          <PixelInput
            id={`book-pages-${book.id}`}
            name="pages"
            type="number"
            min={0}
            defaultValue={book.pages ?? ""}
          />
        </div>
        <div>
          <label htmlFor={`book-liked-${book.id}`}>
            <input
              id={`book-liked-${book.id}`}
              name="liked"
              type="checkbox"
              defaultChecked={book.liked}
            />{" "}
            Like
          </label>
        </div>
        <div>
          <label htmlFor={`book-review-${book.id}`}>Review / notes</label>
          <PixelTextarea
            id={`book-review-${book.id}`}
            name="review"
            rows={3}
            defaultValue={book.review ?? ""}
          />
        </div>
        {state.error ? <p>{state.error}</p> : null}
        <PixelButton type="submit" disabled={pending}>
          {pending ? "Updating…" : "Save"}
        </PixelButton>
        <PixelButton type="button" onClick={() => setEditing(false)}>
          Cancel
        </PixelButton>
      </form>
    </li>
  );
}

function MovieEntry({ movie }: { movie: MovieLog }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(
    updateMovieAction,
    initialState,
  );

  if (!editing) {
    return (
      <li className="px-panel">
        <p>
          {movie.name}
          {movie.rating != null ? ` — ${movie.rating}/5` : ""}
          {movie.runtime != null ? ` — ${movie.runtime} min` : ""}
          {movie.liked ? " — liked" : ""}
        </p>
        <PixelButton type="button" onClick={() => setEditing(true)}>
          Update
        </PixelButton>
        <form action={deleteMovieAction}>
          <input type="hidden" name="id" value={movie.id} />
          <PixelButton type="submit">Delete</PixelButton>
        </form>
      </li>
    );
  }

  return (
    <li className="px-panel">
      <form action={action}>
        <input type="hidden" name="id" value={movie.id} />
        <div>
          <label htmlFor={`movie-name-${movie.id}`}>Name</label>
          <PixelInput
            id={`movie-name-${movie.id}`}
            name="name"
            type="text"
            required
            defaultValue={movie.name}
          />
        </div>
        <div>
          <label htmlFor={`movie-cover-${movie.id}`}>Cover URL</label>
          <PixelInput
            id={`movie-cover-${movie.id}`}
            name="cover_url"
            type="url"
            defaultValue={movie.cover_url ?? ""}
          />
        </div>
        <div>
          <span>Rating</span>
          <StarRating name="rating" defaultValue={movie.rating} aria-label="Rating" />
        </div>
        <div>
          <label htmlFor={`movie-finished-${movie.id}`}>Finished date</label>
          <PixelInput
            id={`movie-finished-${movie.id}`}
            name="finished_date"
            type="date"
            defaultValue={movie.finished_date ?? ""}
          />
        </div>
        <div>
          <label htmlFor={`movie-runtime-${movie.id}`}>Runtime (minutes)</label>
          <PixelInput
            id={`movie-runtime-${movie.id}`}
            name="runtime"
            type="number"
            min={0}
            defaultValue={movie.runtime ?? ""}
          />
        </div>
        <div>
          <label htmlFor={`movie-liked-${movie.id}`}>
            <input
              id={`movie-liked-${movie.id}`}
              name="liked"
              type="checkbox"
              defaultChecked={movie.liked}
            />{" "}
            Like
          </label>
        </div>
        <div>
          <label htmlFor={`movie-review-${movie.id}`}>Review / notes</label>
          <PixelTextarea
            id={`movie-review-${movie.id}`}
            name="review"
            rows={3}
            defaultValue={movie.review ?? ""}
          />
        </div>
        {state.error ? <p>{state.error}</p> : null}
        <PixelButton type="submit" disabled={pending}>
          {pending ? "Updating…" : "Save"}
        </PixelButton>
        <PixelButton type="button" onClick={() => setEditing(false)}>
          Cancel
        </PixelButton>
      </form>
    </li>
  );
}

function AlbumEntry({ album }: { album: AlbumLog }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(
    updateAlbumAction,
    initialState,
  );

  if (!editing) {
    return (
      <li className="px-panel">
        <p>
          {album.name}
          {album.rating != null ? ` — ${album.rating}/5` : ""}
          {album.liked ? " — liked" : ""}
        </p>
        <PixelButton type="button" onClick={() => setEditing(true)}>
          Update
        </PixelButton>
        <form action={deleteAlbumAction}>
          <input type="hidden" name="id" value={album.id} />
          <PixelButton type="submit">Delete</PixelButton>
        </form>
      </li>
    );
  }

  return (
    <li className="px-panel">
      <form action={action}>
        <input type="hidden" name="id" value={album.id} />
        <div>
          <label htmlFor={`album-name-${album.id}`}>Name</label>
          <PixelInput
            id={`album-name-${album.id}`}
            name="name"
            type="text"
            required
            defaultValue={album.name}
          />
        </div>
        <div>
          <label htmlFor={`album-cover-${album.id}`}>Cover URL</label>
          <PixelInput
            id={`album-cover-${album.id}`}
            name="cover_url"
            type="url"
            defaultValue={album.cover_url ?? ""}
          />
        </div>
        <div>
          <span>Rating</span>
          <StarRating name="rating" defaultValue={album.rating} aria-label="Rating" />
        </div>
        <div>
          <label htmlFor={`album-finished-${album.id}`}>Finished date</label>
          <PixelInput
            id={`album-finished-${album.id}`}
            name="finished_date"
            type="date"
            defaultValue={album.finished_date ?? ""}
          />
        </div>
        <div>
          <label htmlFor={`album-liked-${album.id}`}>
            <input
              id={`album-liked-${album.id}`}
              name="liked"
              type="checkbox"
              defaultChecked={album.liked}
            />{" "}
            Like
          </label>
        </div>
        <div>
          <label htmlFor={`album-review-${album.id}`}>Review / notes</label>
          <PixelTextarea
            id={`album-review-${album.id}`}
            name="review"
            rows={3}
            defaultValue={album.review ?? ""}
          />
        </div>
        {state.error ? <p>{state.error}</p> : null}
        <PixelButton type="submit" disabled={pending}>
          {pending ? "Updating…" : "Save"}
        </PixelButton>
        <PixelButton type="button" onClick={() => setEditing(false)}>
          Cancel
        </PixelButton>
      </form>
    </li>
  );
}

type LibraryEntriesProps = {
  books: BookLog[];
  movies: MovieLog[];
  albums: AlbumLog[];
};

export default function LibraryEntries({ books, movies, albums }: LibraryEntriesProps) {
  return (
    <div className="library-entries-wrapper">
      <section>
        <h2>Your Book Entries</h2>
        {books.length === 0 ? (
          <p style={{ color: "#908caa", fontSize: "0.9rem" }}>No books logged yet.</p>
        ) : (
          <ul>
            {books.map((book) => (
              <BookEntry key={book.id} book={book} />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Your Movie Entries</h2>
        {movies.length === 0 ? (
          <p style={{ color: "#908caa", fontSize: "0.9rem" }}>No movies logged yet.</p>
        ) : (
          <ul>
            {movies.map((movie) => (
              <MovieEntry key={movie.id} movie={movie} />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Your Album Entries</h2>
        {albums.length === 0 ? (
          <p style={{ color: "#908caa", fontSize: "0.9rem" }}>No albums logged yet.</p>
        ) : (
          <ul>
            {albums.map((album) => (
              <AlbumEntry key={album.id} album={album} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
