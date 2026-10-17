"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  createAlbumAction,
  createBookAction,
  createMovieAction,
  type LoggingFormState,
} from "./actions";
import StarRating from "@/components/pixel/StarRating";

const initialState: LoggingFormState = { error: null };

export default function CreateLogForms() {
  const [activeTab, setActiveTab] = useState<"book" | "movie" | "album">("book");

  // Book Form State
  const [bookState, bookAction, bookPending] = useActionState(
    createBookAction,
    initialState,
  );
  const [bookTitle, setBookTitle] = useState("");
  const [bookCoverUrl, setBookCoverUrl] = useState("");
  const [showBookCustomCover, setShowBookCustomCover] = useState(false);
  const [bookResetSignal, setBookResetSignal] = useState(0);
  const bookFormRef = useRef<HTMLFormElement>(null);

  // Movie Form State
  const [movieState, movieAction, moviePending] = useActionState(
    createMovieAction,
    initialState,
  );
  const [movieTitle, setMovieTitle] = useState("");
  const [movieCoverUrl, setMovieCoverUrl] = useState("");
  const [showMovieCustomCover, setShowMovieCustomCover] = useState(false);
  const [movieResetSignal, setMovieResetSignal] = useState(0);
  const movieFormRef = useRef<HTMLFormElement>(null);

  // Album Form State
  const [albumState, albumAction, albumPending] = useActionState(
    createAlbumAction,
    initialState,
  );
  const [albumTitle, setAlbumTitle] = useState("");
  const [albumCoverUrl, setAlbumCoverUrl] = useState("");
  const [showAlbumCustomCover, setShowAlbumCustomCover] = useState(false);
  const [albumResetSignal, setAlbumResetSignal] = useState(0);
  const albumFormRef = useRef<HTMLFormElement>(null);

  // Reset book form on successful submission
  const prevBookPendingRef = useRef(bookPending);
  useEffect(() => {
    if (prevBookPendingRef.current && !bookPending && !bookState.error) {
      setBookTitle("");
      setBookCoverUrl("");
      setShowBookCustomCover(false);
      setBookResetSignal((s) => s + 1);
      bookFormRef.current?.reset();
    }
    prevBookPendingRef.current = bookPending;
  }, [bookPending, bookState.error]);

  // Reset movie form on successful submission
  const prevMoviePendingRef = useRef(moviePending);
  useEffect(() => {
    if (prevMoviePendingRef.current && !moviePending && !movieState.error) {
      setMovieTitle("");
      setMovieCoverUrl("");
      setShowMovieCustomCover(false);
      setMovieResetSignal((s) => s + 1);
      movieFormRef.current?.reset();
    }
    prevMoviePendingRef.current = moviePending;
  }, [moviePending, movieState.error]);

  // Reset album form on successful submission
  const prevAlbumPendingRef = useRef(albumPending);
  useEffect(() => {
    if (prevAlbumPendingRef.current && !albumPending && !albumState.error) {
      setAlbumTitle("");
      setAlbumCoverUrl("");
      setShowAlbumCustomCover(false);
      setAlbumResetSignal((s) => s + 1);
      albumFormRef.current?.reset();
    }
    prevAlbumPendingRef.current = albumPending;
  }, [albumPending, albumState.error]);

  return (
    <section className="create-log-section">
      <div className="create-log-header">
        <h2 className="create-log-title">Add to Your Haven</h2>
        <div className="create-log-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "book"}
            className={`create-log-tab ${activeTab === "book" ? "active" : ""}`}
            onClick={() => setActiveTab("book")}
          >
            📚 Log a Book
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "movie"}
            className={`create-log-tab ${activeTab === "movie" ? "active" : ""}`}
            onClick={() => setActiveTab("movie")}
          >
            🎬 Log a Movie
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "album"}
            className={`create-log-tab ${activeTab === "album" ? "active" : ""}`}
            onClick={() => setActiveTab("album")}
          >
            🎵 Log an Album
          </button>
        </div>
      </div>

      {/* BOOK FORM */}
      <div style={{ display: activeTab === "book" ? "block" : "none" }}>
        <form ref={bookFormRef} action={bookAction} className="library-form">
          <div className="form-title-cover-row">
            <div className="form-title-col">
              <label htmlFor="book-name">Book Title</label>
              <input
                id="book-name"
                name="name"
                type="text"
                required
                value={bookTitle}
                onChange={(e) => setBookTitle(e.target.value)}
                placeholder="e.g. Piranesi"
                autoComplete="off"
              />
              <input type="hidden" name="cover_url" value={bookCoverUrl} />

              <div className="form-cover-override">
                <button
                  type="button"
                  className="form-cover-override-toggle"
                  onClick={() => setShowBookCustomCover((prev) => !prev)}
                >
                  {showBookCustomCover ? "– Hide custom cover URL" : "+ Custom cover URL"}
                </button>
                {showBookCustomCover && (
                  <input
                    type="url"
                    placeholder="https://example.com/cover.jpg"
                    value={bookCoverUrl}
                    onChange={(e) => setBookCoverUrl(e.target.value)}
                    className="form-cover-override-input"
                  />
                )}
              </div>
            </div>

            <CoverPreviewBox
              type="book"
              title={bookTitle}
              onCoverResolved={(url) => setBookCoverUrl(url ?? "")}
              resetSignal={bookResetSignal}
            />
          </div>

          <div className="form-row-grid">
            <div>
              <label htmlFor="book-rating">Rating (0-5)</label>
              <input
                id="book-rating"
                name="rating"
                type="number"
                min={0}
                max={5}
                step={0.5}
                placeholder="4.5"
              />
            </div>
            <div>
              <label htmlFor="book-status">Status</label>
              <select id="book-status" name="status" defaultValue="">
                <option value="">—</option>
                <option value="want">Want to read</option>
                <option value="reading">Currently reading</option>
                <option value="finished">Finished</option>
                <option value="dropped">Dropped</option>
              </select>
            </div>
            <div>
              <label htmlFor="book-pages">Pages</label>
              <input id="book-pages" name="pages" type="number" min={0} placeholder="272" />
            </div>
          </div>

          <div className="form-row-grid">
            <div>
              <label htmlFor="book-started">Started date</label>
              <input id="book-started" name="started_date" type="date" />
            </div>
            <div>
              <label htmlFor="book-finished">Finished date</label>
              <input id="book-finished" name="finished_date" type="date" />
            </div>
            <div className="form-checkbox-col">
              <label htmlFor="book-liked" className="form-checkbox-label">
                <input id="book-liked" name="liked" type="checkbox" />
                <span>❤️ Favorite</span>
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="book-review">Review / Notes</label>
            <textarea
              id="book-review"
              name="review"
              rows={3}
              placeholder="Thoughts, favorite quotes, or impressions…"
            />
          </div>

          {bookState.error ? <p className="form-error-msg">{bookState.error}</p> : null}

          <div className="form-actions">
            <button type="submit" disabled={bookPending} className="btn-save-log">
              {bookPending ? "Saving to Haven…" : "Save Book to Haven"}
            </button>
          </div>
        </form>
      </div>

      {/* MOVIE FORM */}
      <div style={{ display: activeTab === "movie" ? "block" : "none" }}>
        <form ref={movieFormRef} action={movieAction} className="library-form">
          <div className="form-title-cover-row">
            <div className="form-title-col">
              <label htmlFor="movie-name">Movie Title</label>
              <input
                id="movie-name"
                name="name"
                type="text"
                required
                value={movieTitle}
                onChange={(e) => setMovieTitle(e.target.value)}
                placeholder="e.g. Inception"
                autoComplete="off"
              />
              <input type="hidden" name="cover_url" value={movieCoverUrl} />

              <div className="form-cover-override">
                <button
                  type="button"
                  className="form-cover-override-toggle"
                  onClick={() => setShowMovieCustomCover((prev) => !prev)}
                >
                  {showMovieCustomCover ? "– Hide custom cover URL" : "+ Custom cover URL"}
                </button>
                {showMovieCustomCover && (
                  <input
                    type="url"
                    placeholder="https://example.com/poster.jpg"
                    value={movieCoverUrl}
                    onChange={(e) => setMovieCoverUrl(e.target.value)}
                    className="form-cover-override-input"
                  />
                )}
              </div>
            </div>

            <CoverPreviewBox
              type="movie"
              title={movieTitle}
              onCoverResolved={(url) => setMovieCoverUrl(url ?? "")}
              resetSignal={movieResetSignal}
            />
          </div>

          <div className="form-row-grid">
            <div>
              <label htmlFor="movie-rating">Rating (0-5)</label>
              <input
                id="movie-rating"
                name="rating"
                type="number"
                min={0}
                max={5}
                step={0.5}
                placeholder="5"
              />
            </div>
            <div>
              <label htmlFor="movie-runtime">Runtime (minutes)</label>
              <input id="movie-runtime" name="runtime" type="number" min={0} placeholder="148" />
            </div>
            <div>
              <label htmlFor="movie-finished">Finished date</label>
              <input id="movie-finished" name="finished_date" type="date" />
            </div>
          </div>

          <div className="form-checkbox-col">
            <label htmlFor="movie-liked" className="form-checkbox-label">
              <input id="movie-liked" name="liked" type="checkbox" />
              <span>❤️ Favorite</span>
            </label>
          </div>

          <div>
            <label htmlFor="movie-review">Review / Notes</label>
            <textarea
              id="movie-review"
              name="review"
              rows={3}
              placeholder="Atmosphere, acting, plot reflections…"
            />
          </div>

          {movieState.error ? <p className="form-error-msg">{movieState.error}</p> : null}

          <div className="form-actions">
            <button type="submit" disabled={moviePending} className="btn-save-log">
              {moviePending ? "Saving to Haven…" : "Save Movie to Haven"}
            </button>
          </div>
          <div>
            <span>Rating</span>
            <StarRating name="rating" aria-label="Rating" />
          </div>

          <div className="form-row-grid">
            <div>
              <label htmlFor="album-rating">Rating (0-5)</label>
              <input
                id="album-rating"
                name="rating"
                type="number"
                min={0}
                max={5}
                step={0.5}
                placeholder="4"
              />
            </div>
            <div>
              <label htmlFor="album-finished">Finished date</label>
              <input id="album-finished" name="finished_date" type="date" />
            </div>
            <div className="form-checkbox-col">
              <label htmlFor="album-liked" className="form-checkbox-label">
                <input id="album-liked" name="liked" type="checkbox" />
                <span>❤️ Favorite</span>
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="album-review">Review / Notes</label>
            <textarea
              id="album-review"
              name="review"
              rows={3}
              placeholder="Soundtrack vibe, stand-out tracks…"
            />
          </div>

          {albumState.error ? <p className="form-error-msg">{albumState.error}</p> : null}

          <div className="form-actions">
            <button type="submit" disabled={albumPending} className="btn-save-log">
              {albumPending ? "Saving to Haven…" : "Save Album to Haven"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
