import Book from "@/database/models/book.model";
import BookSegment from "@/database/models/bookSegment.model";
import { connectToDatabase } from "@/database/mongose";
import { generateSlug, serializeData } from "@/lib/utils";
import { CreateBook, TextSegment } from "@/types";

export const createBook = async (data: CreateBook) => {
  try {
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
    //TODO: Check subscription limits before creating a book

    const book = await Book.create({ ...data, slug, totalSegments: 0 });
    return {
      success: true,
      data: serializeData(book),
    };
  } catch (error) {
    console.error("Error creating a book", error);
    return {
      success: false,
      error: error,
    };
  }
};

export const saveBookSegments = async (
  bookId: string,
  clerkId: string,
  segments: TextSegment[]
) => {
  try {
    await connectToDatabase();
    console.log("Saving book segments...");

    const segmentsToInsert = segments.map(
      ({ text, segmentIndex, pageNumber, wordCount }) => ({
        clerkId,
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
      success: true,
      data: { segmentsCreated: segments.length },
    };
  } catch (error) {
    console.error("Error saving book segment", error);
    await BookSegment.deleteMany({ bookId });
    await Book.findByIdAndDelete(bookId);
    console.log(
      "Deleted book segments and book due to failure to save segments"
    );
  }
};
