"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  createAlbumAction,
  createBookAction,
  createMovieAction,
  type LoggingFormState,
} from "./actions";
import CoverPreviewBox from "./CoverPreviewBox";
import StarRating from "@/components/pixel/StarRating";
import PixelButton from "@/components/pixel/PixelButton";
import PixelInput, { PixelSelect, PixelTextarea } from "@/components/pixel/PixelInput";
import UnlockToast from "@/components/pixel/UnlockToast";
import HeartToggle from "@/components/pixel/HeartToggle";

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
    <section className="create-log-section px-panel">
      <div className="create-log-header">
        <h2 className="create-log-title">Add to Your Haven</h2>
        <div className="create-log-tabs" role="tablist">
          <PixelButton
            type="button"
            role="tab"
            aria-selected={activeTab === "book"}
            className={`create-log-tab ${activeTab === "book" ? "active" : ""}`}
            onClick={() => setActiveTab("book")}
          >
            📚 Log a Book
          </PixelButton>
          <PixelButton
            type="button"
            role="tab"
            aria-selected={activeTab === "movie"}
            className={`create-log-tab ${activeTab === "movie" ? "active" : ""}`}
            onClick={() => setActiveTab("movie")}
          >
            🎬 Log a Movie
          </PixelButton>
          <PixelButton
            type="button"
            role="tab"
            aria-selected={activeTab === "album"}
            className={`create-log-tab ${activeTab === "album" ? "active" : ""}`}
            onClick={() => setActiveTab("album")}
          >
            🎵 Log an Album
          </PixelButton>
        </div>
      </div>

      {/* BOOK FORM */}
      <div style={{ display: activeTab === "book" ? "block" : "none" }}>
        <form ref={bookFormRef} action={bookAction} className="library-form">
          <div className="form-title-cover-row">
            <div className="form-title-col">
              <label htmlFor="book-name">Book Title</label>
              <PixelInput
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
                <PixelButton
                  type="button"
                  className="form-cover-override-toggle"
                  onClick={() => setShowBookCustomCover((prev) => !prev)}
                >
                  {showBookCustomCover ? "– Hide custom cover URL" : "+ Custom cover URL"}
                </PixelButton>
                {showBookCustomCover && (
                  <PixelInput
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
              <label>Rating</label>
              <StarRating name="rating" aria-label="Book Rating" />
            </div>
            <div>
              <label htmlFor="book-status">Status</label>
              <PixelSelect id="book-status" name="status" defaultValue="">
                <option value="">—</option>
                <option value="want">Want to read</option>
                <option value="reading">Currently reading</option>
                <option value="finished">Finished</option>
                <option value="dropped">Dropped</option>
              </PixelSelect>
            </div>
            <div>
              <label htmlFor="book-pages">Pages</label>
              <PixelInput id="book-pages" name="pages" type="number" min={0} placeholder="272" />
            </div>
          </div>

          <div className="form-row-grid">
            <div>
              <label htmlFor="book-started">Started date</label>
              <PixelInput id="book-started" name="started_date" type="date" />
            </div>
            <div>
              <label htmlFor="book-finished">Finished date</label>
              <PixelInput id="book-finished" name="finished_date" type="date" />
            </div>
            <div className="form-checkbox-col">
              <HeartToggle key={bookResetSignal} name="liked" label="Favorite" />
            </div>
          </div>

          <div>
            <label htmlFor="book-review">Review / Notes</label>
            <PixelTextarea
              id="book-review"
              name="review"
              rows={3}
              placeholder="Thoughts, favorite quotes, or impressions…"
            />
          </div>

          {bookState.error ? <p className="form-error-msg">{bookState.error}</p> : null}
          <UnlockToast keys={bookState.unlocked} />

          <div className="form-actions">
            <PixelButton type="submit" disabled={bookPending}>
              {bookPending ? "Saving to Haven…" : "Save Book to Haven"}
            </PixelButton>
          </div>
        </form>
      </div>

      {/* MOVIE FORM */}
      <div style={{ display: activeTab === "movie" ? "block" : "none" }}>
        <form ref={movieFormRef} action={movieAction} className="library-form">
          <div className="form-title-cover-row">
            <div className="form-title-col">
              <label htmlFor="movie-name">Movie Title</label>
              <PixelInput
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
                <PixelButton
                  type="button"
                  className="form-cover-override-toggle"
                  onClick={() => setShowMovieCustomCover((prev) => !prev)}
                >
                  {showMovieCustomCover ? "– Hide custom cover URL" : "+ Custom cover URL"}
                </PixelButton>
                {showMovieCustomCover && (
                  <PixelInput
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
              <label>Rating</label>
              <StarRating name="rating" aria-label="Movie Rating" />
            </div>
            <div>
              <label htmlFor="movie-runtime">Runtime (minutes)</label>
              <PixelInput id="movie-runtime" name="runtime" type="number" min={0} placeholder="148" />
            </div>
            <div>
              <label htmlFor="movie-finished">Finished date</label>
              <PixelInput id="movie-finished" name="finished_date" type="date" />
            </div>
          </div>

          <div className="form-checkbox-col">
            <HeartToggle key={movieResetSignal} name="liked" label="Favorite" />
          </div>

          <div>
            <label htmlFor="movie-review">Review / Notes</label>
            <PixelTextarea
              id="movie-review"
              name="review"
              rows={3}
              placeholder="Atmosphere, acting, plot reflections…"
            />
          </div>

          {movieState.error ? <p className="form-error-msg">{movieState.error}</p> : null}
          <UnlockToast keys={movieState.unlocked} />

          <div className="form-actions">
            <PixelButton type="submit" disabled={moviePending}>
              {moviePending ? "Saving to Haven…" : "Save Movie to Haven"}
            </PixelButton>
          </div>
        </form>
      </div>

      {/* ALBUM FORM */}
      <div style={{ display: activeTab === "album" ? "block" : "none" }}>
        <form ref={albumFormRef} action={albumAction} className="library-form">
          <div className="form-title-cover-row">
            <div className="form-title-col">
              <label htmlFor="album-name">Album Title</label>
              <PixelInput
                id="album-name"
                name="name"
                type="text"
                required
                value={albumTitle}
                onChange={(e) => setAlbumTitle(e.target.value)}
                placeholder="e.g. Abbey Road"
                autoComplete="off"
              />
              <input type="hidden" name="cover_url" value={albumCoverUrl} />

              <div className="form-cover-override">
                <PixelButton
                  type="button"
                  className="form-cover-override-toggle"
                  onClick={() => setShowAlbumCustomCover((prev) => !prev)}
                >
                  {showAlbumCustomCover ? "– Hide custom cover URL" : "+ Custom cover URL"}
                </PixelButton>
                {showAlbumCustomCover && (
                  <PixelInput
                    type="url"
                    placeholder="https://example.com/album.jpg"
                    value={albumCoverUrl}
                    onChange={(e) => setAlbumCoverUrl(e.target.value)}
                    className="form-cover-override-input"
                  />
                )}
              </div>
            </div>

            <CoverPreviewBox
              type="album"
              title={albumTitle}
              onCoverResolved={(url) => setAlbumCoverUrl(url ?? "")}
              resetSignal={albumResetSignal}
            />
          </div>

          <div className="form-row-grid">
            <div>
              <label>Rating</label>
              <StarRating name="rating" aria-label="Album Rating" />
            </div>
            <div>
              <label htmlFor="album-finished">Finished date</label>
              <PixelInput id="album-finished" name="finished_date" type="date" />
            </div>
            <div className="form-checkbox-col">
              <HeartToggle key={albumResetSignal} name="liked" label="Favorite" />
            </div>
          </div>

          <div>
            <label htmlFor="album-review">Review / Notes</label>
            <PixelTextarea
              id="album-review"
              name="review"
              rows={3}
              placeholder="Soundtrack vibe, stand-out tracks…"
            />
          </div>

          {albumState.error ? <p className="form-error-msg">{albumState.error}</p> : null}
          <UnlockToast keys={albumState.unlocked} />

          <div className="form-actions">
            <PixelButton type="submit" disabled={albumPending}>
              {albumPending ? "Saving to Haven…" : "Save Album to Haven"}
            </PixelButton>
          </div>
        </form>
      </div>
    </section>
  );
}
