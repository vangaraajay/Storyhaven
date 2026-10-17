"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth0";
import {
  createAlbumLog,
  createBookLog,
  createMovieLog,
  deleteAlbumLog,
  deleteBookLog,
  deleteMovieLog,
  updateAlbumLog,
  updateBookLog,
  updateMovieLog,
  type BookStatus,
} from "@/lib/logging";
import { getProfile, isProfileComplete } from "@/lib/profiles";
import { searchMediaCover, type MediaType } from "@/lib/media-search";
import {
  listCatalogFeed,
  type CatalogMode,
  type CatalogMediaType,
  type CatalogFeedResponse,
} from "@/lib/catalog";

export type LoggingFormState = {
  error: string | null;
};

async function requireProfileId(): Promise<string> {
  const session = await auth0.getSession();
  const user = session?.user;

  if (!user) {
    redirect("/pages/login");
  }

  const profile = await getProfile(user);
  if (!isProfileComplete(profile) || !profile) {
    redirect("/pages/profile");
  }

  return profile.id;
}

function optionalNumber(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return null;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function bookInputFromForm(formData: FormData) {
  const statusRaw = String(formData.get("status") ?? "").trim();
  return {
    name: String(formData.get("name") ?? ""),
    cover_url: String(formData.get("cover_url") ?? ""),
    rating: optionalNumber(formData.get("rating")),
    started_date: String(formData.get("started_date") ?? ""),
    finished_date: String(formData.get("finished_date") ?? ""),
    liked: formData.get("liked") === "on",
    review: String(formData.get("review") ?? ""),
    status: (statusRaw || null) as BookStatus | null,
    pages: optionalNumber(formData.get("pages")),
  };
}

function movieInputFromForm(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    cover_url: String(formData.get("cover_url") ?? ""),
    rating: optionalNumber(formData.get("rating")),
    finished_date: String(formData.get("finished_date") ?? ""),
    liked: formData.get("liked") === "on",
    review: String(formData.get("review") ?? ""),
    runtime: optionalNumber(formData.get("runtime")),
  };
}

function albumInputFromForm(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    cover_url: String(formData.get("cover_url") ?? ""),
    rating: optionalNumber(formData.get("rating")),
    finished_date: String(formData.get("finished_date") ?? ""),
    liked: formData.get("liked") === "on",
    review: String(formData.get("review") ?? ""),
  };
}

export async function createBookAction(
  _prev: LoggingFormState,
  formData: FormData,
): Promise<LoggingFormState> {
  const profileId = await requireProfileId();

  try {
    await createBookLog(profileId, bookInputFromForm(formData));
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to save book.",
    };
  }

  revalidatePath("/pages/library");
  return { error: null };
}

export async function createMovieAction(
  _prev: LoggingFormState,
  formData: FormData,
): Promise<LoggingFormState> {
  const profileId = await requireProfileId();

  try {
    await createMovieLog(profileId, movieInputFromForm(formData));
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to save movie.",
    };
  }

  revalidatePath("/pages/library");
  return { error: null };
}

export async function createAlbumAction(
  _prev: LoggingFormState,
  formData: FormData,
): Promise<LoggingFormState> {
  const profileId = await requireProfileId();

  try {
    await createAlbumLog(profileId, albumInputFromForm(formData));
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to save album.",
    };
  }

  revalidatePath("/pages/library");
  return { error: null };
}

export async function updateBookAction(
  _prev: LoggingFormState,
  formData: FormData,
): Promise<LoggingFormState> {
  const profileId = await requireProfileId();
  const id = String(formData.get("id") ?? "");

  try {
    await updateBookLog(profileId, id, bookInputFromForm(formData));
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to update book.",
    };
  }

  revalidatePath("/pages/library");
  return { error: null };
}

export async function updateMovieAction(
  _prev: LoggingFormState,
  formData: FormData,
): Promise<LoggingFormState> {
  const profileId = await requireProfileId();
  const id = String(formData.get("id") ?? "");

  try {
    await updateMovieLog(profileId, id, movieInputFromForm(formData));
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to update movie.",
    };
  }

  revalidatePath("/pages/library");
  return { error: null };
}

export async function updateAlbumAction(
  _prev: LoggingFormState,
  formData: FormData,
): Promise<LoggingFormState> {
  const profileId = await requireProfileId();
  const id = String(formData.get("id") ?? "");

  try {
    await updateAlbumLog(profileId, id, albumInputFromForm(formData));
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to update album.",
    };
  }

  revalidatePath("/pages/library");
  return { error: null };
}

export async function deleteBookAction(formData: FormData): Promise<void> {
  const profileId = await requireProfileId();
  const id = String(formData.get("id") ?? "");
  await deleteBookLog(profileId, id);
  revalidatePath("/pages/library");
}

export async function deleteMovieAction(formData: FormData): Promise<void> {
  const profileId = await requireProfileId();
  const id = String(formData.get("id") ?? "");
  await deleteMovieLog(profileId, id);
  revalidatePath("/pages/library");
}

export async function deleteAlbumAction(formData: FormData): Promise<void> {
  const profileId = await requireProfileId();
  const id = String(formData.get("id") ?? "");
  await deleteAlbumLog(profileId, id);
  revalidatePath("/pages/library");
}

export async function fetchMediaCoverAction(
  type: MediaType,
  title: string,
): Promise<string | null> {
  await requireProfileId();
  return searchMediaCover(type, title);
}

export async function getCatalogFeedAction(
  mode: CatalogMode,
  category: CatalogMediaType,
  page: number,
): Promise<CatalogFeedResponse> {
  const profileId = await requireProfileId();
  return listCatalogFeed(profileId, mode, category, page);
}

