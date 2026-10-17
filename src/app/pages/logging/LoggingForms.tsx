"use client";

import { useActionState } from "react";
import {
  createAlbumAction,
  createBookAction,
  createMovieAction,
  type LoggingFormState,
} from "./actions";

const initialState: LoggingFormState = { error: null };

export default function LoggingForms() {
  const [bookState, bookAction, bookPending] = useActionState(
    createBookAction,
    initialState,
  );
  const [movieState, movieAction, moviePending] = useActionState(
    createMovieAction,
    initialState,
  );
  const [albumState, albumAction, albumPending] = useActionState(
    createAlbumAction,
    initialState,
  );

  return (
    <>
      <section>
        <h2>Log a book</h2>
        <form action={bookAction}>
          <div>
            <label htmlFor="book-name">Name</label>
            <input id="book-name" name="name" type="text" required />
          </div>
          <div>
            <label htmlFor="book-cover">Cover URL</label>
            <input id="book-cover" name="cover_url" type="url" />
          </div>
          <div>
            <label htmlFor="book-rating">Rating (0-5)</label>
            <input
              id="book-rating"
              name="rating"
              type="number"
              min={0}
              max={5}
              step={0.5}
            />
          </div>
          <div>
            <label htmlFor="book-started">Started date</label>
            <input id="book-started" name="started_date" type="date" />
          </div>
          <div>
            <label htmlFor="book-finished">Finished date</label>
            <input id="book-finished" name="finished_date" type="date" />
          </div>
          <div>
            <label htmlFor="book-status">Status</label>
            <select id="book-status" name="status" defaultValue="">
              <option value="">—</option>
              <option value="want">Want</option>
              <option value="reading">Reading</option>
              <option value="finished">Finished</option>
              <option value="dropped">Dropped</option>
            </select>
          </div>
          <div>
            <label htmlFor="book-pages">Pages</label>
            <input id="book-pages" name="pages" type="number" min={0} />
          </div>
          <div>
            <label htmlFor="book-liked">
              <input id="book-liked" name="liked" type="checkbox" /> Like
            </label>
          </div>
          <div>
            <label htmlFor="book-review">Review / notes</label>
            <textarea id="book-review" name="review" rows={3} />
          </div>
          {bookState.error ? <p>{bookState.error}</p> : null}
          <button type="submit" disabled={bookPending}>
            {bookPending ? "Saving…" : "Save book"}
          </button>
        </form>
      </section>

      <section>
        <h2>Log a movie</h2>
        <form action={movieAction}>
          <div>
            <label htmlFor="movie-name">Name</label>
            <input id="movie-name" name="name" type="text" required />
          </div>
          <div>
            <label htmlFor="movie-cover">Cover URL</label>
            <input id="movie-cover" name="cover_url" type="url" />
          </div>
          <div>
            <label htmlFor="movie-rating">Rating (0-5)</label>
            <input
              id="movie-rating"
              name="rating"
              type="number"
              min={0}
              max={5}
              step={0.5}
            />
          </div>
          <div>
            <label htmlFor="movie-finished">Finished date</label>
            <input id="movie-finished" name="finished_date" type="date" />
          </div>
          <div>
            <label htmlFor="movie-runtime">Runtime (minutes)</label>
            <input id="movie-runtime" name="runtime" type="number" min={0} />
          </div>
          <div>
            <label htmlFor="movie-liked">
              <input id="movie-liked" name="liked" type="checkbox" /> Like
            </label>
          </div>
          <div>
            <label htmlFor="movie-review">Review / notes</label>
            <textarea id="movie-review" name="review" rows={3} />
          </div>
          {movieState.error ? <p>{movieState.error}</p> : null}
          <button type="submit" disabled={moviePending}>
            {moviePending ? "Saving…" : "Save movie"}
          </button>
        </form>
      </section>

      <section>
        <h2>Log an album</h2>
        <form action={albumAction}>
          <div>
            <label htmlFor="album-name">Name</label>
            <input id="album-name" name="name" type="text" required />
          </div>
          <div>
            <label htmlFor="album-cover">Cover URL</label>
            <input id="album-cover" name="cover_url" type="url" />
          </div>
          <div>
            <label htmlFor="album-rating">Rating (0-5)</label>
            <input
              id="album-rating"
              name="rating"
              type="number"
              min={0}
              max={5}
              step={0.5}
            />
          </div>
          <div>
            <label htmlFor="album-finished">Finished date</label>
            <input id="album-finished" name="finished_date" type="date" />
          </div>
          <div>
            <label htmlFor="album-liked">
              <input id="album-liked" name="liked" type="checkbox" /> Like
            </label>
          </div>
          <div>
            <label htmlFor="album-review">Review / notes</label>
            <textarea id="album-review" name="review" rows={3} />
          </div>
          {albumState.error ? <p>{albumState.error}</p> : null}
          <button type="submit" disabled={albumPending}>
            {albumPending ? "Saving…" : "Save album"}
          </button>
        </form>
      </section>
    </>
  );
}
