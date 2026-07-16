import { BookCardProps } from "@/types";
import Image from "next/image";
import Link from "next/link";

const BookCard = ({ title, author, coverURL, slug }: BookCardProps) => {
  return (
    <Link href={`/books/${slug}`}>
      <article className="book-card">
        <figure className="book-card-figure">
          <div className="book-card-cover-wrapper">
            <Image
              src={coverURL}
              alt={title}
              width={133}
              height={200}
              className="book-card-cover"
            />
          </div>
        </figure>
        <figcaption className="book-card-meta">
          <h3 className="book-card-title">{title}</h3>
          <h3 className="book-card-author">{author}</h3>
        </figcaption>
      </article>
    </Link>
  );
};

export default BookCard;
