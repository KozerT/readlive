import Book from "@/database/models/book.model";
import { connectToDatabase } from "@/database/mongose";
import { generateSlug, serializeData } from "@/lib/utils";
import { CreateBook } from "@/types";

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
