"use server";

import Book from "@/database/models/book.model";
import BookSegment from "@/database/models/bookSegment.model";
import { connectToDatabase } from "@/database/mongose";
import { getBookLimitError, getUserSubscription } from "@/lib/subscription.server";
import { generateSlug, serializeData } from "@/lib/utils";
import { CreateBook, TextSegment } from "@/types";
import { revalidatePath } from "next/cache";

export const createBook = async (data: CreateBook) => {
  try {
    // Identity comes from the Clerk session only, never from the payload
    const { userId, limits } = await getUserSubscription();

    if (!userId) {
      return {
        success: false as const,
        error: "You must be logged in to add a book.",
        isBillingError: false as const,
      };
    }

    await connectToDatabase();
    const slug = generateSlug(data.title);

    const existingBook = await Book.findOne({ slug }).lean();

    if (existingBook) {
      return {
        success: true,
        data: serializeData(existingBook),
        alreadyExist: true,
      };
    }

    const limitError = await getBookLimitError(userId, limits);

    if (limitError) {
      return {
        success: false as const,
        error: limitError,
        isBillingError: true as const,
      };
    }

    const book = await Book.create({
      clerkId: userId,
      title: data.title,
      author: data.author,
      persona: data.persona,
      fileURL: data.fileURL,
      fileBlobKey: data.fileBlobKey,
      coverURL: data.coverURL,
      coverBlobKey: data.coverBlobKey,
      fileSize: data.fileSize,
      slug,
      totalSegments: 0,
    });

    revalidatePath("/");

    return {
      success: true as const,
      data: serializeData(book),
    };
  } catch (error) {
    console.error("Error creating a book", error);
    return {
      success: false as const,
      error,
      isBillingError: false as const,
    };
  }
};

export const saveBookSegments = async (
  bookId: string,
  segments: TextSegment[]
) => {
  try {
    const { userId } = await getUserSubscription();

    if (!userId) {
      return {
        success: false as const,
        error: "You must be logged in to save book segments.",
      };
    }

    await connectToDatabase();

    // Only the book's owner may attach segments to it
    const ownedBook = await Book.exists({ _id: bookId, clerkId: userId });

    if (!ownedBook) {
      return {
        success: false as const,
        error: "Book not found.",
      };
    }

    try {
      console.log("Saving book segments...");

      const segmentsToInsert = segments.map(
        ({ text, segmentIndex, pageNumber, wordCount }) => ({
          clerkId: userId,
          bookId,
          content: text,
          segmentIndex,
          pageNumber,
          wordCount,
        })
      );
      await BookSegment.insertMany(segmentsToInsert);
      await Book.findByIdAndUpdate(bookId, { totalSegments: segments.length });
      console.log("Successfully saved segments");
      return {
        success: true as const,
        data: { segmentsCreated: segments.length },
      };
    } catch (error) {
      console.error("Error saving book segment", error);
      await BookSegment.deleteMany({ bookId, clerkId: userId });
      await Book.findOneAndDelete({ _id: bookId, clerkId: userId });
      console.log(
        "Deleted book segments and book due to failure to save segments"
      );
      return {
        success: false as const,
        error,
      };
    }
  } catch (error) {
    console.error("Error saving book segment", error);
    return {
      success: false as const,
      error,
    };
  }
};

export const checkBookExists = async (title: string) => {
  try {
    await connectToDatabase();
    const slug = generateSlug(title);
    const existingBook = await Book.findOne({ slug }).lean();
    if (existingBook) {
      return {
        exists: true as const,
        book: serializeData(existingBook),
      };
    }
    return {
      exists: false as const,
      book: null,
    };
  } catch (error) {
    console.error("Error checking book exist", error);
    return {
      exists: false as const,
      book: null,
      error,
    };
  }
};

export const getAllBooks = async () => {
  try {
    await connectToDatabase();
    const books = await Book.find({}).sort({ createdAt: -1 }).lean();
    return {
      success: true,
      data: serializeData(books),
    };
  } catch (error) {
    console.error("Error fetching all books", error);
    return {
      success: false,
      error,
    };
  }
};

// Case-insensitive regex match on title or author; empty query returns all books
export const searchBooks = async (query: string = "") => {
  const trimmed = query.trim();
  if (!trimmed) return getAllBooks();

  try {
    await connectToDatabase();
    // Escape so user input is matched literally and can't inject regex syntax
    const pattern = new RegExp(trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const books = await Book.find({
      $or: [{ title: pattern }, { author: pattern }],
    })
      .sort({ createdAt: -1 })
      .lean();
    return {
      success: true,
      data: serializeData(books),
    };
  } catch (error) {
    console.error("Error searching books", error);
    return {
      success: false,
      error,
    };
  }
};

type SegmentMatch = {
  content: string;
  segmentIndex: number;
  pageNumber?: number;
};

// Full-text search over a book's segments, best matches first
export const searchBookSegments = async (
  bookId: string,
  query: string,
  numResults: number = 3
) => {
  try {
    // Punctuation is dropped so quotes and dashes in the query are not read
    // as $text operators (exact phrase, negation)
    const keywords = query
      .split(/[^\p{L}\p{N}]+/u)
      .filter((word) => word.length > 1);

    if (keywords.length === 0) {
      return { success: true as const, data: [] as SegmentMatch[] };
    }

    await connectToDatabase();

    const segments = await BookSegment.find(
      { bookId, $text: { $search: keywords.join(" ") } },
      { score: { $meta: "textScore" } }
    )
      .select("content segmentIndex pageNumber")
      .sort({ score: { $meta: "textScore" } })
      .limit(numResults)
      .lean();

    return {
      success: true as const,
      data: serializeData(segments) as SegmentMatch[],
    };
  } catch (error) {
    console.error("Error searching book segments", error);
    return {
      success: false as const,
      data: [] as SegmentMatch[],
      error,
    };
  }
};

export const getBookBySlug = async (slug: string) => {
  try {
    await connectToDatabase();
    const book = await Book.findOne({ slug }).lean();
    const data = book ? serializeData(book) : null;

    return {
      success: true as const,
      data,
    };
  } catch (error) {
    console.error("Error fetching book", error);
    return {
      success: false as const,
      data: null,
      error,
    };
  }
};

export const checkBookLimit = async () => {
  try {
    const { userId, plan, limits } = await getUserSubscription();

    if (!userId) {
      return {
        allowed: false as const,
        error: "You must be logged in to add a book.",
        isBillingError: false as const,
      };
    }

    const error = await getBookLimitError(userId, limits);

    return {
      allowed: !error,
      error,
      isBillingError: !!error,
      plan,
      maxBooks: limits.maxBooks,
    };
  } catch (error) {
    console.error("Error checking book limit", error);
    return {
      allowed: false as const,
      error: "Could not verify your plan. Please try again.",
      isBillingError: false as const,
    };
  }
};
