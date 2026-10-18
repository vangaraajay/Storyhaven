"use client";

import { useActionState } from "react";
import {
  createAlbumAction,
  createBookAction,
  createMovieAction,
  type LoggingFormState,
} from "./actions";
import StarRating from "@/components/pixel/StarRating";
import UnlockToast from "@/components/pixel/UnlockToast";
import PixelButton from "@/components/pixel/PixelButton";
import PixelInput, { PixelSelect, PixelTextarea } from "@/components/pixel/PixelInput";

const initialState: LoggingFormState = { error: null };

export default function CreateLogForms() {
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
      <section className="px-panel">
        <h2>Log a book</h2>
        <form action={bookAction}>
          <div>
            <label htmlFor="book-name">Name</label>
            <PixelInput id="book-name" name="name" type="text" required />
          </div>
          <div>
            <label htmlFor="book-cover">Cover URL</label>
            <PixelInput id="book-cover" name="cover_url" type="url" />
          </div>
          <div>
            <span>Rating</span>
            <StarRating name="rating" aria-label="Rating" />
          </div>
          <div>
            <label htmlFor="book-started">Started date</label>
            <PixelInput id="book-started" name="started_date" type="date" />
          </div>
          <div>
            <label htmlFor="book-finished">Finished date</label>
            <PixelInput id="book-finished" name="finished_date" type="date" />
          </div>
          <div>
            <label htmlFor="book-status">Status</label>
            <PixelSelect id="book-status" name="status" defaultValue="">
              <option value="">—</option>
              <option value="want">Want</option>
              <option value="reading">Reading</option>
              <option value="finished">Finished</option>
              <option value="dropped">Dropped</option>
            </PixelSelect>
          </div>
          <div>
            <label htmlFor="book-pages">Pages</label>
            <PixelInput id="book-pages" name="pages" type="number" min={0} />
          </div>
          <div>
            <label htmlFor="book-liked">
              <input id="book-liked" name="liked" type="checkbox" /> Like
            </label>
          </div>
          <div>
            <label htmlFor="book-review">Review / notes</label>
            <PixelTextarea id="book-review" name="review" rows={3} />
          </div>
          {bookState.error ? <p>{bookState.error}</p> : null}
          <UnlockToast keys={bookState.unlocked} />
          <PixelButton type="submit" disabled={bookPending}>
            {bookPending ? "Saving…" : "Save book"}
          </PixelButton>
        </form>
      </section>

      <section className="px-panel">
        <h2>Log a movie</h2>
        <form action={movieAction}>
          <div>
            <label htmlFor="movie-name">Name</label>
            <PixelInput id="movie-name" name="name" type="text" required />
          </div>
          <div>
            <label htmlFor="movie-cover">Cover URL</label>
            <PixelInput id="movie-cover" name="cover_url" type="url" />
          </div>
          <div>
            <span>Rating</span>
            <StarRating name="rating" aria-label="Rating" />
          </div>
          <div>
            <label htmlFor="movie-finished">Finished date</label>
            <PixelInput id="movie-finished" name="finished_date" type="date" />
          </div>
          <div>
            <label htmlFor="movie-runtime">Runtime (minutes)</label>
            <PixelInput id="movie-runtime" name="runtime" type="number" min={0} />
          </div>
          <div>
            <label htmlFor="movie-liked">
              <input id="movie-liked" name="liked" type="checkbox" /> Like
            </label>
          </div>
          <div>
            <label htmlFor="movie-review">Review / notes</label>
            <PixelTextarea id="movie-review" name="review" rows={3} />
          </div>
          {movieState.error ? <p>{movieState.error}</p> : null}
          <UnlockToast keys={movieState.unlocked} />
          <PixelButton type="submit" disabled={moviePending}>
            {moviePending ? "Saving…" : "Save movie"}
          </PixelButton>
        </form>
      </section>

      <section className="px-panel">
        <h2>Log an album</h2>
        <form action={albumAction}>
          <div>
            <label htmlFor="album-name">Name</label>
            <PixelInput id="album-name" name="name" type="text" required />
          </div>
          <div>
            <label htmlFor="album-cover">Cover URL</label>
            <PixelInput id="album-cover" name="cover_url" type="url" />
          </div>
          <div>
            <span>Rating</span>
            <StarRating name="rating" aria-label="Rating" />
          </div>
          <div>
            <label htmlFor="album-finished">Finished date</label>
            <PixelInput id="album-finished" name="finished_date" type="date" />
          </div>
          <div>
            <label htmlFor="album-liked">
              <input id="album-liked" name="liked" type="checkbox" /> Like
            </label>
          </div>
          <div>
            <label htmlFor="album-review">Review / notes</label>
            <PixelTextarea id="album-review" name="review" rows={3} />
          </div>
          {albumState.error ? <p>{albumState.error}</p> : null}
          <UnlockToast keys={albumState.unlocked} />
          <PixelButton type="submit" disabled={albumPending}>
            {albumPending ? "Saving…" : "Save album"}
          </PixelButton>
        </form>
      </section>
    </>
  );
}
